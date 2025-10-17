import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint pour recevoir les stats emails/SMS du plugin
 * POST /api/statistics/update-stats
 * Body: { license_key, email_stats, sms_stats }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { license_key, email_stats, sms_stats } = body;

    if (!license_key) {
      await DebugLogger.log({
        category: 'SYNC',
        action: 'STATS_UPDATE',
        method: 'POST',
        endpoint: '/api/statistics/update-stats',
        status: 'ERROR',
        message: 'Clé de licence manquante',
        requestData: {
          has_email_stats: email_stats !== undefined,
          has_sms_stats: Array.isArray(sms_stats) && sms_stats.length > 0,
          email_count: email_stats || 0,
          sms_countries: Array.isArray(sms_stats) ? sms_stats.length : 0,
        },
        duration: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      
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
      await DebugLogger.log({
        category: 'SYNC',
        action: 'STATS_UPDATE',
        method: 'POST',
        endpoint: '/api/statistics/update-stats',
        status: 'ERROR',
        message: 'Licence invalide ou inactive',
        requestData: {
          license_key,
          email_count: email_stats || 0,
          sms_countries: Array.isArray(sms_stats) ? sms_stats.length : 0,
        },
        duration: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer les stats email si présentes
    let emailStatsCreated = 0;
    if (email_stats !== undefined && email_stats !== null) {
      await prisma.emailStats.create({
        data: {
          licenseId: license.id,
          emailsSent: parseInt(email_stats) || 0,
        },
      });
      emailStatsCreated = parseInt(email_stats) || 0;
    }

    // Enregistrer les stats SMS par pays avec le système de pricing centralisé
    let smsStatsCreated = 0;
    let smsLogsCreated = 0;
    let totalSmsCost = 0;
    
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
          smsStatsCreated = smsStatsOperations.length;
          totalSmsCost = smsStatsOperations.reduce((sum, stat) => sum + Number(stat.totalCost), 0);
        }

        if (smsLogOperations.length > 0) {
          await prisma.smsLog.createMany({
            data: smsLogOperations,
          });
          smsLogsCreated = smsLogOperations.length;
        }

        console.log(`SMS stats enregistrées: ${smsStatsOperations.length} stats, ${smsLogOperations.length} logs`);
      } catch (smsError) {
        console.error('Erreur spécifique SMS:', smsError);
        throw new Error(`Erreur lors de l'enregistrement des stats SMS: ${smsError instanceof Error ? smsError.message : 'Erreur inconnue'}`);
      }
    }

    // Log du succès
    await DebugLogger.log({
      category: 'SYNC',
      action: 'STATS_UPDATE',
      method: 'POST',
      endpoint: '/api/statistics/update-stats',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Statistiques enregistrées (E-mails : ${emailStatsCreated} | SMS : ${smsLogsCreated} dans ${smsStatsCreated} pays)`,
      requestData: {
        email_stats: emailStatsCreated,
        sms_countries: smsStatsCreated,
        sms_total: smsLogsCreated,
      },
      responseData: {
        email_stats_created: emailStatsCreated > 0 ? 1 : 0,
        sms_stats_created: smsStatsCreated,
        sms_logs_created: smsLogsCreated,
        total_sms_cost: totalSmsCost,
      },
      duration: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

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
    
    // Log de l'erreur
    await DebugLogger.log({
      category: 'SYNC',
      action: 'STATS_UPDATE',
      method: 'POST',
      endpoint: '/api/statistics/update-stats',
      status: 'ERROR',
      message: 'Erreur lors de l\'enregistrement des statistiques',
      errorDetails: error instanceof Error ? error.stack : String(error),
      duration: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
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
