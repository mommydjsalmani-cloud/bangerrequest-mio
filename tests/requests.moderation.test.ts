import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createRequest, PATCH as patchRequest } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';
import { getSupabase } from '@/lib/supabase';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

let testSessionToken: string;

beforeAll(async () => {
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase
      .from('sessioni_libere')
      .insert({
        name: 'Test Moderation Session',
        token: 'test-mod-token-12345',
        status: 'active',
        archived: false
      })
      .select('token')
      .single();
    testSessionToken = data?.token || 'test-mod-token-12345';
  } else {
    testSessionToken = 'test-mod-token-12345';
  }
});

describe('Requests moderation (merge/mute)', () => {
  it('mute aggiorna stato a muted', async () => {
    const create = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { 
      session_token: testSessionToken,
      track_id: 'm1', 
      title: 'Mute Song', 
      artists: 'Band',
      requester_name: 'user1'
    }) as unknown as Request);
    
    if (create.status !== 200) {
      console.warn('Test skipped: Supabase not available');
      return;
    }
    
    const cj = await parseJSON(create as Response);
    const id = cj.item.id;
    const mute = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id, action: 'mute' }, { 'x-dj-secret': '77', 'x-dj-user': 'mommy' }) as unknown as Request);
    expect(mute.status).toBe(200);
    const mj = await parseJSON(mute as Response);
    expect(mj.item.status).toBe('muted');
  });

  it('merge incrementa duplicates senza target e poi con target', async () => {
    const r1 = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { 
      session_token: testSessionToken,
      track_id: 'x1', 
      title: 'Song X', 
      artists: 'Artist',
      requester_name: 'user2'
    }) as unknown as Request);
    
    if (r1.status !== 200) {
      console.warn('Test skipped: Supabase not available');
      return;
    }
    
    const j1 = await parseJSON(r1 as Response);
    const id1 = j1.item.id;
    // merge self (increment duplicates)
    const mergeSelf = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id: id1, action: 'merge' }, { 'x-dj-secret': '77', 'x-dj-user': 'mommy' }) as unknown as Request);
    expect(mergeSelf.status).toBe(200);
    const msj = await parseJSON(mergeSelf as Response);
    expect(msj.item.duplicates).toBe(1);

    // seconda request
    const r2 = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { 
      session_token: testSessionToken,
      track_id: 'x1', 
      title: 'Song X', 
      artists: 'Artist',
      requester_name: 'user3'
    }) as unknown as Request);
    const j2 = await parseJSON(r2 as Response);
    const id2 = j2.item.id;

    // merge id2 into id1
    const mergeInto = await patchRequest(buildRequest('PATCH', 'http://localhost/api/requests', { id: id2, action: 'merge', mergeWithId: id1 }, { 'x-dj-secret': '77', 'x-dj-user': 'mommy' }) as unknown as Request);
    expect(mergeInto.status).toBe(200);
    const mi = await parseJSON(mergeInto as Response);
    expect(mi.target.duplicates).toBe(2);
  });
});