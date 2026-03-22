import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTidalAuthUrl, generatePKCE, encryptToken } from '@/lib/tidal';

/**
 * ⚠️ CRITICAL FIX #1: OAuth Domain Redirect
 * 
 * Questa funzione garantisce che in produzione venga SEMPRE usato il dominio canonico
 * (mommydj.com) invece del dominio Vercel, evitando perdita di stato sessione.
 * 
 * NON MODIFICARE senza consultare FIXES_REGISTRY.md
 * Test: tests/critical-fixes.regression.test.ts
 */
function getCanonicalOrigin(req: NextRequest): string {
  if (process.env.NODE_ENV !== 'production') {
    return req.nextUrl.origin;
  }

  const configured =
    process.env.PUBLIC_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    'https://mommydj.com';

  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';

  if (forwardedHost === 'mommydj.com' || forwardedHost === 'www.mommydj.com') {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return configured;
}

/**
 * GET /api/tidal/auth
 * Genera URL OAuth Tidal e reindirizza
 */
export async function GET(req: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djUser = req.headers.get('x-dj-user');
    const djSecret = req.headers.get('x-dj-secret');
    
    const expectedUser = process.env.DJ_PANEL_USER;
    const expectedSecret = process.env.DJ_PANEL_SECRET;
    
    if (!djUser || !djSecret || djUser !== expectedUser || djSecret !== expectedSecret) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sessione corrente (opzionale ma raccomandata) per evitare dipendenza da sessionStorage cross-domain
    const sessionId = req.nextUrl.searchParams.get('session_id') || '';

    // Genera state per CSRF protection
    const randomState = randomBytes(32).toString('hex');
    
    // ⚠️ CRITICAL: Usa canonical domain (mommydj.com) - NON modificare
    // Fix: OAuth Domain Redirect (commit 86a5028)
    const origin = getCanonicalOrigin(req);

    // Calcola redirect URI dinamicamente, ma in produzione forza mommydj.com per compatibilità OAuth
    let dynamicRedirectUri: string;
    if (process.env.NODE_ENV === 'production') {
      dynamicRedirectUri = 'https://mommydj.com/richiedi/api/tidal/callback';
    } else {
      const basePath = '';
      dynamicRedirectUri = `${origin}${basePath}/api/tidal/callback`;
    }
    
    // Genera PKCE per OAuth di Tidal
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Codifica tutto nello state: random (CSRF), origin (redirect), codeVerifier (PKCE), session_id, redirectUri
    // Questo evita cookie cross-domain: il callback decodifica tutto dallo state
    const statePayload = JSON.stringify({
      random: randomState,
      origin,
      cv: encryptToken(codeVerifier),
      sid: sessionId,
      ru: dynamicRedirectUri, // redirect_uri usato nell'auth, da riusare IDENTICO nel token exchange
    });
    const state = Buffer.from(statePayload).toString('base64url');

    // Genera authUrl con state + code_challenge + redirect URI dinamico
    const authUrl = getTidalAuthUrl(state, codeChallenge, dynamicRedirectUri);
    
    console.log('Generated Tidal auth URL:', {
      clientId: process.env.TIDAL_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: dynamicRedirectUri,
      origin,
      sessionId: sessionId || 'N/A',
      state: state.substring(0, 30) + '...',
      authUrl: authUrl.substring(0, 150) + '...',
    });
    
    // Niente cookie: tutto è nello state (codeVerifier cifrato)
    return NextResponse.json({
      ok: true,
      authUrl,
    });

  } catch (error) {
    console.error('Tidal auth error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Auth failed' },
      { status: 500 }
    );
  }
}
