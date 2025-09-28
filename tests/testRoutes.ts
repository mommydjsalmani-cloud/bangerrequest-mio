// Helper per costruire Request facilmente
export function buildRequest(method: string, url: string, body?: any, headers?: Record<string,string>) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers||{}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function parseJSON(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}
