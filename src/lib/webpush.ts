// Server-side utilities per notifiche push
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Storage in-memory per sottoscrizioni DJ (in produzione usare DB)
export const djSubscriptions = new Map<string, PushSubscription[]>();

// Simple file-backed persistence for local development to avoid losing subscriptions
// between restarts or hot-reloads. This is intentionally lightweight and only used
// when NODE_ENV !== 'production'. In production you should use a proper DB.
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

function loadSubscriptionsFromDisk() {
  try {
    if (process.env.NODE_ENV === 'production') return;
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed: Record<string, PushSubscription[]> = JSON.parse(raw || '{}');
    for (const [k, v] of Object.entries(parsed)) {
      djSubscriptions.set(k, v);
    }
    console.log(`📥 Loaded ${Array.from(djSubscriptions.values()).flat().length} push subscriptions from disk`);
  } catch (err) {
    console.error('Failed to load push subscriptions from disk:', err);
  }
}

function saveSubscriptionsToDisk() {
  try {
    if (process.env.NODE_ENV === 'production') return;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj: Record<string, PushSubscription[]> = {};
    for (const [k, v] of djSubscriptions.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    // console.log('📤 Saved push subscriptions to disk');
  } catch (err) {
    console.error('Failed to save push subscriptions to disk:', err);
  }
}

// Carica le subscription all'import
loadSubscriptionsFromDisk();

// VAPID keys (in produzione usare variabili ambiente)
export const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BL7ELYgWbwZ-zTgfHBFfHZ8CqF4vtyJR8t_-o8L8WsxXzXHOdYh6bXBzqSs4dYfJH2WL3b4rFKs6yTfR9lXqLCY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'pxYiHHB8Qoe6Mqek5-i4KGHlpd3YhEAaE9k8b-eO9hA'
};

// Configura web-push con VAPID keys
webpush.setVapidDetails(
  'mailto:dev@bangerrequest.com',
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

// Aggiungi sottoscrizione per un DJ
export function addDJSubscription(djUser: string, subscription: PushSubscription): void {
  if (!djSubscriptions.has(djUser)) {
    djSubscriptions.set(djUser, []);
  }
  
  const userSubs = djSubscriptions.get(djUser)!;
  // Rimuovi eventuali sottoscrizioni duplicate
  const filtered = userSubs.filter(sub => sub.endpoint !== subscription.endpoint);
  filtered.push(subscription);
  djSubscriptions.set(djUser, filtered);
  
  console.log(`📱 Added push subscription for DJ: ${djUser}`);
  saveSubscriptionsToDisk();
}

// Rimuovi sottoscrizione per un DJ
export function removeDJSubscription(djUser: string, subscription: PushSubscription): void {
  const userSubs = djSubscriptions.get(djUser);
  if (!userSubs) return;
  
  const filtered = userSubs.filter(sub => sub.endpoint !== subscription.endpoint);
  djSubscriptions.set(djUser, filtered);
  
  console.log(`📱 Removed push subscription for DJ: ${djUser}`);
  saveSubscriptionsToDisk();
}

// Ottieni tutte le sottoscrizioni per inviare notifiche
export function getAllDJSubscriptions(): PushSubscription[] {
  const allSubs: PushSubscription[] = [];
  for (const subs of djSubscriptions.values()) {
    allSubs.push(...subs);
  }
  return allSubs;
}

// Pulisci sottoscrizioni invalide
export function cleanupInvalidSubscriptions(invalidEndpoints: string[]): void {
  for (const [djUser, subs] of djSubscriptions.entries()) {
    const validSubs = subs.filter(sub => !invalidEndpoints.includes(sub.endpoint));
    djSubscriptions.set(djUser, validSubs);
  }
  saveSubscriptionsToDisk();
}

/**
 * Invia notifica push a tutte le sottoscrizioni attive
 */
export async function sendPushNotification(payload: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}): Promise<{ success: number; failed: number; invalidEndpoints: string[] }> {
  const subscriptions = getAllDJSubscriptions();
  
  if (subscriptions.length === 0) {
    console.log('📭 No DJ subscriptions found');
    return { success: 0, failed: 0, invalidEndpoints: [] };
  }

  console.log(`📤 Sending push notification to ${subscriptions.length} subscribers`);
  console.log(`� Payload:`, payload);

  const invalidEndpoints: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Invia notifica a tutte le sottoscrizioni
  const promises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      successCount++;
      console.log(`✅ Notification sent to: ${subscription.endpoint.substring(0, 50)}...`);
    } catch (error) {
      failedCount++;
      console.error(`❌ Failed to send notification to ${subscription.endpoint.substring(0, 50)}:`, error);
      
      // Se la sottoscrizione è invalida, marcala per la rimozione
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          invalidEndpoints.push(subscription.endpoint);
        }
      }
    }
  });

  await Promise.allSettled(promises);

  // Pulisci sottoscrizioni invalide
  if (invalidEndpoints.length > 0) {
    cleanupInvalidSubscriptions(invalidEndpoints);
    console.log(`�️ Cleaned up ${invalidEndpoints.length} invalid subscriptions`);
  }

  console.log(`📊 Push notification results: ${successCount} success, ${failedCount} failed`);
  return { success: successCount, failed: failedCount, invalidEndpoints };
}

/**
 * Funzione specifica per inviare notifiche di nuove richieste
 */
export async function sendNewRequestNotification(request: { id: string; title: string; artists?: string | null }): Promise<void> {
  console.log('🔔 Preparing to send new request notification...');
  
  const title = '🎵 Nuova Richiesta Musicale!';
  const body = `${request.title}${request.artists ? ` - ${request.artists}` : ''}`;
  
  const payload = {
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {
      type: 'new_request',
      requestId: request.id,
      timestamp: new Date().toISOString(),
      url: '/dj/libere'
    }
  };

  const result = await sendPushNotification(payload);
  
  if (result.success > 0) {
    console.log(`✅ New request notification sent successfully to ${result.success} subscribers`);
  } else {
    console.log('� No active subscriptions found for new request notification');
  }
}
