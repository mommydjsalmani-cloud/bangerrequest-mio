import { NextResponse } from 'next/server';

export async function GET() {
  // Invece di richiamare via fetch interna (che richiederebbe sapere base URL corretto) calcoliamo direttamente i due blocchi
  // Ricostruendo la stessa logica dei singoli endpoint per evitare problemi di fetch interna in edge/runtime.

  // Supabase health (replica logica esistente)
  const supabaseBlock = await (async () => {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (!hasUrl || !hasKey) {
      return {
        ok: false,
        mode: 'in-memory',
        error: 'missing_env',
        hasUrl,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      };
    }
    return { ok: true, mode: 'supabase' };
  })();

  // Auth health (replica logica esistente)
  const haveUser = !!process.env.DJ_PANEL_USER?.trim();
  const haveSecret = !!process.env.DJ_PANEL_SECRET?.trim();
  const authBlock = haveUser && haveSecret
    ? { ok: true }
    : { ok: false, error: 'misconfigured', haveUser, haveSecret };

  return NextResponse.json({ supabase: supabaseBlock, auth: authBlock });
}
