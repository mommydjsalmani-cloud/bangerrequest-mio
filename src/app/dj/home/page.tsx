"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function DJHome() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Test di autenticazione con endpoint eventi (più veloce)
      const response = await fetch('/api/events', {
        headers: {
          'x-dj-user': username.trim(),
          'x-dj-secret': password.trim()
        }
      });
      
      if (!response.ok) {
        setError('Credenziali DJ non valide');
        return;
      }
      
      // Login riuscito - salva credenziali
      sessionStorage.setItem('dj_secret', password.trim());
      sessionStorage.setItem('dj_user', username.trim());
      setAuthed(true);
      
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };

  // Se non autenticato, mostra form di login
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <form onSubmit={login} className="bg-white/10 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">🎧 DJ Panel</h1>
            <p className="text-gray-300">Accedi per gestire i tuoi eventi</p>
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
              className="w-full px-3 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-3 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-lg font-medium"
            >
              {loading ? 'Accesso...' : 'Accedi al Pannello DJ'}
            </button>
          </div>
          
          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>Accedi per gestire eventi e richieste libere</p>
          </div>
        </form>
      </div>
    );
  }

  // Se autenticato, mostra selezione modalità
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">🎧 Pannello DJ</h1>
          <button
            onClick={() => setAuthed(false)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-300 mb-12">Benvenuto {username}! Scegli la modalità di gestione:</p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {/* Pannello Eventi */}
          <Link 
            href="/dj/eventi"
            className="group flex flex-col items-center gap-4 bg-blue-600 hover:bg-blue-700 p-8 rounded-xl transition-all transform hover:scale-105 min-w-[280px]"
          >
            <div className="text-6xl mb-2">🎧</div>
            <h2 className="text-2xl font-bold">Pannello Eventi</h2>
            <p className="text-blue-100 text-center">
              Gestisci eventi specifici con codici<br />
              e richieste per singoli eventi
            </p>
            <div className="text-sm bg-blue-800 px-3 py-1 rounded-full">
              Sistema Tradizionale
            </div>
          </Link>
          
          {/* Richieste Libere */}
          <Link 
            href="/dj/libere"
            className="group flex flex-col items-center gap-4 bg-purple-600 hover:bg-purple-700 p-8 rounded-xl transition-all transform hover:scale-105 min-w-[280px]"
          >
            <div className="text-6xl mb-2">🎵</div>
            <h2 className="text-2xl font-bold">Richieste Libere</h2>
            <p className="text-purple-100 text-center">
              Gestisci richieste aperte senza<br />
              associazione a eventi specifici
            </p>
            <div className="text-sm bg-purple-800 px-3 py-1 rounded-full">
              Nuovo Sistema
            </div>
          </Link>
        </div>
        
        <div className="mt-12 text-gray-400 text-sm">
          <p>Entrambi i sistemi sono completamente indipendenti</p>
        </div>
      </div>
    </div>
  );
}