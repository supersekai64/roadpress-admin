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
      // Importer le service de pricing SMS avec tous les tarifs réels
      const { SmsPricingService } = await import('@/lib/sms-pricing');

      for (const stat of sms_stats) {
        if (stat.country && stat.sms_count) {
          // Utiliser le service centralisé pour le calcul des coûts
          const costCalculation = SmsPricingService.calculateSMSCost(stat.country, stat.sms_count);
          const costPerSms = costCalculation.unitPrice;
          const totalCostForCountry = costCalculation.cost;

          // Enregistrer dans SmsStats (pour les totaux globaux)
          await prisma.smsStats.create({
            data: {
              licenseId: license.id,
              smsSent: stat.sms_count,
              totalCost: totalCostForCountry,
            },
          });

          // Créer un log par SMS pour permettre le détail par pays
          // (chaque SMS individuel avec son coût)
          for (let i = 0; i < stat.sms_count; i++) {
            await prisma.smsLog.create({
              data: {
                licenseId: license.id,
                phone: `+${stat.country.toLowerCase().replace(/\s+/g, '')}-${i + 1}`, // Numéro fictif unique
                country: stat.country,
                status: 'delivered',
                cost: costPerSms,
                sendDate: new Date(),
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Statistiques enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
