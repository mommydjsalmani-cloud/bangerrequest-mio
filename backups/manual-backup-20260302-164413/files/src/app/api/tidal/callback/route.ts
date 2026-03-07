import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, encryptToken, decryptToken } from '@/lib/tidal';
import { getSupabase } from '@/lib/supabase';

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

function buildDjRedirectUrl(req: NextRequest, query: string): URL {
  const origin = getCanonicalOrigin(req).replace(/\/$/, '');
  return new URL(`${origin}/richiedi/dj/libere${query}`);
}

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
      return NextResponse.redirect(buildDjRedirectUrl(req, `?tidal_error=${encodeURIComponent(error)}`));
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect(buildDjRedirectUrl(req, '?tidal_error=invalid_callback'));
    }

    // Decodifica state (base64url) che contiene: random, origin, cv (codeVerifier cifrato), ru (redirectUri)
    // Non usiamo cookie perché il callback può arrivare su dominio diverso da quello di auth
    let stateData: { random: string; origin: string; cv: string; sid?: string; ru?: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      console.error('Invalid state format');
      return NextResponse.redirect(buildDjRedirectUrl(req, '?tidal_error=invalid_state_format'));
    }

    if (!stateData.random || !stateData.origin || !stateData.cv) {
      console.error('Incomplete state payload:', Object.keys(stateData));
      return NextResponse.redirect(buildDjRedirectUrl(req, '?tidal_error=incomplete_state'));
    }

    // Decripta il codeVerifier dallo state
    let codeVerifier: string;
    try {
      codeVerifier = decryptToken(stateData.cv);
    } catch {
      console.error('Failed to decrypt codeVerifier from state');
      return NextResponse.redirect(buildDjRedirectUrl(req, '?tidal_error=invalid_code_verifier'));
    }

    // Scambia code per token con PKCE
    // IMPORTANTE: redirect_uri deve essere IDENTICO a quello usato nell'auth request
    // stateData.ru contiene il redirect URI dinamico basato sull'origin originale (es. mommydj.com)
    console.log('Exchanging code for token with redirectUri:', stateData.ru || process.env.TIDAL_REDIRECT_URI);
    const tokenData = await exchangeCodeForToken(code, codeVerifier, stateData.ru);
    
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

    // Se disponibile session_id nello state, salva subito nel DB lato server
    // così la ricerca utente funziona anche se la sessione DJ client non è più attiva
    if (stateData.sid) {
      const supabase = getSupabase();
      if (supabase) {
        const { error: saveError } = await supabase
          .from('sessioni_libere')
          .update({
            tidal_access_token: encryptedAccessToken,
            tidal_refresh_token: encryptedRefreshToken,
            tidal_user_id: tokenData.user_id || null,
            tidal_token_expires_at: expiresAt.toISOString(),
            catalog_type: 'tidal',
          })
          .eq('id', stateData.sid)
          .eq('archived', false);

        if (saveError) {
          console.error('Failed to persist Tidal auth from callback:', saveError);
        } else {
          console.log('Tidal auth persisted from callback for session', stateData.sid);
        }
      } else {
        console.error('Supabase not configured, cannot persist Tidal auth from callback');
      }
    }

    // Reindirizza all'origin originale con i token
    const origin = getCanonicalOrigin(req);
    console.log('Building redirect URL:', { origin, stateOrigin: stateData.origin });

    const callbackUrl = new URL(`${origin.replace(/\/$/, '')}/richiedi/dj/libere`);
    callbackUrl.searchParams.set('tidal_success', 'true');
    callbackUrl.searchParams.set('tidal_access_token', encryptedAccessToken);
    callbackUrl.searchParams.set('tidal_refresh_token', encryptedRefreshToken);
    callbackUrl.searchParams.set('tidal_user_id', tokenData.user_id || '');
    callbackUrl.searchParams.set('tidal_expires_at', expiresAt.toISOString());
    if (stateData.sid) {
      callbackUrl.searchParams.set('tidal_session_id', stateData.sid);
    }

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
    return NextResponse.redirect(buildDjRedirectUrl(
      req,
      `?tidal_error=${encodeURIComponent(error instanceof Error ? error.message : 'callback_failed')}`
    ));
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
  } catch {
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
