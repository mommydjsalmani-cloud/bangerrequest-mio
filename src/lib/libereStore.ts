// Store e utilities per Richieste Libere

export type LibereSession = {
  id: string;
  token: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'paused';
  name: string;
  reset_count: number;
  last_reset_at?: string;
  archived: boolean;
  rate_limit_enabled?: boolean;
  rate_limit_seconds?: number;
  notes_enabled?: boolean;
  homepage_visible?: boolean;
  homepage_priority?: string;
  require_event_code?: boolean;
  current_event_code?: string;
};

export type LibereRequest = {
  id: string;
  session_id: string;
  created_at: string;
  track_id?: string;
  uri?: string;
  title: string;
  artists?: string;
  album?: string;
  cover_url?: string;
  isrc?: string;
  explicit?: boolean;
  preview_url?: string;
  duration_ms?: number;
  requester_name?: string;
  client_ip: string;
  user_agent?: string;
  source: 'spotify' | 'manual';
  status: 'new' | 'accepted' | 'rejected' | 'cancelled' | 'archived';
  note?: string;
  archived: boolean;
  event_code?: string;
  event_code_upper?: string;
  accepted_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  archived_at?: string;
};

export type LibereStats = {
  total: number;
  lastHour: number;
  topRequests: Array<{
    title: string;
    artists?: string;
    count: number;
  }>;
};

// Utilities per formatting
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDuration(durationMs?: number): string {
  if (!durationMs) return '--:--';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Validazione token
export function isValidToken(token: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(token) && token.length >= 8 && token.length <= 64;
}

// Rate limiting client-side check
export function canMakeRequest(lastRequestTime?: number, intervalSeconds: number = 60): { allowed: boolean; remainingSeconds?: number } {
  if (!lastRequestTime) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const timeDiff = now - lastRequestTime;
  const minInterval = intervalSeconds * 1000; // converti in millisecondi
  
  if (timeDiff < minInterval) {
    const remainingMs = minInterval - timeDiff;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return { allowed: false, remainingSeconds };
  }
  
  return { allowed: true };
}

// Pulizia testo input
export function sanitizeInput(text: string): string {
  return text.trim().replace(/\s+/g, ' ').substring(0, 200);
}

// Generazione QR code URL con API esterna
export function generateQRCodeUrl(url: string): string {
  // API gratuita qrserver.com - dimensione 500x500 per migliore qualità
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
}

// Generazione link pubblico
export function generatePublicUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/richieste?s=${token}`;
}

// Status mapping per UI
export const STATUS_LABELS = {
  'new': 'Nuova',
  'accepted': 'Accettata',
  'rejected': 'Rifiutata',
  'cancelled': 'Cancellata',
  'archived': 'Archiviata'
} as const;

export const STATUS_COLORS = {
  'new': 'bg-blue-100 text-blue-800',
  'accepted': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
  'cancelled': 'bg-orange-100 text-orange-800',
  'archived': 'bg-gray-100 text-gray-800'
} as const;

// Session status per UI
export const SESSION_STATUS_LABELS = {
  'active': 'Attive',
  'paused': 'In pausa'
} as const;

export const SESSION_STATUS_COLORS = {
  'active': 'bg-green-100 text-green-800',
  'paused': 'bg-yellow-100 text-yellow-800'
} as const;