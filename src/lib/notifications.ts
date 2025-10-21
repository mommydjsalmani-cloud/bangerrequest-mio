// Helper library per gestione Push Notifications
// VINCOLO: Fail-safe, nessun impatto su funzionalità esistenti

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPermissionState {
  supported: boolean;
  permission: NotificationPermission;
  canRequestPermission: boolean;
  requiresPWA: boolean; // iOS senza PWA installata
}

/**
 * Verifica se le push notifications sono supportate
 */
export function isPushSupported(): boolean {
  try {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  } catch {
    return false;
  }
}

/**
 * Ottiene lo stato corrente dei permessi
 */
export function getPermissionState(): NotificationPermissionState {
  const supported = isPushSupported();
  
  if (!supported) {
    return {
      supported: false,
      permission: 'default',
      canRequestPermission: false,
      requiresPWA: false
    };
  }

  const permission = Notification.permission;
  
  // Rileva iOS: richiede PWA installata per push notifications
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const requiresPWA = isIOS && !isStandalone;

  return {
    supported: true,
    permission,
    canRequestPermission: permission === 'default',
    requiresPWA
  };
}

/**
 * Richiede permesso per le notifiche
 */
export async function requestPermission(): Promise<NotificationPermission> {
  try {
    if (!isPushSupported()) {
      throw new Error('Push notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Converte VAPID public key da base64url a Uint8Array
 */
export function base64UrlToUint8Array(base64String: string): Uint8Array {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Error converting VAPID key:', error);
    throw new Error('Invalid VAPID public key format');
  }
}

/**
 * Registra service worker se non presente
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Sottoscrive alle push notifications
 */
export async function subscribeToPush(djSecret: string): Promise<PushSubscriptionData> {
  try {
    // Verifica supporto e permessi
    const permissionState = getPermissionState();
    
    if (!permissionState.supported) {
      throw new Error('Push notifications not supported');
    }

    if (permissionState.requiresPWA) {
      throw new Error('iOS requires PWA installation for push notifications');
    }

    if (permissionState.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission denied');
      }
    }

    // Verifica VAPID public key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }

    // Registra service worker
    const registration = await registerServiceWorker();

    // Attendi che sia pronto
    await new Promise<void>((resolve) => {
      if (registration.active) {
        resolve();
      } else {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                resolve();
              }
            });
          }
        });
      }
    });

    // Sottoscrivi
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey) as BufferSource
    });

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      }
    };

    // Invia al server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-secret': djSecret
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Subscription failed');
    }

    console.log('Push subscription successful');
    return subscriptionData;

  } catch (error) {
    console.error('Push subscription error:', error);
    throw error;
  }
}

/**
 * Rimuove sottoscrizione push
 */
export async function unsubscribeFromPush(djSecret: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('No service worker registration found');
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('No active subscription found');
      return;
    }

    // Rimuovi dal server prima
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-secret': djSecret
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    // Poi rimuovi localmente
    await subscription.unsubscribe();
    console.log('Push unsubscription successful');

  } catch (error) {
    console.error('Push unsubscription error:', error);
    throw error;
  }
}

/**
 * Verifica se c'è una sottoscrizione attiva
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
