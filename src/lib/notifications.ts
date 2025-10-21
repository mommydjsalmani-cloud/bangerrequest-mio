// Base64URL to Uint8Array utility
export function base64UrlToUint8Array(base64UrlString: string): Uint8Array {
  const padding = '='.repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Request notification permission
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  });

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;
  
  return registration;
}

// Subscribe to push notifications
export async function subscribeToPush(djSecret: string, djUser: string): Promise<boolean> {
  try {
    // Check permission
    if (Notification.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('VAPID public key not configured');
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey) as BufferSource
      });
    }

    // Send credentials to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'SET_DJ_CREDENTIALS',
        secret: djSecret,
        user: djUser
      });
    }

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-secret': djSecret,
        'x-dj-user': djUser
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      throw new Error(`Subscription failed: ${response.status}`);
    }

    return true;
  } catch (error: unknown) {
    console.error('Failed to register service worker:', error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(djSecret: string, djUser: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      return true; // Already unsubscribed
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return true; // Already unsubscribed
    }

    // Unsubscribe locally
    await subscription.unsubscribe();

    // Notify server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-secret': djSecret,
        'x-dj-user': djUser
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    return true;
  } catch (error) {
    console.error('Push unsubscription failed:', error);
    throw error;
  }
}

// Check if subscription is active
export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// Detect iOS and PWA status
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true;
}

export function canReceivePushOnIOS(): boolean {
  return isIOS() ? isPWAInstalled() : true;
}
