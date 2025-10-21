// API endpoint for push notification unsubscriptions
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DJ authentication check (same as subscribe)
function authenticateDJ(req: NextRequest) {
  const djSecret = process.env.DJ_PANEL_SECRET?.trim();
  const djUser = process.env.DJ_PANEL_USER?.trim();
  
  if (!djSecret || !djUser) {
    return { ok: false, error: 'DJ panel not configured' };
  }
  
  const headerSecret = req.headers.get('x-dj-secret')?.trim();
  const headerUser = req.headers.get('x-dj-user')?.trim();
  
  if (headerSecret !== djSecret || headerUser !== djUser) {
    return { ok: false, error: 'unauthorized' };
  }
  
  return { ok: true };
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Memory storage reference (same as subscribe)
const subscriptions = new Map();

export async function POST(req: NextRequest) {
  try {
    // Authenticate DJ
    const auth = authenticateDJ(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }
    
    const djUser = req.headers.get('x-dj-user')?.trim() || 'unknown';
    const body = await req.json();
    
    const { endpoint } = body;
    
    if (!endpoint) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing required field: endpoint' 
      }, { status: 400 });
    }
    
    // Try to remove from Supabase first
    const supabase = getSupabaseClient();
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('dj_user', djUser);
        
        if (error) {
          console.error('Supabase push unsubscription error:', error);
        }
      } catch (error) {
        console.error('Supabase push unsubscription failed:', error);
      }
    }
    
    // Remove from memory storage
    subscriptions.delete(djUser);
    
    console.log(`Push subscription removed for DJ: ${djUser}`);
    
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
