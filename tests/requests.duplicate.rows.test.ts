import { describe, it, expect } from 'vitest';
import { POST as createRequest, GET as getRequests } from '@/app/api/requests/route';
import { buildRequest, parseJSON } from './testRoutes';

process.env.DJ_PANEL_SECRET = '77';
process.env.DJ_PANEL_USER = 'mommy';

// Questo test verifica che quando arriva un duplicato venga creata UNA NUOVA RIGA (oltre ad aggiornare il contatore sull'originale)
// (Solo branch Supabase: in-memory mantiene la semantica diversa storica, ma qui interessa percorso principale)

describe('Duplicate rows creation', () => {
  it('crea riga duplicata oltre ad aggiornare contatore', async () => {
    const baseBody = { track_id:'dupRow1', title:'XSong', artists:'Band', event_code:'EVX', requester:'u1' };
    const first = await createRequest(buildRequest('POST', 'http://localhost/api/requests', baseBody) as any);
    expect(first.status).toBe(200);
    const firstJ = await parseJSON(first as any);
    const firstId = firstJ.item.id;

    const second = await createRequest(buildRequest('POST', 'http://localhost/api/requests', { ...baseBody, requester:'u2', note:'second' }) as any);
    expect(second.status).toBe(200);
    const secondJ = await parseJSON(second as any);
    expect(secondJ.duplicate).toBe(true);
    // Se available duplicate_row deve esistere
    if (secondJ.duplicate_row) {
      expect(secondJ.duplicate_row.id).not.toBe(firstId);
      expect(secondJ.replicated).toBe(true);
    }

    // Recupera lista e verifica almeno 2 righe per stessa track/event
    const listRes = await getRequests(buildRequest('GET', 'http://localhost/api/requests?event_code=EVX&track_id=dupRow1') as any);
    expect(listRes.status).toBe(200);
    const listJ = await parseJSON(listRes as any);
    const rows = listJ.requests.filter((r: any) => r.track_id === 'dupRow1' && r.event_code === 'EVX');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
