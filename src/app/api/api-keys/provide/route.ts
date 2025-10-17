import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';

/**
 * Endpoint SÉCURISÉ pour fournir les clés API au plugin client
 * GET /api/api-keys/provide?license_key=XXXX&site_url=https://example.com
 * 
 * SÉCURITÉ :
 * - Vérifie que la licence est ACTIVE
 * - Vérifie que la licence EST ASSOCIÉE à un domaine
 * - Vérifie que le site_url correspond EXACTEMENT au domaine autorisé
 * - Log chaque tentative d'accès
 * - Refuse les licences expirées
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license_key');
    const siteUrl = searchParams.get('site_url');

    // VALIDATION : Clé de licence obligatoire
    if (!licenseKey) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'ERROR',
        message: 'Tentative d\'accès sans clé de licence',
        requestData: { siteUrl },
        errorDetails: 'license_key manquant',
      });

      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    // VALIDATION : URL du site obligatoire
    if (!siteUrl) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'ERROR',
        message: 'Tentative d\'accès sans site_url',
        requestData: { licenseKey },
        errorDetails: 'site_url manquant',
      });

      return NextResponse.json(
        { success: false, message: 'URL du site manquante (site_url requis)' },
        { status: 400 }
      );
    }

    // RÉCUPÉRATION : Trouver la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'ERROR',
        message: 'Tentative d\'accès avec clé invalide',
        requestData: { licenseKey, siteUrl },
        errorDetails: 'Licence introuvable',
      });

      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // SÉCURITÉ : Vérifier que la licence est ACTIVE
    if (license.status !== 'ACTIVE') {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'ERROR',
        message: `Tentative d'accès avec licence ${license.status}`,
        requestData: { licenseKey, siteUrl, licenseStatus: license.status },
        errorDetails: `Statut de licence non autorisé: ${license.status}`,
      });

      return NextResponse.json(
        { success: false, message: 'Licence non active' },
        { status: 403 }
      );
    }

    // SÉCURITÉ : Vérifier que la licence EST ASSOCIÉE
    if (!license.isAssociated || !license.siteUrl) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'ERROR',
        message: 'Tentative d\'accès avec licence non associée',
        requestData: { licenseKey, siteUrl, isAssociated: license.isAssociated },
        errorDetails: 'Licence non associée à un domaine',
      });

      return NextResponse.json(
        { success: false, message: 'Licence non associée à un domaine' },
        { status: 403 }
      );
    }

    // SÉCURITÉ CRITIQUE : Vérifier que le domaine correspond EXACTEMENT
    if (license.siteUrl !== siteUrl) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'ERROR',
        message: 'TENTATIVE D\'ACCÈS NON AUTORISÉ - Domaine non correspondant',
        requestData: {
          licenseKey,
          requestedUrl: siteUrl,
          authorizedUrl: license.siteUrl,
        },
        errorDetails: 'URL demandée ne correspond pas à l\'URL autorisée',
      });

      return NextResponse.json(
        {
          success: false,
          message: `Cette licence est autorisée uniquement pour ${license.siteUrl}`,
        },
        { status: 403 }
      );
    }

    // SÉCURITÉ : Vérifier que la licence n'est pas expirée
    const now = new Date();
    const endDate = new Date(license.endDate);

    if (endDate < now) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'ERROR',
        message: 'Tentative d\'accès avec licence expirée',
        requestData: {
          licenseKey,
          siteUrl,
          endDate: license.endDate,
        },
        errorDetails: `Licence expirée le ${license.endDate}`,
      });

      return NextResponse.json(
        { success: false, message: 'Licence expirée' },
        { status: 403 }
      );
    }

    // AUTORISATION ACCORDÉE : Récupérer les clés API actives
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
      },
    });

    const keys: Record<string, string> = {};
    apiKeys.forEach((key) => {
      keys[key.service] = key.key;
    });

    const responseTime = Date.now() - startTime;

    // LOG : Accès autorisé
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'PROVIDE_KEYS',
      method: 'GET',
      endpoint: '/api/api-keys/provide',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      message: `Clés API fournies avec succès pour ${siteUrl}`,
      requestData: {
        licenseKey,
        siteUrl,
        responseTime: `${responseTime}ms`,
      },
      responseData: {
        keysProvided: Object.keys(keys),
        licenseExpires: license.endDate,
      },
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

    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'PROVIDE_KEYS',
      method: 'GET',
      endpoint: '/api/api-keys/provide',
      status: 'ERROR',
      message: 'Erreur serveur lors de la fourniture des clés API',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
