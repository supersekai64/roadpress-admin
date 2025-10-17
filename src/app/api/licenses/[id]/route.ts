import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';
import { DebugLogger } from '@/lib/debug-logger';

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
  const startTime = Date.now();
  
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
  const startTime = Date.now();
  
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

    // LOG : Modification de licence réussie
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'UPDATE_LICENSE',
      method: 'PUT',
      endpoint: `/api/licenses/${id}`,
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Licence modifiée avec succès pour ${license.clientName}`,
      requestData: {
        previousData: {
          clientName: existingLicense.clientName,
          startDate: existingLicense.startDate,
          endDate: existingLicense.endDate,
          status: existingLicense.status,
          siteUrl: existingLicense.siteUrl,
          isAssociated: existingLicense.isAssociated,
        },
        newData: {
          clientName: validatedData.clientName,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          status,
          siteUrl: validatedData.siteUrl,
          isAssociated: validatedData.isAssociated,
        },
      },
      responseData: {
        licenseId: license.id,
        licenseKey: license.licenseKey,
        status: license.status,
        label: 'LICENCE',
        clientName: license.clientName,
      },
            duration: Date.now() - startTime,
    });

    return NextResponse.json(license);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // LOG : Erreur de validation
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'UPDATE_LICENSE',
        method: 'PUT',
        endpoint: `/api/licenses/${(await params).id}`,
        status: 'ERROR',
        label: 'LICENCE',
        message: 'Données invalides pour la modification de licence',
        errorDetails: JSON.stringify(error.issues),
              duration: Date.now() - startTime,
      });

      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur PUT /api/licenses/[id]:', error);

    // LOG : Erreur lors de la modification
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'UPDATE_LICENSE',
      method: 'PUT',
      endpoint: `/api/licenses/${(await params).id}`,
      status: 'ERROR',
      label: 'LICENCE',
      message: 'Erreur lors de la modification de la licence',
      errorDetails: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
    });

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
  const startTime = Date.now();
  
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

    // LOG : Suppression de licence réussie
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DELETE_LICENSE',
      method: 'DELETE',
      endpoint: `/api/licenses/${id}`,
      licenseId: undefined, // La licence n'existe plus
      clientName: existingLicense.clientName,
      status: 'SUCCESS',
      message: `Licence supprimée avec succès pour ${existingLicense.clientName}`,
      requestData: {
        deletedLicense: {
          licenseId: existingLicense.id,
          licenseKey: existingLicense.licenseKey,
          clientName: existingLicense.clientName,
          status: existingLicense.status,
          label: 'LICENCE',
          startDate: existingLicense.startDate,
          endDate: existingLicense.endDate,
          siteUrl: existingLicense.siteUrl,
          isAssociated: existingLicense.isAssociated,
        },
      },
            duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { message: 'Licence supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur DELETE /api/licenses/[id]:', error);

    // LOG : Erreur lors de la suppression
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DELETE_LICENSE',
      method: 'DELETE',
      endpoint: `/api/licenses/${(await params).id}`,
      status: 'ERROR',
      label: 'LICENCE',
      message: 'Erreur lors de la suppression de la licence',
      errorDetails: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la licence' },
      { status: 500 }
    );
  }
}
