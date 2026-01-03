import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Debug env', () => {
  beforeEach(() => {
    console.log('1. Before setting:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    
    console.log('2. After setting:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    
    vi.resetModules();
  });

  it('test', async () => {
    console.log('3. In test:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    
    const { getSupabase } = await import('@/lib/supabase');
    const sb = getSupabase();
    console.log('4. getSupabase result:', sb);
    expect(sb).toBeNull();
  });
});
