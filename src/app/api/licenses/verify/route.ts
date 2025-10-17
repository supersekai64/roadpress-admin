import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint appelé par le plugin client pour vérifier ET activer une licence
 * POST /api/licenses/verify
 * Body: { license_key, site_url }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, site_url } = body;

    if (!license_key) {
      return NextResponse.json(
        { valid: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    if (!site_url) {
      return NextResponse.json(
        { valid: false, message: 'URL du site manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license) {
      // LOG : Tentative avec clé invalide
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'VERIFY_LICENSE',
        method: 'POST',
        endpoint: '/api/licenses/verify',
        status: 'ERROR',
        message: `Tentative d'activation avec clé invalide`,
        requestData: { license_key, site_url },
        errorDetails: 'Licence introuvable',
      });

      return NextResponse.json(
        { valid: false, message: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Vérifier les dates de validité
    const now = new Date();
    const startDate = new Date(license.startDate);
    const endDate = new Date(license.endDate);

    // Vérifier si la licence est expirée
    if (endDate < now) {
      if (license.status !== 'EXPIRED') {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: 'EXPIRED' },
        });
      }

      // LOG : Tentative avec licence expirée
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'VERIFY_LICENSE',
        method: 'POST',
        endpoint: '/api/licenses/verify',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'WARNING',
        message: `Tentative d'activation avec licence expirée`,
        requestData: {
          license_key,
          site_url,
          endDate: license.endDate,
        },
      });

      return NextResponse.json(
        {
          valid: false,
          message: 'Licence expirée',
          endDate: license.endDate,
        },
        { status: 403 }
      );
    }

    // Vérifier si déjà associée à un autre domaine
    if (license.isAssociated && license.siteUrl !== site_url) {
      // LOG : Tentative d'utilisation sur un domaine différent
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'VERIFY_LICENSE',
        method: 'POST',
        endpoint: '/api/licenses/verify',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'ERROR',
        message: `Tentative d'utilisation sur un domaine non autorisé`,
        requestData: {
          license_key,
          attemptedUrl: site_url,
          authorizedUrl: license.siteUrl,
        },
        errorDetails: 'Licence déjà associée à un autre domaine',
      });

      return NextResponse.json(
        {
          valid: false,
          message: `Cette licence est déjà activée sur ${license.siteUrl}. Contactez l'administrateur pour réassocier la licence.`,
          authorizedDomain: license.siteUrl,
        },
        { status: 403 }
      );
    }

    // Première activation ou réactivation sur le même domaine
    if (!license.isAssociated) {
      const updatedLicense = await prisma.license.update({
        where: { id: license.id },
        data: {
          siteUrl: site_url,
          isAssociated: true,
          status: 'ACTIVE',
          lastUpdate: new Date(),
        },
      });

      // LOG : Activation réussie avec auto-association
      await DebugLogger.log({
        category: 'LICENSE',
        action: 'ASSOCIATE_LICENSE',
        method: 'POST',
        endpoint: '/api/licenses/verify',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'SUCCESS',
        message: `Licence activée et associée automatiquement à ${site_url}`,
        requestData: {
          license_key,
          site_url,
          previousStatus: license.status,
        },
        responseData: {
          licenseId: updatedLicense.id,
          clientName: updatedLicense.clientName,
          siteUrl: updatedLicense.siteUrl,
          status: updatedLicense.status,
          isAssociated: updatedLicense.isAssociated,
        },
      });

      return NextResponse.json({
        valid: true,
        message: 'Licence activée avec succès !',
        license: {
          key: updatedLicense.licenseKey,
          clientName: updatedLicense.clientName,
          status: updatedLicense.status,
          siteUrl: updatedLicense.siteUrl,
          startDate: updatedLicense.startDate,
          endDate: updatedLicense.endDate,
          isAssociated: updatedLicense.isAssociated,
        },
      });
    }

    // Licence déjà activée sur ce domaine - vérification standard
    // LOG : Vérification réussie (licence déjà active)
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'VERIFY_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/verify',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Vérification réussie pour ${site_url}`,
      requestData: {
        license_key,
        site_url,
      },
    });

    return NextResponse.json({
      valid: true,
      message: 'Licence valide',
      license: {
        key: license.licenseKey,
        clientName: license.clientName,
        status: license.status,
        siteUrl: license.siteUrl,
        startDate: license.startDate,
        endDate: license.endDate,
        isAssociated: license.isAssociated,
      },
    });
  } catch (error) {
    console.error('Erreur vérification licence:', error);

    // LOG : Erreur serveur
    await DebugLogger.log({
      category: 'LICENSE',
      action: 'VERIFY_LICENSE',
      method: 'POST',
      endpoint: '/api/licenses/verify',
      status: 'ERROR',
      message: 'Erreur serveur lors de la vérification',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { valid: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
