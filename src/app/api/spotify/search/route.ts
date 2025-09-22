import { NextResponse } from 'next/server';
import { getSpotifyToken } from '@/lib/spotify';

type SpotifyTrack = {
  id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  duration_ms?: number;
  explicit?: boolean;
  preview_url?: string | null;
  isrc?: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = url.searchParams.get('limit') || '10';
  if (!q) return NextResponse.json({ tracks: [] });

  let token: string;
  try {
    token = await getSpotifyToken();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'token error' }, { status: 500 });
  }

  const spotifyRes = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', market: 'IT', limit })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!spotifyRes.ok) {
    const txt = await spotifyRes.text();
    return NextResponse.json({ error: 'spotify search failed', details: txt }, { status: 500 });
  }

  const data = await spotifyRes.json();

  // Map minimal track info with explicit types (avoid `any` for ESLint)
  type RawArtist = { name?: string };
  type RawAlbumImage = { url?: string };
  type RawAlbum = { name?: string; images?: RawAlbumImage[] };
  type RawTrack = {
    id: string;
    uri?: string;
    name?: string;
    artists?: RawArtist[];
    album?: RawAlbum;
    duration_ms?: number;
    explicit?: boolean;
    preview_url?: string | null;
    external_ids?: { isrc?: string } | null;
  };

  const items: RawTrack[] = data.tracks?.items || [];

  const tracks: SpotifyTrack[] = items.map((t) => {
    const artists = Array.isArray(t.artists) ? t.artists.map((a) => a.name || '').filter(Boolean).join(', ') : '';
    return {
      id: t.id,
      uri: t.uri,
      title: t.name,
      artists,
      album: t.album?.name,
      cover_url: t.album?.images?.[0]?.url || null,
      duration_ms: t.duration_ms,
      explicit: Boolean(t.explicit),
      preview_url: t.preview_url ?? null,
      isrc: t.external_ids?.isrc ?? null,
    };
  });

  return NextResponse.json({ tracks });
}
