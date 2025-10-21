import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST /api/push/unsubscribe
export async function POST(req: NextRequest) {
  try {
    // Autenticazione DJ
    const djSecret = req.headers.get('x-dj-secret')?.trim();
    const djUser = req.headers.get('x-dj-user')?.trim();
    
    const envSecret = process.env.DJ_PANEL_SECRET?.trim();
    const envUser = process.env.DJ_PANEL_USER?.trim();
    
    if (!envSecret || !envUser || djSecret !== envSecret || djUser !== envUser) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { endpoint } = await req.json();
    
    if (!endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Endpoint required' 
      }, { status: 400 });
    }

    // Rimuovi/disattiva subscription
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Database not configured' 
      }, { status: 500 });
    }

    const { error } = await supabase
      .from('dj_push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint)
      .eq('dj_user', djUser);

    if (error) {
      console.error('Error unsubscribing:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Push notifications disattivate'
    });
    
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}