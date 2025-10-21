import webpush from 'web-push';
import { getSupabase } from './supabase';

// Configurazione VAPID
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:your-email@example.com';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();

// Configura webpush con chiavi VAPID
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: {
    requestId?: string;
    url?: string;
    type?: string;
    [key: string]: unknown;
  };
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Invia notifica push a una singola subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: vapidSubject,
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
        },
        TTL: 60 * 60 * 24, // 24 ore
        urgency: 'normal',
      }
    );

    return { success: true };
  } catch (error: unknown) {
    console.error('Push notification send error:', error);
    
    // Gestisci errori specifici
    const webPushError = error as { statusCode?: number };
    if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
      // Subscription non valida o scaduta
      return { 
        success: false, 
        error: 'SUBSCRIPTION_INVALID' 
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Invia notifica push a tutti i DJ attivi
 */
export async function sendPushToAllDJs(
  payload: PushNotificationPayload
): Promise<{
  total: number;
  sent: number;
  failed: number;
  invalidSubscriptions: string[];
}> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Database not configured');
  }

  // Recupera tutte le subscription attive
  const { data: subscriptions, error } = await supabase
    .from('dj_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      invalidSubscriptions: [],
    };
  }

  const results = {
    total: subscriptions.length,
    sent: 0,
    failed: 0,
    invalidSubscriptions: [] as string[],
  };

  // Invia notifiche in parallelo (con limite)
  const batchSize = 10;
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);
    
    const promises = batch.map(async (sub) => {
      const result = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        payload
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        
        // Se subscription non valida, disattiva nel database
        if (result.error === 'SUBSCRIPTION_INVALID') {
          results.invalidSubscriptions.push(sub.endpoint);
          
          await supabase
            .from('dj_push_subscriptions')
            .update({ 
              is_active: false,
              deactivated_at: new Date().toISOString(),
              error_reason: 'Invalid subscription'
            })
            .eq('id', sub.id);
        }
      }
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Invia notifica per nuova richiesta
 */
export async function sendNewRequestNotification(requestData: {
  id: string;
  titolo: string;
  artista: string;
  nome_richiedente?: string;
}): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '🎵 Nuova Richiesta',
    body: `${requestData.artista} - ${requestData.titolo}${
      requestData.nome_richiedente ? ` (da ${requestData.nome_richiedente})` : ''
    }`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    requireInteraction: true,
    actions: [
      {
        action: 'accept',
        title: '✅ Accetta',
      },
      {
        action: 'view',
        title: '👀 Visualizza',
      },
    ],
    data: {
      requestId: requestData.id,
      url: '/dj/libere',
      type: 'new_request',
    },
  };

  const results = await sendPushToAllDJs(payload);
  
  console.log('Push notification results:', {
    requestId: requestData.id,
    ...results,
  });
}

/**
 * Test di configurazione VAPID
 */
export function isWebPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

/**
 * Ottieni chiave pubblica VAPID per il client
 */
export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}
