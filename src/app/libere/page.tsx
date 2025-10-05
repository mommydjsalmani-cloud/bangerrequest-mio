"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { canMakeRequest, sanitizeInput, LibereSession } from '@/lib/libereStore';
import Image from 'next/image';

type RequestFormData = {
  title: string;
  requester_name: string;
  artists: string;
  track_id?: string;
  uri?: string;
  album?: string;
  cover_url?: string;
  duration_ms?: number;
  source: 'spotify' | 'manual';
};

type SpotifyTrack = {
  id: string;
  uri?: string;
  title?: string;  // campo dall'API
  artists?: string;  // già stringa processata dall'API
  album?: string;  // già stringa processata dall'API
  cover_url?: string | null;  // dall'API
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
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number | undefined>();
  
  // Form state
  const [formData, setFormData] = useState<RequestFormData>({
    title: '',
    requester_name: '',
    artists: '',
    source: 'manual'
  });
  
  // Spotify search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  
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
  
  // Ricerca automatica Spotify con debounce (come pagina events)
  useEffect(() => {
    console.log('useEffect chiamato, searchQuery:', searchQuery);
    const t = setTimeout(() => {
      if (!searchQuery.trim()) {
        console.log('Query vuota, resetto risultati');
        setSearchResults([]);
        return;
      }
      console.log('Cercando:', searchQuery);
      setSearching(true);
      fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
        .then((r) => r.json())
        .then((data) => {
          console.log('Risultati ricevuti:', data);
          setSearchResults(data.tracks || []);
        })
        .catch((err) => {
          console.error('Errore ricerca:', err);
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const selectSpotifyTrack = (track: SpotifyTrack) => {
    console.log('🎵 Selecting track:', track);
    setFormData({
      title: track.title || '',
      artists: track.artists || '',
      requester_name: formData.requester_name,
      track_id: track.id,
      uri: track.uri,
      album: track.album || '',
      cover_url: track.cover_url || '',
      duration_ms: track.duration_ms,
      source: 'spotify'
    });
    setSearchResults([]);
    setSearchQuery('');
    console.log('✅ Track selected, form updated');
  };
  
  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Titolo brano obbligatorio');
      return;
    }
    
    // Rate limiting check
    const rateLimitCheck = canMakeRequest(lastRequestTime);
    if (!rateLimitCheck.allowed) {
      setError(`Devi attendere ${rateLimitCheck.remainingSeconds} secondi prima di inviare un'altra richiesta`);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const payload = {
        title: sanitizeInput(formData.title),
        requester_name: formData.requester_name.trim() || undefined,
        artists: formData.artists.trim() || undefined,
        track_id: formData.track_id,
        uri: formData.uri,
        album: formData.album,
        cover_url: formData.cover_url,
        duration_ms: formData.duration_ms,
        source: formData.source
      };
      
      const response = await fetch(`/api/libere?s=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        setError(data.error || 'Errore invio richiesta');
        return;
      }
      
      setSuccess(data.message || 'Richiesta ricevuta 🎶');
      setLastRequestTime(Date.now());
      
      // Reset form
      setFormData({
        title: '',
        requester_name: '',
        artists: '',
        source: 'manual'
      });
      
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

        {session?.status === 'paused' && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-yellow-200">
            <p>⏸️ Le richieste libere sono chiuse al momento</p>
          </div>
        )}

        {session?.status === 'active' && (
          <>
            {/* Nome utente */}
            <div className="flex flex-col gap-3">
              <input
                value={formData.requester_name}
                onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                type="text"
                placeholder="Il tuo nome"
                className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>

            {/* Ricerca Spotify */}
            <div className="flex flex-col gap-3">
              <input
                value={searchQuery}
                onChange={(e) => {
                  console.log('Input cambiato:', e.target.value);
                  setSearchQuery(e.target.value);
                }}
                type="text"
                placeholder="Cerca titolo o artista su Spotify"
                className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>

            {searching && <div className="text-sm text-gray-300">Ricerca in corso... ({searchQuery})</div>}

            {/* Debug info */}
            {searchQuery && !searching && searchResults.length === 0 && (
              <div className="text-sm text-yellow-300">
                Nessun risultato per &quot;{searchQuery}&quot;. Controlla la console per errori.
              </div>
            )}

            {/* Risultati ricerca */}
            <div className="grid grid-cols-1 gap-2">
              {/* Debug: {searchResults.length} risultati */}
              {searchResults.map((track) => {
                console.log('Rendering track:', track);
                return (
                <div 
                  key={track.id} 
                  className="p-2 rounded flex items-center gap-3 sm:gap-4 cursor-pointer transition bg-zinc-800/40 hover:bg-zinc-800"
                  onClick={() => selectSpotifyTrack(track)}
                >
                  <Image 
                    src={track.cover_url || '/file.svg'} 
                    alt={track.title || 'cover'} 
                    width={56} 
                    height={56} 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded object-cover flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">
                      {track.title} 
                      {track.explicit && (
                        <span className="text-[10px] bg-red-600 px-1 rounded ml-1 align-middle">E</span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-gray-400 truncate">
                      {track.artists} — {track.album}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {formatDuration(track.duration_ms || 0)}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Form con canzone selezionata */}
            {formData.source === 'spotify' && formData.title && (
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-semibold text-green-400">🎵 Canzone Selezionata</h3>
                <div className="flex items-center gap-4">
                  {formData.cover_url && (
                    <Image 
                      src={formData.cover_url} 
                      alt={formData.title} 
                      width={64} 
                      height={64} 
                      className="w-16 h-16 rounded object-cover" 
                    />
                  )}
                  <div>
                    <div className="font-semibold">{formData.title}</div>
                    <div className="text-sm text-gray-400">{formData.artists}</div>
                    {formData.album && (
                      <div className="text-xs text-gray-500">{formData.album}</div>
                    )}
                  </div>
                </div>
                
                <input
                  type="text"
                  value={formData.requester_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                  placeholder="Il tuo nome"
                  className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={submitRequest}
                    disabled={submitting || !formData.requester_name.trim()}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    {submitting ? '⏳ Invio...' : '🎶 Invia Richiesta'}
                  </button>
                  <button
                    onClick={() => {
                      setFormData({
                        title: '',
                        requester_name: formData.requester_name,
                        artists: '',
                        source: 'manual'
                      });
                    }}
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    ↺
                  </button>
                </div>
              </div>
            )}

            {/* Messaggi e form fallback */}
            {searchResults.length === 0 && searchQuery.trim() && !searching && (
              <div className="text-center text-gray-400 py-4">
                <p>Nessun risultato trovato. Inserisci i dati manualmente:</p>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titolo brano"
                    className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={formData.artists}
                    onChange={(e) => setFormData(prev => ({ ...prev, artists: e.target.value }))}
                    placeholder="Artista"
                    className="w-full p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none text-sm"
                  />
                  <button
                    onClick={submitRequest}
                    disabled={submitting || !formData.title.trim()}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    {submitting ? '⏳ Invio...' : '🎶 Invia Richiesta'}
                  </button>
                </div>
              </div>
            )}

            {/* Messaggi di errore/successo */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-200">
                {success}
              </div>
            )}
          </>
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