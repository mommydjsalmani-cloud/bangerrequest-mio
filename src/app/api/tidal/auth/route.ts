import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTidalAuthUrl, generatePKCE, encryptToken } from '@/lib/tidal';

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
    
    // Origin affidabile della richiesta corrente (funziona con dominio custom e vercel.app)
    const origin = req.nextUrl.origin;
    
    // Genera PKCE per OAuth di Tidal
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Codifica tutto nello state: random (CSRF), origin (redirect), codeVerifier (PKCE), session_id
    // Questo evita cookie cross-domain: il callback decodifica tutto dallo state
    const statePayload = JSON.stringify({
      random: randomState,
      origin,
      cv: encryptToken(codeVerifier),
      sid: sessionId,
    });
    const state = Buffer.from(statePayload).toString('base64url');

    // Genera authUrl con state + code_challenge
    const authUrl = getTidalAuthUrl(state, codeChallenge);
    
    console.log('Generated Tidal auth URL:', {
      clientId: process.env.TIDAL_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: process.env.TIDAL_REDIRECT_URI,
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
