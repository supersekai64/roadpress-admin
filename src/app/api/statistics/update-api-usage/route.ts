import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les stats OpenAI/Deepl du plugin
 * POST /api/statistics/update-api-usage
 * Body: { license_key, deepl_stats, openai_stats }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, deepl_stats, openai_stats } = body;

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

    // Enregistrer stats Deepl
    if (deepl_stats) {
      await prisma.deeplStats.create({
        data: {
          licenseId: license.id,
          charactersTranslated: deepl_stats.tokens_used || 0,
          translationsCount: 1,
        },
      });
    }

    // Enregistrer stats OpenAI
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
    }

    return NextResponse.json({
      success: true,
      message: 'Stats API enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats API:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
