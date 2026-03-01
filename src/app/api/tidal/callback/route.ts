import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, encryptToken } from '@/lib/tidal';

/**
 * GET /api/tidal/callback
 * Riceve code OAuth e completa autenticazione
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Gestione errore OAuth
    if (error) {
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=' + encodeURIComponent(error), req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dj/libere?tidal_error=invalid_callback', req.url)
      );
    }

    // Scambia code per token
    const tokenData = await exchangeCodeForToken(code);

    // Cripta i token per sicurezza
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

    // Calcola scadenza
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Salva in sessione temporanea (da associare poi alla sessione attiva)
    // Per ora salviamo in query params (in produzione usare session storage sicuro)
    const callbackUrl = new URL('/dj/libere', req.url);
    callbackUrl.searchParams.set('tidal_success', 'true');
    callbackUrl.searchParams.set('tidal_access_token', encryptedAccessToken);
    callbackUrl.searchParams.set('tidal_refresh_token', encryptedRefreshToken);
    callbackUrl.searchParams.set('tidal_user_id', tokenData.user_id || '');
    callbackUrl.searchParams.set('tidal_expires_at', expiresAt.toISOString());

    return NextResponse.redirect(callbackUrl);

  } catch (error) {
    console.error('Tidal callback error:', error);
    return NextResponse.redirect(
      new URL('/dj/libere?tidal_error=' + encodeURIComponent(
        error instanceof Error ? error.message : 'callback_failed'
      ), req.url)
    );
  }
}
