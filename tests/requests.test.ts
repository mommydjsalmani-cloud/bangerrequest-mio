import { describe, it, expect } from 'vitest';
import { POST as createRequest, PATCH as patchRequest } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

describe('Requests flow', () => {
  it('crea richiesta', async () => {
    // serve evento per associare event_code? Non obbligatorio qui, si accetta senza controllo
    const req = buildRequest('POST', 'http://localhost/api/requests', { track_id:'t1', title:'Song', artists:'Artist', event_code:'EV1', requester:'user1' });
    const res = await createRequest(req as any);
    expect(res.status).toBe(200);
    const j = await parseJSON(res as any);
    expect(j.ok).toBe(true);
    expect(j.item.title).toBe('Song');
  });

  it('cancel senza auth consentito', async () => {
    // crea
    const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'t2', title:'Brano', artists:'Artista', requester:'user2' }) as any);
    const cj = await parseJSON(create as any);
    const id = cj.item.id;
    const cancel = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'cancel' }) as any);
    expect(cancel.status).toBe(200);
    const cc = await parseJSON(cancel as any);
    expect(cc.item.status).toBe('cancelled');
  });

  it('accept richiede auth', async () => {
    const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'t3', title:'Another', artists:'Band' }) as any);
    const cj = await parseJSON(create as any);
    const id = cj.item.id;
    // senza auth
    const fail = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'accept' }) as any);
    expect(fail.status).toBe(401);
    // con auth
    const ok = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'accept' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(ok.status).toBe(200);
    const jj = await parseJSON(ok as any);
    expect(jj.item.status).toBe('accepted');
  });

  it('rileva duplicato e non crea nuova entry', async () => {
    const first = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'dup1', title:'DupSong', artists:'Band', event_code:'EVDUP' }) as any);
    expect(first.status).toBe(200);
    const firstJ = await parseJSON(first as any);
    const firstId = firstJ.item.id;
    const second = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'dup1', title:'DupSong', artists:'Band', event_code:'EVDUP' }) as any);
    expect(second.status).toBe(200);
    const secondJ = await parseJSON(second as any);
    expect(secondJ.duplicate).toBe(true);
    expect(secondJ.existing.id).toBe(firstId);
  });
});
