import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { eventsStore } from '@/lib/eventsStore';

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
  if (authErr) return NextResponse.json({ ok:false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('events').select('id, code, name, status, active, created_at').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });
    return NextResponse.json({ ok:true, mode: 'supabase', count: data?.length || 0, codes: (data||[]).map(e=>e.code), events: data });
  }
  return NextResponse.json({ ok:true, mode: 'in-memory', count: eventsStore.length, codes: eventsStore.map(e=>e.code), events: eventsStore });
}

export async function DELETE(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return NextResponse.json({ ok:false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  const supabase = getSupabase();
  if (supabase) {
    // Cancelliamo prima requests che fanno riferimento a event_code, poi events
    const delReq = await supabase.from('requests').delete().neq('id', '___never'); // condizione fittizia per forzare delete all
    if (delReq.error) return NextResponse.json({ ok:false, step: 'delete_requests', error: delReq.error.message }, { status:500 });
    const delEv = await supabase.from('events').delete().neq('id', '___never');
    if (delEv.error) return NextResponse.json({ ok:false, step: 'delete_events', error: delEv.error.message }, { status:500 });
    return NextResponse.json({ ok:true, deletedRequests: delReq.count ?? null, deletedEvents: delEv.count ?? null });
  }
  // in-memory
  eventsStore.splice(0, eventsStore.length);
  return NextResponse.json({ ok:true, deletedInMemory: true });
}
