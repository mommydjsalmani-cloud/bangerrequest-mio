import { describe, it, expect } from 'vitest';
import { GET as healthGET } from '@/app/api/health/route';
import { parseJSON } from './testRoutes';

describe('Aggregated health endpoint', () => {
  it('restituisce blocco supabase e auth', async () => {
    // Configuriamo solo auth per vedere differenza
    process.env.DJ_PANEL_USER = 'testuser';
    process.env.DJ_PANEL_SECRET = 'testsecret';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; // assicura missing supabase
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await healthGET() as any;
    expect(res.status).toBe(200);
    const j = await parseJSON(res as any);
    expect(j).toHaveProperty('supabase');
    expect(j).toHaveProperty('auth');
    expect(j.auth.ok).toBe(true);
    expect(j.supabase.ok).toBe(false); // manca supabase => in-memory
    expect(j.supabase.error).toBe('missing_env');
  });
});
