import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { RequestItem } from '../route';
// Nota: import type per non creare dipendenza runtime circolare

// Endpoint: /api/requests/raw
// Scopo: debug – restituisce le righe così come sono salvate (senza grouping) ordinando per created_at DESC
// Query params supportati: event_code, track_id, status, limit (default 100)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventCode = url.searchParams.get('event_code');
  const trackId = url.searchParams.get('track_id');
  const status = url.searchParams.get('status');
  const limitParam = parseInt(url.searchParams.get('limit') || '100', 10);
  const limit = isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 500);
  const supabase = getSupabase();
  if (supabase) {
    let q = supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(limit);
    if (eventCode) q = q.eq('event_code', eventCode);
    if (trackId) q = q.eq('track_id', trackId);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data, count: data?.length || 0 });
  }
  // Fallback in-memory: accediamo allo store tramite import dinamico del modulo principale
  try {
    const mainMod = await import('../route');
    // @ts-ignore access internal store (non esportato: se non presente ritorna info)
    const internalStore: RequestItem[] | undefined = mainMod.__store || mainMod.store || undefined;
    if (!internalStore) {
      return NextResponse.json({ ok: true, supabase: false, reason: 'no_supabase_client_no_store' });
    }
    let rows = [...internalStore];
    if (eventCode) rows = rows.filter(r => r.event_code === eventCode);
    if (trackId) rows = rows.filter(r => r.track_id === trackId);
    if (status) rows = rows.filter(r => r.status === status);
    rows.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ ok: true, supabase: false, rows: rows.slice(0, limit), count: Math.min(rows.length, limit) });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, supabase: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
