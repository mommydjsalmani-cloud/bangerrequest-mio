import { NextResponse } from 'next/server';
import { djSubscriptions } from '@/lib/webpush';

// Endpoint di debug: cancella tutte le subscriptions (solo per sviluppo)
export async function POST() {
  try {
    // Usa l'export esplicito della Map dal modulo webpush
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