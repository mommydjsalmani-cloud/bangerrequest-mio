import { describe, it, expect } from 'vitest';
import { POST as createRequest, PATCH as patchRequest } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

describe('Requests moderation (merge/mute)', () => {
  it('mute aggiorna stato a muted', async () => {
    const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'m1', title:'Mute Song', artists:'Band' }) as any);
    const cj = await parseJSON(create as any);
    const id = cj.item.id;
    const mute = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action:'mute' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(mute.status).toBe(200);
    const mj = await parseJSON(mute as any);
    expect(mj.item.status).toBe('muted');
  });

  it('merge incrementa duplicates senza target e poi con target', async () => {
    // primo request
    const r1 = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'x1', title:'Song X', artists:'Artist' }) as any);
    const j1 = await parseJSON(r1 as any);
    const id1 = j1.item.id;
    // merge self (increment duplicates)
    const mergeSelf = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id: id1, action:'merge' }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(mergeSelf.status).toBe(200);
    const msj = await parseJSON(mergeSelf as any);
    expect(msj.item.duplicates).toBe(1);

    // seconda request
    const r2 = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { track_id:'x1', title:'Song X', artists:'Artist' }) as any);
    const j2 = await parseJSON(r2 as any);
    const id2 = j2.item.id;

    // merge id2 into id1
    const mergeInto = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id: id2, action:'merge', mergeWithId: id1 }, { 'x-dj-secret':'77', 'x-dj-user':'mommy' }) as any);
    expect(mergeInto.status).toBe(200);
    const mi = await parseJSON(mergeInto as any);
    expect(mi.target.duplicates).toBe(2);
  });
});
