import { describe, it, expect } from 'vitest';
import { POST as createRequest, PATCH as patchRequest } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

describe('Requests flow', () => {
  it('crea richiesta', async () => {
    // serve evento per associare event_code? Non obbligatorio qui, si accetta senza controllo
    const req = buildRequest('POST', 'http://localhost/api/requests', { track_id:'t1', title:'Song', artists:'Artist', event_code:'EV1', requester:'user1' });
  const res = await createRequest(req as unknown as Request);
  expect(res.status).toBe(200);
  const j = await parseJSON(res as Response);
    expect(j.ok).toBe(true);
    expect(j.item.title).toBe('Song');
  });

  it('cancel senza auth consentito', async () => {
    // crea
  const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'t2', title:'Brano', artists:'Artista', requester:'user2' }) as unknown as Request);
  const cj = await parseJSON(create as Response);
    const id = cj.item.id;
  const cancel = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'cancel' }) as unknown as Request);
  expect(cancel.status).toBe(200);
  const cc = await parseJSON(cancel as Response);
    expect(cc.item.status).toBe('cancelled');
  });

  it('accept richiede auth', async () => {
  const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'t3', title:'Another', artists:'Band' }) as unknown as Request);
  const cj = await parseJSON(create as Response);
    const id = cj.item.id;
    // senza auth
  const fail = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'accept' }) as unknown as Request);
    expect(fail.status).toBe(401);
    // con auth
  const ok = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'accept' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as unknown as Request);
  expect(ok.status).toBe(200);
  const jj = await parseJSON(ok as Response);
    expect(jj.item.status).toBe('accepted');
  });
});
