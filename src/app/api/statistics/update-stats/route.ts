import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les stats emails/SMS du plugin
 * POST /api/statistics/update-stats
 * Body: { license_key, email_stats, sms_stats }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, email_stats, sms_stats } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    // Vérifier la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer les stats email si présentes
    if (email_stats !== undefined && email_stats !== null) {
      await prisma.emailStats.create({
        data: {
          licenseId: license.id,
          emailsSent: parseInt(email_stats) || 0,
        },
      });
    }

    // Enregistrer les stats SMS par pays avec le système de pricing centralisé
    if (Array.isArray(sms_stats) && sms_stats.length > 0) {
      try {
        // Importer le service de pricing SMS avec tous les tarifs réels
        const { SmsPricingService } = await import('@/lib/sms-pricing');

        // Préparer toutes les opérations en batch pour éviter les problèmes de performance
        const smsStatsOperations = [];
        const smsLogOperations = [];

        for (const stat of sms_stats) {
          if (stat.country && stat.sms_count && typeof stat.sms_count === 'number' && stat.sms_count > 0) {
            // Utiliser le service centralisé pour le calcul des coûts
            const costCalculation = SmsPricingService.calculateSMSCost(stat.country, stat.sms_count);
            const costPerSms = costCalculation.unitPrice;
            const totalCostForCountry = costCalculation.cost;

            // Préparer l'opération SmsStats
            smsStatsOperations.push({
              licenseId: license.id,
              smsSent: stat.sms_count,
              totalCost: totalCostForCountry,
            });

            // Préparer les opérations SmsLog (un par SMS)
            for (let i = 0; i < stat.sms_count; i++) {
              smsLogOperations.push({
                licenseId: license.id,
                phone: `+${stat.country.toLowerCase().replace(/\s+/g, '')}-${Date.now()}-${i + 1}`, // Numéro unique avec timestamp
                country: stat.country,
                status: 'delivered',
                cost: costPerSms,
                sendDate: new Date(),
              });
            }
          }
        }

        // Exécuter toutes les opérations en batch pour de meilleures performances
        if (smsStatsOperations.length > 0) {
          await prisma.smsStats.createMany({
            data: smsStatsOperations,
          });
        }

        if (smsLogOperations.length > 0) {
          await prisma.smsLog.createMany({
            data: smsLogOperations,
          });
        }

        console.log(`SMS stats enregistrées: ${smsStatsOperations.length} stats, ${smsLogOperations.length} logs`);
      } catch (smsError) {
        console.error('Erreur spécifique SMS:', smsError);
        throw new Error(`Erreur lors de l'enregistrement des stats SMS: ${smsError instanceof Error ? smsError.message : 'Erreur inconnue'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Statistiques enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats:', error);
    
    // Log détaillé pour diagnostic
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue';
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur serveur',
        debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
