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
