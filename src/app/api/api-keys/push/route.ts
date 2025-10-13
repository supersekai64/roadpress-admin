import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import prisma from '@/lib/prisma';

/**
 * POST /api/api-keys/push
 * Distribue les clés API actives vers tous les sites clients associés
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

    // Récupérer toutes les licences actives et associées
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

        // Préparer les clés à envoyer
        const keysToSend = activeKeys.reduce((acc, key) => {
          acc[key.service] = key.key;
          return acc;
        }, {} as Record<string, string>);

        // Appel webhook vers le site client
        const webhookUrl = `${license.siteUrl}/wp-json/roadpress/v1/update-keys`;
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-License-Key': license.licenseKey,
          },
          body: JSON.stringify({
            keys: keysToSend,
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(10000), // Timeout 10s
        });

        if (response.ok) {
          results.success.push(license.clientName);
        } else {
          results.failed.push({
            site: license.clientName,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        results.failed.push({
          site: license.clientName,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
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
