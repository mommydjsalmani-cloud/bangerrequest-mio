import { NextResponse } from 'next/server';

// Endpoint diagnostico per verificare configurazione credenziali DJ.
export async function GET() {
  const haveUser = !!process.env.DJ_PANEL_USER?.trim();
  const haveSecret = !!process.env.DJ_PANEL_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';
  if (!haveUser || !haveSecret) {
    return NextResponse.json({
      ok: false,
      error: 'misconfigured',
      ...(isProd ? {} : { haveUser, haveSecret })
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
