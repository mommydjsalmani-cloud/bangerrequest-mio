import { NextResponse } from 'next/server';
import { getSpotifyToken } from '@/lib/spotify';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_credentials',
        ...(isProd ? {} : {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        })
      },
      { status: 500 }
    );
  }
  try {
    await getSpotifyToken();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
