import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * POST /api/poi/sync
 * Synchronise plusieurs POIs depuis un site client WordPress
 * 
 * Authentification : Header X-License-Key
 * 
 * Format attendu :
 * {
 *   "pois": [
 *     {
 *       "poiId": "POI001",           // Identifiant unique du POI côté client
 *       "name": "Nom du POI",
 *       "type": "restaurant",         // Optionnel
 *       "address": "Adresse complète", // Optionnel
 *       "latitude": 48.8566,
 *       "longitude": 2.3522,
 *       "visitCount": 42,             // Optionnel, défaut 0
 *       "seasonData": {}              // Optionnel, données saisonnières
 *     }
 *   ]
 * }
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  let licenseId: string | undefined;
  let clientName: string | undefined;

  try {
    const licenseKey = request.headers.get('X-License-Key');

    if (!licenseKey) {
      await DebugLogger.logError({
        action: 'sync',
        message: 'Tentative de sync sans clé de licence',
        errorDetails: 'Header X-License-Key manquant',
      });

      return NextResponse.json(
        { error: 'Clé de licence manquante dans le header X-License-Key' },
        { status: 401 }
      );
    }

    // Vérifier la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      await DebugLogger.logError({
        action: 'sync',
        message: 'Tentative de sync avec clé invalide',
        errorDetails: `Clé: ${licenseKey.substring(0, 8)}...`,
      });

      return NextResponse.json(
        { error: 'Licence introuvable' },
        { status: 403 }
      );
    }

    if (license.status !== 'ACTIVE') {
      await DebugLogger.logError({
        action: 'sync',
        licenseId: license.id,
        clientName: license.clientName,
        message: 'Tentative de sync avec licence inactive',
        errorDetails: `Status: ${license.status}`,
      });

      return NextResponse.json(
        { error: 'Licence inactive ou expirée' },
        { status: 403 }
      );
    }

    licenseId = license.id;
    clientName = license.clientName;

    const body = await request.json();
    const { pois, visits } = body;

    if (!Array.isArray(pois)) {
      await DebugLogger.logError({
        action: 'sync',
        licenseId,
        clientName,
        message: 'Format de données invalide',
        errorDetails: 'Le champ "pois" doit être un tableau',
        requestData: body,
      });

      return NextResponse.json(
        { error: 'Format invalide : "pois" doit être un tableau' },
        { status: 400 }
      );
    }

    if (pois.length === 0) {
      await DebugLogger.logWarning({
        action: 'sync',
        licenseId,
        clientName,
        message: 'Tentative de sync avec tableau vide',
      });

      return NextResponse.json({
        success: true,
        message: 'Aucun POI à synchroniser',
        results: { created: 0, updated: 0, failed: 0, errors: [] },
        client: clientName,
      });
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    const visitResults = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Traitement de chaque POI
    for (const poiData of pois) {
      try {
        const { poiId, name, type, address, latitude, longitude, visitCount, seasonData } = poiData;

        // Validation des champs obligatoires
        if (!poiId || !name || latitude == null || longitude == null) {
          results.failed++;
          const missingFields = [];
          if (!poiId) missingFields.push('poiId');
          if (!name) missingFields.push('name');
          if (latitude == null) missingFields.push('latitude');
          if (longitude == null) missingFields.push('longitude');
          
          results.errors.push(
            `POI "${name || 'inconnu'}" : champs manquants (${missingFields.join(', ')})`
          );
          continue;
        }

        // Validation des coordonnées
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          results.failed++;
          results.errors.push(
            `POI "${name}" : latitude/longitude doivent être des nombres`
          );
          continue;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          results.failed++;
          results.errors.push(
            `POI "${name}" : coordonnées invalides (lat: ${latitude}, lng: ${longitude})`
          );
          continue;
        }

        // Vérifier si le POI existe déjà (par poiId + licenseId)
        const existingPoi = await prisma.poi.findUnique({
          where: {
            licenseId_poiId: {
              licenseId: license.id,
              poiId: poiId,
            },
          },
        });

        if (existingPoi) {
          // Mettre à jour le POI existant
          await prisma.poi.update({
            where: { id: existingPoi.id },
            data: {
              name,
              type: type || existingPoi.type,
              address: address || existingPoi.address,
              latitude,
              longitude,
              visitCount: visitCount ?? existingPoi.visitCount,
              seasonData: seasonData ? JSON.stringify(seasonData) : existingPoi.seasonData,
              syncDate: new Date(),
            },
          });
          results.updated++;
        } else {
          // Créer un nouveau POI
          await prisma.poi.create({
            data: {
              poiId,
              name,
              type: type || null,
              address: address || null,
              latitude,
              longitude,
              licenseId: license.id,
              visitCount: visitCount || 0,
              seasonData: seasonData ? JSON.stringify(seasonData) : JSON.stringify({}),
              syncDate: new Date(),
            },
          });
          results.created++;
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results.errors.push(`POI "${poiData.name || 'inconnu'}" : ${errorMessage}`);
      }
    }

    // Traitement des visites (si présentes)
    if (Array.isArray(visits) && visits.length > 0) {
      for (const visitData of visits) {
        try {
          const { poiId, roadpressId, visitDate, season, visitorProfile, stayDuration, countryOfOrigin, bookingMode, travelReason, transportModes, interests } = visitData;

          // Validation des champs obligatoires
          if (!poiId || !roadpressId) {
            visitResults.failed++;
            visitResults.errors.push(`Visite manquante poiId ou roadpressId`);
            continue;
          }

          // Trouver le POI correspondant dans notre base
          const poi = await prisma.poi.findUnique({
            where: {
              licenseId_poiId: {
                licenseId: license.id,
                poiId: poiId,
              },
            },
          });

          if (!poi) {
            visitResults.failed++;
            visitResults.errors.push(`POI ${poiId} introuvable pour la visite ${roadpressId}`);
            continue;
          }

          // Vérifier si la visite existe déjà (par roadpressId + licenseId)
          const existingVisit = await prisma.poiVisit.findFirst({
            where: {
              roadpressId: roadpressId,
              licenseId: license.id,
            },
          });

          if (existingVisit) {
            // Mettre à jour la visite existante
            await prisma.poiVisit.update({
              where: { id: existingVisit.id },
              data: {
                visitDate: visitDate ? new Date(visitDate) : existingVisit.visitDate,
                season: season || existingVisit.season,
                visitorProfile: visitorProfile || existingVisit.visitorProfile,
                stayDuration: stayDuration || existingVisit.stayDuration,
                countryOfOrigin: countryOfOrigin || existingVisit.countryOfOrigin,
                bookingMode: bookingMode || existingVisit.bookingMode,
                travelReason: travelReason || existingVisit.travelReason,
                transportModes: transportModes || existingVisit.transportModes,
                interests: interests || existingVisit.interests,
              },
            });
            visitResults.updated++;
          } else {
            // Créer une nouvelle visite
            await prisma.poiVisit.create({
              data: {
                poiId: poi.id,
                licenseId: license.id,
                roadpressId,
                visitDate: visitDate ? new Date(visitDate) : new Date(),
                season,
                visitorProfile,
                stayDuration,
                countryOfOrigin,
                bookingMode,
                travelReason,
                transportModes,
                interests,
              },
            });
            visitResults.created++;
          }
        } catch (error) {
          visitResults.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          visitResults.errors.push(`Visite "${visitData.roadpressId || 'inconnu'}" : ${errorMessage}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    // Log de succès
    await DebugLogger.logSuccess({
      action: 'sync',
      licenseId,
      clientName,
      message: `Synchronisation de ${pois.length} POI(s) et ${visits?.length || 0} visite(s)`,
      requestData: { poisCount: pois.length, visitsCount: visits?.length || 0 },
      responseData: { pois: results, visits: visitResults },
      duration,
    });

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée : ${results.created} POI(s) créé(s), ${results.updated} mis à jour, ${visitResults.created} visite(s) créée(s), ${visitResults.updated} mise(s) à jour`,
      results: {
        pois: results,
        visits: visitResults,
      },
      client: clientName,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : undefined;

    await DebugLogger.logError({
      action: 'sync',
      licenseId,
      clientName,
      message: 'Erreur serveur lors de la synchronisation des POIs',
      errorDetails: errorStack || errorMessage,
    });

    console.error('Erreur sync POIs:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur lors de la synchronisation',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
