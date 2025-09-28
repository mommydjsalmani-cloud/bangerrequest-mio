import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST /api/requests/debug/write
// Body: { id?: string }
// Se id non passato prende il più recente. Tenta un append a duplicates_log per diagnosticare errori RLS/colonna.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: 'no_supabase' }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const targetId = body.id as string | undefined;
  let target: { id: string; duplicates_log?: unknown } | null = null;
  try {
    if (targetId) {
      const { data, error } = await supabase.from('requests').select('*').eq('id', targetId).single();
      if (error || !data) return NextResponse.json({ ok: false, error: 'target_not_found', details: error?.message });
      target = data;
    } else {
      const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !data) return NextResponse.json({ ok: false, error: 'no_rows', details: error?.message });
      target = data;
    }
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: 'query_failed', details: e instanceof Error ? e.message : String(e) });
  }
  const now = new Date().toISOString();
  const currentLog = Array.isArray(target?.duplicates_log) ? target.duplicates_log : [];
  const newEntry = { at: now, requester: 'debug_write', note: 'debug append' };
  const newLog = [...currentLog, newEntry];
  if (!target) {
    return NextResponse.json({ ok: false, error: 'no_target_after_fetch' }, { status: 404 });
  }
  try {
    const { data, error } = await supabase.from('requests').update({ duplicates_log: newLog }).eq('id', target.id).select('id,duplicates_log').single();
    if (error) {
      const raw = error as unknown as { code?: string; details?: string | null; hint?: string | null };
      return NextResponse.json({ ok: false, phase: 'update', error: error.message, code: raw.code, details: raw.details, hint: raw.hint });
    }
    return NextResponse.json({ ok: true, updated: data });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, phase: 'exception', error: e instanceof Error ? e.message : String(e) });
  }
}
