import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { sendNewRequestNotification, isWebPushConfigured } from '@/lib/webpush';

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
    let q = supabase.from('requests').select('*').order('created_at', { ascending: false });
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
  const body = (await req.json()) as Partial<RequestItem>;
  const now = new Date().toISOString();
  const supabase = getSupabase();
  // Se il DB in produzione ha id UUID, usiamo randomUUID quando supabase è attivo
  const generatedId = supabase ? randomUUID() : `${Date.now()}`;
  const item: RequestItem = {
    id: generatedId,
    created_at: now,
    track_id: body.track_id || 'unknown',
    uri: body.uri,
    title: body.title,
    artists: body.artists,
    album: body.album,
    cover_url: body.cover_url ?? null,
    isrc: body.isrc ?? null,
    explicit: !!body.explicit,
    preview_url: body.preview_url ?? null,
    duration_ms: body.duration_ms,
    note: body.note,
    event_code: body.event_code ?? null,
    requester: body.requester ?? null,
    status: 'new',
    duplicates: 0,
  };
  if (supabase) {
    const { data, error } = await supabase.from('requests').insert(item).select('*').single();
    if (error) {
      interface PgErr { code?: string; hint?: string | null; details?: string | null }
      const raw = error as unknown as PgErr;
      return withVersion({ ok: false, error: error.message, details: { code: raw.code, hint: raw.hint, details: raw.details } }, { status: 500 });
    }
    
    // Invia notifica push per nuova richiesta (se configurato)
    if (isWebPushConfigured()) {
      try {
        await sendNewRequestNotification({
          id: data.id,
          titolo: data.title || 'Titolo sconosciuto',
          artista: data.artists || 'Artista sconosciuto',
          nome_richiedente: data.requester || undefined,
        });
      } catch (pushError) {
        // Log error ma non bloccare la risposta
        console.error('Push notification failed:', pushError);
      }
    }
    
    return withVersion({ ok: true, item: data });
  } else {
    store.unshift(item);
    return withVersion({ ok: true, item });
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
          const { data: target, error: e1 } = await supabase.from('requests').select('*').eq('id', body.mergeWithId).single();
          if (e1 || !target) return withVersion({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
          const { error: e2 } = await supabase.from('requests').delete().eq('id', body.id);
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          const { data, error: e3 } = await supabase.from('requests').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
          if (e3) return withVersion({ ok: false, error: e3.message }, { status: 500 });
          return withVersion({ ok: true, mergedInto: body.mergeWithId, target: data });
        } else {
          const { data, error } = await supabase.from('requests').select('*').eq('id', body.id).single();
          if (error || !data) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
          const { data: upd, error: e2 } = await supabase.from('requests').update({ duplicates: (data.duplicates || 0) + 1 }).eq('id', body.id).select('*').single();
          if (e2) return withVersion({ ok: false, error: e2.message }, { status: 500 });
          return withVersion({ ok: true, item: upd });
        }
      }
      if (body.action === 'cancel') {
        const { data, error } = await supabase.from('requests').update({ status: 'cancelled' }).eq('id', body.id).select('*').single();
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
      const { data, error } = await supabase.from('requests').update(patch).eq('id', body.id).select('*').single();
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
