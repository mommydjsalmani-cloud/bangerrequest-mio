import { NextRequest, NextResponse } from 'next/server';
import { getTidalAuthUrl } from '@/lib/tidal';
import { randomBytes } from 'crypto';

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
    const state = randomBytes(32).toString('hex');
    
    // Estrai l'origin dalla richiesta per redirect_uri dinamico
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    
    // Genera authUrl con state e dominio dinamico
    const authUrl = getTidalAuthUrl(state, origin);
    
    // Salva state in cookie firmato per validare nel callback
    const response = NextResponse.json({
      ok: true,
      authUrl,
    });
    
    response.cookies.set('tidal_oauth_state', state, {
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
