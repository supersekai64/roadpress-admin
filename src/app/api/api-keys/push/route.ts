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

    // Log du démarrage de l'opération
    await prisma.debugLog.create({
      data: {
        category: 'PUSH_API',
        action: 'PUSH_API_KEYS_START',
        status: 'INFO',
        message: `Démarrage du push des clés API vers ${activeLicenses.length} client(s)`,
        requestData: {
          services: activeKeys.map(k => k.service),
          keyCount: activeKeys.length,
          targetCount: activeLicenses.length,
          targets: activeLicenses.map(l => l.clientName),
        },
      },
    });

    const results = {
      success: [] as string[],
      failed: [] as { site: string; error: string }[],
    };

    // Distribuer les clés à chaque site client
    for (const license of activeLicenses) {
      const startTime = Date.now();
      
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

        const duration = Date.now() - startTime;

        if (response.ok) {
          results.success.push(license.clientName);
          
          // Log de succès
          await prisma.debugLog.create({
            data: {
              category: 'PUSH_API',
              action: 'PUSH_API_KEYS_SUCCESS',
              method: 'POST',
              endpoint: webhookUrl,
              licenseId: license.id,
              clientName: license.clientName,
              status: 'SUCCESS',
              message: `Clés API poussées avec succès vers ${license.clientName}`,
              requestData: {
                services: activeKeys.map(k => k.service),
                keyCount: activeKeys.length,
              },
              responseData: {
                status: response.status,
                statusText: response.statusText,
              },
              duration,
            },
          });
        } else {
          const errorText = await response.text().catch(() => 'Aucun détail');
          results.failed.push({
            site: license.clientName,
            error: `HTTP ${response.status} - ${errorText}`,
          });
          
          // Log d'échec HTTP
          await prisma.debugLog.create({
            data: {
              category: 'PUSH_API',
              action: 'PUSH_API_KEYS_FAILED',
              method: 'POST',
              endpoint: webhookUrl,
              licenseId: license.id,
              clientName: license.clientName,
              status: 'ERROR',
              message: `Échec du push vers ${license.clientName} : HTTP ${response.status}`,
              requestData: {
                services: activeKeys.map(k => k.service),
                keyCount: activeKeys.length,
              },
              errorDetails: errorText,
              duration,
            },
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        results.failed.push({
          site: license.clientName,
          error: errorMessage,
        });
        
        // Log d'erreur réseau/timeout
        await prisma.debugLog.create({
          data: {
            category: 'PUSH_API',
            action: 'PUSH_API_KEYS_ERROR',
            method: 'POST',
            endpoint: license.siteUrl ? `${license.siteUrl}/wp-json/roadpress/v1/update_api_keys` : 'URL manquante',
            licenseId: license.id,
            clientName: license.clientName,
            status: 'ERROR',
            message: `Erreur lors du push vers ${license.clientName}`,
            requestData: {
              services: activeKeys.map(k => k.service),
              keyCount: activeKeys.length,
            },
            errorDetails: errorMessage,
            duration,
          },
        });
        
        console.error(`Erreur push vers ${license.clientName} (${license.siteUrl}):`, error);
      }
    }

    // Mettre à jour lastPush pour toutes les clés
    await prisma.apiKey.updateMany({
      where: { isActive: true },
      data: { lastPush: new Date() },
    });

    // Log du résumé final
    await prisma.debugLog.create({
      data: {
        category: 'PUSH_API',
        action: 'PUSH_API_KEYS_COMPLETE',
        status: results.failed.length === 0 ? 'SUCCESS' : results.success.length > 0 ? 'WARNING' : 'ERROR',
        message: `Push terminé : ${results.success.length} succès, ${results.failed.length} échec(s) sur ${activeLicenses.length} client(s)`,
        responseData: {
          total: activeLicenses.length,
          success: results.success.length,
          failed: results.failed.length,
          successList: results.success,
          failedList: results.failed,
        },
      },
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
