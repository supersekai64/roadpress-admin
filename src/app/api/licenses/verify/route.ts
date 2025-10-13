import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint appelé par le plugin client pour vérifier une licence
 * GET /api/licenses/verify?license_key=XXXX
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license_key');

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Vérifier les dates de validité
    const now = new Date();
    const isActive =
      license.status === 'ACTIVE' &&
      license.startDate <= now &&
      license.endDate >= now;

    if (!isActive) {
      // Mettre à jour le statut si expiré
      if (license.endDate < now && license.status !== 'EXPIRED') {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: 'EXPIRED' },
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Licence inactive ou expirée',
          status: license.status,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Licence valide',
      api_token: license.apiToken,
      license: {
        key: license.licenseKey,
        clientName: license.clientName,
        status: license.status,
        startDate: license.startDate,
        endDate: license.endDate,
      },
    });
  } catch (error) {
    console.error('Erreur vérification licence:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
