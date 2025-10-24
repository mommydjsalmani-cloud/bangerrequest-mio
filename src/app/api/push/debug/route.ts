// Debug API per verificare configurazione push
// GET /api/push/debug

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Debug semplice senza auth per vedere la configurazione
    const config = {
      ENABLE_PUSH_NOTIFICATIONS: !!process.env.ENABLE_PUSH_NOTIFICATIONS,
      ENABLE_PUSH_VALUE: process.env.ENABLE_PUSH_NOTIFICATIONS,
      VAPID_PUBLIC_KEY: !!process.env.VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
      VAPID_SUBJECT: !!process.env.VAPID_SUBJECT,
      DJ_PANEL_USER: !!process.env.DJ_PANEL_USER,
      DJ_PANEL_SECRET: !!process.env.DJ_PANEL_SECRET,
      ALL_ENV_KEYS: Object.keys(process.env).filter(key => 
        key.includes('VAPID') || 
        key.includes('PUSH') || 
        key.includes('DJ_PANEL')
      ).sort()
    };
    
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      config,
      userAgent: request.headers.get('user-agent')
    });
    
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}