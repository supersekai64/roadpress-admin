import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * MIDDLEWARE SIMPLIFIÉ POUR DEBUG
 * Authentification uniquement, pas de blocage de bots
 */
export default async function middleware(request: NextRequest) {
  // 1. Autoriser robots.txt, sitemap.xml, ai.txt
  const isPublicFile = request.nextUrl.pathname.match(
    /^\/(robots\.txt|sitemap\.xml|ai\.txt)$/
  );
  
  if (isPublicFile) {
    return NextResponse.next();
  }
  
  // 2. Autoriser les API publiques (pas d'auth)
  const isPublicApi = request.nextUrl.pathname.match(
    /^\/api\/(auth|debug|licenses\/(verify|update|disassociate)|statistics|api-keys|poi\/sync)/
  );
  
  if (isPublicApi) {
    return NextResponse.next();
  }
  
  // 3. Auth pour le reste
  return auth(request as any) as any;
}

export const config = {
  matcher: [
    // Protéger toutes les routes SAUF :
    // - /api/auth (NextAuth)
    // - /api/debug/* (routes de debug avec auth interne)
    // - /api/licenses/verify (endpoint public pour plugins WordPress)
    // - /api/licenses/update (endpoint public pour plugins WordPress)
    // - /api/licenses/disassociate (endpoint public pour plugins WordPress)
    // - /api/statistics/* (endpoints publics pour plugins WordPress)
    // - /api/api-keys/* (endpoints publics pour plugins WordPress)
    // - /api/poi/sync (endpoint public pour plugins WordPress)
    // - robots.txt, sitemap.xml, ai.txt (fichiers SEO)
    // - fichiers statiques
    '/((?!api/auth|api/debug|api/licenses/verify|api/licenses/update|api/licenses/disassociate|api/statistics|api/api-keys|api/poi/sync|robots.txt|sitemap.xml|ai.txt|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
