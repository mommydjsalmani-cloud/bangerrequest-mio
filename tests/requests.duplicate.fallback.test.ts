import { describe, it, expect } from 'vitest';
import { POST as createRequest, GET as getRequests } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

// Verifica fallback duplicate detection via title+artists quando track_id manca o differisce.

describe('Duplicate detection fallback title+artists', () => {
  it('rileva duplicato solo via title+artists quando track_id assente', async () => {
    const baseBody = { title:'Same Song', artists:'The Band', event_code:'EVFB', requester:'r1' };
    const first = await createRequest(buildRequest('POST', 'http://localhost/api/requests', baseBody) as any);
    expect(first.status).toBe(200);
    const firstJ = await parseJSON(first as any);
    expect(firstJ.item).toBeTruthy();

    const second = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { ...baseBody, requester:'r2', note:'dup without track id' }) as any);
    expect(second.status).toBe(200);
    const secondJ = await parseJSON(second as any);
    expect(secondJ.duplicate).toBe(true);
    expect(secondJ.detection_mode).toBe('title_artists');

    // GET verify at least 2 rows for same event (no track filter because unknown track_id fallback uses 'unknown')
    const listRes = await getRequests(buildRequest('GET', 'http://localhost/api/requests?event_code=EVFB') as any);
    const listJ = await parseJSON(listRes as any);
    const rows = listJ.requests.filter((r: any) => r.event_code === 'EVFB' && r.title === 'Same Song');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
