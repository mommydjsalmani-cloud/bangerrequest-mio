// Service Worker per Push Notifications
// Gira in background anche quando l'app è chiusa

const CACHE_NAME = 'banger-request-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Push event - quando arriva una notifica
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
    data = { title: 'Nuova richiesta', body: 'Una nuova richiesta musicale è arrivata!' };
  }

  const options = {
    body: data.body || `${data.title} - ${data.artist}`,
    icon: '/Simbolo_Bianco.png',
    badge: '/Simbolo_Bianco.png',
    tag: 'new-request',
    data: {
      request_id: data.request_id,
      session_id: data.session_id,
      url: `/dj/libere?highlight=${data.request_id}`
    },
    actions: [
      {
        action: 'view',
        title: '👀 Visualizza',
        icon: '/Simbolo_Bianco.png'
      },
      {
        action: 'dismiss',
        title: '✖️ Chiudi'
      }
    ],
    requireInteraction: true, // Mantiene visibile finché non si interagisce
    silent: false,
    vibrate: [200, 100, 200] // Vibrazione per mobile
  };

  event.waitUntil(
    self.registration.showNotification('🎵 Banger Request', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Apri l'app nel pannello DJ
    const url = event.notification.data.url || '/dj/libere';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Se c'è già una finestra aperta, focusla
          for (let client of windowClients) {
            if (client.url.includes('/dj') && 'focus' in client) {
              return client.focus().then(() => {
                // Naviga alla richiesta specifica se possibile
                return client.navigate(url);
              });
            }
          }
          
          // Altrimenti apri nuova finestra
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Solo chiudi la notifica (già fatto sopra)
  }
});

// Background sync per retry se offline (opzionale)
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-request') {
    console.log('Background sync for retry-request');
    // Implementare retry logica se necessario
  }
});