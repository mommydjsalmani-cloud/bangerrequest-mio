"use client";

import { useState, useEffect, useCallback } from 'react';
import { LibereSession, LibereRequest, LibereStats } from '@/lib/libereStore';

export default function LibereAdminPanel() {
  // Stati base per autenticazione
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Stati per gestione schema e migrazione  
  const [schemaError, setSchemaError] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Carica credenziali da sessionStorage al mount
  useEffect(() => {
    try {
      const savedPwd = sessionStorage.getItem('dj_secret');
      const savedUser = sessionStorage.getItem('dj_user');
      if (savedPwd && savedUser) {
        setPassword(savedPwd);
        setUsername(savedUser);
      }
    } catch {}
  }, []);

  // Funzione di logout
  const logout = () => {
    sessionStorage.removeItem('dj_secret');
    sessionStorage.removeItem('dj_user');
    window.location.href = '/dj/home';
  };

  // Funzioni principali con useCallback
  const checkMigration = useCallback(async () => {
    setMigrationLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/libere/migrate', {
        method: 'POST',
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setSuccess(data.message);
      } else {
        if (data.sql) {
          setError(`${data.error}\n\nSQL da eseguire:\n${data.sql}`);
        } else {
          setError(data.error || 'Errore durante il controllo migrazione');
        }
      }
    } catch {
      setError('Errore connessione durante il controllo migrazione');
    } finally {
      setMigrationLoading(false);
    }
  }, [username, password]);

  // Carica dati quando le credenziali sono disponibili - versione semplificata
  useEffect(() => {
    // Per ora, nessun caricamento automatico
  }, [username, password]);

  // Se non ci sono credenziali, redirect alla home
  if (!password || !username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center bg-white/10 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Accesso Richiesto</h2>
          <p className="text-gray-300 mb-4">Devi effettuare il login per accedere al pannello richieste libere.</p>
          <button 
            onClick={() => window.location.href = '/dj/home'}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Torna al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-2 md:p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">🎵 Pannello Richieste Libere</h1>
              <p className="text-gray-300">Benvenuto {username}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30"
            >
              Logout
            </button>
          </div>
          
          {/* Error e Schema Handling */}
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded mb-4 backdrop-blur-sm">
              {error}
              {schemaError && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400 rounded backdrop-blur-sm">
                  <h4 className="font-medium text-blue-200 mb-2">🔧 Configurazione Database</h4>
                  <button
                    onClick={checkMigration}
                    disabled={migrationLoading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-3 mb-2"
                  >
                    {migrationLoading ? '⏳ Controllo...' : '⚡ Controlla Migrazione Rate Limiting'}
                  </button>
                  <div className="text-sm text-blue-200 bg-blue-600/20 p-2 rounded border-l-4 border-blue-400">
                    <strong>Setup Manuale:</strong><br/>
                    1. Vai su <strong>Supabase Dashboard</strong><br/>
                    2. Clicca <strong>SQL Editor</strong><br/>
                    3. Incolla il contenuto di <code className="bg-white/20 px-1 rounded">docs/richieste_libere_schema.sql</code><br/>
                    4. Clicca <strong>Run</strong>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-3 rounded mb-4 backdrop-blur-sm">
              {success}
            </div>
          )}
        </div>

        {/* Per ora mostro solo il minimo */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 border border-white/20">
          <div className="text-center text-white">
            <p>Pannello in caricamento...</p>
            <p className="text-sm text-gray-300 mt-2">Credenziali caricate: {username ? '✅' : '❌'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}