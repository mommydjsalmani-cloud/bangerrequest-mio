import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return NextResponse.json({
      ok: false,
      mode: 'in-memory',
      error: 'missing_env',
      hasUrl,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hint: 'Aggiungi NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY per abilitare persistenza'
    }, { status: 500 });
  }
  async function tableExists(client: ReturnType<typeof getSupabase>, name: string) {
    try {
      const { error } = await client!.from(name).select('*', { count: 'exact', head: true });
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }
  const [hasRequests, hasEvents] = await Promise.all([tableExists(supabase, 'requests'), tableExists(supabase, 'events')]);
  return NextResponse.json({
    ok: true,
    mode: 'supabase',
    tables: { requests: hasRequests, events: hasEvents }
  });
}
