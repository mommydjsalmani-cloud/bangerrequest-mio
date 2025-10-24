import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING',
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      TELEGRAM_USER_ID: process.env.TELEGRAM_USER_ID,
      DJ_PANEL_USER: process.env.DJ_PANEL_USER,
      DJ_PANEL_SECRET: process.env.DJ_PANEL_SECRET ? 'SET' : 'MISSING'
    }
  });
}