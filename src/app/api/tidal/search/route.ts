import { NextRequest, NextResponse } from 'next/server';
import { searchTidal, normalizeTidalTrack } from '@/lib/tidal';
import { getSupabase } from '@/lib/supabase';

/**
 * GET /api/tidal/search
 * Ricerca brani su Tidal (richiede sessione con token Tidal)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const sessionToken = searchParams.get('s');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, error: 'Session token required' },
        { status: 400 }
      );
    }

    // Ottieni sessione dal DB
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessioni_libere')
      .select('id, catalog_type, tidal_access_token, tidal_refresh_token, tidal_token_expires_at')
      .eq('token', sessionToken)
      .eq('archived', false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired session' },
        { status: 404 }
      );
    }

    // Verifica che sia configurato Tidal
    if (session.catalog_type !== 'tidal' || !session.tidal_access_token) {
      return NextResponse.json(
        { ok: false, error: 'Tidal not configured for this session' },
        { status: 403 }
      );
    }

    // TODO: Verifica scadenza token e rinnova se necessario
    // Per ora usiamo direttamente il token

    // Ricerca su Tidal
    const results = await searchTidal(query, session.tidal_access_token, limit, offset);

    const tracks = results.tracks.map(normalizeTidalTrack);

    return NextResponse.json({
      ok: true,
      tracks,
      total: results.totalNumberOfItems,
      limit,
      offset,
      query,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Tidal search error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
