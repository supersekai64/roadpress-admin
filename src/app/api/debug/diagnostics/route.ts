import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';

/**
 * Route de diagnostic pour vérifier l'état de l'authentification
 * Accessible uniquement en développement ou pour les utilisateurs connectés
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      auth: {
        isAuthenticated: !!session,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userRole: session?.user?.role || null,
      },
      config: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
      },
      headers: {
        userAgent: request.headers.get('user-agent') || 'unknown',
        host: request.headers.get('host') || 'unknown',
        referer: request.headers.get('referer') || 'none',
      },
    };

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
