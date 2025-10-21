// Service Worker per Push Notifications
// VINCOLO: Fail-safe totale, nessun impatto su funzionalità esistenti

const CACHE_NAME = 'banger-request-v1';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event - listener principale per notifiche
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  if (!event.data) {
    console.warn('[SW] Push event without data');
    return;
  }

  try {
    const data = event.data.json();
    const { id, title, artist, event: eventName } = data;
    
    const notificationTitle = '🎵 Banger Request';
    const notificationBody = `Nuova richiesta: ${title} - ${artist}`;
    
    const notificationOptions = {
      body: notificationBody,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: `new-request-${id}`, // Previene duplicati
      requireInteraction: true,
      renotify: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'accept',
          title: '✅ Accetta'
        },
        {
          action: 'view', 
          title: '👀 Visualizza'
        }
      ],
      data: {
        id,
        title,
        artist,
        event: eventName
      }
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
    
  } catch (error) {
    console.error('[SW] Error processing push:', error);
    // Fail-safe: mostra notifica generica
    event.waitUntil(
      self.registration.showNotification('🎵 Banger Request', {
        body: 'Nuova richiesta musicale',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        requireInteraction: true
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  const { id } = event.notification.data || {};
  
  if (!id) {
    console.warn('[SW] Notification click without ID');
    return;
  }

  if (event.action === 'accept') {
    // Azione Accept: chiama API per accettare richiesta
    event.waitUntil(
      fetch(`/api/requests/${id}/accept`, {
        method: 'POST',
        credentials: 'include', // Same-origin cookies
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => {
        console.log('[SW] Accept response:', response.status);
      }).catch(error => {
        console.error('[SW] Accept error:', error);
      })
    );
    
  } else if (event.action === 'view') {
    // Azione View: apri/focus sulla pagina DJ
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Cerca finestra esistente
        for (const client of clientList) {
          if (client.url.includes('/dj')) {
            return client.focus();
          }
        }
        // Apri nuova finestra
        return clients.openWindow(`/dj/requests/${id}`);
      }).catch(error => {
        console.error('[SW] View error:', error);
        // Fallback: apri pannello DJ generico
        return clients.openWindow('/dj/libere');
      })
    );
    
  } else {
    // Click generico: focus o apri pannello DJ
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('/dj')) {
            return client.focus();
          }
        }
        return clients.openWindow('/dj/libere');
      }).catch(error => {
        console.error('[SW] Generic click error:', error);
      })
    );
  }
});

// Background sync (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});
