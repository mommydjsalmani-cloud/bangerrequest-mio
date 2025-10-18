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
    const sqlCommands: string[] = [];

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

    // Verifica se esistono le colonne homepage_visible e homepage_priority
    const { error: homepageError } = await supabase
      .from('sessioni_libere')
      .select('homepage_visible, homepage_priority')
      .limit(1);

    if (homepageError && (homepageError.message.includes('homepage_visible') || homepageError.message.includes('homepage_priority'))) {
      migrationNeeded = true;
      sqlCommands.push(`
-- Migrazione: Aggiungi controllo homepage alle sessioni libere
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS homepage_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS homepage_priority timestamptz;

-- Indice per query efficiente delle sessioni visibili ordinata per priorità
CREATE INDEX IF NOT EXISTS idx_sessioni_libere_homepage_visible 
ON public.sessioni_libere(homepage_visible, homepage_priority DESC) 
WHERE homepage_visible = true;

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.homepage_visible IS 'Se true, mostra la sessione come pulsante sulla homepage';
COMMENT ON COLUMN public.sessioni_libere.homepage_priority IS 'Timestamp per ordinare le sessioni visibili sulla homepage (più recente = priorità alta)';`);
    }

    // Verifica se esiste la colonna event_code_required
    const { error: eventCodeError } = await supabase
      .from('sessioni_libere')
      .select('event_code_required')
      .limit(1);

    if (eventCodeError && eventCodeError.message.includes('event_code_required')) {
      migrationNeeded = true;
      sqlCommands.push(`
-- Migrazione: Aggiungi controllo codice evento alle sessioni libere
ALTER TABLE public.sessioni_libere 
ADD COLUMN IF NOT EXISTS event_code_required boolean NOT NULL DEFAULT false;

-- Aggiungi campo event_code alle richieste libere
ALTER TABLE public.richieste_libere 
ADD COLUMN IF NOT EXISTS event_code text;

-- Indice per ricerca veloce per codice evento
CREATE INDEX IF NOT EXISTS idx_richieste_libere_event_code ON public.richieste_libere(event_code);

-- Commenti per documentazione
COMMENT ON COLUMN public.sessioni_libere.event_code_required IS 'Se true, richiede il codice evento per fare richieste';
COMMENT ON COLUMN public.richieste_libere.event_code IS 'Codice evento fornito dall utente per la richiesta';`);
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