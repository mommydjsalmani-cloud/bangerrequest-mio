import { NextResponse } from 'next/server';
import { searchDeezer } from '@/lib/deezer';

export async function GET() {
  try {
    // Piccola query di test per verificare che le API Deezer siano raggiungibili
    await searchDeezer('test', 1);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
