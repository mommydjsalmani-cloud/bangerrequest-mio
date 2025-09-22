import { NextResponse } from 'next/server';
import { getSpotifyToken } from '@/lib/spotify';

export async function GET() {
  try {
    const token = await getSpotifyToken();
    return NextResponse.json({ access_token: token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'token error' }, { status: 500 });
  }
}
