import { NextResponse } from 'next/server';

async function getToken(): Promise<string> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/spotify/token`);
  if (!res.ok) throw new Error('Token fetch failed');
  const data = await res.json();
  return data.access_token;
}

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

  const token = await getToken();

  const spotifyRes = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', market: 'IT', limit })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!spotifyRes.ok) {
    const txt = await spotifyRes.text();
    return NextResponse.json({ error: 'spotify search failed', details: txt }, { status: 500 });
  }

  const data = await spotifyRes.json();

  // Map minimal track info
  const tracks: SpotifyTrack[] = (data.tracks?.items || []).map((t: any) => {
    const artists = Array.isArray(t.artists) ? t.artists.map((a: any) => a.name).join(', ') : '';
    return {
      id: t.id,
      uri: t.uri,
      title: t.name,
      artists,
      album: t.album?.name,
      cover_url: t.album?.images?.[0]?.url || null,
      duration_ms: t.duration_ms,
      explicit: t.explicit,
      preview_url: t.preview_url,
      isrc: t.external_ids?.isrc || null,
    } as SpotifyTrack;
  });

  return NextResponse.json({ tracks });
}
