import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { RequestItem } from '../route';

// Endpoint diagnostico rapido per contare quante righe esistono per una stessa traccia/evento
// GET /api/requests/check?event_code=EVT&track_id=XYZ
// Se ometti track_id ritorna conteggi per tutte le track di quell'evento (limit 50 distinte più frequenti)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventCode = url.searchParams.get('event_code');
  const trackId = url.searchParams.get('track_id');
  const supabase = getSupabase();
  if (!eventCode) {
    return NextResponse.json({ ok: false, error: 'missing_event_code' }, { status: 400 });
  }
  if (supabase) {
    if (trackId) {
      const { data, error } = await supabase.from('requests').select('*').eq('event_code', eventCode).eq('track_id', trackId).order('created_at', { ascending: false }).limit(100);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, event_code: eventCode, track_id: trackId, count: data?.length || 0, ids: (data||[]).map(r=>r.id) });
    } else {
      // Contiamo per track_id (null/unknown raggruppati) limit top 50
      const { data, error } = await supabase.from('requests').select('id,track_id,event_code,created_at').eq('event_code', eventCode).order('created_at',{ascending:false}).limit(1000);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      const buckets: Record<string, number> = {};
      (data||[]).forEach(r=>{ const k = r.track_id||'unknown'; buckets[k]=(buckets[k]||0)+1; });
      const top = Object.entries(buckets).sort((a,b)=> b[1]-a[1]).slice(0,50).map(([track,count])=>({ track_id: track, count }));
      return NextResponse.json({ ok: true, event_code: eventCode, tracks: top });
    }
  } else {
    // in-memory path
    // @ts-expect-error exposed in requests/route
    const store: RequestItem[] = globalThis.__requestsStore || [];
    const filtered = store.filter(r=> r.event_code === eventCode);
    if (trackId) {
      const sub = filtered.filter(r=> r.track_id === trackId);
      return NextResponse.json({ ok: true, event_code: eventCode, track_id: trackId, count: sub.length, ids: sub.map(r=>r.id) });
    } else {
      const buckets: Record<string, number> = {};
      filtered.forEach(r=> { const k = r.track_id||'unknown'; buckets[k]=(buckets[k]||0)+1; });
      const top = Object.entries(buckets).sort((a,b)=> b[1]-a[1]).slice(0,50).map(([track,count])=>({ track_id: track, count }));
      return NextResponse.json({ ok: true, event_code: eventCode, tracks: top });
    }
  }
}
