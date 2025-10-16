import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint pour recevoir les stats OpenAI/Deepl du plugin
 * POST /api/statistics/update-api-usage
 * Body: { license_key, deepl_stats, openai_stats }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { license_key, deepl_stats, openai_stats } = body;

    if (!license_key) {
      await DebugLogger.log({
        category: 'API_USAGE',
        action: 'API_USAGE_UPDATE_FAILED',
        method: 'POST',
        endpoint: '/api/statistics/update-api-usage',
        status: 'ERROR',
        message: 'Clé de licence manquante',
        requestData: { has_deepl: !!deepl_stats, has_openai: !!openai_stats },
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
        category: 'API_USAGE',
        action: 'API_USAGE_UPDATE_UNAUTHORIZED',
        method: 'POST',
        endpoint: '/api/statistics/update-api-usage',
        status: 'ERROR',
        message: 'Licence invalide ou inactive',
        requestData: { license_key, has_deepl: !!deepl_stats, has_openai: !!openai_stats },
        duration: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer stats Deepl
    let deeplCount = 0;
    if (deepl_stats) {
      await prisma.deeplStats.create({
        data: {
          licenseId: license.id,
          charactersTranslated: deepl_stats.tokens_used || 0,
          translationsCount: 1,
        },
      });
      deeplCount = 1;
    }

    // Enregistrer stats OpenAI
    let openaiCount = 0;
    if (openai_stats) {
      await prisma.openaiStats.create({
        data: {
          licenseId: license.id,
          totalTokens: openai_stats.tokens_used || 0,
          promptTokens: Math.floor((openai_stats.tokens_used || 0) * 0.7),
          completionTokens: Math.floor((openai_stats.tokens_used || 0) * 0.3),
          requestsCount: 1,
          totalCost: openai_stats.estimated_cost || 0,
        },
      });
      openaiCount = 1;
    }

    // Log du succès
    await DebugLogger.log({
      category: 'API_USAGE',
      action: 'API_USAGE_UPDATE_SUCCESS',
      method: 'POST',
      endpoint: '/api/statistics/update-api-usage',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Stats API enregistrées (DeepL: ${deeplCount}, OpenAI: ${openaiCount})`,
      requestData: {
        deepl_tokens: deepl_stats?.tokens_used || 0,
        openai_tokens: openai_stats?.tokens_used || 0,
        openai_cost: openai_stats?.estimated_cost || 0,
      },
      responseData: {
        deepl_stats_created: deeplCount,
        openai_stats_created: openaiCount,
      },
      duration: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Stats API enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats API:', error);
    
    // Log de l'erreur
    await DebugLogger.log({
      category: 'API_USAGE',
      action: 'API_USAGE_UPDATE_ERROR',
      method: 'POST',
      endpoint: '/api/statistics/update-api-usage',
      status: 'ERROR',
      message: 'Erreur lors de l\'enregistrement des stats API',
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
