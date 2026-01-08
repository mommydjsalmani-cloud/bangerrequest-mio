import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BUILD_TAG = 'libere-pending-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

/**
 * GET /api/libere/pending?sessionId=...&voterId=...
 * Ritorna le richieste pending (status = 'new' o 'accepted') per una sessione
 * con i contatori voti e il voto dell'utente corrente
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
    const { data: requests, error: reqError } = await supabase
      .from('richieste_libere')
      .select('id, session_id, created_at, track_id, uri, title, artists, album, cover_url, duration_ms, requester_name, status, up_votes, down_votes')
      .eq('session_id', sessionId)
      .eq('archived', false)
      .in('status', ['new', 'accepted', 'rejected'])
      .order('created_at', { ascending: false });
    
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
    
    // Arricchisci le richieste con myVote
    const enrichedRequests = (requests || []).map(r => ({
      ...r,
      up_votes: r.up_votes || 0,
      down_votes: r.down_votes || 0,
      myVote: userVotes[r.id] || null
    }));
    
    return withVersion({ 
      ok: true, 
      requests: enrichedRequests 
    });
    
  } catch (error) {
    console.error('[pending] Unexpected error:', error);
    return withVersion({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
