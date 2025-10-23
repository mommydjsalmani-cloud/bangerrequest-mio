// Sistema centralizzato di gestione errori per l'app
import { NextResponse } from 'next/server';

export type ErrorContext = {
  operation: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
};

export type APIError = {
  code: string;
  message: string;
  statusCode: number;
  context?: Record<string, unknown>;
  timestamp: string;
  retryAfter?: number;
};

// Classi di errore tipizzate
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly retryAfter?: number;

  constructor(
    code: string, 
    message: string, 
    statusCode: number = 500,
    context?: Record<string, unknown>,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, 400, { field });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, operation?: string) {
    super('DATABASE_ERROR', message, 500, { operation });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, retryAfter?: number) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 503, { service }, retryAfter);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', `Too many requests. Try again in ${retryAfter} seconds.`, 429, {}, retryAfter);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super('AUTHORIZATION_ERROR', message, 403);
  }
}

// Logger centralizzato
class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  error(error: Error | AppError, context?: ErrorContext) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      context,
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        appContext: error.context
      })
    };

    if (this.isDev) {
      console.error('🚨 Error:', logData);
    } else {
      // In production, invierebbe a servizio di logging (Sentry, LogRocket, etc.)
      console.error(JSON.stringify(logData));
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context
    };

    if (this.isDev) {
      console.warn('⚠️ Warning:', logData);
    } else {
      console.warn(JSON.stringify(logData));
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context
    };

    if (this.isDev) {
      console.info('ℹ️ Info:', logData);
    } else {
      console.info(JSON.stringify(logData));
    }
  }
}

export const logger = new Logger();

// Helper per creare risposte API standardizzate
export function createErrorResponse(error: Error | AppError, context?: ErrorContext): NextResponse {
  // Log dell'errore
  logger.error(error, context);

  if (error instanceof AppError) {
    const apiError: APIError = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      timestamp: new Date().toISOString(),
      retryAfter: error.retryAfter
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString();
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: apiError.message,
        code: apiError.code,
        timestamp: apiError.timestamp,
        ...(apiError.context && { context: apiError.context }),
        ...(apiError.retryAfter && { retryAfter: apiError.retryAfter })
      },
      { 
        status: error.statusCode,
        headers
      }
    );
  }

  // Errore generico non gestito
  const apiError: APIError = {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    statusCode: 500,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(
    { 
      ok: false, 
      error: apiError.message,
      code: apiError.code,
      timestamp: apiError.timestamp
    },
    { status: 500 }
  );
}

// Wrapper per API routes con error handling automatico
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };
}

// Helper per validazione input
export function validateRequired<T>(value: T, fieldName: string): NonNullable<T> {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value as NonNullable<T>;
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
  return email;
}

export function validateLength(value: string, min: number, max: number, fieldName: string): string {
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
  }
  return value;
}

// Helper per operazioni con timeout
export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operation: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError('TIMEOUT_ERROR', `Operation '${operation}' timed out after ${timeoutMs}ms`, 408));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Helper per retry automatico
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // lastError è garantito essere definito qui perché il loop esegue almeno una volta
  throw new AppError(
    'RETRY_EXHAUSTED', 
    `Operation failed after ${maxRetries + 1} attempts: ${lastError!.message}`,
    500,
    { maxRetries, lastError: lastError!.message }
  );
}

// Helper per estrazione sicura degli IP
export function extractClientIP(request: Request): string {
  const headers = [
    'cf-connecting-ip',
    'x-forwarded-for', 
    'x-real-ip',
    'x-remote-addr',
    'x-client-ip'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Prendi il primo IP se è una lista separata da virgole
      const ip = value.split(',')[0].trim();
      // Normalizza IPv6 rimuovendo zone identifier
      return ip.replace(/%[\w]+$/, '');
    }
  }

  return 'unknown';
}