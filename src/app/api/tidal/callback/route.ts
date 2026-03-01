import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, encryptToken } from '@/lib/tidal';

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
      state: state ? state.substring(0, 10) + '...' : null,
      error,
      origin: req.headers.get('origin'),
      url: req.nextUrl.toString(),
    });

    // Gestione errore OAuth
    if (error) {
      console.error('Tidal OAuth error:', error);
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=' + encodeURIComponent(error), req.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=invalid_callback', req.url)
      );
    }

    // Valida lo state contro il cookie
    const storedState = req.cookies.get('tidal_oauth_state')?.value;
    if (!storedState || !state) {
      console.error('Missing state or stored state');
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=missing_state', req.url)
      );
    }
    
    // Decodifica origin e random state da state (base64)
    let stateData: { random: string; origin: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('Invalid state format');
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=invalid_state_format', req.url)
      );
    }
    
    // Valida il random state
    if (stateData.random !== storedState) {
      console.error('State mismatch:', { stored: storedState, received: stateData.random });
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=state_mismatch', req.url)
      );
    }

    console.log('Exchanging code for token');

    // Scambia code per token
    const tokenData = await exchangeCodeForToken(code);
    
    console.log('Token exchange successful, got user_id:', tokenData.user_id);

    // Cripta i token per sicurezza
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

    // Calcola scadenza
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Salva in sessione temporanea (da associare poi alla sessione attiva)
    // Per ora salviamo in query params (in produzione usare session storage sicuro)
    
    // Usa l'origin decodificato dallo state
    const origin = stateData.origin;
    
    console.log('Building redirect URL:', { origin });
    
    const callbackUrl = new URL(`${origin}/richiedi/dj/libere`);
    callbackUrl.searchParams.set('tidal_success', 'true');
    callbackUrl.searchParams.set('tidal_access_token', encryptedAccessToken);
    callbackUrl.searchParams.set('tidal_refresh_token', encryptedRefreshToken);
    callbackUrl.searchParams.set('tidal_user_id', tokenData.user_id || '');
    callbackUrl.searchParams.set('tidal_expires_at', expiresAt.toISOString());

    console.log('Redirecting to:', callbackUrl.toString().substring(0, 100) + '...');

    const response = NextResponse.redirect(callbackUrl);
    
    // Cancella il cookie di stato dopo validazione riuscita
    response.cookies.delete('tidal_oauth_state');
    
    console.log('OAuth callback completed successfully');
    
    return response;

  } catch (error) {
    console.error('Tidal callback error:', error);
    return NextResponse.redirect(
      new URL('/dj/libere?tidal_error=' + encodeURIComponent(
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
