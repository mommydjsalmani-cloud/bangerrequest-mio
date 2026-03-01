import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, encryptToken, decryptToken } from '@/lib/tidal';

/**
 * Gestisce il callback OAuth di Tidal (GET e POST)
 */
async function handleCallback(searchParams: URLSearchParams, req: NextRequest) {
  try {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('Tidal callback received:', {
      code: code ? code.substring(0, 10) + '...' : null,
      state: state ? state.substring(0, 30) + '...' : null,
      error,
      errorDescription: searchParams.get('error_description'),
    });

    // Gestione errore OAuth
    if (error) {
      console.error('Tidal OAuth error:', error, searchParams.get('error_description'));
      return NextResponse.redirect(
        new URL('/richiedi/dj/libere?tidal_error=' + encodeURIComponent(error), req.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect(
        new URL('/richiedi/dj/libere?tidal_error=invalid_callback', req.url)
      );
    }

    // Decodifica state (base64url) che contiene: random, origin, cv (codeVerifier cifrato)
    // Non usiamo cookie perché il callback può arrivare su dominio diverso da quello di auth
    let stateData: { random: string; origin: string; cv: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      console.error('Invalid state format');
      return NextResponse.redirect(
        new URL('/richiedi/dj/libere?tidal_error=invalid_state_format', req.url)
      );
    }

    if (!stateData.random || !stateData.origin || !stateData.cv) {
      console.error('Incomplete state payload:', Object.keys(stateData));
      return NextResponse.redirect(
        new URL('/richiedi/dj/libere?tidal_error=incomplete_state', req.url)
      );
    }

    // Decripta il codeVerifier dallo state
    let codeVerifier: string;
    try {
      codeVerifier = decryptToken(stateData.cv);
    } catch {
      console.error('Failed to decrypt codeVerifier from state');
      return NextResponse.redirect(
        new URL('/richiedi/dj/libere?tidal_error=invalid_code_verifier', req.url)
      );
    }

    // Scambia code per token con PKCE
    console.log('Exchanging code for token...');
    const tokenData = await exchangeCodeForToken(code, codeVerifier);
    
    console.log('Token exchange successful:', {
      user_id: tokenData.user_id,
      expires_in: tokenData.expires_in,
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      access_token_length: tokenData.access_token?.length
    });

    // Cripta i token per sicurezza prima di passarli nell'URL
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);
    
    console.log('Tokens encrypted:', {
      encrypted_access_length: encryptedAccessToken.length,
      encrypted_refresh_length: encryptedRefreshToken.length
    });

    // Calcola scadenza
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Reindirizza all'origin originale con i token
    const origin = stateData.origin;
    console.log('Building redirect URL:', { origin });
    
    const callbackUrl = new URL(`${origin}/richiedi/dj/libere`);
    callbackUrl.searchParams.set('tidal_success', 'true');
    callbackUrl.searchParams.set('tidal_access_token', encryptedAccessToken);
    callbackUrl.searchParams.set('tidal_refresh_token', encryptedRefreshToken);
    callbackUrl.searchParams.set('tidal_user_id', tokenData.user_id || '');
    callbackUrl.searchParams.set('tidal_expires_at', expiresAt.toISOString());

    console.log('Full redirect URL params:', {
      tidal_success: 'true',
      user_id: tokenData.user_id,
      expires_at: expiresAt.toISOString(),
      access_token_preview: encryptedAccessToken.substring(0, 30) + '...',
      full_url_length: callbackUrl.toString().length
    });
    
    console.log('OAuth callback completed successfully - redirecting');
    
    return NextResponse.redirect(callbackUrl);

  } catch (error) {
    console.error('Tidal callback error:', error);
    return NextResponse.redirect(
      new URL('/richiedi/dj/libere?tidal_error=' + encodeURIComponent(
        error instanceof Error ? error.message : 'callback_failed'
      ), req.url)
    );
  }
}

/**
 * GET /api/tidal/callback
 * Riceve code OAuth e completa autenticazione
 */
export async function GET(req: NextRequest) {
  return handleCallback(req.nextUrl.searchParams, req);
}

/**
 * POST /api/tidal/callback
 * Supporto POST per OAuth provider che lo richiedono
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const searchParams = new URLSearchParams({
      code: body.code || '',
      state: body.state || '',
      error: body.error || '',
    });
    return handleCallback(searchParams, req);
  } catch (error) {
    // Fallback per POST con form-data
    const formData = await req.formData();
    const searchParams = new URLSearchParams({
      code: formData.get('code')?.toString() || '',
      state: formData.get('state')?.toString() || '',
      error: formData.get('error')?.toString() || '',
    });
    return handleCallback(searchParams, req);
  }
}
