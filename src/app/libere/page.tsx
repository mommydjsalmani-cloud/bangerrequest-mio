"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { canMakeRequest, sanitizeInput, LibereSession } from '@/lib/libereStore';
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
  
  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  
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
        const response = await fetch(`/api/libere?s=${token}`);
        const data = await response.json();
        
        if (!data.ok) {
          setError(data.error || 'Errore caricamento sessione');
          return;
        }
        
        setSession(data.session);
        
        // Mostra onboarding solo dopo aver caricato la sessione, se il nome non è salvato
        if (!savedName) {
          setShowOnboarding(true);
        } else {
          setRequesterName(savedName);
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

  // Controlla stato richiesta con polling
  useEffect(() => {
    if (!lastRequestId || !token) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/libere?s=${token}&request_id=${lastRequestId}`);
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
      fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=10`)
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

  // Completa onboarding e salva nome
  const completeOnboarding = () => {
    if (!onboardingName.trim()) return;
    if (session?.require_event_code && !eventCode.trim()) return;
    
    setRequesterName(onboardingName);
    sessionStorage.setItem(`libere_user_name_${token}`, onboardingName);
    setShowOnboarding(false);
    
    const welcomeMsg = session?.require_event_code && eventCode 
      ? `🎉 Benvenuto ${onboardingName}! Evento: ${eventCode}. Ora puoi richiedere la tua musica preferita.`
      : `🎉 Benvenuto ${onboardingName}! Ora puoi richiedere la tua musica preferita.`;
    
    setMessage(welcomeMsg);
    setTimeout(() => setMessage(null), 4000);
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

    // Validazione codice evento se richiesto
    if (session?.require_event_code && !eventCode.trim()) {
      setError('Inserisci il codice evento');
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
      
      const response = await fetch(`/api/libere?s=${token}`, {
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
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center max-w-md w-full border border-white/20 shadow-xl">
          <div className="mb-4 flex justify-center">
            <Image 
              src="/Simbolo_Bianco.png" 
              alt="Banger Request Logo" 
              width={80} 
              height={80} 
              className="w-auto h-16 object-contain"
            />
          </div>
          <div className="text-5xl mb-6">🎵</div>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Benvenuto nella Musica!
          </h1>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6 border border-white/20">
            <p className="text-gray-200 text-base leading-relaxed">
              {session?.require_event_code 
                ? "✨ Inserisci il tuo nome e il codice evento per iniziare il viaggio musicale. Il DJ sta aspettando le tue richieste!"
                : "✨ Inserisci il tuo nome per iniziare il viaggio musicale. Il DJ sta aspettando le tue richieste!"
              }
            </p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Come ti chiami?"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (!session?.require_event_code || eventCode.trim()) && completeOnboarding()}
              className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-center"
              autoFocus
              maxLength={50}
            />
            
            {/* Campo Codice Evento - Design migliorato */}
            {session && session.require_event_code && (
              <div className="space-y-3">
                <div className="text-center">
                  <label className="block text-sm font-medium text-white mb-2 flex items-center justify-center gap-2">
                    🎫 <span>Codice Evento</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Inserisci il codice evento..."
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onboardingName.trim() && eventCode.trim() && completeOnboarding()}
                    className="w-full p-4 rounded-xl bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg text-white placeholder-gray-300 border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400/50 text-center font-mono text-lg tracking-wider transition-all duration-300 shadow-lg"
                    maxLength={50}
                  />
                </div>
                <div className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-all duration-300 ${
                  eventCode.trim() 
                    ? 'bg-green-500/20 border border-green-400/30 text-green-200' 
                    : 'bg-amber-500/20 border border-amber-400/30 text-amber-200'
                }`}>
                  <span className="text-lg">
                    {eventCode.trim() ? '✅' : '⚠️'}
                  </span>
                  <span className="text-sm font-medium">
                    {eventCode.trim() ? 'Codice evento valido' : 'Inserisci il codice evento per continuare'}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={completeOnboarding}
              disabled={!onboardingName.trim() || (session?.require_event_code && !eventCode.trim())}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              🎉 Inizia a Richiedere!
            </button>
          </div>
          
          <div className="mt-8 bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-center gap-2 text-gray-300 text-sm">
              <span className="text-blue-400">💾</span>
              <span>Il tuo nome verrà salvato per questa sessione</span>
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-4 sm:p-6">
      <div className="w-full max-w-4xl space-y-6 mt-4 mb-8">
        
        {/* Header Personalizzato */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            🎵 Ciao {requesterName}!
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            {session?.name ? `Stai richiedendo musica per: ${session.name}` : 'Richiedi la tua musica preferita al DJ'}
          </p>
        </div>

        {message && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-xl text-center backdrop-blur-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center backdrop-blur-lg">
            {error}
          </div>
        )}

        {!submitted ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl space-y-6">
            {/* Ricerca Migliorata */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold">🔍 Cerca la tua canzone</label>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder="🎵 Cerca la tua canzone preferita..."
                  className="w-full p-4 pl-12 pr-14 rounded-xl bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg text-white placeholder-gray-300 border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400/50 text-base transition-all duration-300 shadow-lg"
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-400 text-xl">
                  🎵
                </div>
                {searching && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-pink-400 text-sm font-medium">Cerco...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Risultati Ricerca con Cards Moderne */}
            {results.length > 0 && (
              <div className="space-y-3">
                <label className="block text-lg font-semibold">🎶 Risultati da Spotify</label>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {results.map((track) => {
                    // Determina se questo track dovrebbe essere nascosto
                    const shouldHide = isCollapsed && selected?.id !== track.id;
                    
                    return (
                      <div 
                        key={track.id} 
                        className={`group relative bg-white/10 hover:bg-white/20 rounded-lg p-4 border transition-all duration-500 cursor-pointer ${
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
                      <div className="flex items-center gap-4">
                        {/* Cover Art */}
                        <div className="relative flex-shrink-0">
                          <Image 
                            src={track.cover_url || '/file.svg'} 
                            alt={track.title || 'cover'} 
                            width={64} 
                            height={64} 
                            className="w-16 h-16 rounded-lg object-cover shadow-lg" 
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
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-bold text-lg sm:text-base text-white drop-shadow-sm leading-tight">
                              {track.title}
                            </h3>
                            {track.explicit && (
                              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0 mt-0.5">
                                E
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-base sm:text-sm truncate mb-1 font-medium">
                            {track.artists}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-sm sm:text-xs truncate">
                              {track.album}
                            </p>
                            <span className="text-gray-400 text-sm sm:text-xs">
                              {formatDuration(track.duration_ms || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 items-end">
                          {/* Preview Audio */}
                          {track.preview_url && (
                            <audio 
                              controls 
                              src={track.preview_url} 
                              className="w-32 h-8" 
                              preload="none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          
                          {/* Open in Spotify Button */}
                          <a
                            href={`https://open.spotify.com/track/${track.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-2 rounded-lg transition-all duration-200 flex flex-col items-center gap-0.5 shadow-lg min-w-0"
                          >
                            <span>🎵</span>
                            <div className="flex flex-col items-center leading-tight">
                              <span>Apri</span>
                              <span>Spotify</span>
                            </div>
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
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-white mb-3">Nessun risultato trovato</h3>
                  <div className="bg-purple-500/20 rounded-lg p-3 mb-4">
                    <p className="text-purple-200 font-medium">&quot;{query}&quot;</p>
                  </div>
                  <div className="space-y-2 text-gray-300">
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
              <div className="bg-white/20 backdrop-blur-lg rounded-lg p-4 border border-purple-300/30">
                <h3 className="text-lg font-semibold mb-3 text-purple-200">
                  ✨ Conferma la tua richiesta
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <Image 
                    src={selected.cover_url || '/file.svg'} 
                    alt={selected.title || 'cover'} 
                    width={48} 
                    height={48} 
                    className="w-12 h-12 rounded-lg object-cover shadow-lg" 
                  />
                  <div>
                    <div className="font-semibold text-white">{selected.title}</div>
                    <div className="text-gray-300 text-sm">{selected.artists}</div>
                  </div>
                </div>
                
                {session?.notes_enabled && (
                  <textarea 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    placeholder="Aggiungi una nota o dedica (opzionale)..." 
                    className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm mb-4" 
                    rows={3} 
                  />
                )}
                
                {/* Campo Codice Evento - Input se non inserito, Display se già inserito */}
                {session?.require_event_code && (
                  <div className="mb-4">
                    {eventCode ? (
                      // Mostra codice evento se già inserito
                      <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-200">
                          <span>🎫</span>
                          <span className="text-sm font-medium">Codice Evento:</span>
                          <span className="font-bold">{eventCode}</span>
                        </div>
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