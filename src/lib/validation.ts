// Validazione e sanitizzazione centralizzata per prevenire injection e abuse

// Limiti di sicurezza
export const LIMITS = {
  TITLE_MAX: 200,
  ARTIST_MAX: 200,
  ALBUM_MAX: 200,
  NOTE_MAX: 500,
  NAME_MAX: 100,
  TOKEN_MAX: 100,
  SESSION_NAME_MAX: 100,
  URL_MAX: 2048,
  ID_MAX: 100,
} as const;

// Espressioni regolari di validazione
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_REGEX = /^[a-zA-Z0-9_-]{8,100}$/;
const ALPHANUMERIC_SAFE = /^[a-zA-Z0-9\s\-_.,!?():'"À-ÿ]+$/;

/**
 * Sanitizza una stringa rimuovendo caratteri pericolosi
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  
  // Rimuovi null bytes e caratteri di controllo pericolosi
  let cleaned = input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  
  // Limita lunghezza
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * Valida un UUID
 */
export function validateUUID(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  return UUID_REGEX.test(input);
}

/**
 * Valida un token di sessione
 */
export function validateToken(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  return TOKEN_REGEX.test(input);
}

/**
 * Valida e sanitizza un titolo di brano
 */
export function validateTitle(input: unknown): string | null {
  const sanitized = sanitizeString(input, LIMITS.TITLE_MAX);
  if (sanitized.length === 0 || sanitized.length > LIMITS.TITLE_MAX) {
    return null;
  }
  return sanitized;
}

/**
 * Valida e sanitizza nome artista
 */
export function validateArtist(input: unknown): string | null {
  const sanitized = sanitizeString(input, LIMITS.ARTIST_MAX);
  if (sanitized.length === 0 || sanitized.length > LIMITS.ARTIST_MAX) {
    return null;
  }
  return sanitized;
}

/**
 * Valida e sanitizza note/commenti
 */
export function validateNote(input: unknown): string {
  return sanitizeString(input, LIMITS.NOTE_MAX);
}

/**
 * Valida e sanitizza nome utente
 */
export function validateName(input: unknown): string {
  return sanitizeString(input, LIMITS.NAME_MAX);
}

/**
 * Valida un URL
 */
export function validateUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  
  try {
    const url = new URL(input);
    // Permetti solo http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    // Limita lunghezza
    if (input.length > LIMITS.URL_MAX) {
      return null;
    }
    return input;
  } catch {
    return null;
  }
}

/**
 * Valida numero intero positivo
 */
export function validatePositiveInt(input: unknown, max: number = Number.MAX_SAFE_INTEGER): number | null {
  if (typeof input !== 'number') {
    const parsed = Number(input);
    if (Number.isNaN(parsed)) return null;
    input = parsed;
  }
  
  if (!Number.isInteger(input as number) || (input as number) < 0 || (input as number) > max) {
    return null;
  }
  
  return input as number;
}

/**
 * Valida boolean
 */
export function validateBoolean(input: unknown): boolean {
  return input === true || input === 'true';
}

/**
 * Valida una action DJ
 */
export function validateDjAction(input: unknown): 'accept' | 'reject' | 'mute' | 'merge' | 'cancel' | null {
  const validActions = ['accept', 'reject', 'mute', 'merge', 'cancel'] as const;
  if (typeof input === 'string' && validActions.includes(input as any)) {
    return input as typeof validActions[number];
  }
  return null;
}

/**
 * Valida una action admin
 */
export function validateAdminAction(input: unknown): 'toggle_status' | 'reset_requests' | 'create_session' | 'regenerate_token' | 'delete_session' | null {
  const validActions = ['toggle_status', 'reset_requests', 'create_session', 'regenerate_token', 'delete_session'] as const;
  if (typeof input === 'string' && validActions.includes(input as any)) {
    return input as typeof validActions[number];
  }
  return null;
}

/**
 * Valida status di richiesta
 */
export function validateStatus(input: unknown): 'new' | 'accepted' | 'rejected' | 'cancelled' | null {
  const validStatuses = ['new', 'accepted', 'rejected', 'cancelled'] as const;
  if (typeof input === 'string' && validStatuses.includes(input as any)) {
    return input as typeof validStatuses[number];
  }
  return null;
}

/**
 * Escape HTML per prevenire XSS (già esiste in telegram.ts ma centralizziamo)
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valida payload richiesta musicale
 */
export interface ValidatedMusicRequest {
  session_token: string;
  title: string;
  artists: string;
  requester_name?: string;
  track_id?: string;
  uri?: string;
  album?: string;
  cover_url?: string;
  isrc?: string;
  explicit?: boolean;
  preview_url?: string;
  duration_ms?: number;
  note?: string;
  event_code?: string;
  source?: string;
}

export function validateMusicRequest(body: unknown): { valid: false; error: string } | { valid: true; data: ValidatedMusicRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'invalid_payload' };
  }

  const obj = body as Record<string, unknown>;

  // Valida campi obbligatori
  if (!validateToken(obj.session_token)) {
    return { valid: false, error: 'invalid_session_token' };
  }

  const title = validateTitle(obj.title);
  if (!title) {
    return { valid: false, error: 'invalid_title' };
  }

  const artists = validateArtist(obj.artists);
  if (!artists) {
    return { valid: false, error: 'invalid_artists' };
  }

  // Costruisci oggetto validato
  const validated: ValidatedMusicRequest = {
    session_token: obj.session_token as string,
    title,
    artists,
    requester_name: validateName(obj.requester_name),
  };

  // Campi opzionali
  if (obj.track_id) validated.track_id = sanitizeString(obj.track_id, LIMITS.ID_MAX);
  if (obj.uri) validated.uri = sanitizeString(obj.uri, LIMITS.URL_MAX);
  if (obj.album) validated.album = sanitizeString(obj.album, LIMITS.ALBUM_MAX);
  if (obj.cover_url) {
    const url = validateUrl(obj.cover_url);
    if (url) validated.cover_url = url;
  }
  if (obj.isrc) validated.isrc = sanitizeString(obj.isrc, 50);
  if (obj.preview_url) {
    const url = validateUrl(obj.preview_url);
    if (url) validated.preview_url = url;
  }
  if (obj.note) validated.note = validateNote(obj.note);
  if (obj.event_code) validated.event_code = sanitizeString(obj.event_code, 50);
  if (obj.source) validated.source = sanitizeString(obj.source, 50);
  
  validated.explicit = validateBoolean(obj.explicit);
  
  const duration = validatePositiveInt(obj.duration_ms, 3600000); // max 1 ora
  if (duration !== null) validated.duration_ms = duration;

  return { valid: true, data: validated };
}

export default {
  sanitizeString,
  validateUUID,
  validateToken,
  validateTitle,
  validateArtist,
  validateNote,
  validateName,
  validateUrl,
  validatePositiveInt,
  validateBoolean,
  validateDjAction,
  validateAdminAction,
  validateStatus,
  escapeHtml,
  validateMusicRequest,
  LIMITS,
};
