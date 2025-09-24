import { NextResponse } from 'next/server';
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
  status: 'new' | 'accepted' | 'rejected' | 'muted';
  duplicates?: number; // how many times merged/duplicated
};

const store: RequestItem[] = [];

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
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data || [] });
  } else {
    let list = store;
    if (id) list = list.filter((r) => r.id === id);
    if (eventCode) list = list.filter((r) => r.event_code === eventCode);
    if (status) list = list.filter((r) => r.status === status);
    return NextResponse.json({ requests: list });
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<RequestItem>;
  const now = new Date().toISOString();
  const item: RequestItem = {
    id: `${Date.now()}`,
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
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('requests').insert(item).select('*').single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  } else {
    store.unshift(item);
    return NextResponse.json({ ok: true, item });
  }
}

export async function PATCH(req: Request) {
  try {
    const djSecret = process.env.DJ_PANEL_SECRET?.trim();
    const header = req.headers.get('x-dj-secret')?.trim();
    if (djSecret && header !== djSecret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const body = (await req.json()) as { id: string; action: 'accept' | 'reject' | 'mute' | 'merge'; mergeWithId?: string };
    const supabase = getSupabase();
    if (supabase) {
      if (body.action === 'merge') {
        if (body.mergeWithId) {
          const { data: target, error: e1 } = await supabase.from('requests').select('*').eq('id', body.mergeWithId).single();
          if (e1 || !target) return NextResponse.json({ ok: false, error: 'merge_target_not_found' }, { status: 404 });
          const { error: e2 } = await supabase.from('requests').delete().eq('id', body.id);
          if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
          const { data, error: e3 } = await supabase.from('requests').update({ duplicates: (target.duplicates || 0) + 1 }).eq('id', body.mergeWithId).select('*').single();
          if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });
          return NextResponse.json({ ok: true, mergedInto: body.mergeWithId, target: data });
        } else {
          const { data, error } = await supabase.from('requests').select('*').eq('id', body.id).single();
          if (error || !data) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
          const { data: upd, error: e2 } = await supabase.from('requests').update({ duplicates: (data.duplicates || 0) + 1 }).eq('id', body.id).select('*').single();
          if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
          return NextResponse.json({ ok: true, item: upd });
        }
      }
      const map: Record<'accept'|'reject'|'mute', Partial<RequestItem>> = {
        accept: { status: 'accepted' },
        reject: { status: 'rejected' },
        mute: { status: 'muted' },
      };
      const patch = map[body.action];
      if (!patch) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
      const { data, error } = await supabase.from('requests').update(patch).eq('id', body.id).select('*').single();
      if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true, item: data });
    }

    // fallback in-memory
    const idx = store.findIndex((r) => r.id === body.id);
    if (idx === -1) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
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
        return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
