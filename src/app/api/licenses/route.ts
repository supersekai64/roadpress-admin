import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth.server';
import { DebugLogger } from '@/lib/debug-logger';

// Schéma de validation pour la création/modification de licence
const licenseSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
});

// Fonction pour générer une clé de licence unique
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// GET /api/licenses - Liste toutes les licences
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { siteUrl: { contains: search, mode: 'insensitive' } },
      ];
    }

    const licenses = await prisma.license.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(licenses);
  } catch (error) {
    console.error('Erreur GET /api/licenses:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des licences' },
      { status: 500 }
    );
  }
}

// POST /api/licenses - Créer une nouvelle licence
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = licenseSchema.parse(body);

    // Générer une clé de licence unique
    let licenseKey = generateLicenseKey();
    let isUnique = false;
    
    // Vérifier l'unicité (max 10 tentatives)
    for (let i = 0; i < 10; i++) {
      const existing = await prisma.license.findUnique({
        where: { licenseKey },
      });
      if (!existing) {
        isUnique = true;
        break;
      }
      licenseKey = generateLicenseKey();
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Impossible de générer une clé unique' },
        { status: 500 }
      );
    }

    // Déterminer le statut initial : TOUJOURS INACTIVE au départ
    // Le statut passera à ACTIVE lors de l'activation par le client
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const now = new Date();

    // Vérifier si déjà expirée
    let status: 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
    if (endDate < now) {
      status = 'EXPIRED';
    }

    const license = await prisma.license.create({
      data: {
        licenseKey,
        clientName: validatedData.clientName,
        startDate,
        endDate,
        status,
        siteUrl: null, // Sera rempli lors de l'activation
        isAssociated: false, // Sera mis à true lors de l'activation
      },
    });

    // 📝 LOG : Création de licence réussie
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'CREATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Licence créée avec succès pour ${license.clientName} (en attente d'activation)`,
      requestData: {
        clientName: validatedData.clientName,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      },
      responseData: {
        licenseId: license.id,
        licenseKey: license.licenseKey,
        status: license.status,
        label: 'LICENCE',
        startDate: license.startDate,
        endDate: license.endDate,
        siteUrl: license.siteUrl,
        isAssociated: license.isAssociated,
      },
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // LOG : Erreur de validation
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'CREATE_LICENSE',
        method: 'POST',
        endpoint: '/api/licenses',
        status: 'ERROR',
        label: 'LICENCE',
        message: 'Données invalides pour la création de licence',
        errorDetails: JSON.stringify(error.issues),
      });

      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erreur POST /api/licenses:', error);

    // LOG : Erreur lors de la création
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'CREATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses',
      status: 'ERROR',
      label: 'LICENCE',
      message: 'Erreur lors de la création de la licence',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Erreur lors de la création de la licence' },
      { status: 500 }
    );
  }
}
