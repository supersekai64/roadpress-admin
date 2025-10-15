import { NextRequest, NextResponse } from 'next/server';

/**
 * Route de diagnostic pour vérifier la configuration de l'environnement
 * NE PAS UTILISER EN PRODUCTION - DÉSACTIVER APRÈS DEBUG
 */
export async function GET(request: NextRequest) {
  const env = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPrismaDatabaseUrl: !!process.env.PRISMA_DATABASE_URL,
    hasDirectDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
  };

  return NextResponse.json({
    success: true,
    environment: env,
    message: '⚠️ DÉSACTIVEZ CETTE ROUTE EN PRODUCTION APRÈS DEBUG',
  });
}
