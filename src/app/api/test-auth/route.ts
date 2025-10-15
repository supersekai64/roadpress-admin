import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';

/**
 * Route de test pour vérifier l'authentification
 * À supprimer après debug
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      sessionData: session ? {
        userId: session.user?.id,
        userEmail: session.user?.email,
        userRole: session.user?.role,
      } : null,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
