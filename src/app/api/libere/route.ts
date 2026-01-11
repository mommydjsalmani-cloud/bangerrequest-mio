import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendTelegramMessage, escapeHtml, getDjPanelUrl } from '@/lib/telegram';

const BUILD_TAG = 'libere-api-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

function getClientIP(req: Request): string {
  // Estrae IP del client considerando vari header impostati da proxy (Cloudflare, Vercel, ecc.)
  // Preferiamo il primo elemento di x-forwarded-for (IP reale del client)
  const cf = req.headers.get('cf-connecting-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const remoteAddr = req.headers.get('x-remote-addr') || req.headers.get('x-remoteaddr');

  const pick = (v?: string | null) => (v ? v.split(',')[0].trim() : undefined);

  const ip = pick(cf) || pick(forwarded) || pick(realIP) || (remoteAddr ? remoteAddr.trim() : undefined);
  if (!ip) return 'unknown';

  // Normalizza eventuali IPv6 zone id (%eth0) rimuovendolo
  return ip.replace(/%[\w]+$/, '');
}

type RateLimitResult = { ok: boolean; retryAfterSeconds?: number };

async function checkRateLimit(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  sessionId: string,
  clientIP: string,
  rateLimitEnabled: boolean = true,
  rateLimitSeconds: number = 60,
  maxRequests: number = 3,
  blockDurationSeconds: number = 60 * 5
): Promise<RateLimitResult> {
  // Se il rate limiting è disabilitato, consenti sempre
  if (!rateLimitEnabled) return { ok: true };

  const now = new Date();
  const rateLimitInterval = new Date(now.getTime() - rateLimitSeconds * 1000);

  // Recupera record se esistente (maybeSingle evita errori se non c'è)
  const { data: rateLimitData } = await supabase
    .from('libere_rate_limit')
    .select('*')
    .eq('client_ip', clientIP)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (rateLimitData) {
    // Controlla se esiste un ban temporaneo
    if (rateLimitData.blocked_until) {
      const blockedUntil = new Date(rateLimitData.blocked_until);
      if (blockedUntil > now) {
        const remaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        return { ok: false, retryAfterSeconds: remaining };
      }
    }

    const lastRequest = new Date(rateLimitData.last_request_at);

    // Se ultimo request è più recente dell'intervallo consentito -> siamo in burst
    if (lastRequest > rateLimitInterval) {
      const newCount = (rateLimitData.request_count || 0) + 1;

      // Se supera la soglia, imposta blocked_until
      if (newCount >= maxRequests) {
        const blockedUntil = new Date(now.getTime() + blockDurationSeconds * 1000).toISOString();
        await supabase
          .from('libere_rate_limit')
          .update({ last_request_at: now.toISOString(), request_count: newCount, blocked_until: blockedUntil })
          .eq('id', rateLimitData.id);

        return { ok: false, retryAfterSeconds: blockDurationSeconds };
      }

      // Non ancora sopra soglia, solo incrementa contatore e blocca la richiesta
      await supabase
        .from('libere_rate_limit')
        .update({ last_request_at: now.toISOString(), request_count: newCount })
        .eq('id', rateLimitData.id);

      // Suggeriamo di ritentare dopo il limite normale
      return { ok: false, retryAfterSeconds: rateLimitSeconds };
    }

    // Altrimenti siamo fuori dal window => reset contatore
    await supabase
      .from('libere_rate_limit')
      .update({ last_request_at: now.toISOString(), request_count: 1, blocked_until: null })
      .eq('id', rateLimitData.id);

    return { ok: true };
  }

  // Nessun record: crea uno nuovo
  await supabase
    .from('libere_rate_limit')
    .insert({ client_ip: clientIP, session_id: sessionId, last_request_at: now.toISOString(), request_count: 1 });

  return { ok: true };
}

async function checkDuplicateRequest(supabase: NonNullable<ReturnType<typeof getSupabase>>, sessionId: string, title: string, artists?: string): Promise<{ isDuplicate: boolean; existingRequest?: { id: string; status: string } }> {
  // Controlla se esiste già una richiesta simile (non archiviata)
  const { data: duplicates } = await supabase
    .from('richieste_libere')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('title', title)
    .eq('artists', artists || '')
    .eq('archived', false)
    .in('status', ['new', 'accepted', 'played']) // Include anche brani già suonati
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (duplicates && duplicates.length > 0) {
    return { isDuplicate: true, existingRequest: duplicates[0] };
  }
  return { isDuplicate: false };
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
    .select('*')
    .eq('token', token)
    .eq('archived', false)
    .single();
  
  if (!session) {
    return withVersion({ ok: false, error: 'Sessione non trovata o scaduta' }, { status: 404 });
  }

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
      notes_enabled: session.notes_enabled,
      require_event_code: session.require_event_code,
      current_event_code: session.current_event_code
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
    .select('*')
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
  
  // Validazione codice evento se richiesto
  const eventCodeTrimmed = event_code?.trim() || null;
  if (session.require_event_code && !eventCodeTrimmed) {
    return withVersion({ ok: false, error: 'Codice evento mancante' }, { status: 400 });
  }
  // Se la sessione ha un codice evento corrente configurato, richiedi che corrisponda
  if (session.require_event_code && session.current_event_code) {
    const sessionCode = (session.current_event_code || '').toString().trim().toUpperCase();
    const providedCode = (eventCodeTrimmed || '').toString().trim().toUpperCase();
    if (sessionCode && providedCode !== sessionCode) {
      return withVersion({ ok: false, error: 'Codice evento non valido' }, { status: 403 });
    }
  }
  
  // Controlla se le note sono abilitate per questa sessione
  const finalNote = session.notes_enabled ? (note?.trim() || null) : null;
  
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  
  // Rate limiting check
  const rateLimitRes = await checkRateLimit(
    supabase,
    session.id,
    clientIP,
    session.rate_limit_enabled,
    session.rate_limit_seconds
  );
  if (!rateLimitRes.ok) {
    const seconds = rateLimitRes.retryAfterSeconds ?? session.rate_limit_seconds ?? 60;
    return withVersion({ ok: false, error: `Troppe richieste. Riprova tra ${seconds} secondi.` }, { status: 429 });
  }
  
  // Duplicate check - restituisce lo stato se già esiste
  const duplicateCheck = await checkDuplicateRequest(supabase, session.id, title.trim(), artists?.trim());
  if (duplicateCheck.isDuplicate && duplicateCheck.existingRequest) {
    const status = duplicateCheck.existingRequest.status;
    
    // Messaggi diversi in base allo stato
    let message: string;
    let statusLabel: string;
    
    if (status === 'played') {
      message = '🎵 Ottima scelta! 🎵 Ma questo brano è già stato suonato stasera!';
      statusLabel = '🎵 Già suonata';
    } else if (status === 'accepted') {
      message = '🎵 Ottima scelta! Questo brano è già in coda.';
      statusLabel = '✅ Accettata - il DJ la suonerà!';
    } else {
      message = '🎵 Ottima scelta! Questo brano è già in coda.';
      statusLabel = '⏳ In attesa di conferma';
    }
    
    return withVersion({ 
      ok: true, // Non è un errore, è un'informazione
      duplicate: true,
      message,
      existingStatus: status,
      existingStatusLabel: statusLabel,
      existingRequestId: duplicateCheck.existingRequest.id
    }, { status: 200 });
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
    client_ip: clientIP,
    user_agent: userAgent,
    source: source,
    status: 'new',
    archived: false,
    event_code: eventCodeTrimmed,
    event_code_upper: eventCodeTrimmed?.toUpperCase() || null
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
  
  // ========== Telegram notification hook ==========
  try {
    if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true') {
      const songTitle = newRequest.title || '';
      const artist = newRequest.artists || '';
      const requesterName = newRequest.requester_name || 'Ospite';
      const comment = newRequest.note || '';

      const text = [
        '🎵 <b>Nuova richiesta</b>',
        `<b>Brano:</b> ${escapeHtml(String(songTitle))} — ${escapeHtml(String(artist))}`,
        `<b>Da:</b> ${escapeHtml(String(requesterName))}`,
        comment ? `<b>Commento:</b> "${escapeHtml(String(comment).slice(0,200))}"` : null,
      ].filter(Boolean).join('\n');

      await sendTelegramMessage({
        textHtml: text,
        inlineKeyboard: [[
          { text: '✅ Accetta', callbackData: `accept:${newRequest.id}` },
          { text: '❌ Rifiuta', callbackData: `reject:${newRequest.id}` }
        ], [
          { text: '🎵 Suonata', callbackData: `played:${newRequest.id}` }
        ], [
          { text: '🔎 Apri pannello', url: getDjPanelUrl() }
        ]]
      });
    }
  } catch (e) {
    // Silenzia errori di rete/telegram per non bloccare il flusso
    if (process.env.NODE_ENV !== 'production') console.error('[Libere] telegram hook error', e);
  }

  return withVersion({ 
    ok: true, 
    message: 'Richiesta ricevuta 🎶',
    request_id: newRequest.id,
    request: newRequest 
  }, { status: 201 });
}