import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const BUILD_TAG = 'libere-api-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

function getClientIP(req: Request): string {
  // Estrae IP del client considerando proxy/load balancer
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const remoteAddr = req.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (remoteAddr) {
    return remoteAddr.trim();
  }
  
  return 'unknown';
}

async function checkRateLimit(supabase: NonNullable<ReturnType<typeof getSupabase>>, sessionId: string, clientIP: string, rateLimitEnabled: boolean = true, rateLimitSeconds: number = 60): Promise<boolean> {
  // Se il rate limiting è disabilitato, consenti sempre
  if (!rateLimitEnabled) {
    return true;
  }

  const now = new Date();
  const rateLimitInterval = new Date(now.getTime() - rateLimitSeconds * 1000);
  
  // Controlla rate limit esistente
  const { data: rateLimitData } = await supabase
    .from('libere_rate_limit')
    .select('*')
    .eq('client_ip', clientIP)
    .eq('session_id', sessionId)
    .single();
  
  if (rateLimitData) {
    const lastRequest = new Date(rateLimitData.last_request_at);
    
    // Se ultimo request è più recente dell'intervallo consentito, blocca
    if (lastRequest > rateLimitInterval) {
      return false; // rate limited
    }
    
    // Aggiorna timestamp
    await supabase
      .from('libere_rate_limit')
      .update({ 
        last_request_at: now.toISOString(),
        request_count: rateLimitData.request_count + 1 
      })
      .eq('id', rateLimitData.id);
  } else {
    // Crea nuovo record rate limit
    await supabase
      .from('libere_rate_limit')
      .insert({
        client_ip: clientIP,
        session_id: sessionId,
        last_request_at: now.toISOString(),
        request_count: 1
      });
  }
  
  return true; // rate limit ok
}

async function checkDuplicateRequest(supabase: NonNullable<ReturnType<typeof getSupabase>>, sessionId: string, title: string, artists?: string): Promise<boolean> {
  // Controlla se esiste già una richiesta simile negli ultimi 5 minuti
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const { data: duplicates } = await supabase
    .from('richieste_libere')
    .select('id')
    .eq('session_id', sessionId)
    .eq('title', title)
    .eq('artists', artists || '')
    .eq('archived', false)
    .gte('created_at', fiveMinutesAgo.toISOString());
  
  return !!(duplicates && duplicates.length > 0);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('s'); // token sessione
  const requestId = url.searchParams.get('request_id'); // per controllare status
  
  if (!token) {
    return withVersion({ ok: false, error: 'Token sessione richiesto' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  // Verifica sessione
  const { data: session } = await supabase
    .from('sessioni_libere')
    .select(`
      id, token, created_at, updated_at, status, name, reset_count, 
      last_reset_at, archived, rate_limit_enabled, rate_limit_seconds, 
      notes_enabled, homepage_visible, homepage_priority,
      event_code_required, event_code_value
    `)
    .eq('token', token)
    .eq('archived', false)
    .single();
  
  if (!session) {
    return withVersion({ ok: false, error: 'Sessione non trovata o scaduta' }, { status: 404 });
  }

  // DEBUG: Log della sessione per verificare campi
  console.log('Session from DB:', JSON.stringify(session, null, 2));
  console.log('event_code_required:', session.event_code_required);
  console.log('event_code_value:', session.event_code_value);

  // Se richiesto il controllo dello stato di una richiesta specifica
  if (requestId) {
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
  
  // Ritorna info sessione per la pagina pubblica
  return withVersion({ 
    ok: true, 
    session: {
      id: session.id,
      status: session.status,
      name: session.name,
      rate_limit_enabled: session.rate_limit_enabled,
      rate_limit_seconds: session.rate_limit_seconds,
      notes_enabled: session.notes_enabled
    }
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('s');
  
  if (!token) {
    return withVersion({ ok: false, error: 'Token sessione richiesto' }, { status: 400 });
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }
  
  // Verifica sessione
  const { data: session } = await supabase
    .from('sessioni_libere')
    .select(`
      id, token, created_at, updated_at, status, name, reset_count, 
      last_reset_at, archived, rate_limit_enabled, rate_limit_seconds, 
      notes_enabled, homepage_visible, homepage_priority,
      event_code_required, event_code_value
    `)
    .eq('token', token)
    .eq('archived', false)
    .single();
  
  if (!session) {
    return withVersion({ ok: false, error: 'Sessione non trovata o scaduta' }, { status: 404 });
  }
  
  if (session.status !== 'active') {
    return withVersion({ ok: false, error: 'Le richieste sono momentaneamente sospese' }, { status: 403 });
  }
  
  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return withVersion({ ok: false, error: 'Dati richiesta non validi' }, { status: 400 });
  }
  
  const { title, requester_name, note, track_id, uri, artists, album, cover_url, isrc, explicit, preview_url, duration_ms, source = 'manual', event_code } = body;
  
  if (!title?.trim()) {
    return withVersion({ ok: false, error: 'Titolo brano obbligatorio' }, { status: 400 });
  }
  
  // Verifica se il codice evento è richiesto per questa sessione
  if (session.event_code_required) {
    if (!event_code?.trim()) {
      return withVersion({ ok: false, error: 'Codice evento richiesto per questa sessione' }, { status: 400 });
    }
    
    // Verifica che il codice evento corrisponda a quello configurato dal DJ
    const expectedCode = session.event_code_value?.trim().toUpperCase();
    const providedCode = event_code.trim().toUpperCase();
    
    if (!expectedCode) {
      return withVersion({ ok: false, error: 'Codice evento non ancora configurato dal DJ' }, { status: 400 });
    }
    
    if (providedCode !== expectedCode) {
      return withVersion({ ok: false, error: 'Codice evento non valido' }, { status: 400 });
    }
  }
  
  // Controlla se le note sono abilitate per questa sessione
  const finalNote = session.notes_enabled ? (note?.trim() || null) : null;
  
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  
  // Rate limiting check
  const rateLimitOk = await checkRateLimit(supabase, session.id, clientIP, session.rate_limit_enabled, session.rate_limit_seconds);
  if (!rateLimitOk) {
    const seconds = session.rate_limit_seconds || 60;
    return withVersion({ ok: false, error: `Troppe richieste. Riprova tra ${seconds} secondi.` }, { status: 429 });
  }
  
  // Duplicate check
  const isDuplicate = await checkDuplicateRequest(supabase, session.id, title.trim(), artists?.trim());
  if (isDuplicate) {
    return withVersion({ ok: false, error: 'Richiesta già inviata di recente' }, { status: 409 });
  }
  
  // Crea richiesta
  const requestData = {
    session_id: session.id,
    track_id: track_id || null,
    uri: uri || null,
    title: title.trim(),
    artists: artists?.trim() || null,
    album: album?.trim() || null,
    cover_url: cover_url || null,
    isrc: isrc || null,
    explicit: explicit || false,
    preview_url: preview_url || null,
    duration_ms: duration_ms || null,
    requester_name: requester_name?.trim() || null,
    note: finalNote, // Usa la nota filtrata in base alle impostazioni sessione
    event_code: session.event_code_required ? (event_code?.trim() || null) : null,
    client_ip: clientIP,
    user_agent: userAgent,
    source: source,
    status: 'new',
    archived: false
  };
  
  const { data: newRequest, error } = await supabase
    .from('richieste_libere')
    .insert(requestData)
    .select()
    .single();
  
  if (error) {
    console.error('Errore creazione richiesta:', error);
    return withVersion({ ok: false, error: 'Errore salvamento richiesta' }, { status: 500 });
  }
  
  return withVersion({ 
    ok: true, 
    message: 'Richiesta ricevuta 🎶',
    request_id: newRequest.id,
    request: newRequest 
  }, { status: 201 });
}