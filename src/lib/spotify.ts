let _cached: { access_token: string; expires_at: number } | null = null;

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now();
  if (_cached && _cached.expires_at > now + 10000) return _cached.access_token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

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
    throw new Error('token error: ' + txt);
  }

  const data = await tokenRes.json();
  const expires_at = Date.now() + (data.expires_in || 3600) * 1000;
  _cached = { access_token: data.access_token, expires_at };
  return data.access_token;
}
