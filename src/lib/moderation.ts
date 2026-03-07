// Thin wrapper per la logica di moderazione usata dal pannello DJ
import { getSupabase } from './supabase';

export async function acceptRequest(requestId: string) {
  const supabase = getSupabase();
  if (supabase) {
    // Prima prova nel sistema libere
    const { data: libereRequest } = await supabase
      .from('richieste_libere')
      .select('id')
      .eq('id', requestId)
      .single();
    
    if (libereRequest) {
      // È una richiesta del sistema libere
      const { error } = await supabase
        .from('richieste_libere')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (error) throw new Error(`Accept failed (libere): ${error.message}`);

      // ⚠️ CRITICAL FIX #4: Automatic Playlist Integration
      // Quando il DJ accetta una richiesta, il brano viene AUTOMATICAMENTE aggiunto alla playlist Tidal
      // Fix: commit d983272 - NON rimuovere questa logica
      // Test: Manual E2E (verifica su app Tidal)
      try {
        const { data: request } = await supabase
          .from('richieste_libere')
          .select('id, session_id, track_id, title, artists, tidal_added_status')
          .eq('id', requestId)
          .single();

        if (request) {
          const { data: session } = await supabase
            .from('sessioni_libere')
            .select('catalog_type, tidal_access_token, tidal_playlist_id, tidal_user_id, name')
            .eq('id', request.session_id)
            .single();

          if (session && session.catalog_type === 'tidal' && session.tidal_access_token && request.track_id) {
            if (request.tidal_added_status === 'success' || request.tidal_added_status === 'pending') {
              return { ok: true };
            }

            await supabase
              .from('richieste_libere')
              .update({ tidal_added_status: 'pending', tidal_error_message: null })
              .eq('id', requestId);

            const {
              addTrackToTidalPlaylist,
              createTidalPlaylist,
              getTidalPlaylist,
              decryptToken,
              searchTidal,
              normalizeTidalTrackIdForPlaylist,
              getTidalCurrentUserId,
            } = await import('@/lib/tidal');

            const accessToken = decryptToken(session.tidal_access_token as string);
            let tidalUserId: string | null = session.tidal_user_id || null;

            if (!tidalUserId) {
              tidalUserId = await getTidalCurrentUserId(accessToken);
              await supabase
                .from('sessioni_libere')
                .update({ tidal_user_id: tidalUserId })
                .eq('id', request.session_id);
            }

            let playlistId = session.tidal_playlist_id;

            if (!playlistId && tidalUserId) {
              const playlist = await createTidalPlaylist(session.name, accessToken, tidalUserId);
              playlistId = playlist.id;
              await supabase
                .from('sessioni_libere')
                .update({ tidal_playlist_id: playlistId })
                .eq('id', request.session_id);
            } else if (playlistId) {
              const existing = await getTidalPlaylist(playlistId, accessToken);
              if (!existing && tidalUserId) {
                const playlist = await createTidalPlaylist(session.name, accessToken, tidalUserId);
                playlistId = playlist.id;
                await supabase
                  .from('sessioni_libere')
                  .update({ tidal_playlist_id: playlistId })
                  .eq('id', request.session_id);
              }
            }

            if (playlistId) {
              let trackIdToAdd = normalizeTidalTrackIdForPlaylist(request.track_id as string) || String(request.track_id);
              try {
                await addTrackToTidalPlaylist(playlistId, trackIdToAdd, accessToken);
              } catch {
                if (request.title) {
                  const searchQuery = request.artists ? `${request.title} ${request.artists}` : request.title;
                  const searchResults = await searchTidal(searchQuery, accessToken, 5, 0);
                  if (searchResults.tracks?.length > 0) {
                    trackIdToAdd = normalizeTidalTrackIdForPlaylist(searchResults.tracks[0].id) || String(searchResults.tracks[0].id);
                    await addTrackToTidalPlaylist(playlistId, trackIdToAdd, accessToken);
                  }
                }
              }

              await supabase
                .from('richieste_libere')
                .update({ tidal_added_status: 'success', tidal_added_at: new Date().toISOString(), tidal_error_message: null })
                .eq('id', requestId);
            }
          }
        }
      } catch (tidalError) {
        await supabase
          .from('richieste_libere')
          .update({ tidal_added_status: 'failed', tidal_error_message: tidalError instanceof Error ? tidalError.message : 'Unknown error' })
          .eq('id', requestId);
      }

      return { ok: true };
    }
    
    // Fallback al sistema requests tradizionale
    const { error } = await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (error) throw new Error(`Accept failed: ${error.message}`);
    return { ok: true };
  } else {
    // Fallback per storage in memoria (development)
    console.log(`Would accept request: ${requestId}`);
    return { ok: true };
  }
}

export async function rejectRequest(requestId: string) {
  const supabase = getSupabase();
  if (supabase) {
    // Prima prova nel sistema libere
    const { data: libereRequest } = await supabase
      .from('richieste_libere')
      .select('id')
      .eq('id', requestId)
      .single();
    
    if (libereRequest) {
      // È una richiesta del sistema libere
      const { error } = await supabase
        .from('richieste_libere')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw new Error(`Reject failed (libere): ${error.message}`);
      return { ok: true };
    }
    
    // Fallback al sistema requests tradizionale
    const { error } = await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    if (error) throw new Error(`Reject failed: ${error.message}`);
    return { ok: true };
  } else {
    // Fallback per storage in memoria (development)
    console.log(`Would reject request: ${requestId}`);
    return { ok: true };
  }
}

/**
 * Segna una richiesta come "played" (suonata).
 * La richiesta esce dalle liste attive DJ ma resta visibile lato utente.
 * I voti vengono disabilitati.
 * NOTA: played_at è opzionale - funziona anche se la colonna non esiste
 */
export async function markAsPlayed(requestId: string) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database non configurato');
  }
  
  // Verifica che la richiesta esista nel sistema libere
  const { data: libereRequest, error: fetchError } = await supabase
    .from('richieste_libere')
    .select('id, status')
    .eq('id', requestId)
    .single();
  
  if (fetchError || !libereRequest) {
    throw new Error('Richiesta non trovata');
  }
  
  // Se è già played, non fare nulla
  if (libereRequest.status === 'played') {
    return { ok: true, alreadyPlayed: true };
  }
  
  // Prova prima con played_at, se fallisce prova senza
  let error = null;
  
  // Tentativo 1: con played_at
  const result1 = await supabase
    .from('richieste_libere')
    .update({ 
      status: 'played',
      played_at: new Date().toISOString()
    })
    .eq('id', requestId);
  
  if (result1.error) {
    // Se l'errore è sulla colonna played_at, riprova senza
    if (result1.error.message?.includes('played_at')) {
      const result2 = await supabase
        .from('richieste_libere')
        .update({ status: 'played' })
        .eq('id', requestId);
      error = result2.error;
    } else {
      error = result1.error;
    }
  }
  
  if (error) {
    throw new Error(`Mark as played failed: ${error.message}`);
  }
  
  return { ok: true };
}

const moderation = { acceptRequest, rejectRequest, markAsPlayed };
export default moderation;
