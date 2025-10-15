import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poiId = searchParams.get('poiId');
    const licenseId = searchParams.get('licenseId');

    // Construire le filtre
    const where: any = {};
    if (poiId) where.poiId = poiId;
    if (licenseId) where.licenseId = licenseId;

    const visits = await prisma.poiVisit.findMany({
      where,
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

    return NextResponse.json(visits);
  } catch (error) {
    console.error('Erreur lors de la récupération des visites:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des visites' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      poiId,
      licenseId,
      season,
      visitorProfile,
      stayDuration,
      countryOfOrigin,
      bookingMode,
      travelReason,
      transportModes,
      interests,
      roadpressId,
      visitDate,
    } = body;

    // Validation basique
    if (!poiId || !licenseId) {
      return NextResponse.json(
        { error: 'poiId et licenseId sont obligatoires' },
        { status: 400 }
      );
    }

    // Vérifier que le POI existe
    const poi = await prisma.poi.findUnique({
      where: { id: poiId },
    });

    if (!poi) {
      return NextResponse.json(
        { error: 'POI introuvable' },
        { status: 404 }
      );
    }

    // Créer la visite
    const visit = await prisma.poiVisit.create({
      data: {
        poiId,
        licenseId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        season,
        visitorProfile,
        stayDuration,
        countryOfOrigin,
        bookingMode,
        travelReason,
        transportModes: transportModes ? JSON.stringify(transportModes) : null,
        interests: interests ? JSON.stringify(interests) : null,
        roadpressId,
      },
      include: {
        poi: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        license: {
          select: {
            id: true,
            clientName: true,
          },
        },
      },
    });

    // Mettre à jour le compteur de visites du POI
    await prisma.poi.update({
      where: { id: poiId },
      data: {
        visitCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la visite:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la visite' },
      { status: 500 }
    );
  }
}
