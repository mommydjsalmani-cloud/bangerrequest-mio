import { describe, it, expect } from 'vitest';
import { POST as createRequest, GET as getRequests } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

// Verifica che due richieste identiche (stesso event_code e track_id) compaiano come due righe distinte
// nella risposta flat (senza grouping) filtrando solo per event_code.

describe('Flat list duplicates visibility', () => {
  it('mostra entrambe le righe duplicata e originale con solo filtro event_code', async () => {
    const body = { track_id:'FLATDUP1', title:'Flat Song', artists:'Flat Band', event_code:'FLATEVT', requester:'alpha' };
    const first = await createRequest(buildRequest('POST', 'http://localhost/api/requests', body) as any);
    expect(first.status).toBe(200);
    const firstJ = await parseJSON(first as any);
    expect(firstJ.ok).toBe(true);

    const second = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { ...body, requester:'beta', note:'second flat' }) as any);
    expect(second.status).toBe(200);
    const secondJ = await parseJSON(second as any);
    expect(secondJ.ok).toBe(true);
    expect(secondJ.duplicate).toBe(true); // deve essere marcato duplicato lato server

    // Adesso prendiamo la lista SOLO filtrando per event_code (senza track_id) e contiamo quante righe con stesso track.
    const listRes = await getRequests(buildRequest('GET', 'http://localhost/api/requests?event_code=FLATEVT') as any);
    expect(listRes.status).toBe(200);
    const listJ = await parseJSON(listRes as any);
    const matches = listJ.requests.filter((r: any) => r.track_id === 'FLATDUP1');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
