import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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
    // Verifica autenticazione DJ
    const body = await request.json();
    const { secret, user } = body;
    
    if (secret !== process.env.DJ_PANEL_SECRET || user !== process.env.DJ_PANEL_USER) {
      return NextResponse.json({ ok: false, error: 'Non autorizzato' }, { status: 401 });
    }

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