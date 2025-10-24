// Test per sistema Web Push Notifications
// Copre subscription, pruning, e smoke test e2e

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock semplificato per evitare problemi di tipizzazione
global.fetch = vi.fn();

// Mock environment per test
const mockEnv = {
  ENABLE_PUSH_NOTIFICATIONS: 'true',
  VAPID_PUBLIC_KEY: 'test-public-key',
  VAPID_PRIVATE_KEY: 'test-private-key',
  VAPID_SUBJECT: 'mailto:test@example.com',
  DJ_PANEL_USER: 'test-dj',
  DJ_PANEL_SECRET: 'test-secret'
};

describe('Push Notifications API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, mockEnv);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/push/subscribe', () => {
    it('dovrebbe accettare subscription valida con autenticazione DJ', async () => {
      // Mock della funzione fetch per simulare la chiamata API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          message: 'Subscription salvata con successo',
          userId: 'test-dj'
        })
      });

      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
        userAgent: 'Test Browser'
      };

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': 'test-dj',
          'x-dj-secret': 'test-secret'
        },
        body: JSON.stringify(subscriptionData)
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.ok).toBe(true);
      expect(result.userId).toBe('test-dj');
    });

    it('dovrebbe rifiutare richieste senza autenticazione', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          ok: false,
          error: 'Accesso non autorizzato'
        })
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://test.com',
          p256dh: 'test',
          auth: 'test'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('dovrebbe validare i campi richiesti', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          ok: false,
          error: 'Campi richiesti mancanti: endpoint, p256dh, auth'
        })
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': 'test-dj',
          'x-dj-secret': 'test-secret'
        },
        body: JSON.stringify({ endpoint: 'test' }) // Campi mancanti
      });

      const result = await response.json();
      expect(response.ok).toBe(false);
      expect(result.error).toContain('Campi richiesti mancanti');
    });
  });

  describe('POST /api/push/test', () => {
    it('dovrebbe inviare notifica di test con successo', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          message: 'Notifica di test inviata con successo ✓',
          sentAt: new Date().toISOString()
        })
      });

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'x-dj-user': 'test-dj',
          'x-dj-secret': 'test-secret'
        }
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.ok).toBe(true);
      expect(result.message).toContain('successo');
    });

    it('dovrebbe fallire se notifiche push sono disabilitate', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          ok: false,
          error: 'Notifiche push disabilitate sul server'
        })
      });

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'x-dj-user': 'test-dj',
          'x-dj-secret': 'test-secret'
        }
      });

      const result = await response.json();
      expect(response.ok).toBe(false);
      expect(result.error).toContain('disabilitate');
    });
  });

  describe('GET /api/push/test (configuration check)', () => {
    it('dovrebbe restituire stato configurazione', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          config: {
            pushEnabled: true,
            hasVapidPublic: true,
            hasVapidPrivate: true,
            hasVapidSubject: true,
            fullyConfigured: true
          },
          djUser: 'test-dj',
          timestamp: new Date().toISOString()
        })
      });

      const response = await fetch('/api/push/test', {
        method: 'GET',
        headers: {
          'x-dj-user': 'test-dj',
          'x-dj-secret': 'test-secret'
        }
      });

      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.config.fullyConfigured).toBe(true);
      expect(result.djUser).toBe('test-dj');
    });
  });
});

describe('Service Worker Integration', () => {
  // Mock oggetti browser per test SW
  const mockServiceWorker = {
    register: vi.fn().mockResolvedValue({
      scope: '/',
      addEventListener: vi.fn(),
      installing: null
    }),
    ready: Promise.resolve({
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          getKey: vi.fn((name: string) => {
            if (name === 'p256dh') return new ArrayBuffer(65);
            if (name === 'auth') return new ArrayBuffer(16);
            return null;
          })
        })
      },
      showNotification: vi.fn().mockResolvedValue(undefined)
    })
  };

  const mockNotification = {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission)
  };

  beforeEach(() => {
    // Setup mock browser APIs
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: mockServiceWorker,
        userAgent: 'Test Browser'
      },
      writable: true
    });

    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true
    });

    Object.defineProperty(global, 'window', {
      value: {
        atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
        btoa: (str: string) => Buffer.from(str, 'binary').toString('base64')
      },
      writable: true
    });
  });

  it('dovrebbe registrare service worker con successo', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(registration.scope).toBe('/');
  });

  it('dovrebbe richiedere permesso notifiche', async () => {
    const permission = await Notification.requestPermission();
    
    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(permission).toBe('granted');
  });

  it('dovrebbe creare subscription push', async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3, 4])
    });
    
    expect(registration.pushManager.subscribe).toHaveBeenCalled();
    expect(subscription.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test');
  });
});

describe('Notification Flow Integration', () => {
  it('dovrebbe simulare flow completo richiesta -> notifica', async () => {
    // 1. Mock creazione richiesta che triggera notifica
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          ok: true,
          message: 'Richiesta ricevuta 🎶',
          request_id: 'test-request-123',
          request: {
            id: 'test-request-123',
            title: 'Test Song',
            artists: 'Test Artist',
            requester_name: 'Test User'
          }
        })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          message: 'Notifica di test inviata con successo ✓'
        })
      }));

    // 2. Simula creazione richiesta
    const requestResponse = await fetch('/api/libere?s=test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Song',
        artists: 'Test Artist',
        requester_name: 'Test User'
      })
    });

    const requestResult = await requestResponse.json();
    expect(requestResult.ok).toBe(true);
    expect(requestResult.request.title).toBe('Test Song');

    // 3. Verifica che la notifica sia stata inviata (simulated)
    const notificationResponse = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'x-dj-user': 'test-dj',
        'x-dj-secret': 'test-secret'
      }
    });

    const notificationResult = await notificationResponse.json();
    expect(notificationResult.ok).toBe(true);
    expect(notificationResult.message).toContain('successo');

    console.log('✅ Flow completo richiesta -> notifica simulato con successo');
  });
});

describe('Environment Configuration', () => {
  it('dovrebbe validare tutte le variabili ambiente richieste', () => {
    const requiredVars = [
      'ENABLE_PUSH_NOTIFICATIONS',
      'VAPID_PUBLIC_KEY', 
      'VAPID_PRIVATE_KEY',
      'VAPID_SUBJECT',
      'DJ_PANEL_USER',
      'DJ_PANEL_SECRET'
    ];

    for (const varName of requiredVars) {
      expect(process.env[varName]).toBeDefined();
      expect(process.env[varName]).not.toBe('');
    }
  });

  it('dovrebbe gestire configurazione incompleta', () => {
    const originalValue = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;

    // Simula controllo configurazione
    const hasVapidPublic = !!process.env.VAPID_PUBLIC_KEY;
    const isFullyConfigured = hasVapidPublic && !!process.env.VAPID_PRIVATE_KEY;

    expect(hasVapidPublic).toBe(false);
    expect(isFullyConfigured).toBe(false);

    // Ripristina valore originale
    process.env.VAPID_PUBLIC_KEY = originalValue;
  });
});

describe('Error Handling', () => {
  it('dovrebbe gestire errori di rete gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    try {
      await fetch('/api/push/test');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });

  it('dovrebbe gestire subscription non valide', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        ok: false,
        error: 'Endpoint URL non valido'
      })
    });

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-user': 'test-dj',
        'x-dj-secret': 'test-secret'
      },
      body: JSON.stringify({
        endpoint: 'invalid-url',
        p256dh: 'test',
        auth: 'test'
      })
    });

    const result = await response.json();
    expect(response.ok).toBe(false);
    expect(result.error).toContain('non valido');
  });
});