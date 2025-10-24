// API Route per test notifiche push
// POST /api/push/test

import { NextRequest, NextResponse } from 'next/server';
import { testPush } from '@/lib/push';

// Force Node.js runtime per web-push
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djSecret = process.env.DJ_PANEL_SECRET?.trim();
    const djUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!djSecret || !djUser) {
      console.error('[Push Test] Credenziali DJ non configurate');
      return NextResponse.json(
        { ok: false, error: 'Server non configurato: credenziali DJ mancanti' },
        { status: 500 }
      );
    }
    
    const headerSecret = request.headers.get('x-dj-secret')?.trim();
    const headerUser = request.headers.get('x-dj-user')?.trim();
    
    if (!headerSecret || !headerUser || headerSecret !== djSecret || headerUser !== djUser) {
      console.warn('[Push Test] Tentativo accesso non autorizzato:', {
        hasSecret: !!headerSecret,
        hasUser: !!headerUser,
        userMatch: headerUser === djUser
      });
      return NextResponse.json(
        { ok: false, error: 'Accesso non autorizzato' },
        { status: 401 }
      );
    }
    
    // Verifica che le notifiche push siano abilitate
    const enablePush = process.env.ENABLE_PUSH_NOTIFICATIONS?.trim() === 'true';
    if (!enablePush) {
      return NextResponse.json(
        { ok: false, error: 'Notifiche push disabilitate sul server' },
        { status: 503 }
      );
    }
    
    console.log('[Push Test] Invio notifica di test a:', headerUser);
    
    // Invia notifica di test
    const result = await testPush();
    
    if (result.success) {
      console.log('[Push Test] Notifica di test inviata con successo');
      return NextResponse.json({
        ok: true,
        message: 'Notifica di test inviata con successo ✓',
        sentAt: new Date().toISOString()
      });
    } else {
      console.error('[Push Test] Errore invio notifica:', result.error);
      return NextResponse.json(
        { 
          ok: false, 
          error: result.error || 'Errore invio notifica di test',
          hint: 'Verifica che il browser abbia il permesso notifiche e che la subscription sia valida'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Push Test] Errore server:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// GET per verificare configurazione notifiche (debug)
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djSecret = process.env.DJ_PANEL_SECRET?.trim();
    const djUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!djSecret || !djUser) {
      return NextResponse.json(
        { ok: false, error: 'Server non configurato' },
        { status: 500 }
      );
    }
    
    const headerSecret = request.headers.get('x-dj-secret')?.trim();
    const headerUser = request.headers.get('x-dj-user')?.trim();
    
    if (!headerSecret || !headerUser || headerSecret !== djSecret || headerUser !== djUser) {
      return NextResponse.json(
        { ok: false, error: 'Non autorizzato' },
        { status: 401 }
      );
    }
    
    // Controlla configurazione
    const enablePush = process.env.ENABLE_PUSH_NOTIFICATIONS?.trim() === 'true';
    const hasVapidPublic = !!process.env.VAPID_PUBLIC_KEY?.trim();
    const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY?.trim();
    const hasVapidSubject = !!process.env.VAPID_SUBJECT?.trim();
    
    const isFullyConfigured = enablePush && hasVapidPublic && hasVapidPrivate && hasVapidSubject;
    
    return NextResponse.json({
      ok: true,
      config: {
        pushEnabled: enablePush,
        hasVapidPublic,
        hasVapidPrivate,
        hasVapidSubject,
        fullyConfigured: isFullyConfigured
      },
      vapidPublicKey: isFullyConfigured ? process.env.VAPID_PUBLIC_KEY?.trim() : null,
      djUser: headerUser,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Push Test GET] Errore:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore server' },
      { status: 500 }
    );
  }
}