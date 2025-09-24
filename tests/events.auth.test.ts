import { describe, it, expect } from 'vitest';
import { POST as eventsPOST } from '@/app/api/events/route';
import { buildRequest, parseJSON } from './testRoutes';

// Set fallback env so route knows credentials
process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

describe('Events auth', () => {
  it('blocca creazione evento senza credenziali', async () => {
    const req = buildRequest('POST', 'http://localhost/api/events', { name: 'Test Evento' });
    const res = await eventsPOST(req as any);
    expect(res.status).toBe(401);
    const j = await parseJSON(res as any);
    expect(j.ok).toBe(false);
  });

  it('permette creazione evento con credenziali', async () => {
    const req = buildRequest('POST', 'http://localhost/api/events', { name: 'Evento OK' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' });
    const res = await eventsPOST(req as any);
    expect(res.status).toBe(200);
    const j = await parseJSON(res as any);
    expect(j.ok).toBe(true);
    expect(j.event.name).toBe('Evento OK');
  });
});
