import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour fournir les clés API au plugin client
 * GET /api/api-keys/provide?license_key=XXXX
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

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Récupérer les clés API actives
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
      },
    });

    const keys: Record<string, string> = {};
    apiKeys.forEach((key) => {
      keys[key.service] = key.key;
    });

    return NextResponse.json({
      success: true,
      api_keys: {
        openai_api_key: keys.openai || '',
        brevo_api_key: keys.brevo || '',
        deepl_api_key: keys.deepl || '',
        mapbox_client_key: keys.mapbox || '',
        geonames_username: keys.geonames || '',
      },
    });
  } catch (error) {
    console.error('Erreur récupération clés API:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
