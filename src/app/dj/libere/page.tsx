"use client";

import { useState } from 'react';
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
        setError(data.error || 'Errore autenticazione');
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
  
  const adminAction = async (action: string, extraData: Record<string, unknown> = {}) => {
    if (!authed || !selectedSessionId) return;
    
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
      } else {
        loadSessionData(selectedSessionId);
      }
      
    } catch {
      setError('Errore connessione');
    } finally {
      setLoading(false);
    }
  };
  
  const updateRequestStatus = async (requestId: string, status: 'accepted' | 'rejected', note?: string) => {
    if (!authed) return;
    
    try {
      const response = await fetch('/api/libere/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dj-user': username,
          'x-dj-secret': password
        },
        body: JSON.stringify({
          request_id: requestId,
          status,
          note
        })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore aggiornamento');
        return;
      }
      
      setSuccess(data.message);
      loadSessionData(selectedSessionId);
      
    } catch {
      setError('Errore connessione');
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
  
  const publicUrl = currentSession ? generatePublicUrl(currentSession.token) : '';
  
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={login} className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">🎵 Pannello Richieste Libere</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </div>
        </form>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">🎵 Pannello Richieste Libere</h1>
            <button
              onClick={() => setAuthed(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Logout
            </button>
          </div>
          
          {/* Session Selection */}
          <div className="flex gap-4 items-center mb-4">
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                if (e.target.value) loadSessionData(e.target.value);
              }}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona sessione...</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({SESSION_STATUS_LABELS[session.status]})
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowCreateSession(!showCreateSession)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              + Nuova Sessione
            </button>
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
                            onClick={() => updateRequestStatus(request.id, 'accepted')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                          >
                            ✅ Accetta
                          </button>
                          <button
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                          >
                            ❌ Rifiuta
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