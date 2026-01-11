import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BUILD_TAG = 'libere-vote-v2';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

/**
 * POST /api/libere/vote
 * body: { sessionId, requestId, action, voterId }
 * action: 'up' | 'down' | 'none'
 * Gestisce il voto per una richiesta usando la funzione RPC atomica
 * 
 * BLOCCO VOTI: le richieste con status='played' non sono votabili
 */
export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return withVersion({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  
  const { sessionId, requestId, action, voterId } = body;
  
  // Validazione input
  if (!sessionId || typeof sessionId !== 'string') {
    return withVersion({ ok: false, error: 'sessionId required' }, { status: 400 });
  }
  if (!requestId || typeof requestId !== 'string') {
    return withVersion({ ok: false, error: 'requestId required' }, { status: 400 });
  }
  if (!voterId || typeof voterId !== 'string') {
    return withVersion({ ok: false, error: 'voterId required' }, { status: 400 });
  }
  if (!action || !['up', 'down', 'none'].includes(action)) {
    return withVersion({ ok: false, error: 'action must be up, down, or none' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'database_unavailable' }, { status: 500 });
  }
  
  try {
    // BLOCCO VOTI: verifica che la richiesta non sia "played"
    const { data: request, error: checkError } = await supabase
      .from('richieste_libere')
      .select('id, status')
      .eq('id', requestId)
      .eq('session_id', sessionId)
      .single();
    
    if (checkError || !request) {
      return withVersion({ ok: false, error: 'request_not_found' }, { status: 404 });
    }
    
    // Se la richiesta è già "played", blocca il voto
    if (request.status === 'played') {
      return withVersion({ ok: false, error: 'vote_disabled_played', message: 'I voti sono disabilitati per i brani già suonati' }, { status: 403 });
    }
    
    // Usa la funzione RPC atomica
    const { data, error } = await supabase.rpc('vote_richiesta_libera', {
      p_session_id: sessionId,
      p_richiesta_id: requestId,
      p_voter_id: voterId,
      p_action: action
    });
    
    if (error) {
      console.error('[vote] RPC error:', error);
      
      // Fallback: se RPC non esiste, gestisci manualmente
      if (error.message?.includes('function') || error.code === '42883') {
        return await handleVoteFallback(supabase, sessionId, requestId, voterId, action);
      }
      
      return withVersion({ ok: false, error: 'vote_error' }, { status: 500 });
    }
    
    // La funzione RPC ritorna un jsonb
    if (data && typeof data === 'object') {
      if (data.ok === false) {
        return withVersion({ ok: false, error: data.error || 'vote_failed' }, { status: 400 });
      }
      
      return withVersion({
        ok: true,
        upVotes: data.upVotes ?? 0,
        downVotes: data.downVotes ?? 0,
        myVote: data.myVote ?? null
      });
    }
    
    return withVersion({ ok: false, error: 'unexpected_response' }, { status: 500 });
    
  } catch (error) {
    console.error('[vote] Unexpected error:', error);
    return withVersion({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

/**
 * Fallback se la funzione RPC non esiste (migrazione non ancora eseguita)
 * Implementa la stessa logica in JS
 */
async function handleVoteFallback(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  sessionId: string,
  requestId: string,
  voterId: string,
  action: string
) {
  try {
    // Verifica che la richiesta esista
    const { data: request, error: reqError } = await supabase
      .from('richieste_libere')
      .select('id, up_votes, down_votes')
      .eq('id', requestId)
      .eq('session_id', sessionId)
      .single();
    
    if (reqError || !request) {
      return withVersion({ ok: false, error: 'request_not_found' }, { status: 404 });
    }
    
    // Trova voto esistente
    const { data: existingVote } = await supabase
      .from('richieste_libere_voti')
      .select('id, vote')
      .eq('session_id', sessionId)
      .eq('richiesta_id', requestId)
      .eq('voter_id', voterId)
      .maybeSingle();
    
    let newUpVotes = request.up_votes || 0;
    let newDownVotes = request.down_votes || 0;
    let myVote: string | null = null;
    
    if (action === 'none') {
      // Rimuovi voto
      if (existingVote) {
        await supabase
          .from('richieste_libere_voti')
          .delete()
          .eq('id', existingVote.id);
        
        if (existingVote.vote === 'up') {
          newUpVotes = Math.max(0, newUpVotes - 1);
        } else {
          newDownVotes = Math.max(0, newDownVotes - 1);
        }
      }
    } else if (action === 'up' || action === 'down') {
      if (!existingVote) {
        // Nuovo voto
        await supabase
          .from('richieste_libere_voti')
          .insert({
            session_id: sessionId,
            richiesta_id: requestId,
            voter_id: voterId,
            vote: action
          });
        
        if (action === 'up') {
          newUpVotes += 1;
        } else {
          newDownVotes += 1;
        }
        myVote = action;
        
      } else if (existingVote.vote === action) {
        // Toggle: stesso voto = rimuovi
        await supabase
          .from('richieste_libere_voti')
          .delete()
          .eq('id', existingVote.id);
        
        if (action === 'up') {
          newUpVotes = Math.max(0, newUpVotes - 1);
        } else {
          newDownVotes = Math.max(0, newDownVotes - 1);
        }
        
      } else {
        // Switch: voto opposto
        await supabase
          .from('richieste_libere_voti')
          .update({ vote: action, updated_at: new Date().toISOString() })
          .eq('id', existingVote.id);
        
        if (action === 'up') {
          newUpVotes += 1;
          newDownVotes = Math.max(0, newDownVotes - 1);
        } else {
          newDownVotes += 1;
          newUpVotes = Math.max(0, newUpVotes - 1);
        }
        myVote = action;
      }
    }
    
    // Aggiorna contatori nella richiesta
    await supabase
      .from('richieste_libere')
      .update({ up_votes: newUpVotes, down_votes: newDownVotes })
      .eq('id', requestId);
    
    return withVersion({
      ok: true,
      upVotes: newUpVotes,
      downVotes: newDownVotes,
      myVote
    });
    
  } catch (error) {
    console.error('[vote fallback] Error:', error);
    return withVersion({ ok: false, error: 'fallback_error' }, { status: 500 });
  }
}
