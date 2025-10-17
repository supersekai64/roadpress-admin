import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DebugLogger } from '@/lib/debug-logger';
import { checkRateLimit, RateLimitPresets, getClientIdentifier } from '@/lib/rate-limit';
import { detectFailedAccess, detectRateLimitViolation, detectUnusualHourAccess } from '@/lib/security-monitor';

/**
 * Endpoint SÉCURISÉ pour fournir les clés API au plugin client
 * GET /api/api-keys/provide?license_key=XXXX&site_url=https://example.com
 * 
 * SÉCURITÉ :
 * - Rate limiting : 10 req/min par licence
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

    // RATE LIMITING : 10 req/min par licence
    if (licenseKey) {
      const rateLimitResult = checkRateLimit(licenseKey, RateLimitPresets.CRITICAL);
      
      if (!rateLimitResult.success) {
        const resetInSeconds = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
        const clientId = getClientIdentifier(request);
        
        // MONITORING : Violation rate limit
        await detectRateLimitViolation(
          clientId,
          '/api/api-keys/provide',
          `Licence: ${licenseKey}, Limite: ${rateLimitResult.limit}/min`
        );
        
        await DebugLogger.log({
          category: 'API_KEYS',
          action: 'PROVIDE_KEYS',
          method: 'GET',
          endpoint: '/api/api-keys/provide',
          status: 'WARNING',
          label: 'CLÉS API',
          message: 'Rate limit dépassé',
          requestData: {
            license_key: licenseKey,
            site_url: siteUrl,
            limit: rateLimitResult.limit,
            resetIn: `${resetInSeconds}s`,
          },
          errorDetails: `Trop de requêtes (${rateLimitResult.limit}/min)`,
        });
        
        return NextResponse.json(
          { 
            success: false, 
            message: `Trop de requêtes. Réessayez dans ${resetInSeconds} secondes.`,
            retryAfter: resetInSeconds,
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              'Retry-After': resetInSeconds.toString(),
            },
          }
        );
      }
    }

    // VALIDATION : Clé de licence obligatoire
    if (!licenseKey) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès sans clé de licence',
        requestData: { siteUrl },
        errorDetails: 'license_key manquant',
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // VALIDATION : URL du site obligatoire
    if (!siteUrl) {
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès sans domaine',
        requestData: { licenseKey },
        errorDetails: 'site_url manquant',
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // RÉCUPÉRATION : Trouver la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      const clientId = getClientIdentifier(request);
      
      // MONITORING : Tentative avec clé invalide
      await detectFailedAccess(
        clientId,
        '/api/api-keys/provide',
        `Licence invalide : ${licenseKey}`
      );
      
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès avec clé invalide',
        requestData: { licenseKey, siteUrl },
        errorDetails: 'Licence introuvable',
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // SÉCURITÉ : Vérifier que la licence est ACTIVE
    if (license.status !== 'ACTIVE') {
      const clientId = getClientIdentifier(request);
      
      // MONITORING : Tentative avec licence non-ACTIVE
      await detectFailedAccess(
        clientId,
        '/api/api-keys/provide',
        `Licence ${license.status}: ${licenseKey}`
      );
      
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès avec licence non active',
        requestData: { licenseKey, siteUrl, licenseStatus: license.status },
        errorDetails: `Statut de licence non autorisé : ${license.status}`,
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
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
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès avec licence non associée',
        requestData: { licenseKey, siteUrl, isAssociated: license.isAssociated },
        errorDetails: 'Licence non associée à un domaine',
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Vérifier que le domaine correspond EXACTEMENT
    if (license.siteUrl !== siteUrl) {
      const clientId = getClientIdentifier(request);
      
      // MONITORING : Tentative d'accès depuis mauvais domaine
      await detectFailedAccess(
        clientId,
        '/api/api-keys/provide',
        `Domaine non autorisé : ${siteUrl} (autorisé: ${license.siteUrl})`
      );
      
      await DebugLogger.log({
        category: 'API_KEYS',
        action: 'PROVIDE_KEYS',
        method: 'GET',
        endpoint: '/api/api-keys/provide',
        licenseId: license.id,
        clientName: license.clientName,
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès avec domaine non correspondant',
        requestData: {
          licenseKey,
          requestedUrl: siteUrl,
          authorizedUrl: license.siteUrl,
        },
        errorDetails: 'URL demandée ne correspond pas à l\'URL autorisée',
      });

      // Message générique
      return NextResponse.json(
        {
          success: false,
          message: 'Accès non autorisé',
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
        status: 'WARNING',
        label: 'CLÉS API',
        message: 'Tentative d\'accès avec licence expirée',
        requestData: {
          licenseKey,
          siteUrl,
          endDate: license.endDate,
        },
        errorDetails: `Licence expirée le ${license.endDate}`,
      });

      // Message générique
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
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
    const clientId = getClientIdentifier(request);

    // MONITORING : Détection accès heure inhabituelle
    await detectUnusualHourAccess(
      clientId,
      '/api/api-keys/provide',
      `Accès réussi depuis ${siteUrl} avec licence ${licenseKey}`
    );

    // LOG : Accès autorisé
    await DebugLogger.log({
      category: 'API_KEYS',
      action: 'PROVIDE_KEYS',
      method: 'GET',
      endpoint: '/api/api-keys/provide',
      licenseId: license.id,
      clientName: license.clientName,
      status: 'SUCCESS',
      label: 'CLÉS API',
      message: 'Clés API fournies avec succès',
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
      label: 'CLÉS API',
      message: 'Erreur serveur lors de la fourniture des clés API',
      errorDetails: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
