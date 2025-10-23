import { NextResponse } from 'next/server';
import { withErrorHandler, ValidationError, ExternalServiceError, withTimeout, logger } from '@/lib/errorHandler';
import { config } from '@/lib/config';
import { getSpotifyToken } from '@/lib/spotify';

// Tipi Spotify API
interface SpotifyArtist {
  name: string;
  id: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  external_ids: { isrc?: string };
  popularity: number;
  external_urls: { spotify: string };
}

async function searchHandler(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  // Validazione input
  if (!query) {
    throw new ValidationError('Search query is required', 'q');
  }

  if (query.length < 2) {
    throw new ValidationError('Search query must be at least 2 characters', 'q');
  }

  if (query.length > 100) {
    throw new ValidationError('Search query too long (max 100 characters)', 'q');
  }

  try {
    // Get token with timeout
    const token = await withTimeout(
      getSpotifyToken(),
      config.spotify.searchTimeout,
      'spotify_token_fetch'
    );

    // Search tracks with timeout
    const searchResponse = await withTimeout(
      fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }),
      config.spotify.searchTimeout,
      'spotify_search_request'
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      logger.error(new Error(`Spotify API error: ${searchResponse.status} ${errorText}`), {
        operation: 'spotify_search',
        endpoint: req.url
      });
      
      throw new ExternalServiceError(
        'Spotify',
        `Search failed: ${searchResponse.status}`,
        searchResponse.status === 429 ? 60 : undefined // Rate limit retry after
      );
    }

    const data = await searchResponse.json();
    
    // Trasforma i risultati in formato consistente
    const tracks = (data.tracks?.items || []).map((track: SpotifyTrack) => ({
      id: track.id,
      uri: track.uri,
      title: track.name,
      artists: track.artists?.map((a: SpotifyArtist) => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.name || '',
      cover_url: track.album?.images?.[0]?.url || null,
      duration_ms: track.duration_ms || 0,
      explicit: track.explicit || false,
      preview_url: track.preview_url || null,
      isrc: track.external_ids?.isrc || null,
      popularity: track.popularity || 0,
      external_urls: track.external_urls
    }));

    return NextResponse.json({
      ok: true,
      tracks,
      total: data.tracks?.total || 0,
      limit,
      offset,
      query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('token error')) {
      throw new ExternalServiceError('Spotify', 'Authentication failed');
    }
    throw error; // Re-throw per essere gestito dal wrapper
  }
}

export const GET = withErrorHandler(searchHandler);