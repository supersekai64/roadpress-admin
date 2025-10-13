import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour désassocier une licence d'un site
 * POST /api/licenses/disassociate
 * Body: { license_key }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Désassocier la licence
    await prisma.license.update({
      where: { id: license.id },
      data: {
        siteUrl: null,
        isAssociated: false,
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Licence désassociée avec succès',
    });
  } catch (error) {
    console.error('Erreur désassociation licence:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
