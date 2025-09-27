import { describe, it, expect } from 'vitest';
import { POST as eventsPOST } from '@/app/api/events/route';
import { buildRequest, parseJSON } from './testRoutes';

// Configura credenziali per passare auth
process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';
// Non impostiamo Supabase per usare store in-memory
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('Events duplicate code handling', () => {
  it('restituisce duplicate_code su secondo inserimento stesso code', async () => {
    const first = await eventsPOST(buildRequest('POST', 'http://localhost/api/events', { name: 'Dup Test', code: 'DUPX' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(first.status).toBe(200);
    const firstJson = await parseJSON(first as any);
    expect(firstJson.ok).toBe(true);
    expect(firstJson.event.code).toBe('DUPX');

    const second = await eventsPOST(buildRequest('POST', 'http://localhost/api/events', { name: 'Dup Test 2', code: 'DUPX' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(second.status).toBe(409);
    const secondJson = await parseJSON(second as any);
    expect(secondJson.error).toBe('duplicate_code');
  });
});
