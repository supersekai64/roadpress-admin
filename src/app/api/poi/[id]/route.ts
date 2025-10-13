import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const poi = await prisma.poi.findUnique({
      where: { id },
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

    if (!poi) {
      return NextResponse.json(
        { error: 'POI introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(poi);
  } catch (error) {
    console.error('Erreur lors de la récupération du POI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du POI' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, latitude, longitude, seasonData, visitCount } = body;

    // Vérifier que le POI existe
    const existingPoi = await prisma.poi.findUnique({
      where: { id },
    });

    if (!existingPoi) {
      return NextResponse.json(
        { error: 'POI introuvable' },
        { status: 404 }
      );
    }

    // Mettre à jour le POI
    const poi = await prisma.poi.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(seasonData !== undefined && { seasonData }),
        ...(visitCount !== undefined && { visitCount }),
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

    return NextResponse.json(poi);
  } catch (error) {
    console.error('Erreur lors de la modification du POI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification du POI' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Vérifier que le POI existe
    const existingPoi = await prisma.poi.findUnique({
      where: { id },
    });

    if (!existingPoi) {
      return NextResponse.json(
        { error: 'POI introuvable' },
        { status: 404 }
      );
    }

    // Supprimer le POI
    await prisma.poi.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'POI supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du POI:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du POI' },
      { status: 500 }
    );
  }
}
