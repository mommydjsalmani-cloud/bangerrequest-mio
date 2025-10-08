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
  
  // Form state con onboarding
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Spotify search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SpotifyTrack | null>(null);
  
  const submitted = !!lastRequestId;

  useEffect(() => {
    if (!token) {
      setError('Token sessione mancante nell\'URL');
      setLoading(false);
      return;
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
        
        // Controlla se è il primo accesso per questa sessione
        const savedName = sessionStorage.getItem(`libere_user_name_${token}`);
        const hasSeenWelcome = sessionStorage.getItem(`libere_welcome_seen_${token}`);
        
        if (savedName) {
          setRequesterName(savedName);
          setIsFirstTime(false);
          
          // Mostra welcome solo se non l'ha mai visto in questa sessione
          if (!hasSeenWelcome) {
            setShowWelcome(true);
          }
        } else {
          setIsFirstTime(true);
        }
        
      } catch {
        setError('Errore connessione');
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
  }, [token]);

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

  // Controlla stato richiesta (come negli eventi)
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
  
  // Ricerca Spotify con debounce (come negli eventi)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
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
  
  // Salva nome utente per la sessione con debounce
  const saveUserName = (name: string) => {
    if (!token || !name.trim() || name.trim().length < 2) return;
    
    // Aggiungi un piccolo delay per evitare conflitti
    setTimeout(() => {
      setRequesterName(name);
      sessionStorage.setItem(`libere_user_name_${token}`, name);
      setIsFirstTime(false);
      setShowWelcome(true);
    }, 100);
  };
  
  // Chiude il welcome e imposta come visto
  const closeWelcome = () => {
    if (!token) return;
    setShowWelcome(false);
    sessionStorage.setItem(`libere_welcome_seen_${token}`, 'true');
  };
  
  // Conferma brano selezionato (come negli eventi)
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
        note: note.trim() || undefined
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
      
      // Reset
      setSelected(null);
      setNote('');
      setRequesterName('');
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

  // Onboarding per primo accesso
  if (isFirstTime && !requesterName) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎵</div>
            <h1 className="text-2xl font-bold mb-2">Benvenuto!</h1>
            <p className="text-gray-300 text-sm">
              Per iniziare a richiedere musica, dimmi come ti chiami
            </p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Il tuo nome"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = requesterName.trim();
                  if (value.length >= 2) {
                    saveUserName(value);
                  }
                }
              }}
              minLength={2}
            />
            
            <button
              onClick={() => {
                const value = requesterName.trim();
                if (value.length >= 2) {
                  saveUserName(value);
                }
              }}
              disabled={requesterName.trim().length < 2}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              🚀 Iniziamo!
            </button>
            
            <div className="text-center text-xs text-gray-400">
              {requesterName.trim().length > 0 && requesterName.trim().length < 2 && 
                "Inserisci almeno 2 caratteri"
              }
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Il tuo nome verrà salvato solo per questa sessione
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Welcome screen personalizzato
  if (showWelcome && requesterName) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-2">
              Ciao {requesterName}!
            </h1>
            <p className="text-gray-300 text-sm">
              Sei pronto a richiedere la tua musica preferita al DJ?
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={closeWelcome}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              🎵 Inizia a richiedere musica
            </button>
            
            <button
              onClick={() => {
                setShowTutorial(true);
                setShowWelcome(false);
              }}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              📚 Come funziona?
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Puoi sempre cambiare il tuo nome dalle impostazioni
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Tutorial interattivo
  if (showTutorial) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📚</div>
            <h1 className="text-2xl font-bold mb-2">Come funziona</h1>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold mb-1">🔍 Cerca la tua canzone</h3>
                <p className="text-sm text-gray-300">Digita il titolo, artista o album nel campo di ricerca</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold mb-1">✅ Seleziona il brano</h3>
                <p className="text-sm text-gray-300">Clicca sulla canzone che vuoi richiedere</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
              <div>
                <h3 className="font-semibold mb-1">💌 Aggiungi una nota (opzionale)</h3>
                <p className="text-sm text-gray-300">Scrivi una dedica o un messaggio per il DJ</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">4</div>
              <div>
                <h3 className="font-semibold mb-1">🎵 Conferma e aspetta</h3>
                <p className="text-sm text-gray-300">Il DJ vedrà la tua richiesta e deciderà quando suonarla</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                setShowTutorial(false);
                sessionStorage.setItem(`libere_welcome_seen_${token}`, 'true');
              }}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              🎵 Perfetto, iniziamo!
            </button>
            
            <button
              onClick={() => setShowTutorial(false)}
              className="w-full text-gray-400 hover:text-white text-sm transition-colors"
            >
              Salta tutorial
            </button>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-black text-white p-4 sm:p-6">
      <div className="w-full max-w-3xl p-6 sm:p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6 mt-4 mb-8">
        {/* Header personalizzato */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              🎵 Ciao {requesterName}!
            </h2>
            <p className="text-sm text-gray-400">
              {session?.name || 'Sessione Demo'} • Richieste Libere
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newName = prompt('Come ti chiami?', requesterName);
                if (newName && newName.trim()) {
                  saveUserName(newName.trim());
                }
              }}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors"
              title="Cambia nome"
            >
              ✏️
            </button>
            <button
              onClick={() => setShowTutorial(true)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors"
            >
              💡 Aiuto
            </button>
            {/* Pulsante temporaneo per test */}
            <button
              onClick={() => {
                if (token) {
                  sessionStorage.removeItem(`libere_user_name_${token}`);
                  sessionStorage.removeItem(`libere_welcome_seen_${token}`);
                  window.location.reload();
                }
              }}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-600 hover:border-red-400 transition-colors"
              title="Reset test"
            >
              🔄
            </button>
          </div>
        </div>

        {!submitted && (
          <>
            <div className="flex flex-col gap-3">
              <input
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                type="text"
                placeholder="Il tuo nome"
                className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Cerca titolo o artista su Spotify"
                className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            {searching && <div className="text-sm text-gray-300">Ricerca in corso...</div>}
            <div className="grid grid-cols-1 gap-2">
              {results.map((t) => (
                <div key={t.id} className={`p-2 rounded flex items-center gap-3 sm:gap-4 ${selected?.id === t.id ? 'ring-2 ring-green-500' : 'bg-zinc-800/40'} transition`}>
                  <Image src={t.cover_url || '/file.svg'} alt={t.title || 'cover'} width={56} height={56} className="w-12 h-12 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">{t.title} {t.explicit ? <span className="text-[10px] bg-red-600 px-1 rounded ml-1 align-middle">E</span> : null}</div>
                    <div className="text-[11px] sm:text-xs text-gray-400 truncate">{t.artists} — {t.album}</div>
                    <div className="text-[10px] text-gray-500">{formatDuration(t.duration_ms || 0)}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {t.preview_url ? (
                      <audio controls src={t.preview_url} className="w-28 sm:w-36 h-8" preload="none" />
                    ) : (
                      <div className="text-[10px] text-gray-500">No preview</div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(t)} className="bg-green-600 text-white py-1 px-2 rounded text-[11px] sm:text-sm">Sel.</button>
                      <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="bg-gray-700 text-white py-1 px-2 rounded text-[11px] sm:text-sm">Apri</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selected && !submitted && (
          <div className="p-4 bg-zinc-800 rounded text-sm sm:text-base">
            <div className="font-semibold">Conferma richiesta: {selected.title} — {selected.artists}</div>
            {session?.notes_enabled && (
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Nota o dedica (opzionale)" 
                className="w-full mt-2 p-2 rounded bg-zinc-900 text-white text-sm" 
                rows={3} 
              />
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={confirmTrack} disabled={submitting || !requesterName.trim()} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 active:scale-[0.98] transition text-white py-2 px-4 rounded text-sm">
                {submitting ? '⏳ Invio...' : 'Conferma'}
              </button>
              <button onClick={()=>setSelected(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 active:scale-[0.98] transition text-white py-2 px-4 rounded text-sm">Annulla</button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="p-5 bg-zinc-800 rounded text-sm sm:text-base flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">🎵 Richiesta inviata!</div>
              <div className="text-xs text-gray-400">
                {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="bg-zinc-700 rounded p-3">
              <div className="text-white font-medium text-sm">{submittedTrack?.title || '—'}</div>
              {submittedTrack?.artists && <div className="text-gray-400 text-xs">{submittedTrack.artists}</div>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                lastRequestStatus === 'new' ? 'bg-yellow-500' : 
                lastRequestStatus === 'accepted' ? 'bg-green-500' : 
                lastRequestStatus === 'rejected' ? 'bg-red-500' : 
                lastRequestStatus === 'cancelled' ? 'bg-gray-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-gray-400">
                Stato: <span className="font-semibold text-white capitalize">{
                  lastRequestStatus === 'new' ? 'In attesa' :
                  lastRequestStatus === 'accepted' ? 'Accettata! 🎉' :
                  lastRequestStatus === 'rejected' ? 'Non accettata' :
                  lastRequestStatus === 'cancelled' ? 'Cancellata' : 'In attesa'
                }</span>
              </span>
            </div>
            
            {lastRequestStatus === 'accepted' && (
              <div className="bg-green-900/30 border border-green-600/50 rounded p-3 text-center">
                <div className="text-green-400 font-semibold text-sm">🎉 Il DJ suonerà la tua canzone!</div>
                <div className="text-green-300 text-xs mt-1">Resta sintonizzato!</div>
              </div>
            )}
            
            {lastRequestStatus === 'rejected' && (
              <div className="bg-red-900/30 border border-red-600/50 rounded p-3 text-center">
                <div className="text-red-400 text-sm">La richiesta non è stata accettata</div>
                <div className="text-red-300 text-xs mt-1">Prova con un altro brano!</div>
              </div>
            )}
            
            {/* Pulsante Instagram */}
            <div className="mt-3 pt-3 border-t border-zinc-700">
              <a
                href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.48.204 4.955.388a5.42 5.42 0 0 0-1.96 1.276A5.42 5.42 0 0 0 .82 3.624c-.185.526-.307 1.14-.342 2.088C.445 6.659.433 7.067.433 10.688s.012 4.029.047 4.977c.035.948.157 1.562.342 2.088a5.42 5.42 0 0 0 1.276 1.96 5.42 5.42 0 0 0 1.96 1.276c.526.185 1.14.307 2.088.342.948.035 1.356.047 4.977.047s4.029-.012 4.977-.047c.948-.035 1.562-.157 2.088-.342a5.42 5.42 0 0 0 1.96-1.276 5.42 5.42 0 0 0 1.276-1.96c.185-.526.307-1.14.342-2.088.035-.948.047-1.356.047-4.977s-.012-4.029-.047-4.977c-.035-.948-.157-1.562-.342-2.088a5.42 5.42 0 0 0-1.276-1.96A5.42 5.42 0 0 0 16.466.867c-.526-.185-1.14-.307-2.088-.342C13.43.445 13.022.433 9.401.433h2.616zm-.566 5.448c-3.31 0-5.99 2.68-5.99 5.99 0 3.31 2.68 5.99 5.99 5.99 3.31 0 5.99-2.68 5.99-5.99 0-3.31-2.68-5.99-5.99-5.99zm0 9.882a3.892 3.892 0 1 1 0-7.784 3.892 3.892 0 0 1 0 7.784zM16.806 5.222a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0z" clipRule="evenodd" />
                </svg>
                Seguimi su Instagram
              </a>
              <div className="text-xs text-gray-400 text-center mt-2">
                Supporta il DJ seguendo su Instagram! 💜
              </div>
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
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                Nuova richiesta
              </button>
            )}
          </div>
        )}

        {/* Messaggi di errore/successo */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
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