import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { sendTelegramMessage, escapeHtml, getDjPanelUrl } from '@/lib/telegram';

type RequestItem = {
  id: string;
  created_at: string;
  track_id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  isrc?: string | null;
  explicit?: boolean;
  preview_url?: string | null;
  duration_ms?: number;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
  status: 'new' | 'accepted' | 'rejected' | 'muted' | 'cancelled';
  duplicates?: number; // how many times merged/duplicated
};

const store: RequestItem[] = [];
const BUILD_TAG = 'requests-diagnostics-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventCode = url.searchParams.get('event_code');
  const status = url.searchParams.get('status');
  const id = url.searchParams.get('id');
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase!.from('requests').select('*').order('created_at', { ascending: false });
    if (id) q = q.eq('id', id);
    if (eventCode) q = q.eq('event_code', eventCode);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return withVersion({ ok: false, error: error.message }, { status: 500 });
    return withVersion({ ok: true, requests: data || [] });
  } else {
    let list = store;
    if (id) list = list.filter((r) => r.id === id);
    if (eventCode) list = list.filter((r) => r.event_code === eventCode);
    if (status) list = list.filter((r) => r.status === status);
    return withVersion({ ok: true, requests: list });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { session_token: string; requester_name?: string; track_id?: string; uri?: string; title: string; artists: string; album?: string; cover_url?: string; isrc?: string; explicit?: boolean; preview_url?: string; duration_ms?: number; note?: string };
    
    if (!body.session_token || !body.title || !body.artists) {
      return withVersion({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

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

    const { data, error } = await supabase!.from('richieste_libere').insert(newRequest).select('*').single();
    if (error) return withVersion({ ok: false, error: error.message }, { status: 500 });

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
    const supabase = getSupabase();
    if (supabase) {
      if (body.action === 'merge') {
        if (body.mergeWithId) {
          const { data: target, error: e1 } = await supabase!.from('requests').select('*').eq('id', body.mergeWithId).single();
          if (e1 || !target) return withVersion({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
          const { error: e2 } = await supabase!.from('requests').delete().eq('id', body.id);
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          const { data, error: e3 } = await supabase!.from('requests').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
          if (e3) return withVersion({ ok: false, error: e3.message }, { status: 500 });
          return withVersion({ ok: true, mergedInto: body.mergeWithId, target: data });
        } else {
          const { data, error } = await supabase!.from('requests').select('*').eq('id', body.id).single();
          if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
          const { data: upd, error: e2 } = await supabase!.from('requests').update({ duplicates: (data.duplicates || 0) + 1 }).eq('id', body.id).select('*').single();
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          return withVersion({ ok: true, item: upd });
        }
      }
      if (body.action === 'cancel') {
        const { data, error } = await supabase!.from('requests').update({ status: 'cancelled' }).eq('id', body.id).select('*').single();
        if (error || !data) return withVersion({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
        return withVersion({ ok: true, item: data });
      }
      const map: Record<'accept'|'reject'|'mute', Partial<RequestItem>> = {
        accept: { status: 'accepted' },
        reject: { status: 'rejected' },
        mute: { status: 'muted' },
      };
      const patch = map[body.action];
      if (!patch) return withVersion({ ok: false, error: 'invalid_action' }, { status: 400 });
      const { data, error } = await supabase!.from('requests').update(patch).eq('id', body.id).select('*').single();
      if (error || !data) return withVersion({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
      return withVersion({ ok: true, item: data });
    }

    // fallback in-memory
    const idx = store.findIndex((r) => r.id === body.id);
  if (idx === -1) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
    const item = store[idx];
    switch (body.action) {
      case 'accept':
        item.status = 'accepted';
        break;
      case 'reject':
        item.status = 'rejected';
        break;
      case 'mute':
        item.status = 'muted';
        break;
      case 'cancel':
        item.status = 'cancelled';
        break;
      case 'merge': {
        const target = body.mergeWithId ? store.find((r) => r.id === body.mergeWithId) : null;
        if (target) {
          target.duplicates = (target.duplicates || 0) + 1;
          store.splice(idx, 1);
          return NextResponse.json({ ok: true, mergedInto: target.id, target });
        } else {
          item.duplicates = (item.duplicates || 0) + 1;
        }
        break;
      }
      default:
        return withVersion({ ok: false, error: 'invalid_action' }, { status: 400 });
    }
    return withVersion({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return withVersion({ ok: false, error: message }, { status: 400 });
  }
}
