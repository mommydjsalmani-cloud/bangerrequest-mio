import { describe, it, expect } from 'vitest';
import * as eventsRoute from '@/app/api/events/route';
import * as requestsRoute from '@/app/api/requests/route';

// Configura credenziali per passare auth
process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';
// Non impostiamo Supabase per usare store in-memory
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

async function call(path: string, init?: { method?: string; body?: any }) {
  const method = init?.method || 'GET';
  const djHeaders = { 'x-dj-secret': '77', 'x-dj-user': 'mommy' };
  if (path === '/api/events' && method === 'POST') {
    const req = new Request('http://local/api/events', { method: 'POST', body: JSON.stringify(init?.body || {}), headers: { 'Content-Type': 'application/json', ...djHeaders } });
    const res = await (eventsRoute as any).POST(req);
    return await res.json();
  }
  if (path.startsWith('/api/requests') && method === 'POST') {
    const req = new Request('http://local/api/requests', { method: 'POST', body: JSON.stringify(init?.body || {}), headers: { 'Content-Type': 'application/json' } });
    const res = await (requestsRoute as any).POST(req);
    return await res.json();
  }
  if (path.startsWith('/api/requests') && method === 'GET') {
    const url = new URL('http://local'+path);
    const req = new Request(url.toString(), { method: 'GET' });
    const res = await (requestsRoute as any).GET(req);
    return await res.json();
  }
  throw new Error('Route non gestita nel test helper: '+method+' '+path);
}

describe('Requests duration propagation', () => {
  it('propaga duration_ms dal POST al GET', async () => {
  const event = await call('/api/events', { method: 'POST', body: { code: 'DURX', name: 'Dur Event X' } });
    expect(event.ok).toBe(true);
    const trackId = 'track-duration-1';
  const post = await call('/api/requests', { method: 'POST', body: { event_code: 'DURX', track_id: trackId, title: 'Song A', artists: 'Artist A', duration_ms: 183000 } });
    expect(post.ok).toBe(true);
  const get = await call(`/api/requests?event_code=DURX&track_id=${trackId}`);
    expect(get.ok).toBe(true);
    expect(get.requests?.length).toBe(1);
    expect(get.requests[0].duration_ms).toBe(183000);
  });

  it('accetta duration in secondi e converte in ms', async () => {
  const event = await call('/api/events', { method: 'POST', body: { code: 'DUR2', name: 'Dur Event 2' } });
    expect(event.ok).toBe(true);
    const trackId = 'track-duration-2';
  const post = await call('/api/requests', { method: 'POST', body: { event_code: 'DUR2', track_id: trackId, title: 'Song B', artists: 'Artist B', duration: 200 } });
    expect(post.ok).toBe(true);
  const get = await call(`/api/requests?event_code=DUR2&track_id=${trackId}`);
    expect(get.ok).toBe(true);
    expect(get.requests?.[0].duration_ms).toBe(200000);
  });
});
