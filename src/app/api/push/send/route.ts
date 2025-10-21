import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/webpush';

// Endpoint per inviare notifiche push manuali (test)
export async function POST(request: NextRequest) {
  try {
    const body: { title?: string; body?: string; message?: string; icon?: string; badge?: string } = await request.json();
    
    const title = body.title || '🎧 Banger Request Test';
    const message = body.body || body.message || 'Test notification';
    const icon = body.icon || '/icon-192x192.png';
    const badge = body.badge || '/icon-192x192.png';

    console.log(`📱 Sending test notification`);
    console.log(`📝 Title: ${title}`);
    console.log(`📝 Message: ${message}`);

    // Invia notifica push reale
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

    if (result.success === 0 && result.failed === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: 'No DJ subscriptions found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: `Test notification sent successfully`,
      stats: {
        success: result.success,
        failed: result.failed,
        invalidCleaned: result.invalidEndpoints.length
      }
    });
    
  } catch (error) {
    console.error('❌ Push send error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}