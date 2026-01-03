import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  // In test mode, ritorna sempre null per evitare connessioni reali
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
