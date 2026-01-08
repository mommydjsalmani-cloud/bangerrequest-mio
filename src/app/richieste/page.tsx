"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { canMakeRequest, sanitizeInput, LibereSession, PendingRequestWithVote, getVoterId, formatTimeAgo } from '@/lib/libereStore';
import { apiPath, publicPath } from '@/lib/apiPath';
import Image from 'next/image';

type SpotifyTrack = {
  id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  duration_ms?: number;
  preview_url?: string | null;
  explicit?: boolean;
  isrc?: string | null;
};

// Step del flusso utente
type UserStep = 'onboarding' | 'pending-list' | 'request-form' | 'submitted';

function RichiesteLibereContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('s');
  
  const [session, setSession] = useState<LibereSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number | undefined>();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastRequestStatus, setLastRequestStatus] = useState<'new' | 'accepted' | 'rejected' | 'cancelled' | null>(null);
  const [submittedTrack, setSubmittedTrack] = useState<{ title?: string; artists?: string } | null>(null);
  
  // Step corrente del flusso
  const [currentStep, setCurrentStep] = useState<UserStep>('onboarding');
  
  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  
  // Pending list state
  const [pendingRequests, setPendingRequests] = useState<PendingRequestWithVote[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [voterId, setVoterId] = useState<string>('');
  const [votingRequestId, setVotingRequestId] = useState<string | null>(null);
  
  // Form state semplificato
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  const [eventCode, setEventCode] = useState('');
  
  // Spotify search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const submitted = !!lastRequestId;

  // Funzione per validare il codice evento in tempo reale
  const getEventCodeStatus = () => {
    if (!session?.require_event_code) return { isValid: true, message: '', type: 'success' };
    
    const trimmedCode = eventCode.trim();
    
    if (!trimmedCode) {
      return { 
        isValid: false, 
        message: 'Inserisci il codice evento per continuare', 
        type: 'warning' 
      };
    }
    
    if (session.current_event_code) {
      const sessionCode = (session.current_event_code || '').toString().trim().toUpperCase();
      const providedCode = trimmedCode.toUpperCase();
      
      if (sessionCode && providedCode === sessionCode) {
        return { 
          isValid: true, 
          message: 'Codice evento corretto!', 
          type: 'success' 
        };
      } else if (sessionCode) {
        return { 
          isValid: false, 
          message: 'Codice evento non valido', 
          type: 'error' 
        };
      }
    }
    
    // Se non c'è current_event_code ma è richiesto, accetta qualsiasi codice
    return { 
      isValid: true, 
      message: 'Codice evento inserito', 
      type: 'info' 
    };
  };

  useEffect(() => {
    if (!token) {
      setError('Token sessione mancante nell\'URL');
      setLoading(false);
      return;
    }

    // Carica il nome salvato dalla sessione
    const savedName = sessionStorage.getItem(`libere_user_name_${token}`);
    
    // Pre-compila codice evento da query parameter
    const codeParam = searchParams?.get('code');
    if (codeParam) {
      setEventCode(codeParam);
    }
    
    const loadSession = async () => {
      try {
        const response = await fetch(apiPath(`/api/libere?s=${token}`));
        const data = await response.json();
        
        if (!data.ok) {
          setError(data.error || 'Errore caricamento sessione');
          return;
        }
        
        setSession(data.session);
        
        // Inizializza voter_id
        const vid = getVoterId();
        setVoterId(vid);
        
        // Mostra onboarding solo dopo aver caricato la sessione, se il nome non è salvato
        if (!savedName) {
          setShowOnboarding(true);
          setCurrentStep('onboarding');
        } else {
          setRequesterName(savedName);
          // Se ha già il nome, va direttamente alla lista pending
          setCurrentStep('pending-list');
        }
      } catch {
        setError('Errore connessione');
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
  }, [token, searchParams]);

  // Carica ultima richiesta e stato
  useEffect(() => {
    const savedRequestId = sessionStorage.getItem('libere_last_request_id');
    const savedStatus = sessionStorage.getItem('libere_last_request_status');
    const savedTrack = sessionStorage.getItem('libere_last_track');
    
    if (savedRequestId) {
      setLastRequestId(savedRequestId);
      if (savedStatus === 'new' || savedStatus === 'accepted' || savedStatus === 'rejected' || savedStatus === 'cancelled') {
        setLastRequestStatus(savedStatus);
      }
      if (savedTrack) {
        try {
          setSubmittedTrack(JSON.parse(savedTrack));
        } catch {}
      }
    }
  }, []);

  // Polling per controllare cambiamenti nella configurazione della sessione
  useEffect(() => {
    if (!token || !session) return;

    const checkSessionConfig = async () => {
      try {
        const response = await fetch(apiPath(`/api/libere?s=${token}`));
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.session) {
            // Controlla se require_event_code è cambiato
            if (data.session.require_event_code !== session.require_event_code) {
              // Ricarica la pagina per mostrare/nascondere il campo codice evento
              window.location.reload();
            }
          }
        }
      } catch (error) {
        console.error('Errore controllo configurazione sessione:', error);
      }
    };

    // Controlla ogni 5 secondi
    const interval = setInterval(checkSessionConfig, 5000);
    return () => clearInterval(interval);
  }, [token, session]);

  // Funzione per caricare richieste pending
  const loadPendingRequests = useCallback(async () => {
    if (!session?.id || !voterId) return;
    
    setPendingLoading(true);
    try {
      const response = await fetch(
        apiPath(`/api/libere/pending?sessionId=${session.id}&voterId=${voterId}`)
      );
      const data = await response.json();
      
      if (data.ok && data.requests) {
        setPendingRequests(data.requests);
      }
    } catch (err) {
      console.error('Errore caricamento pending:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [session?.id, voterId]);

  // Carica pending requests quando si è nella lista e polling ogni 4s
  useEffect(() => {
    if (currentStep !== 'pending-list' || !session?.id || !voterId) return;
    
    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 4000);
    return () => clearInterval(interval);
  }, [currentStep, session?.id, voterId, loadPendingRequests]);

  // Funzione per votare
  const handleVote = async (requestId: string, action: 'up' | 'down') => {
    if (!session?.id || !voterId || votingRequestId) return;
    
    // Trova il voto attuale
    const currentRequest = pendingRequests.find(r => r.id === requestId);
    const currentVote = currentRequest?.myVote;
    
    // Calcola l'azione: toggle se stesso voto, altrimenti nuovo voto
    const finalAction = currentVote === action ? 'none' : action;
    
    setVotingRequestId(requestId);
    
    // Ottimistic update
    setPendingRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      
      let newUp = r.up_votes || 0;
      let newDown = r.down_votes || 0;
      let newMyVote: 'up' | 'down' | null = null;
      
      if (finalAction === 'none') {
        // Rimuove voto
        if (currentVote === 'up') newUp = Math.max(0, newUp - 1);
        if (currentVote === 'down') newDown = Math.max(0, newDown - 1);
      } else if (finalAction === 'up') {
        if (currentVote === 'down') newDown = Math.max(0, newDown - 1);
        if (currentVote !== 'up') newUp += 1;
        newMyVote = 'up';
      } else if (finalAction === 'down') {
        if (currentVote === 'up') newUp = Math.max(0, newUp - 1);
        if (currentVote !== 'down') newDown += 1;
        newMyVote = 'down';
      }
      
      return { ...r, up_votes: newUp, down_votes: newDown, myVote: newMyVote };
    }));
    
    try {
      const response = await fetch(apiPath('/api/libere/vote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          requestId,
          action: finalAction,
          voterId
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Aggiorna con i dati reali dal server
        setPendingRequests(prev => prev.map(r => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            up_votes: data.upVotes,
            down_votes: data.downVotes,
            myVote: data.myVote
          };
        }));
      }
    } catch (err) {
      console.error('Errore voto:', err);
      // Ricarica per sincronizzare
      loadPendingRequests();
    } finally {
      setVotingRequestId(null);
    }
  };

  // Controlla stato richiesta con polling
  useEffect(() => {
    if (!lastRequestId || !token) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(apiPath(`/api/libere?s=${token}&request_id=${lastRequestId}`));
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.status !== lastRequestStatus) {
            setLastRequestStatus(data.status);
            sessionStorage.setItem('libere_last_request_status', data.status);
            
            if (data.status === 'cancelled' && lastRequestStatus === 'accepted') {
              setMessage('⚠️ La tua richiesta accettata è stata cancellata dal DJ');
              setTimeout(() => setMessage(null), 3500);
            }
          }
        }
      } catch {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [lastRequestId, token, lastRequestStatus]);
  
  // Ricerca Spotify con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      setIsCollapsed(false); // Reset collapse quando cerchi
      fetch(apiPath(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=10`))
        .then((r) => r.json())
        .then((data) => {
          setResults(data.tracks || []);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Completa onboarding e salva nome -> va alla lista pending
  const completeOnboarding = () => {
    if (!onboardingName.trim()) return;
    if (session?.require_event_code && !eventCode.trim()) return;
    
    // Validazione codice evento se richiesto dalla sessione
    if (session?.require_event_code && session.current_event_code) {
      const sessionCode = (session.current_event_code || '').toString().trim().toUpperCase();
      const provided = (eventCode || '').toString().trim().toUpperCase();
      if (sessionCode && provided !== sessionCode) {
        setError('Codice evento non valido. Controlla e riprova.');
        return;
      }
    }
    
    setRequesterName(onboardingName);
    sessionStorage.setItem(`libere_user_name_${token}`, onboardingName);
    setShowOnboarding(false);
    
    // Vai alla lista pending invece che direttamente al form
    setCurrentStep('pending-list');
    
    const welcomeMsg = session?.require_event_code && eventCode 
      ? `🎉 Benvenuto ${onboardingName}! Evento: ${eventCode}.`
      : `🎉 Benvenuto ${onboardingName}!`;
    
    setMessage(welcomeMsg);
    setTimeout(() => setMessage(null), 3000);
  };

  // Gestisce selezione con collapse
  const handleTrackSelection = (track: SpotifyTrack) => {
    if (selected?.id === track.id) {
      // Se clicchi sulla stessa canzone, fai toggle del collapse
      setIsCollapsed(!isCollapsed);
    } else {
      // Nuova selezione, attiva collapse
      setSelected(track);
      setIsCollapsed(true);
    }
  };
  
  // Conferma brano selezionato
  const confirmTrack = async () => {
    if (!selected) return;
    
    if (!requesterName.trim()) {
      setError('Nome obbligatorio');
      return;
    }


    
    // Rate limiting check (solo se abilitato dalla sessione)
    if (session?.rate_limit_enabled !== false) {
      const rateLimitSeconds = session?.rate_limit_seconds || 60;
      const rateLimitCheck = canMakeRequest(lastRequestTime, rateLimitSeconds);
      if (!rateLimitCheck.allowed) {
        setError(`Devi attendere ${rateLimitCheck.remainingSeconds} secondi prima di inviare un'altra richiesta`);
        return;
      }
    }
    
    setSubmitting(true);
    setError(null);
    setMessage(null);
    
    try {
      const payload = {
        title: sanitizeInput(selected.title || ''),
        requester_name: requesterName.trim(),
        artists: selected.artists || '',
        track_id: selected.id,
        uri: selected.uri,
        album: selected.album || '',
        cover_url: selected.cover_url || '',
        duration_ms: selected.duration_ms,
        source: 'spotify',
        note: note.trim() || undefined,
        event_code: eventCode.trim() || undefined
      };
      
      const response = await fetch(apiPath(`/api/libere?s=${token}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore invio richiesta');
        setSubmitting(false);
        return;
      }
      
      // Successo - salva info
      setLastRequestTime(Date.now());
      setLastRequestId(data.request_id);
      setLastRequestStatus('new');
      setSubmittedTrack({ title: selected.title, artists: selected.artists });
      
      sessionStorage.setItem('libere_last_request_id', data.request_id);
      sessionStorage.setItem('libere_last_request_status', 'new');
      sessionStorage.setItem('libere_last_track', JSON.stringify({ title: selected.title, artists: selected.artists }));
      
      // Reset form (ma mantieni il nome!)
      setSelected(null);
      setNote('');
      setQuery('');
      setResults([]);
      setMessage(data.message || 'Richiesta inviata 🎶');
      setTimeout(() => setMessage(null), 3500);
      
    } catch {
      setError('Errore connessione');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-black text-white p-6">
        <div className="text-sm text-gray-300">Caricamento sessione...</div>
      </main>
    );
  }
  
  if (error && !session) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-black text-white p-6">
        <div className="bg-zinc-900 rounded-xl p-8 text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">❌ {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Riprova
          </button>
        </div>
      </main>
    );
  }

  // Schermata di onboarding
  if (showOnboarding) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center max-w-md w-full border border-white/20 shadow-xl">
          <div className="mb-3 flex justify-center">
            <Image
              src={publicPath("/Simbolo_Bianco.png")}
              alt="Banger Request Logo"
              width={80}
              height={80}
              className="w-auto h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Benvenuto!
          </h1>
          <div className="bg-white/10 backdrop-blur rounded-lg py-3 px-4 mb-5 border border-white/20">
            <p className="text-gray-200 text-sm leading-relaxed">
              {session?.require_event_code 
                ? "✨ Inserisci il tuo nome e il codice evento per iniziare il viaggio musicale. Il DJ sta aspettando le tue richieste!"
                : "✨ Inserisci il tuo nome per iniziare il viaggio musicale. Il DJ sta aspettando le tue richieste!"
              }
            </p>
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Come ti chiami?"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onboardingName.trim() && (!session?.require_event_code || getEventCodeStatus().isValid) && completeOnboarding()}
              className="w-full py-2.5 px-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-center"
              autoFocus
              maxLength={50}
            />
            
            {/* Campo Codice Evento - Design migliorato */}
            {session && session.require_event_code && (
              <div className="space-y-2">
                <div className="text-center">
                  <label className="block text-sm font-medium text-white mb-2 flex items-center justify-center gap-2">
                    🎫 <span>Codice Evento</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Inserisci il codice evento..."
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onboardingName.trim() && getEventCodeStatus().isValid && completeOnboarding()}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg text-white placeholder-gray-300 border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400/50 text-center font-mono text-base tracking-wider transition-all duration-300 shadow-lg"
                    maxLength={50}
                  />
                </div>
                <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 ${
                  getEventCodeStatus().type === 'success' 
                    ? 'bg-green-500/20 border border-green-400/30 text-green-200' 
                    : getEventCodeStatus().type === 'error'
                    ? 'bg-red-500/20 border border-red-400/30 text-red-200'
                    : getEventCodeStatus().type === 'info'
                    ? 'bg-blue-500/20 border border-blue-400/30 text-blue-200'
                    : 'bg-amber-500/20 border border-amber-400/30 text-amber-200'
                }`}>
                  <span className="text-base">
                    {getEventCodeStatus().type === 'success' ? '✅' : 
                     getEventCodeStatus().type === 'error' ? '❌' :
                     getEventCodeStatus().type === 'info' ? 'ℹ️' : '⚠️'}
                  </span>
                  <span className="text-sm font-medium">
                    {getEventCodeStatus().message}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={completeOnboarding}
              disabled={!onboardingName.trim() || (session?.require_event_code && !getEventCodeStatus().isValid)}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              🎉 Inizia a Richiedere!
            </button>
          </div>
          
          <div className="mt-6 bg-white/5 backdrop-blur rounded-lg py-2.5 px-3 border border-white/10">
            <div className="flex items-center justify-center gap-2 text-gray-300 text-xs">
              <span className="text-blue-400">💾</span>
              <span>Il tuo nome verrà salvato per questa sessione</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Step: Lista richieste pending con voti
  if (currentStep === 'pending-list') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-start bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-4 mt-4 mb-8">
          
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl py-4 px-4 border border-white/20 shadow-xl text-center">
            <h1 className="text-xl font-bold mb-1">
              🎵 Ciao {requesterName}!
            </h1>
            <p className="text-gray-300 text-sm">
              {session?.name || 'Richieste in corso'}
            </p>
          </div>

          {message && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-200 py-3 px-4 rounded-lg text-center backdrop-blur-lg">
              {message}
            </div>
          )}

          {/* CTA Nuova Richiesta */}
          <button
            onClick={() => setCurrentStep('request-form')}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎶</span>
            <span className="text-lg">Fai una richiesta</span>
          </button>

          {/* Lista Pending */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl py-4 px-4 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>📋</span>
                <span>Richieste in corso</span>
                {pendingLoading && (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                )}
              </h2>
              <span className="text-sm text-gray-400">{pendingRequests.length} brani</span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-gray-300">Nessuna richiesta al momento</p>
                <p className="text-gray-400 text-sm mt-1">Sii il primo a richiedere un brano!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 border border-white/10 transition-all"
                  >
                    <div className="flex gap-3">
                      {/* Cover */}
                      {request.cover_url && (
                        <Image
                          src={request.cover_url}
                          alt={request.title}
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{request.title}</div>
                        <div className="text-gray-300 text-sm truncate">{request.artists}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{request.requester_name || 'Anonimo'}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(request.created_at)}</span>
                        </div>
                      </div>

                      {/* Voti */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {/* Pulsanti voto */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleVote(request.id, 'up')}
                            disabled={votingRequestId === request.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-sm ${
                              request.myVote === 'up'
                                ? 'bg-green-500/30 text-green-300 border border-green-400/50'
                                : 'bg-white/10 text-gray-300 hover:bg-green-500/20 hover:text-green-300 border border-white/10'
                            } ${votingRequestId === request.id ? 'opacity-50' : ''}`}
                          >
                            <span>👍</span>
                            <span className="font-semibold">{request.up_votes || 0}</span>
                          </button>
                          
                          <button
                            onClick={() => handleVote(request.id, 'down')}
                            disabled={votingRequestId === request.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-sm ${
                              request.myVote === 'down'
                                ? 'bg-red-500/30 text-red-300 border border-red-400/50'
                                : 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-300 border border-white/10'
                            } ${votingRequestId === request.id ? 'opacity-50' : ''}`}
                          >
                            <span>👎</span>
                            <span className="font-semibold">{request.down_votes || 0}</span>
                          </button>
                        </div>

                        {/* Status label */}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          request.status === 'new' 
                            ? 'bg-blue-500/30 text-blue-200' 
                            : request.status === 'accepted'
                            ? 'bg-green-500/30 text-green-200'
                            : 'bg-red-500/30 text-red-200'
                        }`}>
                          {request.status === 'new' && 'In attesa'}
                          {request.status === 'accepted' && '✓ Confermata'}
                          {request.status === 'rejected' && 'Rifiutata'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info aggiornamento */}
          <div className="text-center text-xs text-gray-400">
            <span>🔄 Aggiornamento automatico ogni 4 secondi</span>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4 sm:p-6">
  <div className="w-full max-w-4xl space-y-3 mt-4 mb-8">
        
        {/* Header Personalizzato */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl py-3 px-4 border border-white/20 shadow-xl text-center">
          <h1 className="text-xl font-bold mb-1">
            🎵 Ciao {requesterName}!
          </h1>
          <p className="text-gray-300 text-sm">
            {session?.name ? `Stai richiedendo musica per: ${session.name}` : 'Richiedi la tua musica preferita al DJ'}
          </p>
        </div>

        {/* Torna alla lista */}
        <button
          onClick={() => setCurrentStep('pending-list')}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-all border border-white/20 flex items-center justify-center gap-2 text-sm"
        >
          <span>←</span>
          <span>Torna alla lista richieste</span>
        </button>

        {message && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 py-3 px-4 rounded-lg text-center backdrop-blur-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 py-3 px-4 rounded-lg text-center backdrop-blur-lg">
            {error}
          </div>
        )}

        {!submitted ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl py-3 px-3 border border-white/20 shadow-xl space-y-3">
            {/* Ricerca Migliorata */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">🔍 Cerca la tua canzone</label>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder="🎵 Cerca la tua canzone preferita..."
                  className="w-full py-2 pl-9 pr-12 rounded-lg bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg text-white placeholder-gray-300 border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400/50 text-sm transition-all duration-300 shadow-lg"
                  autoFocus
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 text-base">
                  🎵
                </div>
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-pink-400 text-xs font-medium">Cerco...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Risultati Ricerca con Cards Moderne */}
            {results.length > 0 && (
              <div className="space-y-2">
                <label className="block text-base font-semibold">🎶 Risultati da Spotify</label>
                <div className="grid grid-cols-1 gap-1 max-h-96 overflow-y-auto">
                  {results.map((track) => {
                    // Determina se questo track dovrebbe essere nascosto
                    const shouldHide = isCollapsed && selected?.id !== track.id;
                    
                    return (
                      <div 
                        key={track.id} 
                        className={`group relative bg-white/10 hover:bg-white/20 rounded-lg py-1.5 px-2 border transition-all duration-300 cursor-pointer ${
                          selected?.id === track.id 
                            ? 'border-purple-400 bg-purple-500/20 ring-2 ring-purple-400' 
                            : 'border-white/20 hover:border-white/40'
                        } ${
                          shouldHide
                            ? 'opacity-0 scale-95 pointer-events-none'
                            : 'opacity-100 scale-100'
                        }`}
                        style={{
                          display: shouldHide ? 'none' : 'block'
                        }}
                        onClick={() => handleTrackSelection(track)}
                      >
                      <div className="flex items-center gap-3">
                        {/* Cover Art */}
                        <div className="relative flex-shrink-0">
                          <Image 
                            src={track.cover_url || '/file.svg'} 
                            alt={track.title || 'cover'} 
                            width={48} 
                            height={48} 
                            className="w-12 h-12 rounded-lg object-cover shadow-lg" 
                          />
                          {selected?.id === track.id && (
                            <div className="absolute inset-0 bg-purple-500/30 rounded-lg flex items-center justify-center">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">✓</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-base text-white drop-shadow-sm truncate leading-tight">
                              {track.title}
                            </h3>
                            {track.explicit && (
                              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">
                                E
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm truncate font-medium leading-tight">
                            {track.artists} • {track.album}
                          </p>
                        </div>

                        {/* Actions - Mobile: stacked, Desktop: inline */}
                        <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center flex-shrink-0">
                          {/* Duration */}
                          {track.duration_ms && (
                            <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                              {formatDuration(track.duration_ms)}
                            </span>
                          )}
                          
                          {/* Open in Spotify Button */}
                          <a
                            href={`https://open.spotify.com/track/${track.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-all duration-200 shadow-lg whitespace-nowrap"
                          >
                            Apri in Spotify
                          </a>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {query && !searching && results.length === 0 && (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🔍</div>
                <div className="bg-white/10 backdrop-blur rounded-xl py-4 px-4 border border-white/20 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-white mb-2">Nessun risultato trovato</h3>
                  <div className="bg-purple-500/20 rounded-lg py-2 px-3 mb-3">
                    <p className="text-purple-200 font-medium">&quot;{query}&quot;</p>
                  </div>
                  <div className="space-y-1.5 text-gray-300 text-sm">
                    <p className="flex items-center gap-2">
                      <span>💡</span>
                      <span>Prova con termini diversi</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>🎵</span>
                      <span>Cerca per artista, titolo o album</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conferma Selezione */}
            {selected && (
              <div className="bg-white/20 backdrop-blur-lg rounded-lg py-3 px-4 border border-purple-300/30">
                <h3 className="text-base font-semibold mb-2 text-purple-200">
                  ✨ Conferma la tua richiesta
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <Image 
                    src={selected.cover_url || '/file.svg'} 
                    alt={selected.title || 'cover'} 
                    width={48} 
                    height={48} 
                    className="w-12 h-12 rounded-lg object-cover shadow-lg" 
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{selected.title}</div>
                    <div className="text-gray-300 text-sm truncate">{selected.artists}</div>
                  </div>
                </div>
                
                {session?.notes_enabled && (
                  <textarea 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    placeholder="Aggiungi una nota o dedica (opzionale)..." 
                    className="w-full py-2 px-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm mb-3" 
                    rows={2} 
                  />
                )}
                
                {/* Campo Codice Evento - Input se non inserito, Display se già inserito */}
                {session?.require_event_code && (
                  <div className="mb-4">
                    {eventCode ? (
                      // Mostra codice evento con possibilità di modifica diretta
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          🎫 Codice Evento
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={eventCode}
                          onChange={(e) => setEventCode(e.target.value)}
                          placeholder="Codice evento"
                          className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                          maxLength={50}
                          aria-label="Codice evento"
                          aria-required={true}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Puoi modificare il codice evento in qualsiasi momento
                        </p>
                      </div>
                    ) : (
                      // Campo input se non ancora inserito
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          🎫 Codice Evento
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          value={eventCode}
                          onChange={(e) => setEventCode(e.target.value)}
                          placeholder="Codice evento"
                          className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                          maxLength={50}
                          aria-label="Codice evento"
                          aria-required={true}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Codice richiesto per inviare la richiesta
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Mostra codice evento anche se opzionale e inserito */}
                {!session?.require_event_code && eventCode && (
                  <div className="mb-4 bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-200">
                      <span>🎫</span>
                      <span className="text-sm font-medium">Codice Evento:</span>
                      <span className="font-bold">{eventCode}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={confirmTrack} 
                    disabled={submitting} 
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Invio...
                      </span>
                    ) : (
                      '🎵 Invia Richiesta'
                    )}
                  </button>
                  <button 
                    onClick={() => setSelected(null)} 
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sezione Richiesta Inviata */
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl text-center space-y-4">
            <div className="text-4xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold text-white">Richiesta Inviata!</h2>
            
            {submittedTrack && (
              <div className="bg-white/20 backdrop-blur-lg rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-1">Hai richiesto:</p>
                <div className="font-semibold text-white text-lg">
                  {submittedTrack.title}
                </div>
                {submittedTrack.artists && (
                  <div className="text-gray-300 text-sm">
                    di {submittedTrack.artists}
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border-2 transition-all duration-300 ${
                lastRequestStatus === 'accepted' ? 'bg-green-500/20 border-green-400/50' :
                lastRequestStatus === 'rejected' ? 'bg-red-500/20 border-red-400/50' :
                lastRequestStatus === 'cancelled' ? 'bg-yellow-500/20 border-yellow-400/50' :
                'bg-blue-500/20 border-blue-400/50'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg font-medium text-white">Stato richiesta:</span>
                  <span className={`text-xl font-bold flex items-center gap-2 ${
                    lastRequestStatus === 'accepted' ? 'text-green-300' :
                    lastRequestStatus === 'rejected' ? 'text-red-300' :
                    lastRequestStatus === 'cancelled' ? 'text-yellow-300' :
                    'text-blue-300'
                  }`}>
                    {lastRequestStatus === 'accepted' ? '✅ Accettata' :
                     lastRequestStatus === 'rejected' ? '❌ Rifiutata' :
                     lastRequestStatus === 'cancelled' ? '⚠️ Cancellata' :
                     '⏳ In attesa'}
                  </span>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <span>🔄</span>
                  <span className="text-sm">La pagina si aggiorna automaticamente quando il DJ decide</span>
                </div>
              </div>
            </div>
            
            {/* Pulsante Instagram */}
            <div className="pt-4 border-t border-white/20">
              <a
                href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-6 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
              >
                📸 Seguimi su Instagram
              </a>
              <p className="text-xs text-gray-400 mt-2">
                Supporta il DJ seguendo su Instagram! 💜
              </p>
            </div>
            
            {(lastRequestStatus === 'accepted' || lastRequestStatus === 'rejected' || lastRequestStatus === 'cancelled') && (
              <button
                onClick={() => {
                  setLastRequestId(null);
                  setLastRequestStatus(null);
                  setSubmittedTrack(null);
                  sessionStorage.removeItem('libere_last_request_id');
                  sessionStorage.removeItem('libere_last_request_status');
                  sessionStorage.removeItem('libere_last_track');
                  // Torna alla lista pending
                  setCurrentStep('pending-list');
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
              >
                🎵 Fai un&apos;altra Richiesta
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function RichiesteLibere() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    }>
      <RichiesteLibereContent />
    </Suspense>
  );
}