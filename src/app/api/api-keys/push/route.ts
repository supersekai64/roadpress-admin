import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

/**
 * POST /api/api-keys/push
 * Distribue les clés API actives vers tous les sites clients associés
 * 
 * Chaque site WordPress client doit avoir le plugin RoadPress installé
 * qui expose l'endpoint : /wp-json/roadpress/v1/update_api_keys
 * 
 * Cet endpoint reçoit les clés API et les stocke dans la base de données WordPress.
 */
export async function POST() {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer toutes les clés API actives
    const activeKeys = await prisma.apiKey.findMany({
      where: { isActive: true },
    });

    if (activeKeys.length === 0) {
      return NextResponse.json(
        { error: 'Aucune clé API active à distribuer' },
        { status: 400 }
      );
    }

    // Récupérer toutes les licences actives et associées avec un site configuré
    // Une licence = un site WordPress avec le plugin RoadPress installé
    const activeLicenses = await prisma.license.findMany({
      where: {
        status: 'ACTIVE',
        isAssociated: true,
        siteUrl: { not: null },
      },
    });

    if (activeLicenses.length === 0) {
      return NextResponse.json(
        { error: 'Aucun site client actif trouvé' },
        { status: 400 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { site: string; error: string }[],
    };

    // Distribuer les clés à chaque site client
    for (const license of activeLicenses) {
      try {
        if (!license.siteUrl) continue;

        // Préparer les clés au format attendu par le plugin WordPress
        // Le plugin attend : deepl_key, openai_key, brevo_key, mapbox_key
        const keysPayload = activeKeys.reduce((acc, key) => {
          acc[`${key.service}_key`] = key.key;
          return acc;
        }, {} as Record<string, string>);

        // Appel webhook vers le site client WordPress
        const webhookUrl = `${license.siteUrl}/wp-json/roadpress/v1/update_api_keys`;
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-License-Key': license.licenseKey,
          },
          body: JSON.stringify(keysPayload),
          signal: AbortSignal.timeout(10000), // Timeout 10s
        });

        if (response.ok) {
          results.success.push(license.clientName);
        } else {
          const errorText = await response.text().catch(() => 'Aucun détail');
          results.failed.push({
            site: license.clientName,
            error: `HTTP ${response.status} - ${errorText}`,
          });
        }
      } catch (error) {
        results.failed.push({
          site: license.clientName,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
        console.error(`Erreur push vers ${license.clientName} (${license.siteUrl}):`, error);
      }
    }

    // Mettre à jour lastPush pour toutes les clés
    await prisma.apiKey.updateMany({
      where: { isActive: true },
      data: { lastPush: new Date() },
    });

    return NextResponse.json({
      message: `Distribution terminée`,
      total: activeLicenses.length,
      success: results.success.length,
      failed: results.failed.length,
      details: results,
    });
  } catch (error) {
    console.error('Erreur push keys:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la distribution des clés' },
      { status: 500 }
    );
  }
}
