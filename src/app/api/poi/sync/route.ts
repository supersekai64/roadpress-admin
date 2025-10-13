import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/poi/sync
 * Synchronise plusieurs POIs depuis un site client
 * Utilise la clé de licence pour authentification
 */
export async function POST(request: Request) {
  try {
    const licenseKey = request.headers.get('X-License-Key');

    if (!licenseKey) {
      return NextResponse.json(
        { error: 'Clé de licence manquante' },
        { status: 401 }
      );
    }

    // Vérifier la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Licence invalide ou inactive' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pois } = body;

    if (!Array.isArray(pois)) {
      return NextResponse.json(
        { error: 'Format invalide : "pois" doit être un tableau' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const poiData of pois) {
      try {
        const { externalId, name, address, latitude, longitude, visitCount, seasonData } = poiData;

        // Validation
        if (!externalId || !name || latitude == null || longitude == null) {
          results.failed++;
          results.errors.push(`POI "${name || 'inconnu'}" : champs obligatoires manquants`);
          continue;
        }

        // Vérifier si le POI existe déjà pour cette licence
        const existingPoi = await prisma.poi.findFirst({
          where: {
            licenseId: license.id,
            // On suppose qu'il y a un champ externalId dans le schema
            // Si ce n'est pas le cas, on utilise name + coordinates
            name,
            latitude,
            longitude,
          },
        });

        if (existingPoi) {
          // Mettre à jour
          await prisma.poi.update({
            where: { id: existingPoi.id },
            data: {
              address: address || existingPoi.address,
              visitCount: visitCount || existingPoi.visitCount,
              seasonData: seasonData ? JSON.stringify(seasonData) : existingPoi.seasonData,
              syncDate: new Date(),
            },
          });
          results.updated++;
        } else {
          // Créer nouveau POI
          const poiCount = await prisma.poi.count();
          const poiId = `POI${String(poiCount + 1).padStart(3, '0')}`;

          await prisma.poi.create({
            data: {
              poiId,
              name,
              address,
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
        results.errors.push(`POI "${poiData.name || 'inconnu'}" : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée`,
      results,
      client: license.clientName,
    });
  } catch (error) {
    console.error('Erreur sync POIs:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la synchronisation' },
      { status: 500 }
    );
  }
}
