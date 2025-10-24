// API Route per subscription notifiche push
// POST /api/push/subscribe

import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription, type PushSubscription } from '@/lib/push';

// Force Node.js runtime per web-push
export const runtime = 'nodejs';

interface SubscribeRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djSecret = process.env.DJ_PANEL_SECRET?.trim();
    const djUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!djSecret || !djUser) {
      console.error('[Push Subscribe] Credenziali DJ non configurate');
      return NextResponse.json(
        { ok: false, error: 'Server non configurato: credenziali DJ mancanti' },
        { status: 500 }
      );
    }
    
    const headerSecret = request.headers.get('x-dj-secret')?.trim();
    const headerUser = request.headers.get('x-dj-user')?.trim();
    
    if (!headerSecret || !headerUser || headerSecret !== djSecret || headerUser !== djUser) {
      console.warn('[Push Subscribe] Tentativo accesso non autorizzato:', {
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
    
    // Parse e validazione body
    let body: SubscribeRequest;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Push Subscribe] Errore parsing JSON:', error);
      return NextResponse.json(
        { ok: false, error: 'JSON non valido' },
        { status: 400 }
      );
    }
    
    // Validazione campi richiesti
    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json(
        { ok: false, error: 'Campi richiesti mancanti: endpoint, p256dh, auth' },
        { status: 400 }
      );
    }
    
    // Validazione formato endpoint
    try {
      new URL(body.endpoint);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Endpoint URL non valido' },
        { status: 400 }
      );
    }
    
    // Validazione chiavi base64
    if (!isValidBase64(body.p256dh) || !isValidBase64(body.auth)) {
      return NextResponse.json(
        { ok: false, error: 'Chiavi p256dh o auth non sono base64 validi' },
        { status: 400 }
      );
    }
    
    // Sanitizza User-Agent
    const userAgent = sanitizeUserAgent(body.userAgent || request.headers.get('user-agent') || 'Unknown');
    
    // Crea subscription object
    const subscription: PushSubscription = {
      user_id: headerUser, // Usa username DJ come user_id
      endpoint: body.endpoint.trim(),
      p256dh: body.p256dh.trim(),
      auth: body.auth.trim(),
      user_agent: userAgent
    };
    
    // Salva subscription
    const result = await saveSubscription(subscription);
    
    if (result.success) {
      console.log('[Push Subscribe] Subscription salvata per:', headerUser);
      return NextResponse.json({
        ok: true,
        message: 'Subscription salvata con successo',
        userId: headerUser
      });
    } else {
      console.error('[Push Subscribe] Errore salvataggio:', result.error);
      return NextResponse.json(
        { ok: false, error: result.error || 'Errore salvataggio subscription' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Push Subscribe] Errore server:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Utility per validare base64
function isValidBase64(str: string): boolean {
  try {
    // Rimuovi padding e controlla caratteri validi
    const cleaned = str.replace(/[=]+$/, '');
    const base64Regex = /^[A-Za-z0-9+/]*$/;
    return base64Regex.test(cleaned) && cleaned.length > 0;
  } catch {
    return false;
  }
}

// Utility per sanitizzare User-Agent
function sanitizeUserAgent(userAgent: string): string {
  // Limita lunghezza e rimuovi caratteri pericolosi
  return userAgent
    .slice(0, 500) // Max 500 caratteri
    .replace(/[\x00-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
    .trim();
}

// GET per ottenere info subscription corrente (opzionale, per debug)
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
    
    // Ottieni statistiche subscription
    const { getSubscriptionStats } = await import('@/lib/push');
    const stats = await getSubscriptionStats();
    
    return NextResponse.json({
      ok: true,
      stats: stats,
      pushEnabled: process.env.ENABLE_PUSH_NOTIFICATIONS?.trim() === 'true',
      hasVapidConfig: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
    });
    
  } catch (error) {
    console.error('[Push Subscribe GET] Errore:', error);
    return NextResponse.json(
      { ok: false, error: 'Errore server' },
      { status: 500 }
    );
  }
}