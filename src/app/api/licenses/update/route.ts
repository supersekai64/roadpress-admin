import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint pour associer MANUELLEMENT une licence à un site client
 * POST /api/licenses/update
 * Body: { license_key, site_url }
 * 
 * ⚠️ NOTE : Cette route est maintenue pour la réassociation manuelle par l'admin.
 * L'activation automatique se fait via /api/licenses/verify (appelé par le plugin).
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
    const updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: {
        siteUrl: site_url,
        isAssociated: true,
        lastUpdate: new Date(),
      },
    });

    // LOG : Association de licence réussie
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'ASSOCIATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/update',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Licence associée avec succès au site ${site_url}`,
      requestData: {
        license_key,
        site_url,
        previousUrl: license.siteUrl,
        previousAssociation: license.isAssociated,
      },
      responseData: {
        licenseId: updatedLicense.id,
        clientName: updatedLicense.clientName,
        siteUrl: updatedLicense.siteUrl,
        isAssociated: updatedLicense.isAssociated,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Licence associée avec succès',
    });
  } catch (error) {
    console.error('Erreur association licence:', error);

    // LOG : Erreur lors de l'association
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'ASSOCIATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/update',
      status: 'ERROR',
      message: 'Erreur lors de l\'association de la licence',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
