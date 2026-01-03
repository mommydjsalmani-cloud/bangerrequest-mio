/**
 * Utility per gestione autenticazione JWT e session
 */
import { randomBytes, createHmac } from 'crypto';

const JWT_SECRET = process.env.DJ_JWT_SECRET || 'default-dev-secret-change-in-production';
const JWT_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore

// Simple JWT implementation (non usare in production mission-critical, usare 'jsonwebtoken' per enterprise)
export function createDJToken(username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000 + JWT_EXPIRY / 1000),
      type: 'dj_panel',
    })
  ).toString('base64url');

  const message = `${header}.${payload}`;
  const signature = createHmac('sha256', JWT_SECRET).update(message).digest('base64url');

  return `${message}.${signature}`;
}

export function verifyDJToken(token: string): { valid: boolean; username?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const [header, payload, signature] = parts;
    const message = `${header}.${payload}`;

    const expectedSig = createHmac('sha256', JWT_SECRET).update(message).digest('base64url');

    if (signature !== expectedSig) return { valid: false };

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Verifica scadenza
    if (decoded.exp * 1000 < Date.now()) return { valid: false };

    return { valid: true, username: decoded.sub };
  } catch {
    return { valid: false };
  }
}

// Rate limiting per autenticazione (key: IP/endpoint)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minuti

export function checkLoginRateLimit(identifier: string): { allowed: boolean; attemptsLeft: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, { count: 0, resetTime: now + LOCKOUT_DURATION });
    return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS };
  }

  record.count++;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, attemptsLeft: 0 };
  }

  return { allowed: true, attemptsLeft: MAX_LOGIN_ATTEMPTS - record.count };
}

export function resetLoginRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

// CSRF token generation
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token: string, stored: string): boolean {
  if (!token || !stored) return false;
  return token === stored;
}

// Genera secret sicuro per webhook
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}
