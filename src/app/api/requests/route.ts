import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabase } from '@/lib/supabase';

export type RequestItem = {
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
  duration_ms?: number | null;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
  status: 'new' | 'accepted' | 'rejected' | 'muted' | 'cancelled';
  duplicates?: number; // how many times merged/duplicated
  // Log dettagliato degli arrivi duplicati (solo POST duplicati, non merge):
  // Ogni entry: { at: ISO timestamp, requester, note }
  duplicates_log?: { at: string; requester?: string | null; note?: string | null }[];
};

// Tipo row Supabase (duplicates_log può essere null / assente)
type SupabaseRequestRow = Omit<RequestItem, 'duplicates_log'> & { duplicates_log?: RequestItem['duplicates_log'] | null };

function normalizeRow(row: unknown): RequestItem {
  const base = row as SupabaseRequestRow;
  return { ...base, duplicates_log: Array.isArray(base?.duplicates_log) ? base.duplicates_log : [] } as RequestItem;
}
// Internal in-memory store (non export per compatibilità con type Route Next.js)
const _memoryStore: RequestItem[] = [];
// Esposto solo per endpoint debug raw tramite globalThis
// @ts-expect-error debug exposure
globalThis.__requestsStore = _memoryStore;
const BUILD_TAG = 'requests-diagnostics-v1';

function withVersion<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status, headers: { 'X-App-Version': BUILD_TAG } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventCode = url.searchParams.get('event_code');
  const status = url.searchParams.get('status');
  const id = url.searchParams.get('id');
  const trackId = url.searchParams.get('track_id');
  const supabase = getSupabase();
  if (supabase) {
  let q = supabase.from('requests').select('*').order('created_at', { ascending: false });
    if (eventCode) q = q.eq('event_code', eventCode);
    if (status) q = q.eq('status', status);
    if (trackId) q = q.eq('track_id', trackId);
    const { data, error } = await q;
    if (error) return withVersion({ ok: false, error: error.message }, { status: 500 });
    const normalized = (data || []).map(r => normalizeRow(r));
    return withVersion({ ok: true, requests: normalized });
  } else {
  let list = _memoryStore;
  if (id) list = list.filter((r) => r.id === id);
    if (eventCode) list = list.filter((r) => r.event_code === eventCode);
    if (status) list = list.filter((r) => r.status === status);
    if (trackId) list = list.filter((r) => r.track_id === trackId);
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
    duration_ms: (() => {
      if (typeof body.duration_ms === 'number') return body.duration_ms;
      // supporta campo alternativo "duration" in secondi senza usare any
      const maybeSeconds = (body as unknown as { duration?: unknown }).duration;
      if (typeof maybeSeconds === 'number') return maybeSeconds * 1000;
      return null;
    })(),
    note: body.note,
    event_code: body.event_code ?? null,
    requester: body.requester ?? null,
    status: 'new',
    duplicates: 0,
  };
  if (supabase) {
    // Duplicate detection avanzata:
    // 1. Se disponibile track_id tenta match diretto.
    // 2. Se non trova (o track_id assente) e sono presenti title+artists effettua fallback su normalizzazione (case insensitive, trim) di title+artists.
    if (body.event_code) {
  type DetectionResult = { original: RequestItem; mode: 'track_id' | 'title_artists' } | null;
  let detection: DetectionResult = null;
      const norm = (s?: string | null) => (s || '').toLowerCase().trim();

      // 1. Tentativo via track_id
      if (body.track_id) {
        const { data: dupList, error: dupErr } = await supabase
          .from('requests')
          .select('*')
            .eq('event_code', body.event_code)
          .eq('track_id', body.track_id)
          .in('status', ['new', 'accepted', 'muted'])
          .order('created_at', { ascending: true });
        if (!dupErr && dupList && dupList.length > 0) {
          detection = { original: normalizeRow(dupList[0]) as RequestItem, mode: 'track_id' };
        }
      }

      // 2. Fallback via title+artists se non già trovato
      if (!detection && body.title && body.artists) {
        const { data: candidates, error: candErr } = await supabase
          .from('requests')
          .select('*')
          .eq('event_code', body.event_code)
          .in('status', ['new', 'accepted', 'muted'])
          .order('created_at', { ascending: true })
          .limit(200);
        if (!candErr && candidates && candidates.length > 0) {
          const t = norm(body.title);
          const a = norm(body.artists);
          const typed = candidates.map(c => normalizeRow(c));
          const found = typed.find(r => norm(r.title) === t && norm(r.artists) === a);
          if (found) {
            detection = { original: found, mode: 'title_artists' };
          }
        }
      }

      if (detection) {
        const original = detection.original;
        const newDuplicatesCount = (original.duplicates || 0) + 1;
        const { data: updatedOriginal, error: updErr } = await supabase
          .from('requests')
          .update({ duplicates: newDuplicatesCount })
          .eq('id', original.id)
          .select('*')
          .single();
        if (updErr || !updatedOriginal) {
          return withVersion({ ok: true, duplicate: true, detection_mode: detection.mode, existing: { id: original.id, status: original.status, duplicates: newDuplicatesCount, title: original.title, artists: original.artists }, log_saved: false, fallback_reason: updErr?.message || 'update_failed' });
        }
        const duplicateRow = {
          id: randomUUID(),
          created_at: now,
          track_id: updatedOriginal.track_id,
          uri: updatedOriginal.uri,
          title: updatedOriginal.title,
          artists: updatedOriginal.artists,
          album: updatedOriginal.album,
          cover_url: updatedOriginal.cover_url,
          isrc: updatedOriginal.isrc,
          explicit: updatedOriginal.explicit,
          preview_url: updatedOriginal.preview_url,
          duration_ms: updatedOriginal.duration_ms ?? null,
          note: body.note,
          event_code: updatedOriginal.event_code,
          requester: body.requester ?? null,
          status: 'new' as const,
          duplicates: 0,
          duplicates_log: [],
        } satisfies RequestItem;
        let insertedDuplicate: RequestItem | null = null;
        let replicatedError: string | null = null;
        try {
          const { data: insData, error: insErr } = await supabase.from('requests').insert(duplicateRow).select('*').single();
          if (insErr) {
            replicatedError = insErr.message;
          } else if (insData) {
            insertedDuplicate = normalizeRow(insData);
          }
        } catch (e: unknown) {
          replicatedError = e instanceof Error ? e.message : String(e);
        }
        if (replicatedError) {
          console.error('[requests][duplicate][insert_failed]', { original_id: updatedOriginal.id, error: replicatedError });
        }
        return withVersion({
          ok: true,
          duplicate: true,
          detection_mode: detection.mode,
          existing: { id: updatedOriginal.id, status: updatedOriginal.status, duplicates: updatedOriginal.duplicates, title: updatedOriginal.title, artists: updatedOriginal.artists },
          replicated: !!insertedDuplicate,
          duplicate_row: insertedDuplicate,
          replicated_error: replicatedError || undefined
        });
      }
    }
    const { data, error } = await supabase.from('requests').insert(item).select('*').single();
    if (error) {
      interface PgErr { code?: string; hint?: string | null; details?: string | null }
      const raw = error as unknown as PgErr;
      return withVersion({ ok: false, error: error.message, details: { code: raw.code, hint: raw.hint, details: raw.details } }, { status: 500 });
    }
    const normInsert = data ? normalizeRow(data) : data;
    return withVersion({ ok: true, item: normInsert });
  } else {
    // In-memory duplicate detection avanzata (parità con Supabase)
    if (body.event_code) {
      const norm = (s?: string | null) => (s || '').toLowerCase().trim();
      let original: RequestItem | null = null;
      let detectionMode: 'track_id' | 'title_artists' | null = null;
  const candidates = _memoryStore.filter(r => r.event_code === body.event_code && ['new','accepted','muted'].includes(r.status));
      if (body.track_id) {
        const byTrack = candidates.filter(r => r.track_id === body.track_id);
        if (byTrack.length > 0) {
          original = [...byTrack].sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
          detectionMode = 'track_id';
        }
      }
      if (!original && body.title && body.artists) {
        const t = norm(body.title); const a = norm(body.artists);
        const byMeta = candidates.filter(r => norm(r.title) === t && norm(r.artists) === a);
        if (byMeta.length > 0) {
          original = [...byMeta].sort((a,b)=> new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
          detectionMode = 'title_artists';
        }
      }
      if (original && detectionMode) {
        original.duplicates = (original.duplicates || 0) + 1;
        const duplicateRow: RequestItem = {
          ...original,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          created_at: now,
          note: body.note,
          requester: body.requester ?? null,
          duplicates: 0,
          duplicates_log: []
        };
  _memoryStore.unshift(duplicateRow);
        return withVersion({ ok: true, duplicate: true, detection_mode: detectionMode, existing: { id: original.id, status: original.status, duplicates: original.duplicates, title: original.title, artists: original.artists }, replicated: true, duplicate_row: duplicateRow });
      }
    }
  _memoryStore.unshift(item);
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
          const { error: delErr } = await supabase.from('requests').delete().eq('id', body.id);
          if (delErr) return withVersion({ ok: false, error: delErr.message }, { status: 500 });
          // Non incrementiamo duplicates: semantica aggiornata (solo POST dup)
          return withVersion({ ok: true, mergedInto: body.mergeWithId, target, origin });
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
          return withVersion({ ok: true, autoMerged: false, reason: 'no_candidate_found', item: origin });
        }
        // Esegui merge origin -> best
        const { error: delErr } = await supabase.from('requests').delete().eq('id', origin.id);
        if (delErr) return withVersion({ ok: false, error: delErr.message }, { status: 500 });
        return withVersion({ ok: true, autoMerged: true, mergedInto: best.id, target: best, origin });
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
  const idx = _memoryStore.findIndex((r) => r.id === body.id);
  if (idx === -1) return withVersion({ ok: false, error: 'not_found' }, { status: 404 });
  const item = _memoryStore[idx];
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
  const target = body.mergeWithId ? _memoryStore.find((r) => r.id === body.mergeWithId) : null;
        if (target) {
          // Rimuove origin senza incrementare duplicates
          _memoryStore.splice(idx, 1);
          return withVersion({ ok: true, mergedInto: target.id, target });
        } else {
          return withVersion({ ok: true, autoMerged: false, reason: 'no_candidate_found', item });
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
