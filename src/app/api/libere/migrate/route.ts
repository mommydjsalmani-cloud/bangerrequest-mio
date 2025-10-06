import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

function requireDJSecret(req: Request) {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';
  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  if (hSecret !== secret || hUser !== user) return 'unauthorized';
  return null;
}

export async function POST(req: Request) {
  const authErr = requireDJSecret(req);
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: authErr === 'misconfigured' ? 500 : 401 });
  
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }

  try {
    let migrationNeeded = false;
    let sqlCommands = [];

    // Verifica se esiste la colonna rate_limit_enabled
    const { error: rateLimitError } = await supabase
      .from('sessioni_libere')
      .select('rate_limit_enabled, rate_limit_seconds')
      .limit(1);

    if (rateLimitError && rateLimitError.message.includes('rate_limit_enabled')) {
      migrationNeeded = true;
      sqlCommands.push(`
-- Migrazione: Aggiungi controllo rate limiting alle sessioni libere
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS rate_limit_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS rate_limit_seconds integer NOT NULL DEFAULT 60;

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.rate_limit_enabled IS 'Se true, applica rate limiting alle richieste';
COMMENT ON COLUMN public.sessioni_libere.rate_limit_seconds IS 'Secondi di attesa tra richieste consecutive';`);
    }

    // Verifica se esiste la colonna notes_enabled
    const { error: notesError } = await supabase
      .from('sessioni_libere')
      .select('notes_enabled')
      .limit(1);

    if (notesError && notesError.message.includes('notes_enabled')) {
      migrationNeeded = true;
      sqlCommands.push(`
-- Migrazione: Aggiungi controllo note/commenti alle sessioni libere
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS notes_enabled boolean NOT NULL DEFAULT true;

-- Commento per documentazione
COMMENT ON COLUMN public.sessioni_libere.notes_enabled IS 'Se true, permette agli utenti di lasciare note/commenti';`);
    }

    if (migrationNeeded) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Migrazione database richiesta',
        instruction: 'Vai su Supabase Dashboard → SQL Editor e esegui il seguente SQL:',
        sql: sqlCommands.join('\n\n').trim()
      }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Database aggiornato e pronto ✓ (Rate limiting e controllo note attivi)' 
    });

  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Errore connessione database',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}