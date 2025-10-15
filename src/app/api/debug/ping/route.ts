import { NextResponse } from 'next/server';

/**
 * Route de test minimaliste - Sans auth, sans Prisma
 * Si celle-ci ne fonctionne pas, le problème est Vercel
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Route /api/debug/ping fonctionne',
    timestamp: new Date().toISOString(),
  });
}
