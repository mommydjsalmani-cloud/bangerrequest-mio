import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/auth';

function requireDJSecret(req: Request) {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';
  
  // Rate limiting: usa IP come identificatore
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitKey = `dj-login:${ip}`;
  
  const rateLimit = checkLoginRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return 'rate_limited';
  }
  
  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  
  if (hSecret !== secret || hUser !== user) {
    // Registra tentativo fallito per rate limiting
    return 'unauthorized';
  }
  
  // Reset rate limit on successful auth
  resetLoginRateLimit(rateLimitKey);
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
  
  // Totali richieste (retrocompatibile: prova con dj_archived, altrimenti solo archived)
  let totalCount = 0;
  const { count: tc, error: tcErr } = await supabase
    .from('richieste_libere')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('archived', false)
    .eq('dj_archived', false);
  
  if (tcErr && tcErr.message.includes('dj_archived')) {
    const { count } = await supabase
      .from('richieste_libere')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('archived', false);
    totalCount = count || 0;
  } else {
    totalCount = tc || 0;
  }
  
  // Richieste ultima ora (retrocompatibile)
  let lastHourCount = 0;
  const { count: lhc, error: lhcErr } = await supabase
    .from('richieste_libere')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('archived', false)
    .eq('dj_archived', false)
    .gte('created_at', oneHourAgo.toISOString());
  
  if (lhcErr && lhcErr.message.includes('dj_archived')) {
    const { count } = await supabase
      .from('richieste_libere')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('archived', false)
      .gte('created_at', oneHourAgo.toISOString());
    lastHourCount = count || 0;
  } else {
    lastHourCount = lhc || 0;
  }
  
  // Top 3 richieste più frequenti (retrocompatibile)
  let allRequests: { title: string; artists?: string }[] | null = null;
  const { data: ar, error: arErr } = await supabase
    .from('richieste_libere')
    .select('title, artists')
    .eq('session_id', sessionId)
    .eq('archived', false)
    .eq('dj_archived', false);
  
  if (arErr && arErr.message.includes('dj_archived')) {
    const { data } = await supabase
      .from('richieste_libere')
      .select('title, artists')
      .eq('session_id', sessionId)
      .eq('archived', false);
    allRequests = data;
  } else {
    allRequests = ar;
  }
  
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
  if (authErr) {
    const status = authErr === 'misconfigured' ? 500 : (authErr === 'rate_limited' ? 429 : 401);
    return withVersion({ ok: false, error: authErr }, { status });
  }
  
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const sessionId = url.searchParams.get('session_id');
  const archived = url.searchParams.get('archived') === 'true'; // Nuovo parametro
  
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
  
  // Richieste della sessione (con filtro archivio DJ)
  // Vista normale: dj_archived = false (o non esiste)
  // Vista archivio: dj_archived = true
  // In entrambi i casi, escludi le richieste definitivamente archiviate
  const requestsQuery = supabase
    .from('richieste_libere')
    .select('*')
    .eq('session_id', sessionId)
    .eq('archived', false); // Sempre escludi quelle definitivamente archiviate
  
  // Prova a filtrare per dj_archived (se la colonna esiste)
  // Se non esiste, la query fallirà e useremo il fallback
  const { data: requests, error: requestsError } = await requestsQuery
    .eq('dj_archived', archived)
    .order('created_at', { ascending: false });
  
  // Se errore (probabilmente colonna non esiste), riprova senza dj_archived
  let finalRequests = requests;
  if (requestsError && requestsError.message.includes('dj_archived')) {
    const { data: fallbackRequests, error: fallbackError } = await supabase
      .from('richieste_libere')
      .select('*')
      .eq('session_id', sessionId)
      .eq('archived', archived) // Usa archived come fallback
      .order('created_at', { ascending: false });
    
    if (fallbackError) {
      return withVersion({ ok: false, error: fallbackError.message }, { status: 500 });
    }
    finalRequests = fallbackRequests;
  } else if (requestsError) {
    return withVersion({ ok: false, error: requestsError.message }, { status: 500 });
  }
  
  // Statistiche
  const stats = await getStats(supabase, sessionId);
  
  return withVersion({ 
    ok: true, 
    session,
    requests: finalRequests || [],
    stats
  });
}

// POST - Azioni admin (toggle status, reset, new session, regenerate token)
export async function POST(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) {
    const status = authErr === 'misconfigured' ? 500 : (authErr === 'rate_limited' ? 429 : 401);
    return withVersion({ ok: false, error: authErr }, { status });
  }
  
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
        rate_limit_seconds: 60,
        notes_enabled: true
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
      
      // Archivia tutte le richieste SOLO per la vista DJ (retrocompatibile)
      // La lista utente continua a vedere le richieste
      // Prova prima con dj_archived, se fallisce usa archived
      const { error: archiveError } = await supabase
        .from('richieste_libere')
        .update({ dj_archived: true, dj_archived_at: new Date().toISOString() })
        .eq('session_id', session_id)
        .eq('dj_archived', false);
      
      // Se dj_archived non esiste, fallback al comportamento precedente
      if (archiveError && archiveError.message.includes('dj_archived')) {
        const { error: fallbackError } = await supabase
          .from('richieste_libere')
          .update({ archived: true, archived_at: new Date().toISOString() })
          .eq('session_id', session_id)
          .eq('archived', false);
        
        if (fallbackError) {
          return withVersion({ ok: false, error: fallbackError.message }, { status: 500 });
        }
      } else if (archiveError) {
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

    case 'update_notes_control': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { notes_enabled } = body;
      
      if (typeof notes_enabled !== 'boolean') {
        return withVersion({ ok: false, error: 'notes_enabled deve essere boolean' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ notes_enabled })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: `Note/commenti ${notes_enabled ? 'abilitati' : 'disabilitati'} ✓` 
      });
    }

    case 'update_event_code_control': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { require_event_code } = body;
      
      if (typeof require_event_code !== 'boolean') {
        return withVersion({ ok: false, error: 'require_event_code deve essere boolean' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ require_event_code })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: `Codice evento ${require_event_code ? 'richiesto' : 'opzionale'} ✓` 
      });
    }

    case 'set_current_event_code': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { current_event_code } = body;
      
      if (current_event_code !== null && typeof current_event_code !== 'string') {
        return withVersion({ ok: false, error: 'current_event_code deve essere string o null' }, { status: 400 });
      }
      
      // Normalizza il codice: trim e uppercase se non null
      const normalizedCode = current_event_code ? current_event_code.trim().toUpperCase() : null;
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ current_event_code: normalizedCode })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: normalizedCode ? `Codice evento impostato: ${normalizedCode}` : 'Codice evento rimosso'
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

    case 'switch_catalog': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { catalog_type } = body;
      
      if (!catalog_type || !['deezer', 'tidal'].includes(catalog_type)) {
        return withVersion({ ok: false, error: 'catalog_type deve essere deezer o tidal' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ catalog_type })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: `Catalogo cambiato in ${catalog_type === 'tidal' ? 'Tidal' : 'Deezer'} ✓` 
      });
    }

    case 'save_tidal_auth': {
      if (!session_id) {
        return withVersion({ ok: false, error: 'session_id richiesto' }, { status: 400 });
      }
      
      const { 
        tidal_access_token, 
        tidal_refresh_token, 
        tidal_user_id,
        tidal_token_expires_at 
      } = body;
      
      if (!tidal_access_token || !tidal_refresh_token) {
        return withVersion({ ok: false, error: 'Token Tidal richiesti' }, { status: 400 });
      }
      
      const { error } = await supabase
        .from('sessioni_libere')
        .update({ 
          tidal_access_token,
          tidal_refresh_token,
          tidal_user_id: tidal_user_id || null,
          tidal_token_expires_at: tidal_token_expires_at || null,
          catalog_type: 'tidal' // Auto-switch a Tidal dopo auth
        })
        .eq('id', session_id);
      
      if (error) {
        return withVersion({ ok: false, error: error.message }, { status: 500 });
      }
      
      return withVersion({ 
        ok: true, 
        message: 'Tidal autenticato ✓' 
      });
    }
    
    default:
      return withVersion({ ok: false, error: 'Azione non supportata' }, { status: 400 });
  }
}

// PATCH - Aggiorna status richieste (accept/reject)
export async function PATCH(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) {
    const status = authErr === 'misconfigured' ? 500 : (authErr === 'rate_limited' ? 429 : 401);
    return withVersion({ ok: false, error: authErr }, { status });
  }
  
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

  if (!['accepted', 'rejected', 'cancelled', 'played', 'new'].includes(status)) {
    return withVersion({ ok: false, error: 'Status non valido' }, { status: 400 });
  }

  // Prepara i dati base per l'update
  const updateData: Record<string, unknown> = { status };

  // Solo aggiorna la nota se viene fornita esplicitamente
  if (note !== undefined) {
    updateData.note = note || null;
  }

  // Timestamp in base all'azione
  if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updateData.rejected_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  } else if (status === 'played') {
    updateData.played_at = new Date().toISOString();
  }
  // status === 'new' non ha timestamp, resetta lo stato

  // Prova l'update - se fallisce per played_at, riprova senza
  let updateError = null;
  const result1 = await supabase
    .from('richieste_libere')
    .update(updateData)
    .eq('id', request_id);
  
  if (result1.error) {
    // Se l'errore è sulla colonna played_at, riprova senza
    if (result1.error.message?.includes('played_at') && status === 'played') {
      delete updateData.played_at;
      const result2 = await supabase
        .from('richieste_libere')
        .update(updateData)
        .eq('id', request_id);
      updateError = result2.error;
    } else {
      updateError = result1.error;
    }
  }
  
  if (updateError) {
    return withVersion({ ok: false, error: updateError.message }, { status: 500 });
  }

  // Se la richiesta è stata accettata, verifica se aggiungere a Tidal
  if (status === 'accepted') {
    // Ottieni richiesta e sessione per verificare Tidal
    const { data: request } = await supabase
      .from('richieste_libere')
      .select('id, session_id, track_id, title, artists')
      .eq('id', request_id)
      .single();
    
    if (request) {
      const { data: session } = await supabase
        .from('sessioni_libere')
        .select('catalog_type, tidal_access_token, tidal_playlist_id, tidal_user_id, name')
        .eq('id', request.session_id)
        .single();
      
      // Se la sessione usa Tidal e ha autenticazione, aggiungi alla playlist
      if (session && session.catalog_type === 'tidal' && session.tidal_access_token && request.track_id) {
        // Marca come pending per Tidal
        await supabase
          .from('richieste_libere')
          .update({ 
            tidal_added_status: 'pending',
            tidal_retry_count: 0
          })
          .eq('id', request_id);
        
        // Tenta aggiunta in background (non bloccare la risposta)
        // In produzione questo andrebbe fatto con una queue/worker
        setImmediate(async () => {
          try {
            const { addTrackToTidalPlaylist, createTidalPlaylist, getTidalPlaylist, decryptToken, searchTidal } = await import('@/lib/tidal');
            const accessToken = decryptToken(session.tidal_access_token!);
            
            let playlistId = session.tidal_playlist_id;
            
            // Se non esiste playlist o è stata eliminata, ricreala
            if (!playlistId && session.tidal_user_id) {
              const playlist = await createTidalPlaylist(session.name, accessToken, session.tidal_user_id);
              playlistId = playlist.id;
              
              await supabase
                .from('sessioni_libere')
                .update({ tidal_playlist_id: playlistId })
                .eq('id', request.session_id);
            } else if (playlistId) {
              // Verifica se playlist esiste ancora
              const existing = await getTidalPlaylist(playlistId, accessToken);
              if (!existing && session.tidal_user_id) {
                // Playlist eliminata, ricreala
                const playlist = await createTidalPlaylist(session.name, accessToken, session.tidal_user_id);
                playlistId = playlist.id;
                
                await supabase
                  .from('sessioni_libere')
                  .update({ tidal_playlist_id: playlistId })
                  .eq('id', request.session_id);
              }
            }
            
            if (playlistId) {
              let trackIdToAdd = request.track_id;
              
              // Tenta di aggiungere con l'ID originale
              try {
                await addTrackToTidalPlaylist(playlistId, trackIdToAdd!, accessToken);
              } catch (addError) {
                // Se fallisce, prova a cercare il brano su Tidal usando title + artists
                // (potrebbe essere un ID Deezer se il catalogo è stato cambiato dopo la richiesta)
                if (request.title) {
                  try {
                    const searchQuery = request.artists ? `${request.title} ${request.artists}` : request.title;
                    const searchResults = await searchTidal(searchQuery, accessToken, 5, 0);
                    
                    if (searchResults.tracks && searchResults.tracks.length > 0) {
                      // Usa il primo risultato
                      trackIdToAdd = searchResults.tracks[0].id;
                      await addTrackToTidalPlaylist(playlistId, trackIdToAdd, accessToken);
                    } else {
                      throw new Error(`Brano "${request.title}" non trovato su Tidal`);
                    }
                  } catch (searchError) {
                    // Se la ricerca fallisce, rilancia l'errore originale
                    throw addError;
                  }
                } else {
                  throw addError;
                }
              }
              
              // Marca come success
              await supabase
                .from('richieste_libere')
                .update({ 
                  tidal_added_status: 'success',
                  tidal_added_at: new Date().toISOString(),
                  tidal_error_message: null
                })
                .eq('id', request_id);
            }
          } catch (error) {
            // Marca come failed per retry successivo
            await supabase
              .from('richieste_libere')
              .update({ 
                tidal_added_status: 'failed',
                tidal_error_message: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq('id', request_id);
          }
        });
      }
    }
  }
  
  const statusMessages: Record<string, string> = {
    'accepted': 'accettata',
    'rejected': 'rifiutata', 
    'cancelled': 'cancellata',
    'played': 'segnata come suonata',
    'new': 'ripristinata in coda'
  };
  
  return withVersion({ 
    ok: true, 
    message: `Richiesta ${statusMessages[status]} ✓` 
  });
}