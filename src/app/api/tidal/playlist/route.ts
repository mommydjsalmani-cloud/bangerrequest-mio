import { NextRequest, NextResponse } from 'next/server';
import {
  createTidalPlaylist,
  addTrackToTidalPlaylist,
  getTidalPlaylist,
  decryptToken,
} from '@/lib/tidal';
import { getSupabase } from '@/lib/supabase';

/**
 * POST /api/tidal/playlist
 * Crea playlist Tidal o aggiunge brano
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, session_id, track_id } = body;

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

    if (!session_id) {
      return NextResponse.json(
        { ok: false, error: 'session_id required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Ottieni sessione
    const { data: session, error: sessionError } = await supabase
      .from('sessioni_libere')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { ok: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.tidal_access_token || !session.tidal_user_id) {
      return NextResponse.json(
        { ok: false, error: 'Tidal not authenticated' },
        { status: 403 }
      );
    }

    const accessToken = decryptToken(session.tidal_access_token);

    // Azione: crea playlist
    if (action === 'create_playlist') {
      const playlist = await createTidalPlaylist(
        session.name,
        accessToken,
        session.tidal_user_id
      );

      // Salva playlist ID nella sessione
      await supabase
        .from('sessioni_libere')
        .update({ tidal_playlist_id: playlist.id })
        .eq('id', session_id);

      return NextResponse.json({
        ok: true,
        playlist,
        message: 'Playlist creata con successo',
      });
    }

    // Azione: aggiungi brano
    if (action === 'add_track') {
      if (!track_id) {
        return NextResponse.json(
          { ok: false, error: 'track_id required' },
          { status: 400 }
        );
      }

      let playlistId = session.tidal_playlist_id;

      // Se non esiste playlist o è stata eliminata, ricreala
      if (!playlistId) {
        const playlist = await createTidalPlaylist(
          session.name,
          accessToken,
          session.tidal_user_id
        );
        playlistId = playlist.id;

        await supabase
          .from('sessioni_libere')
          .update({ tidal_playlist_id: playlistId })
          .eq('id', session_id);
      } else {
        // Verifica se playlist esiste ancora
        const existing = await getTidalPlaylist(playlistId, accessToken);
        if (!existing) {
          // Playlist eliminata, ricreala
          const playlist = await createTidalPlaylist(
            session.name,
            accessToken,
            session.tidal_user_id
          );
          playlistId = playlist.id;

          await supabase
            .from('sessioni_libere')
            .update({ tidal_playlist_id: playlistId })
            .eq('id', session_id);
        }
      }

      // Aggiungi brano alla playlist
      await addTrackToTidalPlaylist(playlistId, track_id, accessToken);

      return NextResponse.json({
        ok: true,
        message: 'Brano aggiunto a playlist Tidal',
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Tidal playlist error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Playlist operation failed' },
      { status: 500 }
    );
  }
}
