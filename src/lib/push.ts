// Libreria Web Push per Banger Request
// Gestisce invio notifiche push con VAPID e persistenza Supabase/in-memory

import webPush from 'web-push';
import { getSupabase } from './supabase';

// Tipi TypeScript
export interface PushSubscription {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

// Store in-memory per fallback
const inMemorySubscriptions = new Map<string, PushSubscription>();

// Configurazione web-push con VAPID
let isConfigured = false;

function ensureWebPushConfig() {
  if (isConfigured) return true;
  
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidSubject = process.env.VAPID_SUBJECT?.trim();
  const enablePush = process.env.ENABLE_PUSH_NOTIFICATIONS?.trim() === 'true';
  
  if (!enablePush) {
    console.warn('[Push] Web Push disabilitato - ENABLE_PUSH_NOTIFICATIONS non è true');
    return false;
  }
  
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error('[Push] Configurazione VAPID incompleta:', {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey,
      hasSubject: !!vapidSubject
    });
    return false;
  }
  
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
    console.log('[Push] Web Push configurato con successo');
    return true;
  } catch (error) {
    console.error('[Push] Errore configurazione VAPID:', error);
    return false;
  }
}

// Utility per convertire subscription format
function formatSubscription(sub: PushSubscription): webPush.PushSubscription {
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };
}

// Salva subscription in database o memoria
export async function saveSubscription(subscription: PushSubscription): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      // Prova prima UPDATE, poi INSERT se non esiste
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', subscription.user_id)
        .eq('endpoint', subscription.endpoint)
        .single();
      
      if (existing) {
        // Aggiorna subscription esistente
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            user_agent: subscription.user_agent
          })
          .eq('id', existing.id);
        
        if (error) {
          console.error('[Push] Errore aggiornamento subscription:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Inserisci nuova subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .insert(subscription);
        
        if (error) {
          console.error('[Push] Errore inserimento subscription:', error);
          return { success: false, error: error.message };
        }
      }
      
      console.log('[Push] Subscription salvata in Supabase:', subscription.user_id);
    } else {
      // Fallback in-memory
      const key = `${subscription.user_id}:${subscription.endpoint}`;
      inMemorySubscriptions.set(key, subscription);
      console.log('[Push] Subscription salvata in memoria:', subscription.user_id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Push] Errore salvataggio subscription:', error);
    return { success: false, error: String(error) };
  }
}

// Rimuovi subscription non valida
export async function removeSubscription(endpoint: string): Promise<void> {
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
      
      if (error) {
        console.error('[Push] Errore rimozione subscription:', error);
      } else {
        console.log('[Push] Subscription rimossa da Supabase:', endpoint);
      }
    } else {
      // Fallback in-memory
      for (const [key, sub] of inMemorySubscriptions.entries()) {
        if (sub.endpoint === endpoint) {
          inMemorySubscriptions.delete(key);
          console.log('[Push] Subscription rimossa da memoria:', endpoint);
          break;
        }
      }
    }
  } catch (error) {
    console.error('[Push] Errore rimozione subscription:', error);
  }
}

// Ottieni tutte le subscription per un utente
export async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('[Push] Errore recupero subscriptions:', error);
        return [];
      }
      
      return data || [];
    } else {
      // Fallback in-memory
      const userSubs: PushSubscription[] = [];
      for (const sub of inMemorySubscriptions.values()) {
        if (sub.user_id === userId) {
          userSubs.push(sub);
        }
      }
      return userSubs;
    }
  } catch (error) {
    console.error('[Push] Errore getUserSubscriptions:', error);
    return [];
  }
}

// Invia notifica a un singolo utente
export async function sendToUser(userId: string, payload: PushPayload): Promise<{ success: boolean; sent: number; errors: number }> {
  if (!ensureWebPushConfig()) {
    return { success: false, sent: 0, errors: 1 };
  }
  
  const subscriptions = await getUserSubscriptions(userId);
  let sent = 0;
  let errors = 0;
  
  console.log(`[Push] Invio a utente ${userId}, ${subscriptions.length} subscriptions`);
  
  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        formatSubscription(subscription),
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24, // 24 ore
          urgency: 'high'
        }
      );
      
      sent++;
      console.log(`[Push] Notifica inviata a ${userId} su ${subscription.endpoint.slice(-20)}`);
    } catch (error: unknown) {
      errors++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = (error as { statusCode?: number }).statusCode;
      console.error(`[Push] Errore invio a ${userId}:`, errorMsg);
      
      // Rimuovi subscriptions non valide (404/410)
      if (statusCode === 404 || statusCode === 410) {
        console.log(`[Push] Rimozione subscription non valida (${statusCode}):`, subscription.endpoint);
        await removeSubscription(subscription.endpoint);
      }
    }
  }
  
  return { success: sent > 0, sent, errors };
}

// Broadcast a tutti i DJ (utenti con credenziali valide)
export async function broadcastToDJs(payload: PushPayload): Promise<{ success: boolean; totalSent: number; totalErrors: number }> {
  if (!ensureWebPushConfig()) {
    return { success: false, totalSent: 0, totalErrors: 1 };
  }
  
  // Ottieni lista DJ dalle credenziali ambiente
  const djUser = process.env.DJ_PANEL_USER?.trim();
  if (!djUser) {
    console.warn('[Push] Nessun DJ configurato per broadcast');
    return { success: false, totalSent: 0, totalErrors: 1 };
  }
  
  console.log('[Push] Broadcast notifica a DJ:', payload.title);
  
  // Per ora inviamo solo al DJ principale configurato
  // In futuro si potrebbe estendere per supportare più DJ
  const result = await sendToUser(djUser, payload);
  
  return {
    success: result.success,
    totalSent: result.sent,
    totalErrors: result.errors
  };
}

// Test di connettività
export async function testPush(): Promise<{ success: boolean; error?: string }> {
  if (!ensureWebPushConfig()) {
    return { success: false, error: 'Web Push non configurato correttamente' };
  }
  
  const djUser = process.env.DJ_PANEL_USER?.trim();
  if (!djUser) {
    return { success: false, error: 'Nessun DJ configurato' };
  }
  
  const testPayload: PushPayload = {
    title: '🎵 Test Notifica',
    body: 'Sistema notifiche funzionante ✓',
    url: '/dj',
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge.png'
  };
  
  const result = await sendToUser(djUser, testPayload);
  
  if (result.success) {
    return { success: true };
  } else {
    return { success: false, error: `Invio fallito: ${result.errors} errori, ${result.sent} inviate` };
  }
}

// Utility per pulire subscriptions obsolete (batch cleanup)
export async function cleanupExpiredSubscriptions(daysOld: number = 30): Promise<{ removed: number }> {
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const { data, error } = await supabase
        .from('push_subscriptions')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      
      if (error) {
        console.error('[Push] Errore cleanup subscriptions:', error);
        return { removed: 0 };
      }
      
      const removed = data?.length || 0;
      console.log(`[Push] Cleanup completato: rimosse ${removed} subscriptions obsolete`);
      return { removed };
    } else {
      // Per in-memory non implementiamo cleanup automatico
      return { removed: 0 };
    }
  } catch (error) {
    console.error('[Push] Errore cleanup:', error);
    return { removed: 0 };
  }
}

// Export configurazione VAPID public key per client
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

// Statistiche subscriptions
export async function getSubscriptionStats(): Promise<{ total: number; byUser: Record<string, number> }> {
  try {
    const supabase = getSupabase();
    
    if (supabase) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id');
      
      if (error) {
        console.error('[Push] Errore stats subscriptions:', error);
        return { total: 0, byUser: {} };
      }
      
      const byUser: Record<string, number> = {};
      for (const row of data || []) {
        byUser[row.user_id] = (byUser[row.user_id] || 0) + 1;
      }
      
      return { total: data?.length || 0, byUser };
    } else {
      // In-memory stats
      const byUser: Record<string, number> = {};
      for (const sub of inMemorySubscriptions.values()) {
        byUser[sub.user_id] = (byUser[sub.user_id] || 0) + 1;
      }
      
      return { total: inMemorySubscriptions.size, byUser };
    }
  } catch (error) {
    console.error('[Push] Errore getSubscriptionStats:', error);
    return { total: 0, byUser: {} };
  }
}