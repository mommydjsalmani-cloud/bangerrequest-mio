// Service Worker per Web Push Notifications - Banger Request
// Versione: 1.0.0

const SW_VERSION = '1.0.0';

// Listener per eventi push
self.addEventListener('push', function(event) {
  console.log('[SW] Push event ricevuto:', event);
  
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('[SW] Errore parsing payload push:', error);
    data = {
      title: '🎵 Nuova richiesta',
      body: 'Controlla il pannello DJ per i dettagli',
      url: '/dj'
    };
  }
  
  const title = data.title || '🎵 Banger Request';
  const options = {
    body: data.body || 'Nuova notifica disponibile',
    icon: data.icon || '/icons/notification-icon.png',
    badge: data.badge || '/icons/badge.png',
    data: {
      url: data.url || '/dj',
      timestamp: Date.now()
    },
    tag: 'banger-request', // Raggruppa notifiche simili
    requireInteraction: true, // Mantiene visibile fino a click
    vibrate: [200, 100, 200], // Pattern vibrazione per mobile
    actions: [
      {
        action: 'open',
        title: '🎧 Apri Pannello DJ',
        icon: '/icons/dj-action.png'
      },
      {
        action: 'dismiss',
        title: '❌ Chiudi',
        icon: '/icons/close-action.png'
      }
    ]
  };
  
  const promiseChain = self.registration.showNotification(title, options)
    .then(() => {
      console.log('[SW] Notifica mostrata con successo');
    })
    .catch((error) => {
      console.error('[SW] Errore mostrando notifica:', error);
    });
  
  event.waitUntil(promiseChain);
});

// Listener per click su notifica
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Click notifica:', event);
  
  const notification = event.notification;
  const action = event.action;
  
  // Chiudi sempre la notifica
  notification.close();
  
  // Se l'azione è dismiss, non fare altro
  if (action === 'dismiss') {
    return;
  }
  
  // Ottieni URL da aprire
  const urlToOpen = notification.data?.url || '/dj';
  
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clientList) {
    // Cerca se c'è già una finestra aperta con l'app
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url.includes(new URL(urlToOpen, self.location.origin).pathname) && 'focus' in client) {
        console.log('[SW] Finestra esistente trovata, portandola in primo piano');
        return client.focus();
      }
    }
    
    // Se non c'è una finestra aperta, aprila
    if (clients.openWindow) {
      const fullUrl = new URL(urlToOpen, self.location.origin).href;
      console.log('[SW] Aprendo nuova finestra:', fullUrl);
      return clients.openWindow(fullUrl);
    }
  }).catch(function(error) {
    console.error('[SW] Errore gestendo click notifica:', error);
  });
  
  event.waitUntil(promiseChain);
});

// Listener per installazione SW
self.addEventListener('install', function() {
  console.log('[SW] Service Worker installato, versione:', SW_VERSION);
  
  // Attiva immediatamente il nuovo SW
  self.skipWaiting();
});

// Listener per attivazione SW
self.addEventListener('activate', function() {
  console.log('[SW] Service Worker attivato, versione:', SW_VERSION);
  
  // Prendi il controllo di tutti i client immediatamente
  self.clients.claim();
});

// Gestione messaggi dal client
self.addEventListener('message', function(event) {
  console.log('[SW] Messaggio ricevuto:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: SW_VERSION,
      timestamp: Date.now()
    });
  }
});

// Gestione errori globali
self.addEventListener('error', function(event) {
  console.error('[SW] Errore globale:', event.error);
});

// Gestione promise rejection non gestite
self.addEventListener('unhandledrejection', function(event) {
  console.error('[SW] Promise rejection non gestita:', event.reason);
});

console.log('[SW] Service Worker caricato, versione:', SW_VERSION);
