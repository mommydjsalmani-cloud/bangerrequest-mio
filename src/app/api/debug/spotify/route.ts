import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
}
