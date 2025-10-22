import { NextResponse } from 'next/server';

// Endpoint di debug: cancella tutte le subscriptions (solo per sviluppo)
export async function POST() {
  try {
    // Importa e manipola direttamente la Map interna
    const webpushModule = await import('@/lib/webpush');
    
    // Accediamo alla Map interna del modulo (hack per sviluppo)
    const djSubscriptions = (webpushModule as any).djSubscriptions || new Map();
    djSubscriptions.clear();
    
    console.log('🧹 Cleared all push subscriptions from memory');
    
    return NextResponse.json({ 
      ok: true, 
      message: 'All subscriptions cleared from memory' 
    });
  } catch (error) {
    console.error('Error clearing push subscriptions:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}