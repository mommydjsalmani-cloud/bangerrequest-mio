import { createClient } from '@supabase/supabase-js';

// Support multiple env var names to be flexible with setups
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() || null;
const key = (
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim() || null;

export function getSupabase() {
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
