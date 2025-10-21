import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: Implement push notification subscription
  return NextResponse.json({ 
    ok: false, 
    error: 'Push notification subscription not yet implemented' 
  }, { status: 501 });
}