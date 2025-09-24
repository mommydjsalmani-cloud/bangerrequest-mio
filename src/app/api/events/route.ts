import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { eventsStore, genCode, EventItem, EventStatus } from '@/lib/eventsStore';

// store & genCode ora centralizzati

function requireDJSecret(req: Request) {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';
  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  if (hSecret !== secret || hUser !== user) return 'unauthorized';
  return null;
}

export async function GET(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: 401 });
  const url = new URL(req.url);
  const active = url.searchParams.get('active');
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase.from('events').select('*').order('created_at', { ascending: false });
    if (active != null) q = q.eq('active', active === 'true');
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, events: data || [] });
  }
  let list = eventsStore;
  if (active != null) list = list.filter((e) => Boolean(e.active) === (active === 'true'));
  return NextResponse.json({ ok: true, events: list });
}

export async function POST(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: 401 });
  const body = (await req.json()) as Partial<EventItem> & { name?: string; code?: string; status?: EventStatus };
  const name = (body.name || '').trim();
  let code = (body.code || '').trim().toUpperCase();
  if (!name) return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 });
  if (!code) code = genCode();
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({ code, name, created_at: now, active: true, status: 'active' })
        .select('*')
        .single();
      if (error) {
        // Unique violation likely when code duplicates
        return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
      }
      return NextResponse.json({ ok: true, event: data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }
  if (eventsStore.some((e) => e.code === code))
    return NextResponse.json({ ok: false, error: 'duplicate_code' }, { status: 409 });
  const item: EventItem = { id: `${Date.now()}`, code, name, created_at: now, status: 'active', active: true };
  eventsStore.unshift(item);
  return NextResponse.json({ ok: true, event: item });
}

export async function PATCH(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: 401 });
  const body = (await req.json()) as { id?: string; code?: string; active?: boolean; name?: string; status?: EventStatus };
  const supabase = getSupabase();
  if (supabase) {
    const patch: { active?: boolean; name?: string; status?: string } = {};
    if (typeof body.status === 'string') {
      patch.status = body.status;
      patch.active = body.status === 'active';
    }
    if (typeof body.active === 'boolean') {
      patch.active = body.active;
      if (!patch.status) patch.status = body.active ? 'active' : 'paused';
    }
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'no_changes' }, { status: 400 });
    let q = supabase.from('events').update(patch);
    if (body.id) q = q.eq('id', body.id);
    else if (body.code) q = q.eq('code', body.code.toUpperCase());
    else return NextResponse.json({ ok: false, error: 'invalid_identifier' }, { status: 400 });
    const { data, error } = await q.select('*').single();
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, event: data });
  }
  const idx = eventsStore.findIndex((e) => (body.id && e.id === body.id) || (body.code && e.code === body.code?.toUpperCase()));
  if (idx === -1) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  const ev = eventsStore[idx];
  if (typeof body.status === 'string') {
    ev.status = body.status;
    ev.active = ev.status === 'active';
  }
  if (typeof body.active === 'boolean') {
    ev.active = body.active;
    ev.status = ev.active ? 'active' : (ev.status === 'closed' ? 'closed' : 'paused');
  }
  if (typeof body.name === 'string' && body.name.trim()) ev.name = body.name.trim();
  return NextResponse.json({ ok: true, event: ev });
}
