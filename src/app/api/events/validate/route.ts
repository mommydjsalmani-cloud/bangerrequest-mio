import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { eventsStore } from '@/lib/eventsStore';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ ok: false, valid: false, error: 'missing_code' }, { status: 400 });
  const supabase = getSupabase();
  if (supabase) {
    // prefer status column if exists; fallback to active
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('code', code)
      .in('status', ['active'])
      .limit(1)
      .maybeSingle();
    if (error) {
      // se status non esiste ancora, riprova usando active
      const { data: data2, error: error2 } = await supabase
        .from('events')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      if (error2) return NextResponse.json({ ok: false, valid: false, error: error2.message }, { status: 500 });
      return NextResponse.json({ ok: true, valid: !!data2, event: data2 || null });
    }
    return NextResponse.json({ ok: true, valid: !!data, event: data || null });
  }
  const ev = eventsStore.find(e => e.code === code && (e.active || (('status' in e) && (e as { status?: string }).status === 'active')));
  return NextResponse.json({ ok: true, valid: !!ev, event: ev || null });
}
