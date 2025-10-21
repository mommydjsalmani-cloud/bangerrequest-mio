import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: Implement push notification sending
  return NextResponse.json({ 
    ok: false, 
    error: 'Push notifications not yet implemented' 
  }, { status: 501 });
}