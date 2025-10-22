import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification, getAllDJSubscriptions } from '@/lib/webpush';

// Endpoint per inviare notifiche push manuali (test)
export async function POST(request: NextRequest) {
  try {
    const body: { title?: string; body?: string; message?: string; icon?: string; badge?: string } = await request.json();
    
    const title = body.title || '🎧 Banger Request Test';
    const message = body.body || body.message || 'Test notification';
    const icon = body.icon || '/icon-192x192.png';
    const badge = body.badge || '/icon-192x192.png';

    console.log(`� === PUSH NOTIFICATION TEST START ===`);
    console.log(`📝 Request body:`, body);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);
    
    // Debug: controlla subscriptions disponibili
    const subscriptions = await getAllDJSubscriptions();
    console.log(`📊 Available DJ subscriptions: ${subscriptions.length}`);
    
    if (subscriptions.length === 0) {
      console.log(`⚠️ No DJ subscriptions found - cannot send test notification`);
      return NextResponse.json({ 
        ok: false, 
        error: 'No DJ subscriptions found. Please subscribe to notifications first in the DJ panel.' 
      }, { status: 404 });
    }
    
    subscriptions.forEach((sub, index) => {
      console.log(`📱 Subscription ${index + 1}: ${sub.endpoint.substring(0, 50)}...`);
    });

    // Invia notifica push reale
    console.log(`🚀 Sending push notification...`);
    const result = await sendPushNotification({
      title,
      body: message,
      icon,
      badge,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        url: '/dj/libere'
      }
    });

    console.log(`📊 Push notification results:`, result);
    console.log(`🔔 === PUSH NOTIFICATION TEST END ===`);
    
    return NextResponse.json({ 
      ok: true, 
      message: `Test notification sent successfully`,
      stats: {
        success: result.success,
        failed: result.failed,
        invalidCleaned: result.invalidEndpoints.length,
        totalSubscriptions: subscriptions.length
      }
    });
    
  } catch (error) {
    console.error('❌ Push send error:', error);
    console.log(`🔔 === PUSH NOTIFICATION TEST ERROR ===`);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}