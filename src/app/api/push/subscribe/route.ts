import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Validazione header DJ
    const djSecret = request.headers.get('x-dj-secret');
    const djUser = request.headers.get('x-dj-user');
    
    const expectedSecret = process.env.DJ_PANEL_SECRET?.trim();
    const expectedUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!expectedSecret || !expectedUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Server not configured' 
      }, { status: 500 });
    }
    
    if (djSecret !== expectedSecret || djUser !== expectedUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Inizializza Supabase
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database not configured' 
      }, { status: 500 });
    }

    // Parse body
    const body = await request.json();
    const { endpoint, keys } = body;
    
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }

    // Upsert subscription
    const { error } = await supabase
      .from('dj_push_subscriptions')
      .upsert({
        dj_id: djUser,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: request.headers.get('user-agent') || null,
        is_active: true,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Subscription saved successfully'
    });

  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}