import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// Endpoint di debug: /api/requests/debug
// Ritorna info sulla presenza della colonna duplicates_log e un sample record
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, supabase: false, reason: 'no_supabase_client' });
  }
  // Controllo presenza colonna via select specifica
  let columnExists = false;
  let sample: { id?: string; duplicates?: number; duplicates_log?: unknown } | null = null;
  let errorMessage: string | null = null;
  try {
    const { data, error } = await supabase.from('requests').select('id,duplicates,duplicates_log').limit(1);
    if (error) {
      errorMessage = error.message;
    } else {
      columnExists = data && data.length > 0 ? Object.prototype.hasOwnProperty.call(data[0], 'duplicates_log') : true; // se tabella vuota assumiamo che la select non abbia fallito -> colonna esiste
      sample = data && data[0] ? data[0] : null;
    }
  } catch (e: unknown) {
    errorMessage = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({ ok: true, supabase: true, columnExists, sample, error: errorMessage });
}
