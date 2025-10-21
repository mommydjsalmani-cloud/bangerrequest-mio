"use client";

import { useState, useEffect } from 'react';
import { 
  getPermissionState, 
  subscribeToPush, 
  unsubscribeFromPush, 
  hasActiveSubscription,
  type NotificationPermissionState 
} from '@/lib/notifications';

interface NotificationsClientProps {
  djSecret: string;
  onStatusChange?: (enabled: boolean) => void;
}

export default function NotificationsClient({ djSecret, onStatusChange }: NotificationsClientProps) {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    supported: false,
    permission: 'default',
    canRequestPermission: false,
    requiresPWA: false
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Verifica stato al mount
  useEffect(() => {
    async function checkState() {
      try {
        const state = getPermissionState();
        setPermissionState(state);
        
        if (state.supported && state.permission === 'granted') {
          const hasSubscription = await hasActiveSubscription();
          setIsSubscribed(hasSubscription);
          onStatusChange?.(hasSubscription);
        }

        // Verifica se VAPID è configurato
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          setShowConfig(true);
        }
      } catch (err) {
        console.error('Error checking notification state:', err);
      }
    }

    checkState();
  }, [onStatusChange]);

  const handleSubscribe = async () => {
    if (!djSecret) {
      setError('Credenziali DJ mancanti');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await subscribeToPush(djSecret);
      setIsSubscribed(true);
      onStatusChange?.(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Subscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!djSecret) {
      setError('Credenziali DJ mancanti');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await unsubscribeFromPush(djSecret);
      setIsSubscribed(false);
      onStatusChange?.(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Configurazione mancante
  if (showConfig) {
    return (
      <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-100 px-4 py-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400">⚠️</span>
          <strong>Push Notifications - Configurazione Richiesta</strong>
        </div>
        <p className="text-sm mb-2">
          Per abilitare le notifiche push, configura le variabili VAPID in Vercel:
        </p>
        <ul className="text-xs space-y-1 ml-4">
          <li>• <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code></li>
          <li>• <code>VAPID_PRIVATE_KEY</code></li>
          <li>• <code>VAPID_SUBJECT</code></li>
        </ul>
        <button
          onClick={() => setShowConfig(false)}
          className="mt-2 text-xs text-yellow-200 hover:text-yellow-100 underline"
        >
          Nascondi questo messaggio
        </button>
      </div>
    );
  }

  // Browser non supportato
  if (!permissionState.supported) {
    return (
      <div className="bg-gray-500/20 border border-gray-400 text-gray-300 px-4 py-2 rounded-lg text-sm">
        <span className="text-gray-400">📱</span> Push notifications non supportate su questo browser
      </div>
    );
  }

  // iOS senza PWA
  if (permissionState.requiresPWA) {
    return (
      <div className="bg-blue-500/20 border border-blue-400 text-blue-100 px-4 py-3 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400">📱</span>
          <strong>iOS - Installa come App</strong>
        </div>
        <p className="text-sm mb-2">
          Su iOS, le notifiche push richiedono l&apos;installazione come PWA:
        </p>
        <ol className="text-xs space-y-1 ml-4 list-decimal">
          <li>Tocca il pulsante Condividi in Safari</li>
          <li>Seleziona &quot;Aggiungi alla schermata Home&quot;</li>
          <li>Apri l&apos;app dalla home screen</li>
          <li>Ricarica questa pagina</li>
        </ol>
      </div>
    );
  }

  // Permesso negato
  if (permissionState.permission === 'denied') {
    return (
      <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-2 rounded-lg text-sm">
        <span className="text-red-400">🚫</span> Notifiche bloccate - Abilita nelle impostazioni del browser
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status e toggle principale */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="font-medium text-white">Notifiche Push</span>
            {isSubscribed && (
              <span className="px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded-full">
                Attive
              </span>
            )}
          </div>
          <p className="text-white/60 text-sm">
            {isSubscribed 
              ? 'Riceverai notifiche per nuove richieste musicali'
              : 'Abilita per ricevere notifiche anche con altre app aperte'
            }
          </p>
        </div>
        
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSubscribed
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:bg-gray-500 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              {isSubscribed ? 'Disabilitando...' : 'Abilitando...'}
            </span>
          ) : (
            isSubscribed ? 'Disabilita' : 'Abilita Notifiche'
          )}
        </button>
      </div>

      {/* Errori */}
      {error && (
        <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-400">❌</span>
            <span className="font-medium">Errore</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-200 hover:text-red-100 underline"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Info aggiuntive quando abilitato */}
      {isSubscribed && (
        <div className="bg-green-500/10 border border-green-400/30 text-green-100 px-4 py-3 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">✅</span>
            <span className="font-medium">Notifiche Attive</span>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Riceverai notifiche anche con altre app in primo piano</li>
            <li>• Azioni rapide: Accetta o Visualizza direttamente dalla notifica</li>
            <li>• Le notifiche persistono finché non interagisci</li>
          </ul>
        </div>
      )}
    </div>
  );
}
