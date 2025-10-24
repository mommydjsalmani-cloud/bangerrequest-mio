import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { sendTelegramMessage, escapeHtml, getDjPanelUrl } from '@/lib/telegram';
import { validateMusicRequest, validateUUID, validateDjAction } from '@/lib/validation';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const BUILD_TAG = 'requests-diagnostics-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionToken = url.searchParams.get('session_token');
  const status = url.searchParams.get('status');
  const id = url.searchParams.get('id');
  const supabase = getSupabase();
  
  if (!supabase) {
    return withVersion({ ok: false, error: 'database_unavailable' }, { status: 500 });
  }

  let q = supabase.from('richieste_libere').select('*').order('created_at', { ascending: false });
  if (id) q = q.eq('id', id);
  if (sessionToken) {
    // Trova session_id dal token
    const { data: session } = await supabase.from('sessioni_libere').select('id').eq('token', sessionToken).single();
    if (session) q = q.eq('session_id', session.id);
  }
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return withVersion({ ok: false, error: 'query_failed' }, { status: 500 });
  return withVersion({ ok: true, requests: data || [] });
}

export async function POST(req: Request) {
  // Rate limiting
  const rateCheck = withRateLimit(req, RATE_LIMITS.MUSIC_REQUEST);
  if (!rateCheck.allowed) {
    return rateCheck.response;
  }

  try {
    const rawBody = await req.json();
    
    // Validazione e sanitizzazione
    const validation = validateMusicRequest(rawBody);
    if (!validation.valid) {
      return withVersion({ ok: false, error: validation.error }, { status: 400 });
    }
    
    const body = validation.data;
    
    const supabase = getSupabase();
    if (!supabase) {
      return withVersion({ ok: false, error: 'database_unavailable' }, { status: 500 });
    }

    // Trova sessione attiva tramite token
    const { data: session, error: sessionError } = await supabase!
      .from('sessioni_libere')
      .select('id, status')
      .eq('token', body.session_token)
      .eq('archived', false)
      .single();

    if (sessionError || !session) {
      return withVersion({ ok: false, error: 'invalid_session' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return withVersion({ ok: false, error: 'session_not_active' }, { status: 403 });
    }

    const newRequest = {
      id: randomUUID(),
      session_id: session.id,
      track_id: body.track_id || null,
      uri: body.uri || null,
      title: body.title,
      artists: body.artists,
      album: body.album || null,
      cover_url: body.cover_url || null,
      isrc: body.isrc || null,
      explicit: body.explicit || false,
      preview_url: body.preview_url || null,
      duration_ms: body.duration_ms || null,
      note: body.note || null,
      requester_name: body.requester_name || null,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('richieste_libere').insert(newRequest).select('*').single();
    if (error) return withVersion({ ok: false, error: 'insert_failed' }, { status: 500 });

    // Telegram notification hook
    try {
      const isTelegramEnabled = !!process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (isTelegramEnabled) {
        const song = data.title || '';
        const artist = data.artists || '';
        const who = data.requester_name || 'Anonimo';
        const comment = data.note || '';

        const text = [
          `🎵 <b>Nuova Richiesta!</b>`,
          `<b>Brano:</b> ${escapeHtml(String(song))}`,
          artist ? `<b>Artista:</b> ${escapeHtml(String(artist))}` : null,
          `<b>Da:</b> ${escapeHtml(String(who))}`,
          comment ? `<b>Commento:</b> "${escapeHtml(String(comment).slice(0,200))}"` : null,
        ].filter(Boolean).join('\n');

        await sendTelegramMessage({
          textHtml: text,
          inlineKeyboard: [[
            { text: '✅ Accetta', callbackData: `accept:${data.id}` },
            { text: '❌ Rifiuta', callbackData: `reject:${data.id}` }
          ], [
            { text: '🔎 Apri pannello', url: getDjPanelUrl() }
          ]]
        });
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('[Requests] telegram hook error', e);
    }

    return withVersion({ ok: true, item: data });
  } catch {
    return withVersion({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return withVersion({ ok: false, error: 'database_unavailable' }, { status: 500 });
  }

  try {
    const body = (await req.json()) as { id: string; action: 'accept' | 'reject' | 'mute' | 'merge' | 'cancel'; mergeWithId?: string };
    
    if (body.action !== 'cancel') {
      const djSecret = process.env.DJ_PANEL_SECRET?.trim();
      const djUser = process.env.DJ_PANEL_USER?.trim();
      if (!djSecret || !djUser) {
        return withVersion({ ok: false, error: 'misconfigured' }, { status: 500 });
      }
      const header = req.headers.get('x-dj-secret')?.trim();
      const headerUser = req.headers.get('x-dj-user')?.trim();
      if (header !== djSecret || headerUser !== djUser) {
        return withVersion({ ok: false, error: 'unauthorized' }, { status: 401 });
      }
    }
    
    if (body.action === 'merge') {
      if (body.mergeWithId) {
        const { data: target, error: e1 } = await supabase.from('richieste_libere').select('*').eq('id', body.mergeWithId).single();
        if (e1 || !target) return withVersion({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
        const { error: e2 } = await supabase.from('richieste_libere').delete().eq('id', body.id);
        if (e2) return withVersion({ ok: false, error: 'delete_failed' }, { status: 500 });
        const { data, error: e3 } = await supabase.from('richieste_libere').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
        if (e3) return withVersion({ ok: false, error: 'update_failed' }, { status: 500 });
        return withVersion({ ok: true, mergedInto: body.mergeWithId, target: data });
      } else {
        const { data, error } = await supabase.from('richieste_libere').select('*').eq('id', body.id).single();
        if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
        const { data: upd, error: e2 } = await supabase.from('richieste_libere').update({ duplicates: (data.duplicates || 0) + 1 }).eq('id', body.id).select('*').single();
        if (e2) return withVersion({ ok: false, error: 'update_failed' }, { status: 500 });
        return withVersion({ ok: true, item: upd });
      }
    }
    
    if (body.action === 'cancel') {
      const { data, error } = await supabase.from('richieste_libere').update({ status: 'cancelled' }).eq('id', body.id).select('*').single();
      if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
      return withVersion({ ok: true, item: data });
    }
    
    const statusMap: Record<'accept'|'reject'|'mute', string> = {
      accept: 'accepted',
      reject: 'rejected',
      mute: 'muted',
    };
    
    const newStatus = statusMap[body.action];
    if (!newStatus) return withVersion({ ok: false, error: 'invalid_action' }, { status: 400 });
    
    const { data, error } = await supabase.from('richieste_libere').update({ status: newStatus }).eq('id', body.id).select('*').single();
    if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
    return withVersion({ ok: true, item: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? 'request_error' : 'unknown_error';
    return withVersion({ ok: false, error: message }, { status: 400 });
  }
}
