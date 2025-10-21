import { NextRequest, NextResponse } from 'next/server';
import { getAllDJSubscriptions, cleanupInvalidSubscriptions } from '@/lib/webpush';

// Endpoint per inviare notifiche push manuali (test)
export async function POST(request: NextRequest) {
  try {
    const body: { title?: string; body?: string; message?: string } = await request.json();
    
    const subscriptions = getAllDJSubscriptions();
    
    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'No DJ subscriptions found' 
      }, { status: 404 });
    }

    const title = body.title || '🎧 Banger Request Test';
    const message = body.body || body.message || 'Test notification';

    console.log(`📱 Sending test notification to ${subscriptions.length} DJ subscriptions`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);

    const invalidEndpoints: string[] = [];

    // Invia notifica a tutte le sottoscrizioni
    const promises = subscriptions.map(async (subscription) => {
      try {
        // Per ora simuliamo l'invio (in futuro si userà web-push library)
        console.log(`📱 Simulating notification to: ${subscription.endpoint.substring(0, 50)}...`);
        
        // Qui si inserirebbe il codice per inviare la notifica push reale
        // usando web-push library con i VAPID keys
        
      } catch (error) {
        console.error('❌ Failed to send notification:', error);
        invalidEndpoints.push(subscription.endpoint);
      }
    });

    await Promise.allSettled(promises);

    // Pulisci sottoscrizioni invalide
    if (invalidEndpoints.length > 0) {
      cleanupInvalidSubscriptions(invalidEndpoints);
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: `Test notification sent to ${subscriptions.length} subscribers`,
      subscriptions: subscriptions.length
    });
    
  } catch (error) {
    console.error('❌ Push send error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}