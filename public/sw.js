// Service Worker for Push Notifications
// Handles background push notifications even when app is closed

const CACHE_NAME = 'banger-request-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - handles incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: `${data.title} - ${data.artists}\nEvento: ${data.event || 'Richieste Libere'}`,
      icon: '/Simbolo_Bianco.png',
      badge: '/Simbolo_Bianco.png',
      tag: `request-${data.id}`,
      data: {
        request_id: data.id,
        session_id: data.session_id,
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: '👀 Visualizza',
          icon: '/Simbolo_Bianco.png'
        },
        {
          action: 'dismiss',
          title: '❌ Ignora'
        }
      ],
      requireInteraction: true, // Keeps notification visible until user interacts
      vibrate: [200, 100, 200], // Vibration pattern for mobile
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification('🎵 Nuova Richiesta Musicale', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    // Fallback notification if data parsing fails
    event.waitUntil(
      self.registration.showNotification('🎵 Banger Request', {
        body: 'Hai ricevuto una nuova richiesta musicale',
        icon: '/Simbolo_Bianco.png',
        tag: 'fallback-notification'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    // Just close notification, do nothing
    return;
  }

  // For 'view' action or default click
  const targetUrl = action === 'view' && data?.session_id 
    ? `/dj/libere?session=${data.session_id}` 
    : '/dj/libere';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/dj') && 'focus' in client) {
            // Focus existing DJ window and navigate if needed
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(targetUrl);
              }
            });
          }
        }
        
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('Error handling notification click:', error);
      })
  );
});

// Background sync for offline functionality (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle background synchronization if needed
  }
});
