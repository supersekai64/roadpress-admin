/**
 * Rate Limiter en mémoire pour Next.js
 * Protège les endpoints contre les abus et force brute
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en mémoire (production: utiliser Redis/Upstash)
const store = new Map<string, RateLimitEntry>();

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  readonly maxRequests: number; // Nombre max de requêtes
  readonly windowMs: number; // Fenêtre de temps en ms
  readonly keyPrefix: string; // Préfixe pour différencier les limiters
}

export interface RateLimitResult {
  readonly success: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number; // Timestamp de reset
}

/**
 * Vérifie si une clé a dépassé la limite
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  
  let entry = store.get(key);
  
  // Première requête ou fenêtre expirée
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    store.set(key, entry);
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: entry.resetTime,
    };
  }
  
  // Incrémenter le compteur
  entry.count++;
  
  // Vérifier la limite
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Configurations prédéfinies par type d'endpoint
 */
export const RateLimitPresets = {
  // 🔴 Endpoints critiques (clés API)
  CRITICAL: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'critical',
  } as RateLimitConfig,
  
  // 🟠 Endpoints élevés (licences)
  HIGH: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'high',
  } as RateLimitConfig,
  
  // 🟡 Endpoints moyens (lecture)
  MEDIUM: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'medium',
  } as RateLimitConfig,
  
  // 🟢 Endpoints bas (admin authentifié)
  LOW: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'low',
  } as RateLimitConfig,
} as const;

/**
 * Helper pour extraire l'IP depuis NextRequest
 */
export function getClientIdentifier(request: Request): string {
  // Essayer d'obtenir l'IP réelle (derrière proxy/CDN)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback : utiliser user-agent comme identifiant
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Réinitialiser le compteur pour une clé (utile pour tests)
 */
export function resetRateLimit(identifier: string, keyPrefix: string): void {
  const key = `${keyPrefix}:${identifier}`;
  store.delete(key);
}

/**
 * Obtenir les statistiques du rate limiter
 */
export function getRateLimitStats() {
  return {
    totalKeys: store.size,
    entries: Array.from(store.entries()).map(([key, entry]) => ({
      key,
      count: entry.count,
      resetIn: Math.max(0, entry.resetTime - Date.now()),
    })),
  };
}
