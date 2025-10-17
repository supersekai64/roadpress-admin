import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poiIdsParam = searchParams.get('poiIds');

    if (!poiIdsParam) {
      return NextResponse.json(
        { error: 'poiIds parameter is required' },
        { status: 400 }
      );
    }

    // Parser les IDs des POI
    const poiIds = poiIdsParam.split(',').filter(Boolean);

    console.log('[POI Export] Recherche de visites pour', poiIds.length, 'POI');
    console.log('[POI Export] IDs des POI :', poiIds);

    if (!poiIds.length) {
      return NextResponse.json(
        { error: 'At least one poiId is required' },
        { status: 400 }
      );
    }

    // Récupérer toutes les visites pour ces POI
    const visits = await prisma.poiVisit.findMany({
      where: {
        poiId: {
          in: poiIds,
        },
      },
      include: {
        poi: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
        license: {
          select: {
            id: true,
            clientName: true,
            licenseKey: true,
          },
        },
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    console.log('[POI Export] Nombre de visites trouvées:', visits.length);

    return NextResponse.json(visits);
  } catch (error) {
    console.error('Erreur lors de la récupération des visites pour export:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des visites' },
      { status: 500 }
    );
  }
}
