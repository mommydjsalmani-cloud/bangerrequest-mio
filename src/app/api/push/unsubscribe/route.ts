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
    const { endpoint } = body;
    
    if (!endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing endpoint' 
      }, { status: 400 });
    }

    // Disattiva o rimuovi subscription
    const { error } = await supabase
      .from('dj_push_subscriptions')
      .update({ 
        is_active: false,
        deactivated_at: new Date().toISOString()
      })
      .eq('endpoint', endpoint)
      .eq('dj_id', djUser);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true,
      message: 'Successfully unsubscribed'
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}