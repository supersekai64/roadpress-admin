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
          emailsDelivered: parseInt(email_stats) || 0,
          emailsOpened: 0,
          emailsClicked: 0,
          emailsBounced: 0,
          emailsSpam: 0,
        },
      });
    }

    // Enregistrer les stats SMS par pays
    if (Array.isArray(sms_stats) && sms_stats.length > 0) {
      for (const stat of sms_stats) {
        if (stat.country && stat.sms_count) {
          await prisma.smsStats.create({
            data: {
              licenseId: license.id,
              smsSent: stat.sms_count,
              smsDelivered: stat.sms_count,
              smsFailed: 0,
              totalCost: 0,
            },
          });
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
