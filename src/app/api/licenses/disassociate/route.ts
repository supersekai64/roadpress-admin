import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint pour désassocier une licence d'un site
 * POST /api/licenses/disassociate
 * Body: { license_key }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
    const updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: {
        siteUrl: null,
        isAssociated: false,
        lastUpdate: new Date(),
      },
    });

    // LOG : Désassociation de licence réussie
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DISASSOCIATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/disassociate',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      label: 'LICENCE',
      message: `Licence désassociée avec succès (ancienne URL : ${license.siteUrl || 'aucune'})`,
      requestData: {
        license_key,
        previousUrl: license.siteUrl,
        previousAssociation: license.isAssociated,
      },
      responseData: {
        licenseId: updatedLicense.id,
        clientName: updatedLicense.clientName,
        siteUrl: updatedLicense.siteUrl,
        isAssociated: updatedLicense.isAssociated,
      },
            duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Licence désassociée avec succès',
    });
  } catch (error) {
    console.error('Erreur désassociation licence :', error);

    // LOG : Erreur lors de la désassociation
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'DISASSOCIATE_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/disassociate',
      status: 'ERROR',
      label: 'LICENCE',
      message: 'Erreur lors de la désassociation de la licence',
      errorDetails: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
