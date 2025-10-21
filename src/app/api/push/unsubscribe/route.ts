import { NextRequest, NextResponse } from 'next/server';
import { removeDJSubscription } from '@/lib/webpush';

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione DJ
    const djSecret = request.headers.get('x-dj-secret')?.trim();
    const djUser = request.headers.get('x-dj-user')?.trim();
    
    const serverSecret = process.env.DJ_PANEL_SECRET?.trim();
    const serverUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!djSecret || !djUser || !serverSecret || !serverUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing credentials' 
      }, { status: 401 });
    }
    
    if (djSecret !== serverSecret || djUser !== serverUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }
    
    // Ottieni dati sottoscrizione
    const { subscription } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }
    
    // Rimuovi sottoscrizione
    removeDJSubscription(djUser, subscription);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Push subscription removed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Push unsubscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}