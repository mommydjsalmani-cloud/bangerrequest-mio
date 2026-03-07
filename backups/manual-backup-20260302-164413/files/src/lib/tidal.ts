// Tidal API Client con OAuth 2.0
// https://developer.tidal.com/documentation/api/api-overview

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const TIDAL_API_BASE = 'https://api.tidal.com/v1';
const TIDAL_OPENAPI_BASE = 'https://openapi.tidal.com/v2';
const TIDAL_LOGIN_BASE = 'https://login.tidal.com';
const TIDAL_TOKEN_BASE = 'https://auth.tidal.com/v1/oauth2';

// Encryption per token (AES-256-GCM)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY_TIDAL || 'default-key-32-chars-long-12345'; // Deve essere 32 caratteri
const ALGORITHM = 'aes-256-gcm';

/**
 * Genera PKCE code_verifier e code_challenge
 * PKCE è richiesto da Tidal OAuth per motivi di sicurezza
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Genera 32 byte random per il verifier
  const codeVerifier = randomBytes(32).toString('base64url');
  
  // Calcola SHA256 hash del verifier per il challenge
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  
  return { codeVerifier, codeChallenge };
}
export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface TidalTrack {
  id: number | string;
  title: string;
  artists: Array<{
    id: number | string;
    name: string;
    type?: string;
  }>;
  album: {
    id: number | string;
    title: string;
    cover?: string; // UUID es. "ae27bc5e-3dc7-4fa5-b5a4-b5c7ba16c6a2"
  };
  duration: number; // in secondi
  explicit: boolean;
  isrc?: string;
}

export interface TidalSearchResponse {
  tracks: TidalTrack[];
  totalNumberOfItems: number;
}

export interface TidalPlaylist {
  id: string;
  name: string;
  description?: string;
  created: string;
  numberOfTracks: number;
}

export interface TidalTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_id?: string; // estratto da user.userId
  user?: { userId?: number | string; countryCode?: string };
}

/**
 * Genera URL per OAuth authorization con PKCE
 * Uses login.tidal.com endpoint
 * @param redirectUri - Override dinamico del redirect URI (usa l'origin della richiesta corrente)
 */
export function getTidalAuthUrl(state: string, codeChallenge: string, redirectUri?: string): string {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const resolvedRedirectUri = redirectUri || process.env.TIDAL_REDIRECT_URI;

  if (!clientId || !resolvedRedirectUri) {
    throw new Error('Tidal credentials not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: resolvedRedirectUri,
    // Scope compatibili con app standard TIDAL
    scope: 'user.read playlists.read playlists.write search.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TIDAL_LOGIN_BASE}/authorize?${params.toString()}`;
}

/**
 * Scambia authorization code per access token con PKCE
 * @param redirectUri - Deve corrispondere ESATTAMENTE al redirect URI usato in getTidalAuthUrl
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri?: string
): Promise<TidalTokenResponse> {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  const resolvedRedirectUri = redirectUri || process.env.TIDAL_REDIRECT_URI;

  if (!clientId || !clientSecret || !resolvedRedirectUri) {
    throw new Error('Tidal credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: resolvedRedirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${TIDAL_TOKEN_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal token exchange failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  // Tidal restituisce user_id dentro l'oggetto user.userId
  if (!data.user_id && data.user?.userId) {
    data.user_id = String(data.user.userId);
  }
  return data;
}

/**
 * Rinnova access token usando refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TidalTokenResponse> {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Tidal credentials not configured');
  }

  const response = await fetch(`${TIDAL_TOKEN_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal token refresh failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Recupera user_id Tidal corrente dall'access token.
 * Utile quando il token exchange non include user_id esplicitamente.
 */
export async function getTidalCurrentUserId(accessToken: string): Promise<string> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const endpoints = [
    `${TIDAL_API_BASE}/users/me?countryCode=IT`,
    `${TIDAL_API_BASE}/sessions`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tidal-Token': clientId,
          Accept: 'application/json',
        },
      });

      if (!res.ok) continue;

      const payload = await res.json();
      const id = extractUserId(payload);
      if (id) return id;
    } catch {
      // prova endpoint successivo
    }
  }

  throw new Error('Unable to resolve Tidal user id from access token');
}

function extractUserId(payload: unknown): string | null {
  const obj = (payload || {}) as Record<string, unknown>;

  const direct = obj.user_id ?? obj.userId ?? obj.id;
  if (direct !== null && direct !== undefined && String(direct).trim()) {
    return String(direct).trim();
  }

  const user = (obj.user || {}) as Record<string, unknown>;
  const nested = user.userId ?? user.id;
  if (nested !== null && nested !== undefined && String(nested).trim()) {
    return String(nested).trim();
  }

  const data = obj.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const candidate = d.id ?? d.userId;
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  return null;
}

/**
 * Ricerca brani su Tidal (API v1)
 * Nota: L'API v1 richiede scope r_usr per user auth.
 * Se non disponibile, la search potrebbe non funzionare con tutti i client_id.
 */
export async function searchTidal(
  query: string,
  accessToken: string | null,
  limit = 10,
  offset = 0
): Promise<TidalSearchResponse> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) {
    throw new Error('Query must be at least 2 characters');
  }

  if (!accessToken || accessToken.length < 10) {
    throw new Error('Tidal OpenAPI search requires a valid access token');
  }

  const url = `${TIDAL_OPENAPI_BASE}/searchResults/${encodeURIComponent(cleanQuery)}?countryCode=IT&limit=${limit}&offset=${offset}&include=tracks,tracks.artists,tracks.albums`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal OpenAPI search failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  const normalizedItems = mapOpenApiTracks(data);

  return {
    tracks: normalizedItems,
    totalNumberOfItems: Number(data?.meta?.total || data?.totalNumberOfItems || normalizedItems.length || 0),
  };
}

function mapOpenApiTracks(payload: unknown): TidalTrack[] {
  const root = (payload || {}) as Record<string, unknown>;
  const data = Array.isArray(root.data)
    ? (root.data as Array<Record<string, unknown>>)
    : root.data && typeof root.data === 'object'
      ? [root.data as Record<string, unknown>]
      : [];
  const included = Array.isArray(root.included) ? (root.included as Array<Record<string, unknown>>) : [];

  const includedByKey = new Map<string, Record<string, unknown>>();
  for (const item of included) {
    const type = String(item.type || '');
    const id = String(item.id || '');
    if (type && id) {
      includedByKey.set(`${type}:${id}`, item);
    }
  }

  const includedTracks = included.filter((item) => String(item.type || '').toLowerCase().includes('track'));
  const sourceTracks = includedTracks.length > 0
    ? includedTracks
    : data.filter((item) => String(item.type || '').toLowerCase().includes('track'));

  return sourceTracks
    .map((item) => {
      const itemType = String(item.type || 'tracks');
      const itemId = String(item.id || '');
      const fullItem = includedByKey.get(`${itemType}:${itemId}`) || item;

      const attrs = (fullItem.attributes || {}) as Record<string, unknown>;
      const rel = (fullItem.relationships || {}) as Record<string, unknown>;

      const artistRefs = (((rel.artists as Record<string, unknown> | undefined)?.data as Array<Record<string, unknown>> | undefined) || []);
      const artists = artistRefs
        .map((ref) => {
          const type = String(ref.type || 'artists');
          const id = String(ref.id || '');
          const full = includedByKey.get(`${type}:${id}`) || {};
          const fullAttrs = (full.attributes || {}) as Record<string, unknown>;
          return {
            id,
            name: String(fullAttrs.name || fullAttrs.title || ''),
          };
        })
        .filter((artist) => artist.name);

      const albumRefs = (((rel.albums as Record<string, unknown> | undefined)?.data as Array<Record<string, unknown>> | undefined) || []);
      const albumRef = albumRefs[0];
      const albumType = String(albumRef?.type || 'albums');
      const albumId = String(albumRef?.id || '');
      const albumFull = includedByKey.get(`${albumType}:${albumId}`) || {};
      const albumAttrs = (albumFull.attributes || {}) as Record<string, unknown>;

      const coverUrl =
        pickCoverUrl(attrs) ||
        pickCoverUrl(albumAttrs) ||
        String(albumAttrs.cover || attrs.cover || '');

      const mappedTrackId = pickBestTrackId(fullItem, attrs);

      const durationSeconds = attrs.durationMs
        ? Math.floor(Number(attrs.durationMs) / 1000)
        : Number(attrs.duration || attrs.durationSeconds || 0);

      return {
        id: mappedTrackId,
        title: String(attrs.title || attrs.name || ''),
        artists,
        album: {
          id: String(albumFull.id || albumId || ''),
          title: String(albumAttrs.title || ''),
          cover: normalizeTidalCoverUrl(coverUrl) || undefined,
        },
        duration: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        explicit: Boolean(attrs.explicit || attrs.explicitLyrics),
        isrc: attrs.isrc ? String(attrs.isrc) : undefined,
      } as TidalTrack;
    })
    .filter((track) => track.id && track.title);
}

function pickCoverUrl(attrs: Record<string, unknown>): string {
  const imageLinks = Array.isArray(attrs.imageLinks) ? attrs.imageLinks : [];
  for (const raw of imageLinks) {
    if (typeof raw === 'string' && raw.trim()) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const href = obj.href;
      const url = obj.url;
      if (typeof href === 'string' && href.trim()) return href;
      if (typeof url === 'string' && url.trim()) return url;
    }
  }

  const recursive = findImageUrlRecursive(attrs, 0);
  if (recursive) return recursive;

  const directCandidates = [
    attrs.cover,
    attrs.coverUrl,
    attrs.image,
    attrs.imageUrl,
    attrs.imageCover,
    attrs.albumCover,
    attrs.albumCoverUrl,
    attrs.artworkUrl,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return '';
}

function findImageUrlRecursive(value: unknown, depth: number): string {
  if (depth > 3 || value === null || value === undefined) return '';

  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('//') || v.startsWith('/')) {
      const lower = v.toLowerCase();
      if (lower.includes('image') || lower.includes('cover') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
        return v;
      }
    }
    return '';
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrlRecursive(item, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [key, val] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (typeof val === 'string' && (keyLower.includes('image') || keyLower.includes('cover') || keyLower.includes('art'))) {
        const direct = findImageUrlRecursive(val, depth + 1);
        if (direct) return direct;
      }
      const found = findImageUrlRecursive(val, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

function normalizeTidalCoverUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = String(raw).trim();
  if (!value) return null;

  if (value.startsWith('//')) {
    value = `https:${value}`;
  }

  if (value.startsWith('http://')) {
    value = `https://${value.slice('http://'.length)}`;
  }

  if (value.startsWith('/')) {
    value = `https://resources.tidal.com${value}`;
  }

  value = value
    .replace(/\{width\}/gi, '320')
    .replace(/\{height\}/gi, '320')
    .replace(/\{w\}/gi, '320')
    .replace(/\{h\}/gi, '320');

  if (value.startsWith('https://') || value.startsWith('http://')) {
    return value;
  }

  if (/^[a-f0-9\-]{32,}$/i.test(value)) {
    return `https://resources.tidal.com/images/${value.replace(/-/g, '/')}/320x320.jpg`;
  }

  return null;
}

function pickBestTrackId(item: Record<string, unknown>, attrs: Record<string, unknown>): string {
  const candidates = [
    item.id,
    attrs.id,
    attrs.trackId,
    attrs.tidalId,
    attrs.audioResourceId,
    attrs.artifactId,
    attrs.legacyId,
  ]
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v));

  for (const candidate of candidates) {
    const normalized = normalizeTidalTrackIdForPlaylist(candidate);
    if (normalized) return normalized;
  }

  return String(item.id || attrs.id || '');
}

export function normalizeTidalTrackIdForPlaylist(trackId: string | number | null | undefined): string | null {
  if (trackId === null || trackId === undefined) return null;
  const raw = String(trackId).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return raw;

  const browseMatch = raw.match(/track\/(\d+)/i);
  if (browseMatch?.[1]) return browseMatch[1];

  const anyDigits = raw.match(/(\d{4,})/);
  if (anyDigits?.[1]) return anyDigits[1];

  return null;
}

/**
 * Crea playlist su Tidal (API v1)
 */
export async function createTidalPlaylist(
  name: string,
  accessToken: string,
  userId: string,
  description?: string
): Promise<TidalPlaylist> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const url = `${TIDAL_API_BASE}/users/${userId}/playlists`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Tidal-Token': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: name,
      description: description || `Richieste musicali - ${name}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    // Fallback OpenAPI v2
    const fallback = await tryCreatePlaylistOpenApi(name, accessToken, description);
    if (fallback) return fallback;
    throw new Error(`Tidal playlist creation failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  // v1 risponde con { uuid, title, numberOfTracks, ... }
  return {
    id: data.uuid || data.id || '',
    name: data.title || data.name || name,
    description: data.description,
    created: data.created || new Date().toISOString(),
    numberOfTracks: data.numberOfTracks || 0,
  };
}

/**
 * Aggiunge brano a playlist Tidal (API v1)
 */
export async function addTrackToTidalPlaylist(
  playlistId: string,
  trackId: string,
  accessToken: string
): Promise<void> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const normalizedTrackId = normalizeTidalTrackIdForPlaylist(trackId);
  if (normalizedTrackId) {
    // v1: prima ottieni l'etag della playlist (richiesto per modificarla)
    const playlistRes = await fetch(`${TIDAL_API_BASE}/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Tidal-Token': clientId,
      },
    });
    const etag = playlistRes.headers.get('ETag') || '';

    const url = `${TIDAL_API_BASE}/playlists/${playlistId}/tracks`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Tidal-Token': clientId,
        'Content-Type': 'application/json',
        ...(etag ? { 'If-None-Match': etag } : {}),
      },
      body: JSON.stringify({
        trackIds: [Number(normalizedTrackId)],
        toIndex: -1,
        onDuplicates: 'SKIP',
      }),
    });

    if (response.ok) return;

    const error = await response.text();
    // fallback openapi con ID raw se disponibile
    const openApiOk = await tryAddTrackOpenApi(playlistId, trackId, accessToken);
    if (openApiOk) return;
    throw new Error(`Tidal add track failed: ${response.status} ${error}`);
  }

  // Se non abbiamo ID numerico v1, prova direttamente OpenAPI
  const openApiOk = await tryAddTrackOpenApi(playlistId, trackId, accessToken);
  if (!openApiOk) {
    throw new Error(`Tidal add track failed: invalid/non supported track id '${trackId}'`);
  }
}

/**
 * Verifica se playlist esiste (API v1)
 */
export async function getTidalPlaylist(
  playlistId: string,
  accessToken: string
): Promise<TidalPlaylist | null> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const url = `${TIDAL_API_BASE}/playlists/${playlistId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Tidal-Token': clientId,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    // prova fallback OpenAPI
    const openApi = await tryGetPlaylistOpenApi(playlistId, accessToken);
    return openApi;
  }

  if (!response.ok) {
    const error = await response.text();
    const openApi = await tryGetPlaylistOpenApi(playlistId, accessToken);
    if (openApi) return openApi;
    throw new Error(`Tidal get playlist failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return {
    id: data.uuid || data.id || playlistId,
    name: data.title || data.name || '',
    description: data.description,
    created: data.created || '',
    numberOfTracks: data.numberOfTracks || 0,
  };
}

async function tryCreatePlaylistOpenApi(name: string, accessToken: string, description?: string): Promise<TidalPlaylist | null> {
  const url = `${TIDAL_OPENAPI_BASE}/playlists`;
  const variants = [
    {
      data: {
        type: 'playlists',
        attributes: {
          title: name,
          description: description || `Richieste musicali - ${name}`,
        },
      },
    },
    {
      data: {
        type: 'playlists',
        attributes: {
          name,
          description: description || `Richieste musicali - ${name}`,
        },
      },
    },
  ];

  for (const body of variants) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) continue;
    const payload = await res.json();
    const data = (payload?.data || {}) as Record<string, unknown>;
    const attrs = (data.attributes || {}) as Record<string, unknown>;
    const id = String(data.id || '');
    if (!id) continue;

    return {
      id,
      name: String(attrs.title || attrs.name || name),
      description: String(attrs.description || ''),
      created: String(attrs.createdAt || attrs.created || new Date().toISOString()),
      numberOfTracks: Number(attrs.numberOfTracks || attrs.trackCount || 0),
    };
  }

  return null;
}

async function tryAddTrackOpenApi(playlistId: string, trackId: string, accessToken: string): Promise<boolean> {
  const candidates = [
    `${TIDAL_OPENAPI_BASE}/playlists/${playlistId}/relationships/tracks`,
    `${TIDAL_OPENAPI_BASE}/playlists/${playlistId}/relationships/items`,
  ];
  const payloads = [
    { data: [{ type: 'tracks', id: String(trackId) }] },
    { data: [{ type: 'track', id: String(trackId) }] },
  ];
  const methods: Array<'POST' | 'PATCH'> = ['POST', 'PATCH'];

  for (const url of candidates) {
    for (const method of methods) {
      for (const payload of payloads) {
        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) return true;
      }
    }
  }

  return false;
}

async function tryGetPlaylistOpenApi(playlistId: string, accessToken: string): Promise<TidalPlaylist | null> {
  const url = `${TIDAL_OPENAPI_BASE}/playlists/${playlistId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!res.ok) return null;

  const payload = await res.json();
  const data = (payload?.data || {}) as Record<string, unknown>;
  const attrs = (data.attributes || {}) as Record<string, unknown>;
  const id = String(data.id || playlistId);

  return {
    id,
    name: String(attrs.title || attrs.name || ''),
    description: String(attrs.description || ''),
    created: String(attrs.createdAt || attrs.created || ''),
    numberOfTracks: Number(attrs.numberOfTracks || 0),
  };
}

/**
 * Normalizza TidalTrack nel formato interno dell'app
 */
export function normalizeTidalTrack(track: TidalTrack) {
  // v1 API: album.cover è spesso UUID; OpenAPI può già restituire URL assoluto
  const safeTrack = (track || {}) as Partial<TidalTrack> & { album?: { title?: string; cover?: string } };
  const cover = normalizeTidalCoverUrl(safeTrack.album?.cover);
  const artists = Array.isArray(safeTrack.artists)
    ? safeTrack.artists.map(a => a?.name).filter(Boolean).join(', ')
    : '';

  return {
    id: String(safeTrack.id || ''),
    uri: null,
    title: safeTrack.title || 'Titolo sconosciuto',
    artists,
    album: safeTrack.album?.title || '',
    cover_url: cover,
    duration_ms: Math.max(0, Number(safeTrack.duration || 0) * 1000),
    explicit: Boolean(safeTrack.explicit),
    preview_url: null,
    isrc: safeTrack.isrc || null,
    popularity: 0,
    external_urls: { tidal: `https://tidal.com/browse/track/${safeTrack.id || ''}` },
  };
}
