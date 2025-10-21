"use client";

import { useState, useEffect } from 'react';
import { 
  isPushSupported, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribed,
  isIOS,
  canReceivePushOnIOS
} from '@/lib/notifications';

interface NotificationsClientProps {
  djSecret: string;
  djUser: string;
}

function NotificationsClient({ djSecret, djUser }: NotificationsClientProps) {
  const [isNotificationsSupported, setIsNotificationsSupported] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = isPushSupported();
      setIsNotificationsSupported(supported);
      
      if (supported) {
        const subscribed = await isSubscribed();
        setIsNotificationsEnabled(subscribed);
      }

      // Check iOS PWA status
      if (isIOS() && !canReceivePushOnIOS()) {
        setShowIOSGuide(true);
      }
    };

    checkSupport();
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await subscribeToPush(djSecret, djUser);
      setIsNotificationsEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await unsubscribeFromPush(djSecret, djUser);
      setIsNotificationsEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isNotificationsSupported) {
    return (
      <div className="bg-gray-500/20 border border-gray-400 text-gray-100 px-4 py-3 rounded-lg backdrop-blur-sm">
        <p className="text-sm">🚫 Push notifications non supportate in questo browser</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* iOS PWA Guide */}
      {showIOSGuide && (
        <div className="bg-blue-500/20 border border-blue-400 text-blue-100 px-4 py-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-medium mb-1">iOS - Installa come App per ricevere push</p>
              <p className="text-sm opacity-90">
                1. Tocca il pulsante <strong>Condividi</strong> ↗️ <br/>
                2. Seleziona <strong>&ldquo;Aggiungi alla Home&rdquo;</strong> <br/>
                3. Tocca <strong>&ldquo;Aggiungi&rdquo;</strong> per installare la PWA
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm">
          <p className="text-sm">❌ {error}</p>
        </div>
      )}

      {/* Notifications Control */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">🔔 Push Notifications</h3>
            <p className="text-white/70 text-sm">
              Ricevi notifiche per nuove richieste anche con altre app in primo piano
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  isNotificationsEnabled ? 'bg-green-400' : 'bg-gray-400'
                }`}
              />
              <span className="text-white/80 text-sm">
                {isNotificationsEnabled ? 'Attive' : 'Disattive'}
              </span>
            </div>

            {/* Toggle Button */}
            {!isNotificationsEnabled ? (
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading || (isIOS() && !canReceivePushOnIOS())}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Abilitando...' : 'Abilita Notifiche'}
              </button>
            ) : (
              <button
                onClick={handleDisableNotifications}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isLoading ? 'Disabilitando...' : 'Disabilita'}
              </button>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {isNotificationsEnabled && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/60 text-xs">
              ✅ Riceverai notifiche push per ogni nuova richiesta musicale con azioni rapide: 
              <strong> Accetta</strong> e <strong>Visualizza</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export { NotificationsClient };
export default NotificationsClient;