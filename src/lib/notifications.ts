// Utility per gestire push notifications
// Client-side push subscription management

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationManager {
  private static instance: NotificationManager;
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Controlla se il browser supporta le notifiche
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Ottieni lo stato attuale delle notifiche
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Richiedi permesso per le notifiche
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Browser non supporta le push notifications');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Registra service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker non supportato');
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    // Aspetta che sia attivo
    await navigator.serviceWorker.ready;
    
    return registration;
  }

  // Subscribe alle push notifications
  async subscribe(djSecret: string, djUser: string): Promise<PushSubscription | null> {
    try {
      // 1. Controlla permessi
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permesso negato per le notifiche');
      }

      // 2. Registra service worker
      const registration = await this.registerServiceWorker();

      // 3. Crea subscription
      const vapidKey = this.urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BDUaau2YrVBj4X3sbQiBBe9dZ6SHgrzAOLGpIiLBroXvn_HzdGXTbqxMVlRck3TPf5Fr26hnbqSu0EE2hGWEpuE'
      );
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as BufferSource
      });

      // 4. Salva sul server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-secret': djSecret,
          'x-dj-user': djUser
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Errore nel salvare la subscription');
      }

      console.log('Push notifications attivate!');
      return subscription;

    } catch (error) {
      console.error('Errore subscribe push:', error);
      throw error;
    }
  }

  // Unsubscribe dalle notifiche
  async unsubscribe(djSecret: string, djUser: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Rimuovi dal server
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

        // Unsubscribe localmente
        await subscription.unsubscribe();
        console.log('Push notifications disattivate');
      }
    } catch (error) {
      console.error('Errore unsubscribe:', error);
      throw error;
    }
  }

  // Controlla se già iscritto
  async isSubscribed(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  // Test notification locale
  async sendTestNotification(): Promise<void> {
    const permission = await this.getPermissionStatus();
    if (permission === 'granted') {
      new Notification('🎵 Test Banger Request', {
        body: 'Le notifiche funzionano correttamente!',
        icon: '/Simbolo_Bianco.png',
        tag: 'test'
      });
    }
  }

  // Utility: converti VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
