import { NextResponse } from 'next/server';
import { VAPID_KEYS } from '@/lib/webpush';

export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_KEYS.publicKey
  });
}