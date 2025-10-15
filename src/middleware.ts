import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Liste des bots à bloquer (SEO, IA, crawlers)
 */
const BLOCKED_BOTS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'ia_archiver',
  'gptbot', // OpenAI
  'chatgpt-user',
  'google-extended', // Google Bard/Gemini
  'anthropic-ai', // Claude
  'claude-web',
  'claudebot',
  'ccbot', // Common Crawl
  'bytespider', // ByteDance (TikTok)
  'diffbot',
  'perplexitybot',
  'amazonbot',
  'omgilibot',
  'applebot',
  'youbot', // You.com
  'crawler',
  'spider',
  'bot',
  'scraper',
];

/**
 * Middleware combiné : Authentification + Blocage des bots
 */
export default async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // 1. Autoriser robots.txt, sitemap.xml, ai.txt sans blocage
  const isPublicFile = request.nextUrl.pathname.match(
    /^\/(robots\.txt|sitemap\.xml|ai\.txt)$/
  );
  
  if (isPublicFile) {
    return NextResponse.next();
  }
  
  // 2. Autoriser les API publiques SANS auth middleware (gèrent leur propre auth)
  const isPublicApi = request.nextUrl.pathname.match(
    /^\/api\/(auth|debug|licenses\/(verify|update|disassociate)|statistics|api-keys|poi\/sync)/
  );
  
  if (isPublicApi) {
    // API publiques : passer sans auth middleware
    return NextResponse.next();
  }
  
  // 3. Bloquer les bots SEO/IA sur les routes protégées
  const isBot = BLOCKED_BOTS.some(bot => userAgent.includes(bot));
  
  if (isBot) {
    console.log(`🚫 Bot bloqué: ${userAgent}`);
    return new NextResponse('Access Denied', { 
      status: 403,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
      },
    });
  }
  
  // 4. Authentification NextAuth pour les routes protégées
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
