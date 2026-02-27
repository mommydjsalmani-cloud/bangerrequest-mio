// Middleware per aggiungere resilienza alle API routes
import { NextResponse } from 'next/server';
import { logger } from './errorHandler';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Numero di fallimenti prima di aprire il circuito
  resetTimeout: number; // Tempo in ms prima di provare a chiudere il circuito
  successThreshold: number; // Successi consecutivi necessari per chiudere il circuito
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
}

// Circuit breakers per servizi esterni
export const circuitBreakers = {
  deezer: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minuto
    successThreshold: 3
  }),
  database: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000, // 30 secondi
    successThreshold: 2
  })
};

// Rate limiter in-memory semplice
export class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  isAllowed(key: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true };
    }

    if (record.count >= this.maxRequests) {
      return { 
        allowed: false, 
        resetTime: record.resetTime 
      };
    }

    record.count++;
    return { allowed: true };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Rate limiter globale per API
export const globalRateLimiter = new InMemoryRateLimiter(
  60000, // 1 minuto
  100 // max 100 richieste per minuto per IP
);

// Cleanup periodico del rate limiter
setInterval(() => {
  globalRateLimiter.cleanup();
}, 60000); // ogni minuto

// Helper per cache semplice
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  get(key: string): T | null {
    const record = this.cache.get(key);
    if (!record) return null;

    if (Date.now() > record.expiry) {
      this.cache.delete(key);
      return null;
    }

    return record.value;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (now > record.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache globale
export const globalCache = new SimpleCache();

// Cleanup periodico della cache
setInterval(() => {
  globalCache.cleanup();
}, 300000); // ogni 5 minuti

// Wrapper per operazioni con cache automatica
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMs: number = 300000 // 5 minuti default
): Promise<T> {
  // Prova prima dalla cache
  const cached = globalCache.get(key);
  if (cached !== null) {
    return cached as T;
  }

  // Esegui operazione e metti in cache
  const result = await operation();
  globalCache.set(key, result, ttlMs);
  return result;
}

// Helper per creare chiavi cache sicure
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.map(p => String(p)).join(':')}`;
}

// Middleware per request/response logging
export function withRequestLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
  operationName: string
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as Request;
    const method = request.method;
    const url = new URL(request.url);
    
    logger.info(`API Request: ${method} ${url.pathname}`, {
      operation: operationName,
      endpoint: `${method} ${url.pathname}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    try {
      const response = await handler(...args);
      
      logger.info(`API Response: ${method} ${url.pathname} - ${response.status}`, {
        operation: operationName,
        endpoint: `${method} ${url.pathname}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return response;
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), {
        operation: operationName,
        endpoint: `${method} ${url.pathname}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      throw error;
    }
  };
}

// Helper per validazione dimensione request
export function withRequestSizeLimit(maxBytes: number) {
  return function <T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const request = args[0] as Request;
      
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxBytes) {
        return NextResponse.json(
          { 
            ok: false, 
            error: 'Request too large',
            maxSize: maxBytes 
          },
          { status: 413 }
        );
      }

      return handler(...args);
    };
  };
}

// Helper per CORS automatico
export function withCORS(origins: string[] = ['*']) {
  return function <T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const request = args[0] as Request;
      const origin = request.headers.get('origin');
      
      // Handle preflight
      if (request.method === 'OPTIONS') {
        const headers = new Headers();
        
        if (origins.includes('*') || (origin && origins.includes(origin))) {
          headers.set('Access-Control-Allow-Origin', origin || '*');
        }
        
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dj-user, x-dj-secret');
        headers.set('Access-Control-Max-Age', '86400');
        
        return new NextResponse(null, { status: 200, headers });
      }

      const response = await handler(...args);
      
      // Add CORS headers to response
      if (origins.includes('*') || (origin && origins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
      }
      
      return response;
    };
  };
}