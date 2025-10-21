// Web Push Service Worker
const CACHE_NAME = 'bangerrequest-v1';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/dj/libere',
        '/icon-192.png',
        '/badge-72.png'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const { id, title, artist, event: eventName } = payload;

  const notificationTitle = '🎵 Banger Request';
  const notificationOptions = {
    body: `Nuova richiesta: ${title} - ${artist}`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `new-request-${id}`,
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'accept', title: '✅ Accetta' },
      { action: 'view', title: '👀 Visualizza' }
    ],
    data: { id, title, artist, event: eventName }
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  const { action, data } = event;
  const { id } = data;

  event.notification.close();

  if (action === 'accept') {
    // Accept request
    event.waitUntil(
      fetch(`/api/requests`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-secret': self.DJ_SECRET || '',
          'x-dj-user': self.DJ_USER || ''
        },
        body: JSON.stringify({ id, action: 'accept' })
      }).catch((error) => {
        console.error('Failed to accept request:', error);
      })
    );
  } else if (action === 'view') {
    // View request - focus existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        const djUrl = `/dj/libere`;
        
        // Try to focus existing DJ panel window
        for (const client of clientList) {
          if (client.url.includes('/dj/')) {
            return client.focus();
          }
        }
        
        // Open new window if no DJ panel found
        if (clients.openWindow) {
          return clients.openWindow(djUrl);
        }
      })
    );
  } else {
    // Default click behavior - open DJ panel
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        const djUrl = `/dj/libere`;
        
        for (const client of clientList) {
          if (client.url.includes('/dj/')) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(djUrl);
        }
      })
    );
  }
});

// Handle background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'accept-request') {
    event.waitUntil(
      // Handle offline accept requests if needed
      console.log('Background sync for accept-request')
    );
  }
});

// Store DJ credentials for notification actions
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_DJ_CREDENTIALS') {
    self.DJ_SECRET = event.data.secret;
    self.DJ_USER = event.data.user;
  }
});
