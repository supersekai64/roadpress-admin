import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour associer une licence à un site client
 * POST /api/licenses/update
 * Body: { license_key, site_url }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, site_url } = body;

    if (!license_key || !site_url) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
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

    // Mettre à jour l'URL du site et marquer comme associée
    await prisma.license.update({
      where: { id: license.id },
      data: {
        siteUrl: site_url,
        isAssociated: true,
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Licence associée avec succès',
    });
  } catch (error) {
    console.error('Erreur association licence:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
