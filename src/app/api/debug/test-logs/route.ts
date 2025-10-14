import { NextRequest, NextResponse } from 'next/server';
import { DebugLogger } from '@/lib/debug-logger';

type LogStatus = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

interface TestLogType {
  readonly category: 'SYNC' | 'PUSH_API' | 'LICENSE';
  readonly action: string;
  readonly status: LogStatus;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 10 } = body;

    console.log('🔍 Génération de logs de test...');

    // Types de logs de test
    const logTypes: TestLogType[] = [
      { category: 'SYNC', action: 'sync_stats', status: 'SUCCESS' },
      { category: 'SYNC', action: 'sync_config', status: 'SUCCESS' },
      { category: 'PUSH_API', action: 'push_api_key', status: 'SUCCESS' },
      { category: 'LICENSE', action: 'create_license', status: 'SUCCESS' },
      { category: 'LICENSE', action: 'verify_license', status: 'SUCCESS' },
      { category: 'SYNC', action: 'sync_error', status: 'ERROR' },
      { category: 'PUSH_API', action: 'push_failed', status: 'ERROR' },
    ];

    let logsCreated = 0;

    for (let i = 0; i < count; i++) {
      const randomType = logTypes[Math.floor(Math.random() * logTypes.length)];
      
      // Créer des données de test variées
      const testData = {
        request: {
          method: 'POST',
          url: `/api/test/${randomType.action}`,
          headers: { 'user-agent': 'Test Client', 'content-type': 'application/json' },
          body: { testId: `test-${i + 1}`, timestamp: new Date().toISOString() }
        },
        response: randomType.status === 'SUCCESS' 
          ? { success: true, data: { id: `result-${i + 1}` } }
          : { success: false, error: 'Test error message' },
        metadata: {
          executionTime: Math.floor(Math.random() * 1000) + 50,
          clientIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Test Client v1.0'
        }
      };

      // Log selon le type
      try {
        switch (randomType.category) {
          case 'SYNC':
            await DebugLogger.logSync({
              action: randomType.action,
              status: randomType.status,
              clientName: `Client-${i + 1}`,
              requestData: testData.request,
              responseData: testData.response,
              duration: testData.metadata.executionTime,
              message: randomType.status === 'ERROR' ? 'Erreur de synchronisation test' : 'Synchronisation test réussie',
            });
            break;
          case 'PUSH_API':
            await DebugLogger.logPushApi({
              action: randomType.action,
              status: randomType.status,
              clientName: `Client-${i + 1}`,
              endpoint: `/api/test/${randomType.action}`,
              requestData: testData.request,
              responseData: testData.response,
              duration: testData.metadata.executionTime,
              message: randomType.status === 'ERROR' ? 'Erreur push API test' : 'Push API test réussi',
            });
            break;
          case 'LICENSE':
            await DebugLogger.logLicense({
              action: randomType.action,
              status: randomType.status,
              clientName: `Client-${i + 1}`,
              requestData: testData.request,
              responseData: testData.response,
              message: randomType.status === 'ERROR' ? 'Erreur licence test' : 'Opération licence test réussie',
            });
            break;
        }
        logsCreated++;
      } catch (logError) {
        console.error('Erreur lors de la création du log:', logError);
      }

      // Petit délai pour varier les timestamps
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100)));
    }

    console.log(`✅ ${logsCreated} logs de test créés`);

    return NextResponse.json({
      success: true,
      message: `${logsCreated} logs de test créés avec succès`,
      logs: logsCreated
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération des logs de test:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération des logs de test' },
      { status: 500 }
    );
  }
}