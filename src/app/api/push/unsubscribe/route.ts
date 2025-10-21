import { NextRequest, NextResponse } from 'next/server';
import { removeDJSubscription } from '@/lib/webpush';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verifica se abbiamo credenziali DJ negli headers (versione autenticata)
    const djSecret = request.headers.get('x-dj-secret')?.trim();
    const djUser = request.headers.get('x-dj-user')?.trim();
    
    if (djSecret && djUser) {
      // Versione autenticata - verifica credenziali
      const serverSecret = process.env.DJ_PANEL_SECRET?.trim();
      const serverUser = process.env.DJ_PANEL_USER?.trim();
      
      if (!serverSecret || !serverUser) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Server not configured' 
        }, { status: 500 });
      }
      
      if (djSecret !== serverSecret || djUser !== serverUser) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Invalid credentials' 
        }, { status: 401 });
      }
      
      // Estrai subscription dai dati
      const subscription = body.subscription || body;
      
      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Invalid subscription data' 
        }, { status: 400 });
      }
      
      // Rimuovi sottoscrizione autenticata
      removeDJSubscription(djUser, subscription);
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Push subscription removed successfully' 
      });
    } else {
      // Versione semplificata - rimozione diretta
      const subscription = body;
      
      if (!subscription || !subscription.endpoint) {
        return NextResponse.json({ 
          ok: false, 
          error: 'Invalid subscription data' 
        }, { status: 400 });
      }
      
      // Rimuovi sottoscrizione generica (usa 'anonymous' come user)
      removeDJSubscription('dj-anonymous', subscription);
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Push subscription removed successfully' 
      });
    }
    
  } catch (error) {
    console.error('❌ Push unsubscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}