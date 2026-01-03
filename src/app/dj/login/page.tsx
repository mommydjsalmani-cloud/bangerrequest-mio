"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiPath } from '@/lib/apiPath';

declare global {
  interface Window {
    grecaptcha?: {
      render: (element: string | HTMLElement, options: { sitekey: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

export default function DJLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const router = useRouter();
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Controlla se l'utente è già autenticato e carica reCAPTCHA
  useEffect(() => {
    try {
      // Verifica che sessionStorage sia disponibile
      if (typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('SessionStorage non disponibile');
        return;
      }
      
      const savedUser = sessionStorage.getItem('dj_user');
      const savedPassword = sessionStorage.getItem('dj_secret');
      
      console.log('Check auth:', { hasUser: !!savedUser, hasPassword: !!savedPassword });
      
      if (savedUser && savedPassword) {
        // Utente già autenticato, reindirizza direttamente al pannello
        console.log('Redirect to /dj/libere');
        router.push('/dj/libere');
        return;
      }

      // Carica reCAPTCHA script se disponibile
      if (recaptchaKey && !window.grecaptcha) {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setRecaptchaReady(true);
        };
        document.head.appendChild(script);
      } else if (recaptchaKey) {
        setRecaptchaReady(true);
      }
    } catch (error) {
      console.error('Errore check autenticazione:', error);
    }
  }, [router, recaptchaKey]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Inserisci username e password');
      return;
    }

    // Verifica reCAPTCHA se configurato
    if (recaptchaKey && window.grecaptcha) {
      const token = window.grecaptcha.getResponse();
      if (!token) {
        setError('Per favore completa il reCAPTCHA');
        return;
      }

      // Verifica token lato server
      try {
        const verifyRes = await fetch(apiPath('/api/auth/verify-recaptcha'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!verifyRes.ok) {
          const data = await verifyRes.json();
          setError(data.message || 'Verifica reCAPTCHA fallita');
          window.grecaptcha.reset();
          return;
        }
      } catch (err) {
        console.error('Errore verifica reCAPTCHA:', err);
        setError('Errore nella verifica di sicurezza');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Test delle credenziali con l'API libere admin
      const res = await fetch(apiPath('/api/libere/admin?action=sessions'), { 
        headers: { 
          'x-dj-secret': password.trim(), 
          'x-dj-user': username.trim() 
        } 
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Credenziali DJ errate. Accesso negato.');
        } else if (res.status === 429) {
          setError('Troppi tentativi di accesso. Riprova tra 15 minuti.');
        } else if (res.status === 500) {
          setError('Server non configurato: contatta admin.');
        } else {
          setError('Errore di validazione credenziali.');
        }
        if (recaptchaKey && window.grecaptcha) {
          window.grecaptcha.reset();
        }
        return;
      }
      
      // Credenziali valide, salva in sessionStorage (solo per questa sessione del browser)
      // ⚠️ Note: In futuro, implementare JWT token con HttpOnly cookies per maggiore sicurezza
      sessionStorage.setItem('dj_secret', password.trim());
      sessionStorage.setItem('dj_user', username.trim());
      
      // Reindirizza direttamente al pannello richieste libere
      router.push('/dj/libere');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Errore di rete: ${errorMsg}`);
      if (recaptchaKey && window.grecaptcha) {
        window.grecaptcha.reset();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
      <form 
        onSubmit={login} 
        className="bg-white/10 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-white/20"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎧 Pannello DJ</h1>
          <p className="text-white/80">Accedi per gestire richieste musicali</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username DJ"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
            disabled={loading}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password DJ"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
            disabled={loading}
          />
          
          {/* reCAPTCHA Widget */}
          {recaptchaKey && recaptchaReady && (
            <div className="flex justify-center my-4">
              <div 
                id="recaptcha-container"
                className="g-recaptcha"
                data-sitekey={recaptchaKey}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim() || !!(recaptchaKey && !recaptchaReady)}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            {loading ? 'Verifico credenziali...' : 'Accedi al Pannello'}
          </button>
        </div>
        
        <div className="mt-6 text-center text-white/60 text-sm">
          <p>Accesso riservato ai DJ autorizzati</p>
        </div>
      </form>
    </div>
  );
}