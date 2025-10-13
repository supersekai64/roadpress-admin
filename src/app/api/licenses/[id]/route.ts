import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

const licenseSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
  siteUrl: z.string().optional().nullable(),
  isAssociated: z.boolean().optional(),
});

interface RouteParams {
  readonly params: Promise<{
    id: string;
  }>;
}

// GET /api/licenses/[id] - Récupérer une licence spécifique
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            emailStats: true,
            smsStats: true,
            deeplStats: true,
            openaiStats: true,
            pois: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: 'Licence non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json(license);
  } catch (error) {
    console.error('Erreur GET /api/licenses/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la licence' },
      { status: 500 }
    );
  }
}

// PUT /api/licenses/[id] - Modifier une licence
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validatedData = licenseSchema.parse(body);

    // Vérifier que la licence existe
    const existingLicense = await prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      return NextResponse.json(
        { error: 'Licence non trouvée' },
        { status: 404 }
      );
    }

    // Calculer le statut si non fourni
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const now = new Date();

    let status = validatedData.status;
    if (!status) {
      if (startDate <= now && endDate >= now) {
        status = 'ACTIVE';
      } else if (endDate < now) {
        status = 'EXPIRED';
      } else {
        status = 'INACTIVE';
      }
    }

    const license = await prisma.license.update({
      where: { id },
      data: {
        clientName: validatedData.clientName,
        startDate,
        endDate,
        status,
        siteUrl: validatedData.siteUrl,
        isAssociated: validatedData.isAssociated,
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur PUT /api/licenses/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de la licence' },
      { status: 500 }
    );
  }
}

// DELETE /api/licenses/[id] - Supprimer une licence
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que la licence existe
    const existingLicense = await prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      return NextResponse.json(
        { error: 'Licence non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer la licence (cascade delete configuré dans Prisma)
    await prisma.license.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Licence supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur DELETE /api/licenses/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la licence' },
      { status: 500 }
    );
  }
}
