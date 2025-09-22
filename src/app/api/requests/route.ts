import { NextResponse } from 'next/server';

type RequestItem = {
  id: string;
  created_at: string;
  track_id: string;
  uri?: string;
  title?: string;
  artists?: string;
  album?: string;
  cover_url?: string | null;
  isrc?: string | null;
  explicit?: boolean;
  preview_url?: string | null;
  note?: string;
  event_code?: string | null;
  requester?: string | null;
};

const store: RequestItem[] = [];

export async function GET() {
  return NextResponse.json({ requests: store });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<RequestItem>;
  const now = new Date().toISOString();
  const item: RequestItem = { id: `${Date.now()}`, created_at: now, track_id: body.track_id || 'unknown', uri: body.uri, title: body.title, artists: body.artists, album: body.album, cover_url: body.cover_url ?? null, isrc: body.isrc ?? null, explicit: !!body.explicit, preview_url: body.preview_url ?? null, note: body.note, event_code: body.event_code ?? null, requester: body.requester ?? null };
  store.unshift(item);
  return NextResponse.json({ ok: true, item });
}
