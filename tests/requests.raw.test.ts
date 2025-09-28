import { describe, it, expect } from 'vitest';
import { POST as createRequest } from '@/app/api/requests/route';
import { GET as rawGet } from '@/app/api/requests/raw/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

describe('Raw requests endpoint', () => {
  it('restituisce entrambe le righe (originale + duplicato)', async () => {
    const base = { track_id:'rawdup1', title:'RawSong', artists:'Band', event_code:'EVRAW', requester:'a' };
    const first = await createRequest(buildRequest('POST', 'http://localhost/api/requests', base) as any);
    expect(first.status).toBe(200);
    await parseJSON(first as any);
    const second = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { ...base, requester:'b' }) as any);
    expect(second.status).toBe(200);
    await parseJSON(second as any);
    const raw = await rawGet(buildRequest('GET', 'http://localhost/api/requests/raw?event_code=EVRAW&track_id=rawdup1') as any);
    expect(raw.status).toBe(200);
    const rj = await parseJSON(raw as any);
    expect(rj.rows.length).toBeGreaterThanOrEqual(2);
  });
});
