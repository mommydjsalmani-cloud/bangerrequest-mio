// Deezer usa API pubblica senza autenticazione per la ricerca base
// https://developers.deezer.com/api

export interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  duration: number; // in secondi
  preview: string | null;
  explicit_lyrics: boolean;
  link: string;
  artist: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    title: string;
    cover: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
    cover_xl?: string;
  };
}

export interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

export async function searchDeezer(
  query: string,
  limit = 10,
  offset = 0
): Promise<DeezerSearchResponse> {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${offset}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deezer API error: ${res.status} ${txt}`);
  }

  const data: DeezerSearchResponse = await res.json();

  // Deezer a volte restituisce un oggetto errore nel campo data
  if ('error' in data) {
    const err = (data as unknown as { error: { type: string; message: string } }).error;
    throw new Error(`Deezer API error: ${err.type} — ${err.message}`);
  }

  return data;
}

/** Normalizza un DeezerTrack nel formato interno usato dall'app */
export function normalizeDeezerTrack(track: DeezerTrack) {
  return {
    id: String(track.id),
    uri: null, // Deezer non ha un URI stile `deezer:track:xxx`
    title: track.title,
    artists: track.artist?.name || 'Unknown Artist',
    album: track.album?.title || '',
    cover_url: track.album?.cover_medium || track.album?.cover || null,
    duration_ms: (track.duration || 0) * 1000,
    explicit: track.explicit_lyrics || false,
    preview_url: track.preview || null,
    isrc: null,
    popularity: 0,
    external_urls: { deezer: track.link || `https://www.deezer.com/track/${track.id}` },
  };
}
