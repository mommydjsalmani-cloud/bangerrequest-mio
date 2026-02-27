import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/auth';

function requireDJSecret(req: NextRequest): string | null {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';

  // Rate limiting per IP
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkLoginRateLimit(`dj-login:${ip}`);
  if (!rateLimit.allowed) return 'rate_limited';

  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  if (hSecret !== secret || hUser !== user) return 'unauthorized';

  resetLoginRateLimit(`dj-login:${ip}`);
  return null;
}

export async function POST(request: NextRequest) {
  const authErr = requireDJSecret(request);
  if (authErr === 'rate_limited') {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  if (authErr) {
    return NextResponse.json({ ok: false, error: 'Non autorizzato' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Controllo variabili ambiente
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Server configuration error: missing Supabase credentials'
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {

    // Prova semplicemente a verificare se le tabelle esistono
    const { error: testError } = await supabase
      .from('sessioni_libere')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database non configurato',
        instruction: 'Vai su Supabase Dashboard → SQL Editor e incolla il contenuto di docs/richieste_libere_schema.sql',
        manualStep: true
      }, { status: 400 });
    }

    // Se arriviamo qui, le tabelle esistono già
    // Verifica e aggiungi le colonne del rate limiting se non esistono
    try {
      // Tenta di selezionare le nuove colonne per vedere se esistono
      const { error: checkError } = await supabase
        .from('sessioni_libere')
        .select('rate_limit_enabled, rate_limit_seconds')
        .limit(1);
      
      if (checkError && checkError.message.includes('rate_limit_enabled')) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Database non aggiornato',
          instruction: 'Vai su Supabase Dashboard → SQL Editor e esegui: scripts/migrate_add_rate_limit_control.sql',
          migrationNeeded: true
        }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ 
        ok: false, 
        error: 'Errore verifica migrazione database',
        instruction: 'Vai su Supabase Dashboard → SQL Editor e esegui: scripts/migrate_add_rate_limit_control.sql',
        migrationNeeded: true
      }, { status: 400 });
    }
    
    // Aggiungiamo una sessione demo se non esiste
    const { error: insertError } = await supabase
      .from('sessioni_libere')
      .upsert({
        token: 'demo-token-libere-2024',
        name: 'Sessione Demo Richieste Libere',
        status: 'active'
      }, {
        onConflict: 'token'
      });

    if (insertError) {
      console.error('Errore inserimento sessione demo:', insertError);
    }

    return NextResponse.json({ 
      ok: true, 
      message: '✅ Database richieste libere configurato e funzionante!'
    });

  } catch (error: unknown) {
    console.error('Errore setup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({ 
      ok: false, 
      error: 'Errore verifica database. Configura manualmente lo schema.',
      instruction: 'Applica docs/richieste_libere_schema.sql nel tuo dashboard Supabase',
      details: errorMessage 
    }, { status: 500 });
  }
}