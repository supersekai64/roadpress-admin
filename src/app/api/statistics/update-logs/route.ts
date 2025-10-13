import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les logs emails/SMS du plugin
 * POST /api/statistics/update-logs
 * Body: { license_key, email_logs, sms_logs }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, email_logs, sms_logs } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer les logs email
    if (Array.isArray(email_logs) && email_logs.length > 0) {
      const emailLogsData = email_logs.map((log) => ({
        licenseId: license.id,
        sendDate: new Date(log.send_date),
        status: 'sent',
        emailTo: log.recipient || 'unknown@example.com',
        subject: log.subject || 'Roadpress Booklet',
      }));

      await prisma.emailLog.createMany({
        data: emailLogsData,
        skipDuplicates: true,
      });
    }

    // Enregistrer les logs SMS
    if (Array.isArray(sms_logs) && sms_logs.length > 0) {
      const smsLogsData = sms_logs.map((log) => ({
        licenseId: license.id,
        phone: log.phone,
        country: log.country || 'Unknown',
        sendDate: new Date(log.send_date),
        status: 'sent',
        cost: 0,
      }));

      await prisma.smsLog.createMany({
        data: smsLogsData,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Logs enregistrés avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement logs:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
