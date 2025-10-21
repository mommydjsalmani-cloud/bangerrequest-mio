"use client";

import { useState, useEffect } from 'react';
import { 
  isPushSupported, 
  getNotificationPermission, 
  subscribeToPush, 
  unsubscribeFromPush,
  isPushSubscribed 
} from '@/lib/push';

interface NotificationManagerProps {
  djSecret: string;
  djUser: string;
}

export default function NotificationManager({ djSecret, djUser }: NotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check support and current state
    const checkState = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);
        
        const subscribed = await isPushSubscribed();
        setIsSubscribed(subscribed);
      }
    };
    
    checkState();
  }, []);

  const enableNotifications = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await subscribeToPush(djSecret, djUser);
      setIsSubscribed(true);
      setPermission('granted');
      setSuccess('✅ Notifiche push attivate! Riceverai avvisi per nuove richieste.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`❌ Errore: ${message}`);
      console.error('Enable notifications failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await unsubscribeFromPush(djSecret, djUser);
      setIsSubscribed(false);
      setSuccess('🔕 Notifiche push disattivate.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`❌ Errore: ${message}`);
      console.error('Disable notifications failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = () => {
    if (!isSupported || permission !== 'granted') {
      setError('❌ Notifiche non disponibili o non autorizzate');
      return;
    }
    
    // Create a test notification
    new Notification('🎵 Test Banger Request', {
      body: 'Test di notifica - Bohemian Rhapsody - Queen',
      icon: '/Simbolo_Bianco.png',
      tag: 'test-notification'
    });
    
    setSuccess('🧪 Notifica di test inviata!');
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4 mb-6">
        <h3 className="text-yellow-100 font-semibold mb-2">⚠️ Notifiche Push Non Supportate</h3>
        <p className="text-yellow-100/80 text-sm">
          Il tuo browser non supporta le notifiche push. 
          Prova con Chrome, Firefox, Safari o Edge aggiornati.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            🔔 Notifiche Push
          </h3>
          <p className="text-white/60 text-sm">
            Ricevi avvisi istantanei per nuove richieste musicali
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full ${
            isSubscribed && permission === 'granted' 
              ? 'bg-green-400' 
              : permission === 'denied' 
                ? 'bg-red-400' 
                : 'bg-yellow-400'
          }`} />
          <span className="text-white/80 text-sm">
            {isSubscribed && permission === 'granted' 
              ? 'Attive' 
              : permission === 'denied' 
                ? 'Bloccate' 
                : 'Inattive'
            }
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-400 text-red-100 px-3 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-400 text-green-100 px-3 py-2 rounded mb-3 text-sm">
          {success}
        </div>
      )}

      {/* Permission denied message */}
      {permission === 'denied' && (
        <div className="bg-orange-500/20 border border-orange-400 text-orange-100 px-3 py-2 rounded mb-3 text-sm">
          🚫 <strong>Notifiche bloccate</strong><br />
          Sblocca le notifiche nelle impostazioni del browser e ricarica la pagina.
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isSubscribed || permission !== 'granted' ? (
          <button
            onClick={enableNotifications}
            disabled={loading || permission === 'denied'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Attivando...
              </>
            ) : (
              <>
                🔔 Attiva Notifiche
              </>
            )}
          </button>
        ) : (
          <button
            onClick={disableNotifications}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Disattivando...
              </>
            ) : (
              <>
                🔕 Disattiva
              </>
            )}
          </button>
        )}
        
        {isSubscribed && permission === 'granted' && (
          <button
            onClick={testNotification}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🧪 Test
          </button>
        )}
      </div>

      {/* Info section */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-white/60 text-xs">
          💡 <strong>Come funziona:</strong> Riceverai una notifica sul dispositivo 
          ogni volta che un utente invia una richiesta musicale, anche se l&apos;app è chiusa.
        </p>
      </div>
    </div>
  );
}