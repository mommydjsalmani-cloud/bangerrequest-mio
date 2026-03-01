import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTidalAuthUrl, generatePKCE } from '@/lib/tidal';

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

    // Genera state per CSRF protection
    const randomState = randomBytes(32).toString('hex');
    
    // Estrai l'origin della richiesta per reindirizzare correttamente nel callback
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://bangerrequest-mio.vercel.app';
    
    // Codifica origin nel state per recuperarlo nel callback (niente cookie cross-domain)
    const stateWithOrigin = JSON.stringify({ random: randomState, origin });
    const state = Buffer.from(stateWithOrigin).toString('base64url');

    // Genera PKCE per OAuth di Tidal
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Genera authUrl con state + code_challenge
    const authUrl = getTidalAuthUrl(state, codeChallenge);
    
    console.log('Generated Tidal auth URL:', {
      clientId: process.env.TIDAL_CLIENT_ID?.substring(0, 10) + '...',
      redirectUri: process.env.TIDAL_REDIRECT_URI,
      state: state.substring(0, 30) + '...',
      authUrl: authUrl.substring(0, 150) + '...',
    });
    
    // Salva state in cookie firmato per validare nel callback
    const response = NextResponse.json({
      ok: true,
      authUrl,
    });
    
    // Salva lo state (senza origin) in cookie per validare CSRF nel callback
    response.cookies.set('tidal_oauth_state', randomState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minuti
      path: '/'
    });
    
    // Salva code_verifier per il token exchange nel callback
    response.cookies.set('tidal_oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minuti
      path: '/'
    });
    
    return response;

  } catch (error) {
    console.error('Tidal auth error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Auth failed' },
      { status: 500 }
    );
  }
}
