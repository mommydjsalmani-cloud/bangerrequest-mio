import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { parseJSON } from './testRoutes';

// Salva e rimuovi le env vars PRIMA di qualsiasi import
const originalEnv = { ...process.env };

beforeAll(() => {
  // Rimuovi le credenziali Supabase PRIMA che i moduli vengano caricati
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

// Mock di getSupabase a livello di modulo - DEVE essere prima di qualsiasi import
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(() => null)
}));

// Mock anche measureAsync per evitare side effects
vi.mock('@/lib/monitoring', () => ({
  healthTracker: {
    setHealthy: vi.fn()
  },
  measureAsync: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn())
}));

describe('Aggregated health endpoint', () => {
  beforeEach(() => {
    // Configura le variabili di ambiente
    process.env.NODE_ENV = 'test';
    process.env.DJ_PANEL_USER = 'testuser';
    process.env.DJ_PANEL_SECRET = 'testsecret';
    // Assicurati che le credenziali Supabase siano rimosse
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('restituisce blocco supabase e auth', async () => {
    // Forza il reset del modulo per usare le nuove env vars
    vi.resetModules();
    
    // Re-applica i mock dopo resetModules
    vi.doMock('@/lib/supabase', () => ({
      getSupabase: vi.fn(() => null)
    }));
    vi.doMock('@/lib/monitoring', () => ({
      healthTracker: {
        setHealthy: vi.fn()
      },
      measureAsync: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn())
    }));

    // Importa il route con il mock di getSupabase già in place
    const { GET: healthGET } = await import('@/app/api/health/route');

    const res = await healthGET() as Response;
    
    // Il nuovo health check è più rigoroso - ritorna 503 se i servizi critici non sono disponibili
    expect(res.status).toBe(503);
    
    const j = await parseJSON(res as Response);
    expect(j).toHaveProperty('checks');
    expect(j.checks).toHaveProperty('auth');
    expect(j.checks).toHaveProperty('database');
    expect(j.checks.auth.ok).toBe(true);
    expect(j.checks.database.ok).toBe(false); // manca supabase => in-memory
    expect(j.checks.database.error).toBe('missing_credentials');
    expect(j.ok).toBe(false); // Overall health è false se mancano servizi critici
  });
});
