// Tidal API Client con OAuth 2.0
// https://developer.tidal.com/documentation/api/api-overview

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const TIDAL_API_BASE = 'https://openapi.tidal.com/v2';
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
  id: string;
  title: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    title: string;
    imageCover?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
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
  user_id?: string;
}

/**
 * Genera URL per OAuth authorization
 * Uses login.tidal.com endpoint (corrected from auth.tidal.com)
 * @param state CSRF state token
 */
export function getTidalAuthUrl(state: string): string {
  /**
   * Genera URL per OAuth authorization
   * Uses login.tidal.com endpoint (corrected from auth.tidal.com)
   * @param state CSRF state token
   * @param codeChallenge Code challenge per PKCE (SHA256 hash del verifier)
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
  });

    params.append('code_challenge_method', 'S256');

  return `${TIDAL_LOGIN_BASE}/authorize?${params.toString()}`;
}

/**
 * Scambia authorization code per access token
 * @param code Authorization code da Tidal
 */
export async function exchangeCodeForToken(code: string): Promise<TidalTokenResponse> {
  /**
   * Scambia authorization code per access token
   * @param code Authorization code da Tidal
   * @param codeVerifier Code verifier per PKCE (generato originariamente come verifier)
   */
  export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TidalTokenResponse> {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  const redirectUri = process.env.TIDAL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Tidal credentials not configured');
  }

  // Log dei parametri per debug
  console.log('Tidal token exchange:', {
    endpoint: `${TIDAL_TOKEN_BASE}/token`,
    clientId: clientId.substring(0, 5) + '...',
    redirectUri: redirectUri,
    code: code.substring(0, 10) + '...',
  });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
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
    console.error('Tidal token exchange error:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
      redirectUri: redirectUri,
    });
    throw new Error(`Tidal token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
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
 * Ricerca brani su Tidal
 */
export async function searchTidal(
  query: string,
  accessToken: string,
  limit = 10,
  offset = 0
): Promise<TidalSearchResponse> {
  const url = `${TIDAL_API_BASE}/search/tracks?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&countryCode=IT`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal search failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return {
    tracks: data.tracks || [],
    totalNumberOfItems: data.totalNumberOfItems || 0,
  };
}

/**
 * Crea playlist su Tidal
 */
export async function createTidalPlaylist(
  name: string,
  accessToken: string,
  userId: string,
  description?: string
): Promise<TidalPlaylist> {
  const url = `${TIDAL_API_BASE}/users/${userId}/playlists`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: description || `Richieste musicali - ${name}`,
      public: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal playlist creation failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Aggiunge brano a playlist Tidal
 */
export async function addTrackToTidalPlaylist(
  playlistId: string,
  trackId: string,
  accessToken: string
): Promise<void> {
  const url = `${TIDAL_API_BASE}/playlists/${playlistId}/items`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trackIds: [trackId],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tidal add track failed: ${response.status} ${error}`);
  }
}

/**
 * Verifica se playlist esiste
 */
export async function getTidalPlaylist(
  playlistId: string,
  accessToken: string
): Promise<TidalPlaylist | null> {
  const url = `${TIDAL_API_BASE}/playlists/${playlistId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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

  return response.json();
}

/**
 * Normalizza TidalTrack nel formato interno dell'app
 */
export function normalizeTidalTrack(track: TidalTrack) {
  const cover = track.album.imageCover?.[0]?.url || null;
  const artists = track.artists.map(a => a.name).join(', ');

  return {
    id: track.id,
    uri: null, // Tidal non usa URI stile Spotify
    title: track.title,
    artists,
    album: track.album.title,
    cover_url: cover,
    duration_ms: track.duration * 1000,
    explicit: track.explicit,
    preview_url: null, // Tidal non fornisce preview pubbliche
    isrc: track.isrc || null,
    popularity: 0,
    external_urls: { tidal: `https://tidal.com/browse/track/${track.id}` },
  };
}
