import { NextResponse } from 'next/server';

export async function GET() {
  // Debug endpoint per vedere le prime lettere delle credenziali configurate
  const user = process.env.DJ_PANEL_USER || '';
  const secret = process.env.DJ_PANEL_SECRET || '';
  
  return NextResponse.json({
    user_hint: user.substring(0, 2) + '*'.repeat(Math.max(0, user.length - 2)),
    user_length: user.length,
    secret_length: secret.length,
    secret_hint: secret.substring(0, 1) + '*'.repeat(Math.max(0, secret.length - 1))
  });
}