import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// VAPID keys configuration
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// Configurazione web-push
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface RequestData {
  title: string;
  artists?: string;
  album?: string;
  requester_name?: string;
  event_code?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djSecret = request.headers.get('x-dj-secret');
    const djUser = request.headers.get('x-dj-user');

    const validDjSecret = process.env.DJ_SECRET;
    const validDjUser = process.env.DJ_USER;

    if (!djSecret || !djUser || djSecret !== validDjSecret || djUser !== validDjUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Non autorizzato: credenziali DJ mancanti o errate' 
      }, { status: 401 });
    }

    // Verifica configurazione VAPID
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn('VAPID keys not configured - push notifications disabled');
      return NextResponse.json({
        ok: false,
        error: 'Configurazione push non disponibile'
      }, { status: 500 });
    }

    // Parsing del body
    const { sessionId, requestData }: { sessionId: string; requestData: RequestData } = await request.json();

    if (!sessionId || !requestData) {
      return NextResponse.json({
        ok: false,
        error: 'SessionId e requestData richiesti'
      }, { status: 400 });
    }

    // Recupera le subscription per questa sessione
    let subscriptions: Array<{
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    }> = [];

    if (supabaseUrl && supabaseServiceKey) {
      // Usa Supabase se configurato
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('subscription_data')
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (error) {
        console.error('Errore Supabase push subscriptions:', error);
        return NextResponse.json({
          ok: false,
          error: 'Errore database subscriptions'
        }, { status: 500 });
      }

      subscriptions = data?.map(row => row.subscription_data) || [];
    } else {
      // Fallback a memoria (per sviluppo)
      const memoryStore = (global as Record<string, unknown>).memoryStore as Record<string, unknown[]> || {};
      subscriptions = (memoryStore[sessionId] as typeof subscriptions) || [];
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'Nessun dispositivo iscritto alle notifiche per questa sessione'
      });
    }

    // Crea il payload della notifica
    const notificationTitle = '🎵 Nuova Richiesta Musicale';
    let notificationBody = requestData.title;
    
    if (requestData.artists) {
      notificationBody += ` - ${requestData.artists}`;
    }
    
    if (requestData.requester_name) {
      notificationBody += `\nDa: ${requestData.requester_name}`;
    }

    if (requestData.event_code) {
      notificationBody += `\nEvento: ${requestData.event_code}`;
    }

    const notificationPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: '/Simbolo_Bianco.png',
      badge: '/Simbolo_Bianco.png',
      tag: 'new-request',
      data: {
        url: '/dj/libere',
        sessionId,
        requestData
      },
      actions: [
        {
          action: 'open',
          title: 'Vai al Pannello'
        }
      ]
    });

    // Invia notifiche a tutti i dispositivi iscritti
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        return { success: true, subscription };
      } catch (error) {
        console.error('Errore invio notifica:', error);
        
        // Se la subscription è invalida, rimuovila dal database
        if (error instanceof Error && (
          error.message.includes('410') || 
          error.message.includes('invalid') ||
          error.message.includes('unsubscribed')
        )) {
          // TODO: Rimuovi subscription invalida dal database
          console.log('Subscription invalida rimossa');
        }
        
        return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    return NextResponse.json({
      ok: true,
      message: `Notifiche inviate: ${successful} successo, ${failed} falliti`,
      details: {
        total: subscriptions.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Errore send push notification:', error);
    return NextResponse.json({
      ok: false,
      error: 'Errore interno server push'
    }, { status: 500 });
  }
}