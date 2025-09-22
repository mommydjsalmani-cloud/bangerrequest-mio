import { NextResponse } from 'next/server';

let cached: { access_token: string; expires_at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cached && cached.expires_at > now + 10000) {
    return NextResponse.json({ access_token: cached.access_token });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
  }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return NextResponse.json({ error: 'token error', details: txt }, { status: 500 });
  }

  const data = await tokenRes.json();
  const expires_at = Date.now() + (data.expires_in || 3600) * 1000;
  cached = { access_token: data.access_token, expires_at };

  return NextResponse.json({ access_token: data.access_token });
}
