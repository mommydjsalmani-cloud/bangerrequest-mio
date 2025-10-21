// Gestione notifiche push per DJ
export class NotificationManager {
  private static instance: NotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Controlla se le notifiche push sono supportate
   */
  static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Controlla se l'utente è già iscritto alle notifiche
   */
  static async isSubscribed(): Promise<boolean> {
    if (!NotificationManager.isSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Iscrive l'utente alle notifiche push (versione semplificata)
   */
  static async subscribe(): Promise<boolean> {
    const instance = NotificationManager.getInstance();
    const initialized = await instance.initialize();
    if (!initialized) return false;

    return await instance.subscribeSimple();
  }

  /**
   * Disiscrive l'utente dalle notifiche push (versione semplificata)
   */
  static async unsubscribe(): Promise<boolean> {
    const instance = NotificationManager.getInstance();
    return await instance.unsubscribeSimple();
  }

  // Inizializza service worker e richiede permessi
  async initialize(): Promise<boolean> {
    if (!NotificationManager.isSupported()) {
      console.warn('🚫 Push notifications not supported');
      return false;
    }

    try {
      // Registra service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered');

      // Richiedi permesso notifiche
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('🚫 Notification permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ SW registration failed:', error);
      return false;
    }
  }

  // Versione semplificata per sottoscrizione (senza credenziali DJ)
  async subscribeSimple(): Promise<boolean> {
    if (!this.registration) {
      console.error('❌ Service Worker not registered');
      return false;
    }

    try {
      // Ottieni VAPID public key dal server
      const vapidResponse = await fetch('/api/push/vapid');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Crea sottoscrizione push
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Invia sottoscrizione al server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.subscription)
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe on server');
      }

      console.log('✅ Push subscription successful');
      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return false;
    }
  }

  // Versione semplificata per disattivazione (senza credenziali DJ)
  async unsubscribeSimple(): Promise<boolean> {
    if (!this.subscription) {
      // Prova a ottenere subscription corrente
      if (this.registration) {
        this.subscription = await this.registration.pushManager.getSubscription();
      }
      if (!this.subscription) return true;
    }

    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.subscription)
      });

      await this.subscription.unsubscribe();
      this.subscription = null;
      console.log('✅ Push unsubscription successful');
      return true;
    } catch (error) {
      console.error('❌ Push unsubscription failed:', error);
      return false;
    }
  }

  // Sottoscrivi DJ alle notifiche push (versione con credenziali)
  async subscribe(djUser: string, djSecret: string): Promise<boolean> {
    if (!this.registration) {
      console.error('❌ Service Worker not registered');
      return false;
    }

    try {
      // Ottieni VAPID public key dal server
      const vapidResponse = await fetch('/api/push/vapid');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Crea sottoscrizione push
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // Invia sottoscrizione al server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': djUser,
          'x-dj-secret': djSecret
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe on server');
      }

      console.log('✅ Push subscription successful');
      return true;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return false;
    }
  }

  // Disattiva notifiche (versione con credenziali)
  async unsubscribe(djUser: string, djSecret: string): Promise<boolean> {
    if (!this.subscription) return true;

    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': djUser,
          'x-dj-secret': djSecret
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON()
        })
      });

      await this.subscription.unsubscribe();
      this.subscription = null;
      console.log('✅ Push unsubscription successful');
      return true;
    } catch (error) {
      console.error('❌ Push unsubscription failed:', error);
      return false;
    }
  }

  // Controlla se le notifiche sono attive
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription !== null;
    } catch {
      return false;
    }
  }

  // Test notifica locale
  async testNotification(): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Test Banger Request', {
        body: 'Le notifiche funzionano correttamente!',
        icon: '/LogoHD_Bianco.png'
      });
    }
  }
}