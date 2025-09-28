import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';

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
    note: body.note,
    event_code: body.event_code ?? null,
    requester: body.requester ?? null,
    status: 'new',
    duplicates: 0,
  };
  if (supabase) {
    // Duplicate detection: stessa canzone già in coda per stesso event_code (stati ancora rilevanti)
    if (body.track_id && body.event_code) {
      const { data: dupList, error: dupErr } = await supabase
        .from('requests')
        .select('*')
        .eq('event_code', body.event_code)
        .eq('track_id', body.track_id)
        .in('status', ['new', 'accepted', 'muted']);
      if (!dupErr && dupList && dupList.length > 0) {
        // Incrementiamo duplicates sull'esistente per contare arrivo di una nuova richiesta uguale
        const existing = dupList[0];
        const { data: updated, error: updErr } = await supabase.from('requests').update({ duplicates: (existing.duplicates || 0) + 1 }).eq('id', existing.id).select('*').single();
        if (updErr || !updated) {
          return withVersion({ ok: false, error: updErr?.message || 'duplicate_update_failed' }, { status: 500 });
        }
        return withVersion({ ok: true, duplicate: true, existing: { id: updated.id, status: updated.status, duplicates: updated.duplicates, title: updated.title, artists: updated.artists } });
      }
    }
    const { data, error } = await supabase.from('requests').insert(item).select('*').single();
    if (error) {
      interface PgErr { code?: string; hint?: string | null; details?: string | null }
      const raw = error as unknown as PgErr;
      return withVersion({ ok: false, error: error.message, details: { code: raw.code, hint: raw.hint, details: raw.details } }, { status: 500 });
    }
    return withVersion({ ok: true, item: data });
  } else {
    // In-memory duplicate detection
    if (body.track_id && body.event_code) {
      const existing = store.find(r => r.track_id === body.track_id && r.event_code === body.event_code && ['new','accepted','muted'].includes(r.status));
      if (existing) {
        existing.duplicates = (existing.duplicates || 0) + 1;
        return withVersion({ ok: true, duplicate: true, existing: { id: existing.id, status: existing.status, duplicates: existing.duplicates, title: existing.title, artists: existing.artists } });
      }
    }
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
        // Se viene passato mergeWithId usiamo comportamento esplicito esistente
        if (body.mergeWithId) {
          const { data: target, error: e1 } = await supabase.from('requests').select('*').eq('id', body.mergeWithId).single();
          if (e1 || !target) return withVersion({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
          const { data: origin, error: eOrigin } = await supabase.from('requests').select('*').eq('id', body.id).single();
          if (eOrigin || !origin) return withVersion({ ok: false, error: 'merge_origin_not_found' }, { status: 404 });
          // Elimina origin
          const { error: delErr } = await supabase.from('requests').delete().eq('id', body.id);
          if (delErr) return withVersion({ ok: false, error: delErr.message }, { status: 500 });
          // Incrementa duplicates target
            const { data: updated, error: updErr } = await supabase.from('requests').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
            if (updErr) return withVersion({ ok: false, error: updErr.message }, { status: 500 });
            return withVersion({ ok: true, mergedInto: body.mergeWithId, target: updated, origin });
        }
        // AUTO-MERGE: trova un candidato con stessa track_id oppure (titolo+artisti) simili nello stesso evento
        const { data: origin, error: originErr } = await supabase.from('requests').select('*').eq('id', body.id).single();
        if (originErr || !origin) return withVersion({ ok: false, error: 'merge_origin_not_found' }, { status: 404 });
        // Criteri di similarità: stessa track_id OR (lower(title) + lower(artists)) e stesso event_code
        let candidateQuery = supabase.from('requests').select('*').neq('id', origin.id);
        if (origin.event_code) candidateQuery = candidateQuery.eq('event_code', origin.event_code);
        const { data: allCandidates, error: candErr } = await candidateQuery.limit(200);
        if (candErr) return withVersion({ ok: false, error: candErr.message }, { status: 500 });
        const norm = (s?: string|null) => (s||'').toLowerCase().trim();
        const oTitle = norm(origin.title);
        const oArtists = norm(origin.artists);
        let best: RequestItem | null = null;
        const candidates: RequestItem[] = (allCandidates || []) as unknown as RequestItem[];
        if (origin.track_id) {
          best = candidates.find(r => r.track_id === origin.track_id) || null;
        }
        if (!best) {
          best = candidates.find(r => norm(r.title) === oTitle && norm(r.artists) === oArtists) || null;
        }
        if (!best) {
          // Nessun candidato: incrementa duplicates sull'origin per indicare tentativo inutile (o restituisci errore specifico)
          const { data: updSelf, error: selfErr } = await supabase.from('requests').update({ duplicates: (origin.duplicates || 0) + 1 }).eq('id', origin.id).select('*').single();
          if (selfErr) return withVersion({ ok: false, error: selfErr.message }, { status: 500 });
          return withVersion({ ok: true, autoMerged: false, reason: 'no_candidate_found', item: updSelf });
        }
        // Esegui merge origin -> best
        const { error: delErr } = await supabase.from('requests').delete().eq('id', origin.id);
        if (delErr) return withVersion({ ok: false, error: delErr.message }, { status: 500 });
        const { data: updBest, error: updErr } = await supabase.from('requests').update({ duplicates: (best.duplicates || 0) + 1 }).eq('id', best.id).select('*').single();
        if (updErr) return withVersion({ ok: false, error: updErr.message }, { status: 500 });
        return withVersion({ ok: true, autoMerged: true, mergedInto: best.id, target: updBest, origin });
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
