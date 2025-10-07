"use client";

import { useState, useEffect, useCallback } from 'react';
import { LibereSession, LibereRequest, LibereStats, SESSION_STATUS_LABELS, STATUS_LABELS, generatePublicUrl } from '@/lib/libereStore';

export default function LibereAdminPanel() {
  // Stati base per autenticazione
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data state
  const [sessions, setSessions] = useState<LibereSession[]>([]);
  const [currentSession, setCurrentSession] = useState<LibereSession | null>(null);
  const [requests, setRequests] = useState<LibereRequest[]>([]);
  const [stats, setStats] = useState<LibereStats | null>(null);
  
  // UI state
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  
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
  const loadSessionData = useCallback(async (sessionId: string) => {
    if (!sessionId || !username || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/libere/admin?session_id=${sessionId}`, {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore caricamento dati');
        return;
      }
      
      setCurrentSession(data.session);
      setRequests(data.requests || []);
      setStats(data.stats || null);
      
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  }, [username, password]);

  const loadData = useCallback(async () => {
    if (!username || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/libere/admin?action=sessions', {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        if (data.error && data.error.includes('sessioni_libere')) {
          setSchemaError(true);
          setError('Database non configurato: le tabelle delle Richieste Libere non sono state create.');
        } else {
          setError(data.error || 'Errore caricamento dati');
        }
        return;
      }
      
      setSessions(data.sessions || []);
      
      // Seleziona prima sessione se disponibile
      if (data.sessions?.length > 0) {
        setSelectedSessionId(data.sessions[0].id);
        loadSessionData(data.sessions[0].id);
      }
      
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  }, [username, password, loadSessionData]);

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

  // Carica dati quando le credenziali sono disponibili
  useEffect(() => {
    if (username && password) {
      loadData();
    }
  }, [username, password, loadData]);

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

        {/* Controlli Sessioni */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 items-stretch sm:items-center mb-4">
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                if (e.target.value) loadSessionData(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"
            >
              <option value="" className="text-gray-800">Seleziona sessione...</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id} className="text-gray-800">
                  {session.name} ({SESSION_STATUS_LABELS[session.status]})
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowCreateSession(!showCreateSession)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg"
            >
              + Nuova
            </button>
          </div>

          {/* Form Creazione Sessione */}
          {showCreateSession && (
            <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Nome sessione..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
                />
                <button
                  onClick={async () => {
                    if (!newSessionName.trim()) return;
                    // Chiama API per creare sessione
                    try {
                      const response = await fetch('/api/libere/admin', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-dj-user': username,
                          'x-dj-secret': password
                        },
                        body: JSON.stringify({
                          action: 'create_session',
                          name: newSessionName.trim()
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (data.ok) {
                        setSuccess('Sessione creata con successo!');
                        setNewSessionName('');
                        setShowCreateSession(false);
                        loadData(); // Ricarica la lista
                      } else {
                        setError(data.error || 'Errore creazione sessione');
                      }
                    } catch {
                      setError('Errore connessione');
                    }
                  }}
                  disabled={!newSessionName.trim() || loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Crea
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sessione Corrente e Richieste */}
        {currentSession && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 border border-white/20">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">{currentSession.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>Status: <span className="text-white">{SESSION_STATUS_LABELS[currentSession.status]}</span></span>
                {currentSession.token && (
                  <span>Token: <code className="text-blue-300">{currentSession.token}</code></span>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-300">Totali</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.lastHour}</div>
                  <div className="text-sm text-gray-300">Ultima Ora</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{requests.filter(r => r.status === 'new').length}</div>
                  <div className="text-sm text-gray-300">Nuove</div>
                </div>
              </div>
            )}

            {/* Lista Richieste */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white mb-3">Richieste ({requests.length})</h3>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nessuna richiesta per questa sessione
                </div>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-white font-medium">{request.title}</div>
                        <div className="text-gray-300 text-sm">{request.artists}</div>
                        {request.note && (
                          <div className="text-gray-400 text-sm mt-1">💬 {request.note}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(request.created_at).toLocaleString('it-IT')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'new' ? 'bg-yellow-600 text-yellow-100' :
                          request.status === 'accepted' ? 'bg-green-600 text-green-100' :
                          request.status === 'rejected' ? 'bg-red-600 text-red-100' :
                          'bg-gray-600 text-gray-100'
                        }`}>
                          {STATUS_LABELS[request.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Per ora mostro solo il minimo se non c'è sessione selezionata */}
        {!currentSession && sessions.length === 0 && !loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 border border-white/20">
            <div className="text-center text-white">
              <p>Nessuna sessione disponibile</p>
              <p className="text-sm text-gray-300 mt-2">Crea una nuova sessione per iniziare</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 border border-white/20">
            <div className="text-center text-white">
              <p>Caricamento in corso...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}