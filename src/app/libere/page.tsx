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
  
  // Form state semplificato
  const [requesterName, setRequesterName] = useState('');
  const [note, setNote] = useState('');
  
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
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
        <div className="text-xl text-blue-300 font-medium">🔄 Caricamento sessione...</div>
      </main>
    );
  }
  
  if (error && !session) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
        <div className="bg-white/10 backdrop-blur rounded-xl p-8 text-center max-w-md border border-white/20 shadow-2xl">
          <div className="text-red-400 text-2xl mb-6 font-bold">❌ {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-bold shadow-lg transition-all"
          >
            Riprova
          </button>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 text-white p-4 sm:p-6">
      <div className="w-full max-w-3xl p-6 sm:p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 flex flex-col gap-6 mt-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          🎵 Richieste Libere - {session?.name || 'Sessione Demo'}
        </h2>

        {!submitted && (
          <>
            <div className="flex flex-col gap-4">
              <input
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                type="text"
                placeholder="Il tuo nome"
                className="w-full p-4 rounded-lg bg-white/10 backdrop-blur text-white placeholder-lime-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg border border-white/20"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Cerca titolo o artista su Spotify"
                className="w-full p-4 rounded-lg bg-white/10 backdrop-blur text-white placeholder-lime-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg border border-white/20"
              />
            </div>
            {searching && <div className="text-base text-blue-300 font-medium text-center">🔍 Ricerca in corso...</div>}
            <div className="grid grid-cols-1 gap-3">
              {results.map((t) => (
                <div key={t.id} className={`p-4 rounded-lg flex items-center gap-3 sm:gap-4 ${selected?.id === t.id ? 'ring-2 ring-green-400 bg-green-500/20' : 'bg-white/10 backdrop-blur border border-white/20 hover:bg-white/15'} transition-all duration-200`}>
                  <Image src={t.cover_url || '/file.svg'} alt={t.title || 'cover'} width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 shadow-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base sm:text-lg truncate text-white">{t.title} {t.explicit ? <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded ml-2 align-middle">E</span> : null}</div>
                    <div className="text-sm sm:text-base text-lime-300 truncate font-bold">{t.artists} — {t.album}</div>
                    <div className="text-sm text-sky-300 font-bold">{formatDuration(t.duration_ms || 0)}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {t.preview_url ? (
                      <audio controls src={t.preview_url} className="w-32 sm:w-40 h-8" preload="none" />
                    ) : (
                      <div className="text-sm text-pink-300 font-bold">No preview</div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(t)} className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium shadow-lg transition-all">Seleziona</button>
                      <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noopener noreferrer" className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded-lg text-sm font-medium shadow-lg transition-all">Spotify</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selected && !submitted && (
          <div className="p-6 bg-white/15 backdrop-blur rounded-lg border border-white/30 text-base sm:text-lg">
            <div className="font-bold text-xl text-green-400 mb-3">✅ Conferma richiesta:</div>
            <div className="text-white font-medium text-lg mb-4">{selected.title} — {selected.artists}</div>
            <textarea 
              value={note} 
              onChange={(e)=>setNote(e.target.value)} 
              placeholder="Nota o dedica (opzionale)" 
              className="w-full mt-2 p-4 rounded-lg bg-white/10 backdrop-blur text-white text-base placeholder-lime-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/20" 
              rows={3} 
            />
            <div className="flex gap-3 mt-4">
              <button 
                onClick={confirmTrack} 
                disabled={submitting || !requesterName.trim()} 
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-white py-3 px-6 rounded-lg text-lg font-bold shadow-lg"
              >
                {submitting ? '⏳ Invio...' : '🎵 Conferma Richiesta'}
              </button>
              <button 
                onClick={()=>setSelected(null)} 
                className="flex-1 bg-gray-500 hover:bg-gray-600 active:scale-[0.98] transition-all text-white py-3 px-6 rounded-lg text-lg font-bold shadow-lg"
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="p-6 bg-white/15 backdrop-blur rounded-lg border border-white/30 text-base sm:text-lg flex flex-col gap-4">
            <div className="font-bold text-2xl text-green-400 text-center">🎶 Richiesta inviata!</div>
            <div className="text-lime-300 text-lg text-center font-bold">
              <span className="text-white font-bold text-xl">{submittedTrack?.title || '—'}</span>
              {submittedTrack?.artists ? <span className="text-sky-300 block text-base font-bold"> di {submittedTrack.artists}</span> : null}
            </div>
            <div className="text-base text-pink-300 bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="text-center">
                Stato attuale: <span className="font-bold text-white text-lg uppercase">{lastRequestStatus || 'in attesa'}</span><br/>
                <span className="text-sm text-amber-300 block mt-2 font-bold">La pagina si aggiorna automaticamente quando il DJ decide.</span>
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
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg text-lg font-bold shadow-lg transition-all"
              >
                🎵 Nuova richiesta
              </button>
            )}
          </div>
        )}

        {/* Messaggi di errore/successo */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-400 text-red-100 px-6 py-4 rounded-lg backdrop-blur text-lg font-medium text-center shadow-lg">
            ❌ {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-500/20 border-2 border-green-400 text-green-100 px-6 py-4 rounded-lg backdrop-blur text-lg font-medium text-center shadow-lg">
            ✅ {message}
          </div>
        )}
      </div>
    </main>
  );
}

export default function RichiesteLibere() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl font-medium">🔄 Caricamento...</div>
      </div>
    }>
      <RichiesteLibereContent />
    </Suspense>
  );
}