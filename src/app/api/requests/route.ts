import { NextResponse } from 'next/server';

let store: any[] = [];

export async function GET() {
  return NextResponse.json({ requests: store });
}

export async function POST(req: Request) {
  const body = await req.json();
  const now = new Date().toISOString();
  const item = { id: `${Date.now()}`, created_at: now, ...body };
  store.unshift(item);
  return NextResponse.json({ ok: true, item });
}
