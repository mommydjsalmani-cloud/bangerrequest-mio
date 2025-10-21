import webPush from 'web-push';
import { getSupabase } from '@/lib/supabase';

// Configurazione VAPID keys
webPush.setVapidDetails(
  'mailto:admin@bangerrequest.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BDUaau2YrVBj4X3sbQiBBe9dZ6SHgrzAOLGpIiLBroXvn_HzdGXTbqxMVlRck3TPf5Fr26hnbqSu0EE2hGWEpuE',
  process.env.VAPID_PRIVATE_KEY || 'OZprrHLl7sstaJc0MUodBTLiiIoN9Lt8PLguPUmikEs'
);

export interface PushPayload {
  title: string;
  artist: string;
  request_id: string;
  session_id: string;
  session_name: string;
  body?: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('Supabase not configured, skipping push notifications');
      return;
    }

    // Ottieni tutte le subscription attive dei DJ
    const { data: subscriptions, error } = await supabase
      .from('dj_push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      artist: payload.artist,
      request_id: payload.request_id,
      session_id: payload.session_id,
      body: payload.body || `${payload.title} - ${payload.artist}`,
      icon: '/Simbolo_Bianco.png',
      badge: '/Simbolo_Bianco.png',
      data: {
        url: `/dj/libere?highlight=${payload.request_id}`
      }
    });

    // Invia push a tutte le subscription
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        };

        await webPush.sendNotification(pushSubscription, notificationPayload);
        console.log(`Push sent to ${sub.dj_user}`);
      } catch (error) {
        console.error(`Failed to send push to ${sub.dj_user}:`, error);
        
        // Se l'endpoint non è più valido, disattivalo
        if (error instanceof Error && error.message.includes('410')) {
          await supabase
            .from('dj_push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.allSettled(pushPromises);
    console.log(`Push notifications sent for request: ${payload.title}`);
    
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

export async function sendTestPushNotification(djUser: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { data: subscriptions } = await supabase
      .from('dj_push_subscriptions')
      .select('*')
      .eq('dj_user', djUser)
      .eq('is_active', true);

    if (!subscriptions || subscriptions.length === 0) {
      return false;
    }

    const testPayload = JSON.stringify({
      title: '🎵 Test Notification',
      body: 'Le notifiche push funzionano correttamente!',
      icon: '/Simbolo_Bianco.png',
      tag: 'test',
      data: { url: '/dj/libere' }
    });

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      await webPush.sendNotification(pushSubscription, testPayload);
    }

    return true;
  } catch (error) {
    console.error('Error sending test push:', error);
    return false;
  }
}