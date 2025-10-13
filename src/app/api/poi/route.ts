import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get('licenseId');

    // Construire la requête avec filtre optionnel
    const where = licenseId ? { licenseId } : {};

    const pois = await prisma.poi.findMany({
      where,
      include: {
        license: {
          select: {
            id: true,
            licenseKey: true,
            clientName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(pois);
  } catch (error) {
    console.error('Erreur lors de la récupération des POI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des POI' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, latitude, longitude, licenseId, seasonData } = body;

    // Validation basique
    if (!name || !latitude || !longitude || !licenseId) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    // Vérifier que la licence existe
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Générer un poiId unique
    const poiCount = await prisma.poi.count();
    const poiId = `POI${String(poiCount + 1).padStart(3, '0')}`;

    // Créer le POI
    const poi = await prisma.poi.create({
      data: {
        poiId,
        name,
        latitude,
        longitude,
        licenseId,
        seasonData: seasonData || JSON.stringify({}),
        visitCount: 0,
        syncDate: new Date(),
      },
      include: {
        license: {
          select: {
            id: true,
            licenseKey: true,
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json(poi, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du POI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du POI' },
      { status: 500 }
    );
  }
}
