import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/auth';

// Verifica autenticazione DJ con rate limiting
function requireDJSecret(req: NextRequest) {
  const secret = process.env.DJ_PANEL_SECRET?.trim();
  const user = process.env.DJ_PANEL_USER?.trim();
  if (!secret || !user) return 'misconfigured';
  
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimitKey = `dj-login:${ip}`;
  
  const rateLimit = checkLoginRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return 'rate_limited';
  }
  
  const hSecret = req.headers.get('x-dj-secret')?.trim();
  const hUser = req.headers.get('x-dj-user')?.trim();
  if (hSecret !== secret || hUser !== user) return 'unauthorized';
  
  // Reset on success
  resetLoginRateLimit(rateLimitKey);
  return null;
}

// GET: Recupera le sessioni visibili sulla homepage (max 2, ordinate per priorità)
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }

  try {
    // Query sessioni visibili sulla homepage, ordinate per priorità (più recente prima)
    // Limitiamo a 2 sessioni come da specifica
    const { data: sessions, error } = await supabase
      .from('sessioni_libere')
      .select('id, name, token, homepage_visible, homepage_priority, status')
      .eq('homepage_visible', true)
      .eq('archived', false)
      .in('status', ['active', 'paused'])
      .order('homepage_priority', { ascending: false })
      .limit(2);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      sessions: sessions || []
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Errore recupero sessioni homepage',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}

// POST: Aggiorna la visibilità homepage di una sessione (riservato al pannello DJ)
export async function POST(req: NextRequest) {
  const authErr = requireDJSecret(req);
  if (authErr) {
    const status = authErr === 'misconfigured' ? 500 : (authErr === 'rate_limited' ? 429 : 401);
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database non configurato' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { sessionId, visible } = body;

    if (!sessionId || typeof visible !== 'boolean') {
      return NextResponse.json({ 
        ok: false, 
        error: 'Parametri richiesti: sessionId (string) e visible (boolean)' 
      }, { status: 400 });
    }

    // Se stiamo rendendo visibile una sessione, controlliamo il limite di 2
    if (visible) {
      const { data: visibleSessions, error: countError } = await supabase
        .from('sessioni_libere')
        .select('id')
        .eq('homepage_visible', true)
        .eq('archived', false)
        .neq('id', sessionId); // Escludiamo la sessione che stiamo aggiornando

      if (countError) {
        return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
      }

      // Se ci sono già 2 sessioni visibili, rimuoviamo quella con priorità più bassa
      if (visibleSessions && visibleSessions.length >= 2) {
        const { data: oldestSession, error: oldestError } = await supabase
          .from('sessioni_libere')
          .select('id')
          .eq('homepage_visible', true)
          .eq('archived', false)
          .neq('id', sessionId)
          .order('homepage_priority', { ascending: true })
          .limit(1);

        if (oldestError) {
          return NextResponse.json({ ok: false, error: oldestError.message }, { status: 500 });
        }

        if (oldestSession && oldestSession.length > 0) {
          await supabase
            .from('sessioni_libere')
            .update({ 
              homepage_visible: false, 
              homepage_priority: null 
            })
            .eq('id', oldestSession[0].id);
        }
      }
    }

    // Aggiorna la visibilità della sessione richiesta
    const updateData: {
      homepage_visible: boolean;
      homepage_priority: string | null;
    } = { 
      homepage_visible: visible,
      homepage_priority: visible ? new Date().toISOString() : null
    };

    const { error: updateError } = await supabase
      .from('sessioni_libere')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: visible ? 'Sessione aggiunta alla homepage' : 'Sessione rimossa dalla homepage'
    });

  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Errore aggiornamento visibilità homepage',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}
