// Sistema di rate limiting per proteggere le API da abuse

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
  blockUntil?: number;
}

// In-memory store (in produzione usare Redis)
const limitStore = new Map<string, RateLimitEntry>();

// Configurazioni per diversi endpoint
export const RATE_LIMITS = {
  // Richieste musicali: 3 ogni 60 secondi
  MUSIC_REQUEST: {
    maxRequests: 3,
    windowMs: 60000,
    blockDurationMs: 300000, // 5 minuti di blocco
  },
  // API DJ: 30 ogni 60 secondi
  DJ_API: {
    maxRequests: 30,
    windowMs: 60000,
    blockDurationMs: 600000, // 10 minuti
  },
  // Webhook Telegram: 100 ogni 60 secondi (molto generoso)
  TELEGRAM_WEBHOOK: {
    maxRequests: 100,
    windowMs: 60000,
    blockDurationMs: 300000,
  },
  // Login: 5 tentativi ogni 15 minuti
  LOGIN: {
    maxRequests: 5,
    windowMs: 900000,
    blockDurationMs: 1800000, // 30 minuti
  },
} as const;

/**
 * Estrai identificatore dal request (IP o header custom)
 */
export function getIdentifier(req: Request): string {
  // Prova headers Vercel/CloudFlare
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback a user agent + accept language (meno affidabile)
  const ua = req.headers.get('user-agent') || 'unknown';
  const lang = req.headers.get('accept-language') || 'unknown';
  return `${ua.substring(0, 50)}-${lang.substring(0, 20)}`;
}

/**
 * Pulisci entries scadute (garbage collection)
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (entry.resetAt < now && (!entry.blocked || (entry.blockUntil && entry.blockUntil < now))) {
      limitStore.delete(key);
    }
  }
}

// Cleanup ogni 5 minuti
setInterval(cleanupExpired, 300000);

/**
 * Verifica rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]
): { allowed: boolean; remaining: number; resetAt: number; blocked?: boolean } {
  const now = Date.now();
  const key = identifier;
  
  let entry = limitStore.get(key);
  
  // Se non esiste o è scaduto, crea nuovo
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
      blocked: false,
    };
    limitStore.set(key, entry);
  }
  
  // Controlla se è bloccato
  if (entry.blocked && entry.blockUntil && entry.blockUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockUntil,
      blocked: true,
    };
  }
  
  // Resetta blocco se scaduto
  if (entry.blocked && entry.blockUntil && entry.blockUntil <= now) {
    entry.blocked = false;
    entry.blockUntil = undefined;
    entry.count = 0;
    entry.resetAt = now + config.windowMs;
  }
  
  // Incrementa contatore
  entry.count++;
  
  // Controlla se supera il limite
  if (entry.count > config.maxRequests) {
    entry.blocked = true;
    entry.blockUntil = now + config.blockDurationMs;
    limitStore.set(key, entry);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockUntil,
      blocked: true,
    };
  }
  
  limitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Middleware helper per Next.js
 */
export function withRateLimit(
  req: Request,
  config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]
): { allowed: true } | { allowed: false; response: Response } {
  const identifier = getIdentifier(req);
  const result = checkRateLimit(identifier, config);
  
  if (!result.allowed) {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': result.resetAt.toString(),
      'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
    });
    
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          ok: false,
          error: 'rate_limit_exceeded',
          message: result.blocked 
            ? 'Too many requests. You have been temporarily blocked.'
            : 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        { status: 429, headers }
      ),
    };
  }
  
  return { allowed: true };
}

/**
 * Blocca manualmente un identificatore (per abuse detection)
 */
export function blockIdentifier(identifier: string, durationMs: number = 3600000): void {
  const now = Date.now();
  limitStore.set(identifier, {
    count: 999,
    resetAt: now + durationMs,
    blocked: true,
    blockUntil: now + durationMs,
  });
}

/**
 * Sblocca un identificatore
 */
export function unblockIdentifier(identifier: string): void {
  limitStore.delete(identifier);
}

/**
 * Ottieni statistiche rate limiting (per admin)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedCount: number;
  activeCount: number;
} {
  cleanupExpired();
  
  let blockedCount = 0;
  let activeCount = 0;
  
  for (const entry of limitStore.values()) {
    if (entry.blocked) {
      blockedCount++;
    } else {
      activeCount++;
    }
  }
  
  return {
    totalEntries: limitStore.size,
    blockedCount,
    activeCount,
  };
}

export default {
  checkRateLimit,
  withRateLimit,
  getIdentifier,
  blockIdentifier,
  unblockIdentifier,
  getRateLimitStats,
  RATE_LIMITS,
};
