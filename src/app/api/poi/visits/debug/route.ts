import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint de debug pour diagnostiquer les relations POI <-> Visites
 */
export async function GET() {
  try {
    // Compter les POIs
    const poisCount = await prisma.poi.count();
    
    // Compter les visites
    const visitsCount = await prisma.poiVisit.count();
    
    // Récupérer quelques POIs avec leurs visites
    const poisWithVisits = await prisma.poi.findMany({
      take: 5,
      include: {
        visits: true,
        license: {
          select: {
            clientName: true,
          },
        },
      },
    });
    
    // Récupérer quelques visites avec leurs POIs
    const visitsWithPois = await prisma.poiVisit.findMany({
      take: 5,
      include: {
        poi: {
          select: {
            id: true,
            name: true,
          },
        },
        license: {
          select: {
            clientName: true,
          },
        },
      },
    });
    
    // Vérifier les visites orphelines (sans POI valide)
    const allVisits = await prisma.poiVisit.findMany({
      select: {
        id: true,
        poiId: true,
        roadpressId: true,
      },
    });
    
    const allPoiIds = new Set(
      (await prisma.poi.findMany({ select: { id: true } })).map(p => p.id)
    );
    
    const orphanVisits = allVisits.filter(v => !allPoiIds.has(v.poiId));
    
    return NextResponse.json({
      summary: {
        totalPois: poisCount,
        totalVisits: visitsCount,
        orphanVisits: orphanVisits.length,
      },
      samples: {
        poisWithVisits: poisWithVisits.map(poi => ({
          id: poi.id,
          name: poi.name,
          client: poi.license.clientName,
          visitsCount: poi.visits.length,
          visitIds: poi.visits.map(v => v.id),
        })),
        visitsWithPois: visitsWithPois.map(visit => ({
          id: visit.id,
          roadpressId: visit.roadpressId,
          poiId: visit.poiId,
          poiName: visit.poi.name,
          client: visit.license.clientName,
        })),
        orphanVisits: orphanVisits.slice(0, 10).map(v => ({
          id: v.id,
          poiId: v.poiId,
          roadpressId: v.roadpressId,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur debug:', error);
    return NextResponse.json(
      { error: 'Erreur lors du diagnostic', details: String(error) },
      { status: 500 }
    );
  }
}
