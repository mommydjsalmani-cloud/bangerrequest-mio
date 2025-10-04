"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { canMakeRequest, sanitizeInput, LibereSession } from '@/lib/libereStore';

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
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images?: Array<{ url: string }> };
  duration_ms: number;
  preview_url?: string;
  explicit: boolean;
  external_ids?: { isrc?: string };
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
  const [searchError, setSearchError] = useState<string | null>(null);
  
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
  
  const searchSpotify = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      
      if (!data.ok) {
        setSearchError(data.error || 'Errore ricerca Spotify');
        return;
      }
      
      setSearchResults(data.tracks || []);
    } catch {
      setSearchError('Errore connessione Spotify');
    } finally {
      setSearching(false);
    }
  };
  
  const selectSpotifyTrack = (track: SpotifyTrack) => {
    setFormData({
      title: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      requester_name: formData.requester_name,
      track_id: track.id,
      uri: track.uri,
      album: track.album.name,
      cover_url: track.album.images?.[0]?.url,
      duration_ms: track.duration_ms,
      source: 'spotify'
    });
    setSearchResults([]);
    setSearchQuery('');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }
  
  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 text-white max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Errore</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">🎵 Richieste Libere</h1>
            <p className="text-blue-200">{session?.name}</p>
            
            {session?.status === 'paused' && (
              <div className="mt-4 bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-yellow-200">
                <p>⏸️ Le richieste libere sono chiuse al momento</p>
              </div>
            )}
          </div>
          
          {session?.status === 'active' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              
              {/* Spotify Search */}
              <div className="mb-6">
                <label className="block text-white text-sm font-medium mb-2">
                  🔍 Cerca su Spotify (opzionale)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchSpotify()}
                    placeholder="Cerca artista, titolo..."
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={searchSpotify}
                    disabled={searching || !searchQuery.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {searching ? '...' : '🔍'}
                  </button>
                </div>
                
                {searchError && (
                  <p className="text-red-300 text-sm mt-2">{searchError}</p>
                )}
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => selectSpotifyTrack(track)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-white/10"
                      >
                        <div className="font-medium text-white">{track.name}</div>
                        <div className="text-blue-200 text-sm">{track.artists.map(a => a.name).join(', ')}</div>
                        <div className="text-blue-300 text-xs">{track.album.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Manual Form */}
              <form onSubmit={submitRequest} className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    🎵 Titolo brano *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Es. Bohemian Rhapsody"
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    🎤 Artista
                  </label>
                  <input
                    type="text"
                    value={formData.artists}
                    onChange={(e) => setFormData(prev => ({ ...prev, artists: e.target.value }))}
                    placeholder="Es. Queen"
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    👤 Il tuo nome (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.requester_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                    placeholder="Come ti chiami?"
                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
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
                
                <button
                  type="submit"
                  disabled={submitting || !formData.title.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all"
                >
                  {submitting ? '⏳ Invio...' : '🎶 Invia Richiesta'}
                </button>
              </form>
              
              <div className="mt-6 text-center text-blue-200 text-sm">
                <p>⏱️ Limite: 1 richiesta ogni 60 secondi</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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