import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BUILD_TAG = 'libere-pending-v2';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

/**
 * Calcola lo score di una richiesta.
 * Formula: up_votes - down_votes
 * A parità di score, l'ordinamento secondario per created_at ASC dà precedenza alle più vecchie.
 */
function calculateScore(upVotes: number, downVotes: number): number {
  return (upVotes || 0) - (downVotes || 0);
}

/**
 * GET /api/libere/pending?sessionId=...&voterId=...
 * Ritorna le richieste pending (status = 'new' o 'accepted') per una sessione
 * con i contatori voti e il voto dell'utente corrente.
 * 
 * ORDINAMENTO AUTOMATICO per utenti:
 * - score_live DESC (priorità automatica)
 * - a parità di score_live: created_at ASC (più vecchie prima)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const voterId = url.searchParams.get('voterId');
  
  if (!sessionId) {
    return withVersion({ ok: false, error: 'sessionId required' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'database_unavailable' }, { status: 500 });
  }
  
  try {
    // Fetch richieste pending (new o accepted) per la sessione
    // L'ordinamento sarà fatto lato server dopo aver calcolato score_live
    const { data: requests, error: reqError } = await supabase
      .from('richieste_libere')
      .select('id, session_id, created_at, track_id, uri, title, artists, album, cover_url, duration_ms, requester_name, status, up_votes, down_votes')
      .eq('session_id', sessionId)
      .eq('archived', false)
      .in('status', ['new', 'accepted', 'rejected']);
    
    if (reqError) {
      console.error('[pending] Error fetching requests:', reqError);
      return withVersion({ ok: false, error: 'fetch_error' }, { status: 500 });
    }
    
    // Se c'è un voterId, recupera i voti dell'utente per questa sessione
    let userVotes: Record<string, string> = {};
    
    if (voterId) {
      const { data: votes, error: voteError } = await supabase
        .from('richieste_libere_voti')
        .select('richiesta_id, vote')
        .eq('session_id', sessionId)
        .eq('voter_id', voterId);
      
      if (!voteError && votes) {
        userVotes = votes.reduce((acc, v) => {
          acc[v.richiesta_id] = v.vote;
          return acc;
        }, {} as Record<string, string>);
      }
    }
    
    // Arricchisci le richieste con myVote e score
    const enrichedRequests = (requests || []).map(r => {
      const upVotes = r.up_votes || 0;
      const downVotes = r.down_votes || 0;
      const score = calculateScore(upVotes, downVotes);
      
      return {
        ...r,
        up_votes: upVotes,
        down_votes: downVotes,
        score: score,
        myVote: userVotes[r.id] || null
      };
    });
    
    // Ordinamento automatico per utenti:
    // 1. score DESC (più alto = più in alto)
    // 2. created_at ASC (a parità, le più vecchie prima)
    enrichedRequests.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      // A parità di score, ordina per created_at ASC
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    return withVersion({ 
      ok: true, 
      requests: enrichedRequests 
    });
    
  } catch (error) {
    console.error('[pending] Unexpected error:', error);
    return withVersion({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
