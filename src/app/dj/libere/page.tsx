"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { formatDateTime, formatDuration, LibereSession, LibereRequest, LibereStats, SESSION_STATUS_LABELS, STATUS_LABELS, STATUS_COLORS, generatePublicUrl, generateQRCodeUrl } from '@/lib/libereStore';

export default function LibereAdminPanel() {
  const [authed, setAuthed] = useState(false);
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
  const [showQR, setShowQR] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [newSessionName, setNewSessionName] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [schemaError, setSchemaError] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/libere/admin?action=sessions', {
        headers: {
          'x-dj-user': username.trim(),
          'x-dj-secret': password.trim()
        }
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        // Controlla se è un errore di schema database
        if (data.error && data.error.includes('sessioni_libere')) {
          setSchemaError(true);
          setError('Database non configurato: le tabelle delle Richieste Libere non sono state create.');
        } else {
          setError(data.error || 'Errore autenticazione');
        }
        return;
      }
      
      setAuthed(true);
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
  };
  
  const loadSessionData = async (sessionId: string) => {
    if (!sessionId || !authed) return;
    
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
  };

  // Polling automatico come negli eventi
  useEffect(() => {
    if (!authed || !selectedSessionId) return;
    
    let mounted = true;
    let interval: ReturnType<typeof setTimeout> | undefined;
    let backoff = 4000;

    const controllerRef: { current?: AbortController } = { current: undefined };

    async function load() {
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      
      try {
        const response = await fetch(`/api/libere/admin?session_id=${selectedSessionId}`, {
          headers: {
            'x-dj-user': username,
            'x-dj-secret': password
          },
          signal: controller.signal
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            if (mounted) setError('Non autorizzato: verifica credenziali DJ.');
          }
          return;
        }
        
        const data = await response.json();
        if (!mounted) return;
        
        if (data.ok) {
          setCurrentSession(data.session);
          setRequests(data.requests || []);
          setStats(data.stats || null);
          setError(null);
          backoff = 4000; // reset backoff su successo
        }
      } catch (error: unknown) {
        if (!mounted || (error instanceof Error && error.name === 'AbortError')) return;
        // Non svuotare i dati su errore di rete
        setError('Problema rete, ritento...');
        backoff = Math.min(backoff * 1.5, 15000);
      }
    }

    function schedule() {
      interval = setTimeout(async () => {
        await load();
        if (mounted) schedule();
      }, backoff);
    }

    load();
    schedule();

    return () => {
      mounted = false;
      if (interval) clearTimeout(interval);
      controllerRef.current?.abort();
    };
  }, [authed, selectedSessionId, password, username]);
  
  const adminAction = async (action: string, extraData: Record<string, unknown> = {}) => {
    // Per la creazione di sessioni non serve selectedSessionId
    if (!authed || (!selectedSessionId && action !== 'create_session')) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/libere/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action,
          session_id: action === 'create_session' ? undefined : selectedSessionId,
          ...extraData
        })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore operazione');
        return;
      }
      
      setSuccess(data.message);
      
      // Ricarica dati
      if (action === 'create_session') {
        // Pulisci il form e chiudi la creazione
        setNewSessionName('');
        setShowCreateSession(false);
        
        // Ricarica lista sessioni
        const sessionsResponse = await fetch('/api/libere/admin?action=sessions', {
          headers: {
            'x-dj-user': username,
            'x-dj-secret': password
          }
        });
        const sessionsData = await sessionsResponse.json();
        if (sessionsData.ok) {
          setSessions(sessionsData.sessions || []);
          if (data.session) {
            setSelectedSessionId(data.session.id);
            loadSessionData(data.session.id);
          }
        }
      } else if (action === 'delete_session') {
        // Ricarica lista sessioni e resetta selezione
        const sessionsResponse = await fetch('/api/libere/admin?action=sessions', {
          headers: {
            'x-dj-user': username,
            'x-dj-secret': password
          }
        });
        const sessionsData = await sessionsResponse.json();
        if (sessionsData.ok) {
          setSessions(sessionsData.sessions || []);
          setSelectedSessionId('');
          setCurrentSession(null);
          setRequests([]);
          setStats(null);
        }
      } else {
        loadSessionData(selectedSessionId);
      }
      
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };
  
  // Funzione veloce stile eventi
  const act = async (requestId: string, action: 'accepted' | 'rejected' | 'cancelled') => {
    if (!authed) return;
    
    const response = await fetch('/api/libere/admin', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-user': username,
        'x-dj-secret': password
      },
      body: JSON.stringify({
        request_id: requestId,
        status: action,
        note: action === 'cancelled' ? 'Cambiato idea - richiesta cancellata dal DJ' : undefined
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) setError('Non autorizzato: credenziali DJ errate.');
      else if (response.status === 500) setError('Errore server.');
      return;
    }
    
    // Refresh ottimistico immediato
    loadSessionData(selectedSessionId);
  };
  
  // Gestione eliminazione sessione
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione? Verranno eliminate anche tutte le richieste associate.')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/libere/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          action: 'delete_session',
          session_id: sessionId
        })
      });

      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore durante l\'eliminazione della sessione');
        return;
      }

      setSuccess('Sessione eliminata con successo ✓');

      // Ricarica lista sessioni e resetta selezione
      const sessionsResponse = await fetch('/api/libere/admin?action=sessions', {
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      const sessionsData = await sessionsResponse.json();
      if (sessionsData.ok) {
        setSessions(sessionsData.sessions || []);
        setSelectedSessionId('');
        setCurrentSession(null);
        setRequests([]);
        setStats(null);
      }
      
    } catch (error) {
      setError('Errore durante l\'eliminazione della sessione');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Link copiato ✓');
    } catch {
      setError('Errore copia link');
    }
  };
  
  const setupDatabase = async () => {
    setSetupLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/libere/setup', {
        method: 'POST',
        headers: {
          'x-dj-user': username,
          'x-dj-secret': password
        }
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore setup database');
        return;
      }
      
      setSuccess('Database configurato con successo! ✓');
      setSchemaError(false);
      
      // Riprova il login
      setTimeout(() => {
        login({ preventDefault: () => {} } as React.FormEvent);
      }, 1000);
      
    } catch {
      setError('Errore connessione durante setup database');
    } finally {
      setSetupLoading(false);
    }
  };
  
  const publicUrl = currentSession ? generatePublicUrl(currentSession.token) : '';
  
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <form onSubmit={login} className="bg-white/10 backdrop-blur-lg p-6 md:p-8 rounded-xl shadow-2xl max-w-md w-full border border-white/20">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">🎵 Pannello Richieste Libere</h1>
          
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded mb-4 backdrop-blur-sm">
              {error}
              {schemaError && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400 rounded backdrop-blur-sm">
                  <h4 className="font-medium text-blue-200 mb-2">🔧 Configurazione Database</h4>
                  <button
                    onClick={setupDatabase}
                    disabled={setupLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-3 mb-2"
                  >
                    {setupLoading ? '⏳ Verifica...' : '🚀 Verifica Database'}
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
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-lg"
            >
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </div>
        </form>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-2 md:p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-white">🎵 Pannello Richieste Libere</h1>
            <button
              onClick={() => setAuthed(false)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30"
            >
              Logout
            </button>
          </div>
          
          {/* Session Selection */}
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
            
            {selectedSessionId && (
              <button
                onClick={() => handleDeleteSession(selectedSessionId)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg transition-colors shadow-lg ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? '⏳ Eliminando...' : '🗑️ Elimina'}
              </button>
            )}
          </div>
          
          {/* Create Session Form */}
          {showCreateSession && (
            <div className="border rounded-lg p-4 bg-gray-50 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome sessione..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() => adminAction('create_session', { session_name: newSessionName })}
                  disabled={!newSessionName.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Crea
                </button>
                <button
                  onClick={() => {
                    setShowCreateSession(false);
                    setNewSessionName('');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
        </div>
        
        {currentSession && (
          <>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{currentSession.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentSession.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {SESSION_STATUS_LABELS[currentSession.status]}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button
                  onClick={() => adminAction('toggle_status')}
                  className={`py-2 px-4 rounded-lg text-white transition-colors ${
                    currentSession.status === 'active' 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {currentSession.status === 'active' ? '⏸️ Pausa' : '▶️ Attiva'}
                </button>
                
                <button
                  onClick={() => adminAction('soft_reset')}
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  🗂️ Reset Morbido
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('ATTENZIONE: Eliminerà definitivamente tutte le richieste. Continuare?')) {
                      adminAction('hard_reset');
                    }
                  }}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  🗑️ Reset Duro
                </button>
                
                <button
                  onClick={() => adminAction('regenerate_token')}
                  className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  🔄 Rigenera Token
                </button>
              </div>
              
              {/* Link & QR */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border rounded-lg"
                  />
                  <button
                    onClick={() => copyToClipboard(publicUrl)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    📋 Copia Link
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    📱 {showQR ? 'Nascondi' : 'Mostra'} QR
                  </button>
                </div>
                
                {showQR && (
                  <div className="text-center">
                    <Image 
                      src={generateQRCodeUrl(publicUrl)} 
                      alt="QR Code" 
                      width={300}
                      height={300}
                      className="mx-auto border rounded-lg" 
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Stats */}
            {stats && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">📊 Statistiche</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-gray-600">Totali</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.lastHour}</div>
                    <div className="text-gray-600">Ultima ora</div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Top 3 richieste:</div>
                    {stats.topRequests.length > 0 ? (
                      <div className="space-y-1">
                        {stats.topRequests.map((req, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{req.title}</span>
                            {req.artists && <span className="text-gray-600"> - {req.artists}</span>}
                            <span className="text-blue-600"> ({req.count}x)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Nessuna richiesta</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Requests List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">📝 Richieste ({requests.length})</h2>
              
              {requests.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nessuna richiesta presente
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-lg">{request.title}</div>
                          {request.artists && (
                            <div className="text-gray-600">{request.artists}</div>
                          )}
                          {request.album && (
                            <div className="text-gray-500 text-sm">{request.album}</div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                            {STATUS_LABELS[request.status]}
                          </span>
                          {request.duration_ms && (
                            <div className="text-gray-500 text-sm mt-1">
                              {formatDuration(request.duration_ms)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-3">
                        <div>📅 {formatDateTime(request.created_at)}</div>
                        {request.requester_name && (
                          <div>👤 {request.requester_name}</div>
                        )}
                        <div>🔍 {request.source === 'spotify' ? 'Spotify' : 'Manuale'}</div>
                        <div>🌐 {request.client_ip}</div>
                      </div>
                      
                      {request.status === 'new' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => act(request.id, 'accepted')}
                            className="bg-green-700 px-2 py-1 rounded text-white hover:bg-green-600 transition"
                          >
                            Accetta
                          </button>
                          <button
                            onClick={() => act(request.id, 'rejected')}
                            className="bg-red-700 px-2 py-1 rounded text-white hover:bg-red-600 transition"
                          >
                            Scarta
                          </button>
                        </div>
                      )}
                      
                      {request.status === 'accepted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => act(request.id, 'rejected')}
                            className="bg-red-700 px-2 py-1 rounded text-white hover:bg-red-600 transition"
                          >
                            Rifiuta
                          </button>
                          <button
                            onClick={() => act(request.id, 'cancelled')}
                            className="bg-orange-700 px-2 py-1 rounded text-white hover:bg-orange-600 transition"
                          >
                            Cancella
                          </button>
                        </div>
                      )}
                      
                      {request.status === 'rejected' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => act(request.id, 'accepted')}
                            className="bg-green-700 px-2 py-1 rounded text-white hover:bg-green-600 transition"
                          >
                            Accetta
                          </button>
                        </div>
                      )}
                      
                      {request.status === 'cancelled' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => act(request.id, 'accepted')}
                            className="bg-green-700 px-2 py-1 rounded text-white hover:bg-green-600 transition"
                          >
                            Accetta
                          </button>
                          <button
                            onClick={() => act(request.id, 'rejected')}
                            className="bg-red-700 px-2 py-1 rounded text-white hover:bg-red-600 transition"
                          >
                            Rifiuta
                          </button>
                        </div>
                      )}
                      
                      {request.note && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                          💬 {request.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}