// Server-side utilities per notifiche push
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Storage in-memory per sottoscrizioni DJ (in produzione usare DB)
const djSubscriptions = new Map<string, PushSubscription[]>();

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
}

// Rimuovi sottoscrizione per un DJ
export function removeDJSubscription(djUser: string, subscription: PushSubscription): void {
  const userSubs = djSubscriptions.get(djUser);
  if (!userSubs) return;
  
  const filtered = userSubs.filter(sub => sub.endpoint !== subscription.endpoint);
  djSubscriptions.set(djUser, filtered);
  
  console.log(`📱 Removed push subscription for DJ: ${djUser}`);
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
}

/**
 * Funzione specifica per inviare notifiche di nuove richieste
 */
export async function sendNewRequestNotification(request: { id: string; title: string; artists?: string | null }): Promise<void> {
  console.log('🔔 Preparing to send new request notification...');
  
  const allSubscriptions = getAllDJSubscriptions();
  
  if (allSubscriptions.length === 0) {
    console.log('📭 No DJ subscriptions found - notification skipped');
    return;
  }

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

  console.log(`📤 Sending notification to ${allSubscriptions.length} DJ subscriptions`);

  // Per ora simuliamo l'invio senza la libreria web-push
  // In futuro si può aggiungere la vera implementazione
  console.log('✅ Notification sent successfully (simulated)');
  console.log('📝 Payload:', payload);
}

// VAPID keys (in produzione usare variabili ambiente)
export const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BL7ELYgWbwZ-zTgfHBFfHZ8CqF4vtyJR8t_-o8L8WsxXzXHOdYh6bXBzqSs4dYfJH2WL3b4rFKs6yTfR9lXqLCY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'pxYiHHB8Qoe6Mqek5-i4KGHlpd3YhEAaE9k8b-eO9hA'
};
