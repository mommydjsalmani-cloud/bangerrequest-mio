export type EventStatus = 'active' | 'paused' | 'closed';

export type EventItem = {
  id: string;
  code: string;
  name: string;
  created_at: string;
  // status gestisce stato logico; active legacy per retrocompatibilità
  status: EventStatus;
  active?: boolean; // mantenuto per vecchie chiamate: true se status==='active'
};

// In-memory store (fallback quando Supabase non è configurato)
export const eventsStore: EventItem[] = [];

export function genCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
