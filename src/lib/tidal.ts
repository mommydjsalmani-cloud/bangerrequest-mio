// Tidal API Client con OAuth 2.0
// https://developer.tidal.com/documentation/api/api-overview

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const TIDAL_API_BASE = 'https://api.tidal.com/v1';
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
 */
export function getTidalAuthUrl(state: string, codeChallenge: string): string {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const redirectUri = process.env.TIDAL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Tidal credentials not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user.read playlists.read playlists.write',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TIDAL_LOGIN_BASE}/authorize?${params.toString()}`;
}

/**
 * Scambia authorization code per access token con PKCE
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<TidalTokenResponse> {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  const redirectUri = process.env.TIDAL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Tidal credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
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
 * Ricerca brani su Tidal (API v1)
 */
export async function searchTidal(
  query: string,
  accessToken: string,
  limit = 10,
  offset = 0
): Promise<TidalSearchResponse> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const url = `${TIDAL_API_BASE}/search/tracks?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&countryCode=IT`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Tidal-Token': clientId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal search failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  // v1 API: { limit, offset, totalNumberOfItems, items: [...] }
  return {
    tracks: data.items || data.tracks || [],
    totalNumberOfItems: data.totalNumberOfItems || 0,
  };
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
      trackIds: [Number(trackId)],
      toIndex: -1,
      onDuplicates: 'SKIP',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal add track failed: ${response.status} ${error}`);
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
    return null; // Playlist non esiste (eliminata dall'utente)
  }

  if (!response.ok) {
    const error = await response.text();
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

/**
 * Normalizza TidalTrack nel formato interno dell'app
 */
export function normalizeTidalTrack(track: TidalTrack) {
  // v1 API: album.cover è un UUID es. "ae27bc5e-3dc7-4fa5-b5a4-b5c7ba16c6a2"
  // URL immagine: https://resources.tidal.com/images/{uuid-con-slash}/320x320.jpg
  const coverUuid = track.album.cover;
  const cover = coverUuid
    ? `https://resources.tidal.com/images/${coverUuid.replace(/-/g, '/')}/320x320.jpg`
    : null;
  const artists = track.artists.map(a => a.name).join(', ');

  return {
    id: String(track.id),
    uri: null,
    title: track.title,
    artists,
    album: track.album.title,
    cover_url: cover,
    duration_ms: track.duration * 1000,
    explicit: track.explicit,
    preview_url: null,
    isrc: track.isrc || null,
    popularity: 0,
    external_urls: { tidal: `https://tidal.com/browse/track/${track.id}` },
  };
}
