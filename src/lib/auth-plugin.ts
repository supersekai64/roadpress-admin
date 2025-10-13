import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

interface AuthResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly status?: number;
  readonly license?: {
    readonly id: string;
    readonly licenseKey: string;
    readonly apiToken: string | null;
    readonly clientName: string;
    readonly status: string;
  };
}

/**
 * Valide l'authentification d'une requête provenant du plugin client
 * Utilise le token API dans le header Authorization ou le license_key en fallback
 */
export async function validatePluginRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // Essayer d'abord avec le token Bearer
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const license = await prisma.license.findUnique({
        where: { apiToken: token },
      });

      if (!license || license.status !== 'ACTIVE') {
        return {
          valid: false,
          error: 'Token invalide ou licence inactive',
          status: 403,
        };
      }

      return {
        valid: true,
        license: {
          id: license.id,
          licenseKey: license.licenseKey,
          apiToken: license.apiToken,
          clientName: license.clientName,
          status: license.status,
        },
      };
    }

    // Fallback : vérifier avec license_key (pour rétrocompatibilité)
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license_key');

    if (!licenseKey) {
      return {
        valid: false,
        error: 'Token ou clé de licence manquant',
        status: 401,
      };
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license || license.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Clé de licence invalide ou licence inactive',
        status: 403,
      };
    }

    return {
      valid: true,
      license: {
        id: license.id,
        licenseKey: license.licenseKey,
        apiToken: license.apiToken,
        clientName: license.clientName,
        status: license.status,
      },
    };
  } catch (error) {
    console.error('Erreur validation authentification plugin:', error);
    return {
      valid: false,
      error: 'Erreur serveur',
      status: 500,
    };
  }
}
