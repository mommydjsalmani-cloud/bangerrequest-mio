import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST /api/push/subscribe
export async function POST(req: NextRequest) {
  try {
    // Autenticazione DJ
    const djSecret = req.headers.get('x-dj-secret')?.trim();
    const djUser = req.headers.get('x-dj-user')?.trim();
    
    const envSecret = process.env.DJ_PANEL_SECRET?.trim();
    const envUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!envSecret || !envUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Server misconfigured' 
      }, { status: 500 });
    }
    
    if (djSecret !== envSecret || djUser !== envUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { subscription } = await req.json();
    
    if (!subscription?.endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid subscription data' 
      }, { status: 400 });
    }

    // Salva subscription nel database
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database not configured' 
      }, { status: 500 });
    }

    const { error } = await supabase
      .from('dj_push_subscriptions')
      .upsert({
        dj_user: djUser,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys?.p256dh || '',
        auth_key: subscription.keys?.auth || '',
        user_agent: req.headers.get('user-agent') || '',
        created_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error saving push subscription:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Push notifications attivate'
    });
    
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}