export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    // Protéger toutes les routes SAUF :
    // - /api/auth (NextAuth)
    // - /api/licenses/verify (endpoint public pour plugins WordPress)
    // - /api/licenses/update (endpoint public pour plugins WordPress)
    // - /api/licenses/disassociate (endpoint public pour plugins WordPress)
    // - /api/statistics/* (endpoints publics pour plugins WordPress)
    // - /api/api-keys/* (endpoints publics pour plugins WordPress)
    // - /api/poi/sync (endpoint public pour plugins WordPress)
    // - fichiers statiques
    '/((?!api/auth|api/licenses/verify|api/licenses/update|api/licenses/disassociate|api/statistics|api/api-keys|api/poi/sync|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
};
