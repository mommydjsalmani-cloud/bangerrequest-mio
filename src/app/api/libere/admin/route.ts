import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { randomBytes } from 'crypto';

function requireDJSecret(req: Request) {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';
  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  if (hSecret !== secret || hUser !== user) return 'unauthorized';
  return null;
}

const BUILD_TAG = 'libere-admin-api-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

function generateToken(): string {
  return randomBytes(16).toString('hex');
}

async function getStats(supabase: NonNullable<ReturnType<typeof getSupabase>>, sessionId: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Totali richieste
  const { count: totalCount } = await supabase
    .from('richieste_libere')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('archived', false);
  
  // Richieste ultima ora
  const { count: lastHourCount } = await supabase
    .from('richieste_libere')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('archived', false)
    .gte('created_at', oneHourAgo.toISOString());
  
  // Top 3 richieste più frequenti (simulata tramite aggregazione lato client)
  const { data: allRequests } = await supabase
    .from('richieste_libere')
    .select('title, artists')
    .eq('session_id', sessionId)
    .eq('archived', false);
  
  // Aggrega lato client
  const counts = new Map<string, { title: string; artists?: string; count: number }>();
  allRequests?.forEach(req => {
    const key = `${req.title}||${req.artists || ''}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { title: req.title, artists: req.artists, count: 1 });
    }
  });
  
  const topRequests = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  return {
    total: totalCount || 0,
    lastHour: lastHourCount || 0,
    topRequests: topRequests || []
  };
}

// GET - Ottieni info sessione corrente + richieste + stats
export async function GET(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return withVersion({ ok: false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const sessionId = url.searchParams.get('session_id');
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  if (action === 'sessions') {
    // Lista tutte le sessioni
    const { data: sessions, error } = await supabase
      .from('sessioni_libere')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      return withVersion({ ok: false, error: error.message }, { status: 500 });
    }
    
    return withVersion({ ok: true, sessions: sessions || [] });
  }

  if (action === 'request_status') {
    // Controllo stato di una richiesta specifica (per utenti)
    const requestId = url.searchParams.get('request_id');
    const sessionToken = req.headers.get('x-session-token');
    
    if (!requestId) {
      return withVersion({ ok: false, error: 'request_id richiesto' }, { status: 400 });
    }

    // Se c'è un session token, verifica che la richiesta appartenga a quella sessione
    if (sessionToken) {
      const { data: session } = await supabase
        .from('sessioni_libere')
        .select('id')
        .eq('token', sessionToken)
        .eq('archived', false)
        .single();

      if (!session) {
        return withVersion({ ok: false, error: 'Sessione non valida' }, { status: 401 });
      }

      const { data: request, error } = await supabase
        .from('richieste_libere')
        .select('status')
        .eq('id', requestId)
        .eq('session_id', session.id)
        .single();

      if (error || !request) {
        return withVersion({ ok: false, error: 'Richiesta non trovata' }, { status: 404 });
      }

      return withVersion({ ok: true, status: request.status });
    }
  }
  
  if (!sessionId) {
    return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
  }
  
  // Info sessione specifica
  const { data: session, error: sessionError } = await supabase
    .from('sessioni_libere')
    .select('*')
    .eq('id', sessionId)
    .eq('archived', false)
    .single();
  
  if (sessionError || !session) {
    return withVersion({ ok: false, error: 'Sessione non trovata' }, { status: 404 });
  }
  
  // Richieste della sessione
  const { data: requests, error: requestsError } = await supabase
    .from('richieste_libere')
    .select('*')
    .eq('session_id', sessionId)
    .eq('archived', false)
    .order('created_at', { ascending: false });
  
  if (requestsError) {
    return withVersion({ ok: false, error: requestsError.message }, { status: 500 });
  }
  
  // Statistiche
  const stats = await getStats(supabase, sessionId);
  
  return withVersion({ 
    ok: true, 
    session,
    requests: requests || [],
    stats
  });
}

// POST - Azioni admin (toggle status, reset, new session, regenerate token)
export async function POST(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return withVersion({ ok: false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  let body;
  try {
    body = await req.json();
  } catch {
    return withVersion({ ok: false, error: 'Dati richiesta non validi' }, { status: 400 });
  }
  
  const { action, session_id, session_name } = body;
  
  if (!action) {
    return withVersion({ ok: false, error: 'Azione richiesta' }, { status: 400 });
  }
  
  switch (action) {
    case 'create_session': {
      // Crea nuova sessione
      const newToken = generateToken();
      const sessionData = {
        token: newToken,
        name: session_name || 'Nuova Sessione Richieste Libere',
        status: 'active',
        reset_count: 0,
        archived: false,
        rate_limit_enabled: true,
        rate_limit_seconds: 60
      };
      
      const { data: newSession, error } = await supabase
        .from('sessioni_libere')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: 'Nuova sessione avviata ✓',
        session: newSession 
      });
    }
    
    case 'toggle_status': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      // Ottieni stato attuale
      const { data: session } = await supabase
        .from('sessioni_libere')
        .select('status')
        .eq('id', session_id)
        .single();
      
      if (!session) {
        return withVersion({ ok: false, error: 'Sessione non trovata' }, { status: 404 });
      }
      
      const newStatus = session.status === 'active' ? 'paused' : 'active';
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ status: newStatus })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      const message = newStatus === 'active' ? 'Richieste attive ✓' : 'Richieste in pausa ✓';
      return withVersion({ ok: true, message, status: newStatus });
    }
    
    case 'soft_reset': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      // Archivia tutte le richieste
      const { error: archiveError } = await supabase
        .from('richieste_libere')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('session_id', session_id)
        .eq('archived', false);
      
      if (archiveError) {
        return withVersion({ ok: false, error: archiveError.message }, { status: 500 });
      }
      
      // Aggiorna contatore reset
      const { error: updateError } = await supabase
        .rpc('increment_reset_count', { session_id })
        .then(async (result) => {
          if (result.error) return result;
          
          return await supabase
            .from('sessioni_libere')
            .update({ last_reset_at: new Date().toISOString() })
            .eq('id', session_id);
        });
      
      if (updateError) {
        return withVersion({ ok: false, error: updateError.message }, { status: 500 });
      }
      
      return withVersion({ ok: true, message: 'Richieste azzerate ✓' });
    }
    
    case 'hard_reset': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      // Elimina definitivamente tutte le richieste
      const { error: deleteError } = await supabase
        .from('richieste_libere')
        .delete()
        .eq('session_id', session_id);
      
      if (deleteError) {
        return withVersion({ ok: false, error: deleteError.message }, { status: 500 });
      }
      
      // Pulisci rate limit
      await supabase
        .from('libere_rate_limit')
        .delete()
        .eq('session_id', session_id);
      
      // Aggiorna contatore reset
      const { error: updateError } = await supabase
        .rpc('increment_reset_count', { session_id })
        .then(async (result) => {
          if (result.error) return result;
          
          return await supabase
            .from('sessioni_libere')
            .update({ last_reset_at: new Date().toISOString() })
            .eq('id', session_id);
        });
      
      if (updateError) {
        return withVersion({ ok: false, error: updateError.message }, { status: 500 });
      }
      
      return withVersion({ ok: true, message: 'Eliminazione definitiva ✓' });
    }
    
    case 'regenerate_token': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const newToken = generateToken();
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ token: newToken })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: 'Token rigenerato ✓',
        token: newToken 
      });
    }

    case 'update_rate_limit': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { rate_limit_enabled, rate_limit_seconds } = body;
      
      if (typeof rate_limit_enabled !== 'boolean') {
        return withVersion({ ok: false, error: 'rate_limit_enabled deve essere boolean' }, { status: 400 });
      }
      
      const seconds = parseInt(rate_limit_seconds);
      if (isNaN(seconds) || seconds < 5 || seconds > 300) {
        return withVersion({ ok: false, error: 'rate_limit_seconds deve essere tra 5 e 300' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ 
          rate_limit_enabled,
          rate_limit_seconds: seconds
        })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: `Rate limiting ${rate_limit_enabled ? 'abilitato' : 'disabilitato'} ✓` 
      });
    }

    case 'delete_session': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      // Prima elimina tutte le richieste associate
      await supabase
        .from('richieste_libere')
        .delete()
        .eq('session_id', session_id);
      
      // Elimina rate limit associato
      await supabase
        .from('libere_rate_limit')
        .delete()
        .eq('session_id', session_id);
      
      // Infine elimina la sessione (soft delete)
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ archived: true })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ ok: true, message: 'Sessione eliminata ✓' });
    }
    
    default:
      return withVersion({ ok: false, error: 'Azione non supportata' }, { status: 400 });
  }
}

// PATCH - Aggiorna status richieste (accept/reject)
export async function PATCH(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return withVersion({ ok: false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  let body;
  try {
    body = await req.json();
  } catch {
    return withVersion({ ok: false, error: 'Dati richiesta non validi' }, { status: 400 });
  }
  
  const { request_id, status, note } = body;
  
  if (!request_id || !status) {
    return withVersion({ ok: false, error: 'request_id e status richiesti' }, { status: 400 });
  }

  if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
    return withVersion({ ok: false, error: 'Status non valido' }, { status: 400 });
  }

  const updateData: { status: string; note?: string | null; accepted_at?: string; rejected_at?: string; cancelled_at?: string } = { status };

  // Solo aggiorna la nota se viene fornita esplicitamente
  if (note !== undefined) {
    updateData.note = note || null;
  }

  if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updateData.rejected_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }  const { error } = await supabase
    .from('richieste_libere')
    .update(updateData)
    .eq('id', request_id);
  
  if (error) {
    return withVersion({ ok: false, error: error.message }, { status: 500 });
  }
  
  return withVersion({ 
    ok: true, 
    message: `Richiesta ${status === 'accepted' ? 'accettata' : status === 'rejected' ? 'rifiutata' : 'cancellata'} ✓` 
  });
}