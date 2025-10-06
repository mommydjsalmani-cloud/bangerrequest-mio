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
  
  return (
    <main className="flex min-h-dvh flex-col items-center justify-start bg-black text-white p-4 sm:p-6">
      <div className="w-full max-w-3xl p-6 sm:p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6 mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">
          🎵 Richieste Libere - {session?.name || 'Sessione Demo'}
        </h2>

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
            <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Nota o dedica (opzionale)" className="w-full mt-2 p-2 rounded bg-zinc-900 text-white text-sm" rows={3} />
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
            <div className="font-semibold text-lg">Richiesta inviata</div>
            <div className="text-gray-300 text-sm">Brano: <span className="text-white font-medium">{submittedTrack?.title || '—'}</span>{submittedTrack?.artists ? <span className="text-gray-400"> — {submittedTrack.artists}</span> : null}</div>
            <div className="text-xs text-gray-400">
              Stato attuale: <span className="font-semibold text-white">{lastRequestStatus || 'in attesa'}</span><br/>
              La pagina si aggiorna automaticamente quando il DJ decide.
            </div>
            
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