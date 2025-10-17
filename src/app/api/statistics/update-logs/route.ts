import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint pour recevoir les logs emails/SMS du plugin
 * POST /api/statistics/update-logs
 * Body: { license_key, email_logs, sms_logs }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { license_key, email_logs, sms_logs } = body;

    if (!license_key) {
      await DebugLogger.log({
        category: 'SYNC',
        action: 'LOGS_UPDATE',
        method: 'POST',
        endpoint: '/api/statistics/update-logs',
        status: 'ERROR',
        label: 'STATISTIQUES',
        message: 'Clé de licence manquante',
        requestData: { 
          has_email_logs: !!email_logs, 
          has_sms_logs: !!sms_logs,
          email_count: Array.isArray(email_logs) ? email_logs.length : 0,
          sms_count: Array.isArray(sms_logs) ? sms_logs.length : 0,
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

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      await DebugLogger.log({
        category: 'SYNC',
        action: 'LOGS_UPDATE',
        method: 'POST',
        endpoint: '/api/statistics/update-logs',
        status: 'ERROR',
        label: 'STATISTIQUES',
        message: 'Licence invalide ou inactive',
        requestData: { 
          license_key,
          email_count: Array.isArray(email_logs) ? email_logs.length : 0,
          sms_count: Array.isArray(sms_logs) ? sms_logs.length : 0,
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

    // Enregistrer les logs email
    let emailLogsCreated = 0;
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
      emailLogsCreated = email_logs.length;
    }

    // Enregistrer les logs SMS
    let smsLogsCreated = 0;
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
      smsLogsCreated = sms_logs.length;
    }

    // Log du succès
    await DebugLogger.log({
      category: 'SYNC',
      action: 'LOGS_UPDATE',
      method: 'POST',
      endpoint: '/api/statistics/update-logs',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      label: 'STATISTIQUES',
      message: `Logs enregistrés (E-mails : ${emailLogsCreated} | SMS : ${smsLogsCreated})`,
      requestData: {
        email_logs_count: emailLogsCreated,
        sms_logs_count: smsLogsCreated,
      },
      responseData: {
        email_logs_created: emailLogsCreated,
        sms_logs_created: smsLogsCreated,
      },
      duration: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Logs enregistrés avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement logs:', error);
    
    // Log de l'erreur
    await DebugLogger.log({
      category: 'SYNC',
      action: 'LOGS_UPDATE',
      method: 'POST',
      endpoint: '/api/statistics/update-logs',
      status: 'ERROR',
      label: 'STATISTIQUES',
      message: 'Erreur lors de l\'enregistrement des logs',
      errorDetails: error instanceof Error ? error.stack : String(error),
      duration: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
