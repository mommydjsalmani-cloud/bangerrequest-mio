import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseJSON } from './testRoutes';

// Mock di getSupabase a livello di modulo - ritorna sempre null
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(() => null)
}));

// Mock measureAsync per eseguire la funzione direttamente
vi.mock('@/lib/monitoring', () => ({
  healthTracker: {
    setHealthy: vi.fn()
  },
  measureAsync: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn())
}));

describe('Aggregated health endpoint', () => {
  beforeEach(() => {
    // Configura le variabili di ambiente per il test
    process.env.NODE_ENV = 'test';
    process.env.DJ_PANEL_USER = 'testuser';
    process.env.DJ_PANEL_SECRET = 'testsecret';
    // Rimuovi le credenziali Supabase per forzare missing_credentials
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('restituisce blocco supabase e auth', async () => {
    // Import dinamico dopo aver settato le env vars
    const { GET: healthGET } = await import('@/app/api/health/route');

    const res = await healthGET() as Response;
    
    // Il health check ritorna 503 se i servizi critici non sono disponibili
    expect(res.status).toBe(503);
    
    const j = await parseJSON(res as Response);
    expect(j).toHaveProperty('checks');
    expect(j.checks).toHaveProperty('auth');
    expect(j.checks).toHaveProperty('database');
    expect(j.checks.auth.ok).toBe(true);
    expect(j.checks.database.ok).toBe(false);
    // Quando mancano le env vars, deve tornare 'missing_credentials'
    expect(j.checks.database.error).toBe('missing_credentials');
    expect(j.ok).toBe(false);
  });
});
