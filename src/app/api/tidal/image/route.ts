import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIXES = [
  'resources.tidal.com',
  '.tidal.com',
  '.wimpmusic.com',
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix
  );
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('u');
    if (!raw) {
      return NextResponse.json({ ok: false, error: 'Missing image URL' }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid image URL' }, { status: 400 });
    }

    if (!['https:', 'http:'].includes(target.protocol)) {
      return NextResponse.json({ ok: false, error: 'Invalid protocol' }, { status: 400 });
    }

    if (!isAllowedHost(target.hostname)) {
      return NextResponse.json({ ok: false, error: 'Host not allowed' }, { status: 403 });
    }

    const upstream = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
      cache: 'force-cache',
    });

    if (!upstream.ok) {
      return NextResponse.json({ ok: false, error: `Upstream error ${upstream.status}` }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Upstream is not an image' }, { status: 415 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('Tidal image proxy error:', error);
    return NextResponse.json({ ok: false, error: 'Image proxy failed' }, { status: 500 });
  }
}
