// Server-side utilities per notifiche push
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Storage in-memory per sottoscrizioni DJ (fallback per sviluppo)
export const djSubscriptions = new Map<string, PushSubscription[]>();

// Simple file-backed persistence for local development to avoid losing subscriptions
// between restarts or hot-reloads. This is intentionally lightweight and only used
// when NODE_ENV !== 'production'. In production we use Supabase.
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
export async function addDJSubscription(djUser: string, subscription: PushSubscription): Promise<void> {
  // In produzione usa Supabase, altrimenti Map in-memory + file
  if (process.env.NODE_ENV === 'production') {
    const supabase = getSupabase();
    if (supabase) {
      try {
        // Upsert: inserisci o aggiorna se esiste già
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            dj_user: djUser,
            endpoint: subscription.endpoint,
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
            last_used_at: new Date().toISOString()
          }, {
            onConflict: 'dj_user,endpoint'
          });
        
        if (error) {
          console.error('❌ Error saving push subscription to DB:', error);
          // Fallback a memoria se DB fallisce
          addToMemory(djUser, subscription);
        } else {
          console.log(`📱 Saved push subscription to DB for DJ: ${djUser}`);
        }
      } catch (error) {
        console.error('❌ Error connecting to DB for push subscription:', error);
        // Fallback a memoria
        addToMemory(djUser, subscription);
      }
    } else {
      // Fallback a memoria se Supabase non configurato
      addToMemory(djUser, subscription);
    }
  } else {
    // Sviluppo: usa memoria + file
    addToMemory(djUser, subscription);
  }
}

// Helper per aggiungere a memoria (sviluppo o fallback)
function addToMemory(djUser: string, subscription: PushSubscription): void {
  if (!djSubscriptions.has(djUser)) {
    djSubscriptions.set(djUser, []);
  }
  
  const userSubs = djSubscriptions.get(djUser)!;
  // Rimuovi eventuali sottoscrizioni duplicate
  const filtered = userSubs.filter(sub => sub.endpoint !== subscription.endpoint);
  filtered.push(subscription);
  djSubscriptions.set(djUser, filtered);
  
  console.log(`📱 Added push subscription to memory for DJ: ${djUser}`);
  saveSubscriptionsToDisk();
}

// Funzione helper per memoria (sviluppo e fallback)
function addDJSubscriptionMemory(djUser: string, subscription: PushSubscription): void {
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
export async function removeDJSubscription(djUser: string, subscription: PushSubscription): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Produzione: rimuovi da Supabase
    const supabase = getSupabase();
    if (!supabase) {
      removeDJSubscriptionMemory(djUser, subscription);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('dj_user', djUser)
        .eq('endpoint', subscription.endpoint);
      
      if (error) {
        console.error('❌ Failed to remove subscription from DB:', error);
      } else {
        console.log(`📱 Removed push subscription from DB for DJ: ${djUser}`);
      }
    } catch (err) {
      console.error('❌ Error removing subscription from DB:', err);
    }
  } else {
    // Sviluppo: usa memoria + file
    removeDJSubscriptionMemory(djUser, subscription);
  }
}

// Funzione helper per memoria (sviluppo)
function removeDJSubscriptionMemory(djUser: string, subscription: PushSubscription): void {
  const userSubs = djSubscriptions.get(djUser);
  if (!userSubs) return;
  
  const filtered = userSubs.filter(sub => sub.endpoint !== subscription.endpoint);
  djSubscriptions.set(djUser, filtered);
  
  console.log(`📱 Removed push subscription for DJ: ${djUser}`);
  saveSubscriptionsToDisk();
}

// Ottieni tutte le sottoscrizioni per inviare notifiche
export async function getAllDJSubscriptions(): Promise<PushSubscription[]> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Produzione: leggi da Supabase
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, using in-memory subscriptions');
      return getAllDJSubscriptionsMemory();
    }
    
    try {
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_key')
        .order('last_used_at', { ascending: false });
      
      if (error) {
        console.error('❌ Failed to load subscriptions from DB:', error);
        return getAllDJSubscriptionsMemory();
      }
      
      return subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      }));
    } catch (err) {
      console.error('❌ Error loading subscriptions from DB:', err);
      return getAllDJSubscriptionsMemory();
    }
  } else {
    // Sviluppo: usa memoria
    return getAllDJSubscriptionsMemory();
  }
}

// Funzione helper per memoria (sviluppo e fallback)
function getAllDJSubscriptionsMemory(): PushSubscription[] {
  const allSubs: PushSubscription[] = [];
  for (const subs of djSubscriptions.values()) {
    allSubs.push(...subs);
  }
  return allSubs;
}

// Pulisci sottoscrizioni invalide
export async function cleanupInvalidSubscriptions(invalidEndpoints: string[]): Promise<void> {
  if (invalidEndpoints.length === 0) return;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Produzione: rimuovi da Supabase
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', invalidEndpoints);
        
        if (error) {
          console.error('❌ Failed to cleanup invalid subscriptions from DB:', error);
        } else {
          console.log(`🗑️ Cleaned up ${invalidEndpoints.length} invalid subscriptions from DB`);
        }
      } catch (err) {
        console.error('❌ Error cleaning up subscriptions from DB:', err);
      }
    }
  }
  
  // Sempre pulisci dalla memoria (dev + fallback)
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
  const subscriptions = await getAllDJSubscriptions();
  
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
