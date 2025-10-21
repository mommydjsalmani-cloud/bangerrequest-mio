import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    const { subscription, userAgent } = await request.json();
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Upsert subscription
    const { error } = await supabase
      .from('dj_push_subscriptions')
      .upsert({
        dj_id: djUser,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
        is_active: true,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Supabase subscription error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Push subscription registered successfully' 
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}