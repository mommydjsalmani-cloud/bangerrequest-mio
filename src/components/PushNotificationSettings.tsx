'use client';

import { useState, useEffect } from 'react';
import { NotificationManager } from '@/lib/notifications';

export function PushNotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Controlla supporto notifiche
    const supported = NotificationManager.isSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      // Controlla se già iscritto
      NotificationManager.isSubscribed().then(subscribed => {
        setIsSubscribed(subscribed);
      });
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!isSupported) return;
    
    setLoading(true);
    try {
      if (isSubscribed) {
        // Disiscriviti
        await NotificationManager.unsubscribe();
        setIsSubscribed(false);
      } else {
        // Iscriviti
        const success = await NotificationManager.subscribe();
        if (success) {
          setIsSubscribed(true);
          setPermission(Notification.permission);
        }
      }
    } catch (error) {
      console.error('Errore gestione notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    if (!isSubscribed) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎵 Test Notifica',
          body: 'Questa è una notifica di test per il DJ panel',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Errore invio notifica test:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-medium text-orange-800 mb-2">🚫 Notifiche Non Supportate</h3>
        <p className="text-sm text-orange-700">
          Il tuo browser non supporta le notifiche push.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-3">🔔 Notifiche Push</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Notifiche Nuove Richieste</p>
            <p className="text-xs text-gray-500">
              Ricevi notifiche quando arrivano nuove richieste musicali
            </p>
          </div>
          
          <button
            onClick={handleToggleNotifications}
            disabled={loading || permission === 'denied'}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
              ${isSubscribed ? 'bg-blue-600' : 'bg-gray-200'}
              ${loading || permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                transition duration-200 ease-in-out
                ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">
              ❌ Notifiche bloccate. Abilita le notifiche nelle impostazioni del browser.
            </p>
          </div>
        )}

        {isSubscribed && (
          <div className="flex gap-2">
            <button
              onClick={testNotification}
              disabled={loading}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md border border-gray-300 disabled:opacity-50"
            >
              {loading ? 'Invio...' : '🧪 Test Notifica'}
            </button>
            
            <div className="text-xs text-green-600 flex items-center">
              ✅ Notifiche attive
            </div>
          </div>
        )}
      </div>
    </div>
  );
}