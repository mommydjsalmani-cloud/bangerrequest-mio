// Service Worker per notifiche push
console.log('🔔 Banger Request SW loaded');

// Gestione notifiche push
self.addEventListener('push', function(event) {
  console.log('📱 Push received:', event);
  
  const options = {
    body: 'Nuova richiesta musicale ricevuta!',
    icon: '/LogoHD_Bianco.png',
    badge: '/Simbolo_Bianco.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/dj/libere'
    },
    actions: [
      {
        action: 'view',
        title: 'Vedi Richieste',
        icon: '/Simbolo_Bianco.png'
      },
      {
        action: 'dismiss',
        title: 'Ignora'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.message || options.body;
      options.data = { ...options.data, ...payload };
    } catch (e) {
      console.log('📝 Push data:', event.data.text());
    }
  }

  event.waitUntil(
    self.registration.showNotification('🎧 Banger Request', options)
  );
});

// Gestione click su notifica
self.addEventListener('notificationclick', function(event) {
  console.log('🔗 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Apri pannello DJ
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dj/libere')
    );
  }
  // 'dismiss' non fa nulla, chiude solo la notifica
});

// Cache per offline (opzionale)
self.addEventListener('install', function(event) {
  console.log('⚙️ SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('✅ SW activated');
  event.waitUntil(self.clients.claim());
});