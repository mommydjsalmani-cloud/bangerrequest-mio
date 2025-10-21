// API endpoint for push notification subscriptions
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DJ authentication check
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

// Store subscription in memory as fallback
const subscriptions = new Map<string, {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  dj_user: string;
  created_at: string;
}>();

export async function POST(req: NextRequest) {
  try {
    // Authenticate DJ
    const auth = authenticateDJ(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
    }
    
    const djUser = req.headers.get('x-dj-user')?.trim() || 'unknown';
    const body = await req.json();
    
    const { endpoint, keys } = body;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing required fields: endpoint, keys.p256dh, keys.auth' 
      }, { status: 400 });
    }
    
    const subscription = {
      endpoint,
      keys,
      dj_user: djUser,
      created_at: new Date().toISOString()
    };
    
    // Try to store in Supabase first
    const supabase = getSupabaseClient();
    
    if (supabase) {
      try {
        // Create table if not exists (idempotent)
        await supabase.rpc('create_push_subscriptions_table_if_not_exists');
        
        // Upsert subscription (replace if exists for same DJ)
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            dj_user: djUser,
            endpoint,
            p256dh_key: keys.p256dh,
            auth_key: keys.auth,
            created_at: subscription.created_at,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'dj_user'
          });
        
        if (error) {
          console.error('Supabase push subscription error:', error);
          // Fall back to memory storage
          subscriptions.set(djUser, subscription);
        }
      } catch (error) {
        console.error('Supabase push subscription failed:', error);
        // Fall back to memory storage
        subscriptions.set(djUser, subscription);
      }
    } else {
      // No Supabase, use memory storage
      subscriptions.set(djUser, subscription);
    }
    
    console.log(`Push subscription saved for DJ: ${djUser}`);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Push subscription saved successfully' 
    });
    
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
