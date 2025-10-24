// Thin wrapper per la logica di moderazione usata dal pannello DJ
import config from './config';

const DJ_USER = process.env.DJ_PANEL_USER || '';
const DJ_SECRET = process.env.DJ_PANEL_SECRET || '';

async function serverPatch(body: Record<string, unknown>) {
  // Usa baseUrl configurato per chiamare l'API interna in modo coerente (può essere localhost o produzione)
  const base = config.app.baseUrl.replace(/\/$/, '');
  const url = `${base}/api/requests`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-dj-user': DJ_USER,
        'x-dj-secret': DJ_SECRET,
      },
      body: JSON.stringify(body)
    });
    if (!res) throw new Error('no-response');
    if (res.status >= 400) {
      const txt = await res.text().catch(() => '');
      throw new Error(`moderation failed: ${res.status} ${txt}`);
    }
    return await res.json().catch(() => ({}));
  } catch (e) {
    // Propaga l'errore verso il chiamante che gestirà la risposta
    throw e;
  }
}

export async function acceptRequest(requestId: string) {
  return serverPatch({ id: requestId, action: 'accept' });
}

export async function rejectRequest(requestId: string) {
  return serverPatch({ id: requestId, action: 'reject' });
}

const moderation = { acceptRequest, rejectRequest };
export default moderation;
