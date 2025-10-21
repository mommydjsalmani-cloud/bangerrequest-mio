import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/webpush';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  data?: {
    requestId?: string;
    action?: string;
    url?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate DJ credentials
    const djSecret = request.headers.get('x-dj-secret');
    const djUser = request.headers.get('x-dj-user');
    
    const expectedSecret = process.env.DJ_PANEL_SECRET;
    const expectedUser = process.env.DJ_PANEL_USER;
    
    if (!djSecret || !djUser || djSecret !== expectedSecret || djUser !== expectedUser) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Push notifications require Supabase configuration' 
      }, { status: 500 });
    }

    const { notification }: { notification: NotificationData } = await request.json();
    
    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Notification title and body are required' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Get all active push subscriptions for this DJ
    const { data: subscriptions, error } = await supabase
      .from('dj_push_subscriptions')
      .select('*')
      .eq('dj_id', djUser)
      .eq('is_active', true);

    if (error) {
      console.error('Supabase subscription fetch error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No active subscriptions found',
        sent: 0 
      });
    }

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            JSON.stringify(notification)
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error('Failed to send to subscription:', sub.endpoint, error);
          
          // If subscription is invalid (410 status), deactivate it
          if (error instanceof Error && error.message.includes('410')) {
            await supabase
              .from('dj_push_subscriptions')
              .update({ is_active: false })
              .eq('endpoint', sub.endpoint);
          }
          
          return { 
            success: false, 
            endpoint: sub.endpoint, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const failed = results.length - successful;

    console.log(`Push notification results: ${successful} sent, ${failed} failed`);

    return NextResponse.json({ 
      ok: true, 
      message: `Notifications sent to ${successful} device(s)`,
      sent: successful,
      failed: failed,
      total: subscriptions.length
    });

  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}