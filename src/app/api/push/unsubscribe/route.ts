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

    const { endpoint } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Endpoint required' 
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Deactivate or delete subscription
    const { error } = await supabase
      .from('dj_push_subscriptions')
      .update({ is_active: false })
      .eq('endpoint', endpoint)
      .eq('dj_id', djUser);

    if (error) {
      console.error('Supabase unsubscription error:', error);
      return NextResponse.json({ 
        ok: false, 
        error: 'Database error' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Push subscription removed successfully' 
    });

  } catch (error) {
    console.error('Push unsubscription error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}