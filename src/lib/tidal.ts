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
  popularity?: number;
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

  const requestedLimit = Math.max(1, Math.min(limit, 50));
  const fetchLimit = Math.max(requestedLimit * 4, 30);
  const url = `${TIDAL_OPENAPI_BASE}/searchResults/${encodeURIComponent(cleanQuery)}?countryCode=IT&limit=${Math.min(fetchLimit, 100)}&offset=${offset}&include=tracks,tracks.artists,tracks.albums`;

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
  const normalizedItems = await enrichMissingCovers(mapOpenApiTracks(data), accessToken);
  const rankedItems = rankTracksByRelevanceAndPopularity(cleanQuery, normalizedItems);

  return {
    tracks: rankedItems.slice(0, requestedLimit),
    totalNumberOfItems: Number(data?.meta?.total || data?.totalNumberOfItems || rankedItems.length || 0),
  };
}

function rankTracksByRelevanceAndPopularity(query: string, tracks: TidalTrack[]): TidalTrack[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = tracks.map((track, index) => {
    const title = String(track.title || '').toLowerCase();
    const artistsText = Array.isArray(track.artists)
      ? track.artists.map((a) => String(a?.name || '')).join(' ').toLowerCase()
      : '';
    const haystack = `${title} ${artistsText}`.trim();

    let score = 0;
    if (title.startsWith(q)) score += 140;
    else if (title.includes(q)) score += 100;
    if (artistsText.includes(q)) score += 60;

    if (terms.length > 1) {
      const matched = terms.filter((term) => haystack.includes(term)).length;
      score += matched * 18;
      if (matched === terms.length) score += 30;
    }

    const popularityRaw = Number(track.popularity || 0);
    const popularity = Number.isFinite(popularityRaw)
      ? (popularityRaw <= 1 ? popularityRaw * 100 : popularityRaw)
      : 0;
    score += popularity * 1.4;

    return { track, index, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const bp = Number(b.track.popularity || 0);
    const ap = Number(a.track.popularity || 0);
    if (bp !== ap) return bp - ap;
    return a.index - b.index;
  });

  return scored.map((entry) => entry.track);
}

async function fetchTrackCoverFromOpenApi(trackId: string, accessToken: string): Promise<string | null> {
  if (!trackId) return null;

  const url = `${TIDAL_OPENAPI_BASE}/tracks/${encodeURIComponent(trackId)}?countryCode=IT&include=albums,albums.coverArt,albums.suggestedCoverArts`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!res.ok) return null;

  const payload = await res.json();
  const included = Array.isArray((payload as Record<string, unknown>)?.included)
    ? ((payload as Record<string, unknown>).included as Array<Record<string, unknown>>)
    : [];
  if (included.length === 0) return null;

  const preferredArtworkIds = new Set<string>();
  for (const item of included) {
    if (String(item.type || '') !== 'albums') continue;
    const rel = (item.relationships || {}) as Record<string, unknown>;
    const coverRelData = ((rel.coverArt as Record<string, unknown> | undefined)?.data || null) as Record<string, unknown> | null;
    const coverId = String(coverRelData?.id || '').trim();
    if (coverId) preferredArtworkIds.add(coverId);

    const suggested = ((rel.suggestedCoverArts as Record<string, unknown> | undefined)?.data || null) as
      | Array<Record<string, unknown>>
      | Record<string, unknown>
      | null;
    if (Array.isArray(suggested)) {
      for (const entry of suggested) {
        const id = String(entry?.id || '').trim();
        if (id) preferredArtworkIds.add(id);
      }
    } else if (suggested && typeof suggested === 'object') {
      const id = String((suggested as Record<string, unknown>)?.id || '').trim();
      if (id) preferredArtworkIds.add(id);
    }
  }

  const artworks = included.filter((item) => String(item.type || '') === 'artworks');
  const orderedArtworks = [
    ...artworks.filter((a) => preferredArtworkIds.has(String(a.id || ''))),
    ...artworks.filter((a) => !preferredArtworkIds.has(String(a.id || ''))),
  ];

  for (const artwork of orderedArtworks) {
    const attrs = ((artwork || {}).attributes || {}) as Record<string, unknown>;
    const files = Array.isArray(attrs.files) ? (attrs.files as Array<Record<string, unknown>>) : [];
    if (files.length === 0) continue;

    const sorted = [...files].sort((a, b) => {
      const aw = Number((a.meta as Record<string, unknown> | undefined)?.width || 0);
      const bw = Number((b.meta as Record<string, unknown> | undefined)?.width || 0);
      if (aw >= 320 && bw >= 320) return aw - bw;
      if (aw >= 320) return -1;
      if (bw >= 320) return 1;
      return bw - aw;
    });

    const href = String(sorted[0]?.href || '').trim();
    const normalized = normalizeTidalCoverUrl(href);
    if (normalized) return normalized;
  }

  return null;
}

async function enrichMissingCovers(tracks: TidalTrack[], accessToken: string): Promise<TidalTrack[]> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';

  const enriched = await Promise.all(tracks.map(async (track) => {
    if (track?.album?.cover) return track;

    const albumId = String(track?.album?.id || '').trim();
    const trackId = String(track?.id || '').trim();

    try {
      if (albumId) {
        const openApiUrl = `${TIDAL_OPENAPI_BASE}/albums/${encodeURIComponent(albumId)}?countryCode=IT&include=coverArt,suggestedCoverArts`;
        const openApiRes = await fetch(openApiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.api+json',
          },
        });

        if (openApiRes.ok) {
          const openApiPayload = await openApiRes.json();
          const openApiData = (openApiPayload?.data || {}) as Record<string, unknown>;
          const openApiAttrs = (openApiData.attributes || {}) as Record<string, unknown>;

          const openApiRelationships = (openApiData.relationships || {}) as Record<string, unknown>;
          const coverRelData = ((openApiRelationships.coverArt as Record<string, unknown> | undefined)?.data || null) as
            | Record<string, unknown>
            | null;
          const coverRelId = String(coverRelData?.id || '').trim();

          const suggestedRelData = ((openApiRelationships.suggestedCoverArts as Record<string, unknown> | undefined)?.data || null) as
            | Array<Record<string, unknown>>
            | Record<string, unknown>
            | null;
          const suggestedRelIds = Array.isArray(suggestedRelData)
            ? suggestedRelData.map((entry) => String(entry?.id || '').trim()).filter(Boolean)
            : suggestedRelData && typeof suggestedRelData === 'object'
              ? [String((suggestedRelData as Record<string, unknown>)?.id || '').trim()].filter(Boolean)
              : [];

          const included = Array.isArray((openApiPayload as Record<string, unknown>)?.included)
            ? ((openApiPayload as Record<string, unknown>).included as Array<Record<string, unknown>>)
            : [];
          const artwork = included.find((item) => {
            const type = String(item.type || '');
            const id = String(item.id || '');
            if (type !== 'artworks') return false;
            if (coverRelId && id === coverRelId) return true;
            if (suggestedRelIds.includes(id)) return true;
            if (!coverRelId && suggestedRelIds.length === 0) return true;
            return false;
          });

          const artworkAttrs = ((artwork || {}).attributes || {}) as Record<string, unknown>;
          const files = Array.isArray(artworkAttrs.files)
            ? (artworkAttrs.files as Array<Record<string, unknown>>)
            : [];

          let artworkHref = '';
          if (files.length > 0) {
            const sorted = [...files].sort((a, b) => {
              const aw = Number((a.meta as Record<string, unknown> | undefined)?.width || 0);
              const bw = Number((b.meta as Record<string, unknown> | undefined)?.width || 0);
              if (aw >= 320 && bw >= 320) return aw - bw;
              if (aw >= 320) return -1;
              if (bw >= 320) return 1;
              return bw - aw;
            });
            artworkHref = String(sorted[0]?.href || '').trim();
          }

          const openApiCover = artworkHref || pickCoverUrl(artworkAttrs) || pickCoverUrl(openApiAttrs) || String(openApiAttrs.cover || '').trim();
          const normalizedOpenApiCover = normalizeTidalCoverUrl(openApiCover);
          if (normalizedOpenApiCover) {
            return {
              ...track,
              album: {
                ...(track.album || {}),
                cover: normalizedOpenApiCover,
              },
            };
          }
        }
      }

      const trackCover = await fetchTrackCoverFromOpenApi(trackId, accessToken);
      if (trackCover) {
        return {
          ...track,
          album: {
            ...(track.album || {}),
            cover: trackCover,
          },
        };
      }

      if (!albumId) return track;

      const url = `${TIDAL_API_BASE}/albums/${encodeURIComponent(albumId)}?countryCode=IT`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tidal-Token': clientId,
          Accept: 'application/json',
        },
      });

      if (!res.ok) return track;
      const payload = await res.json();
      const albumCover = normalizeTidalCoverUrl(String(payload?.cover || payload?.image || '').trim());
      if (!albumCover) return track;

      return {
        ...track,
        album: {
          ...(track.album || {}),
          cover: albumCover,
        },
      };
    } catch {
      return track;
    }
  }));

  return enriched;
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

      const artistRefContainer =
        (rel.artists as Record<string, unknown> | undefined) ||
        (rel.artist as Record<string, unknown> | undefined) ||
        {};
      const rawArtistRefs = artistRefContainer.data;
      const artistRefs = Array.isArray(rawArtistRefs)
        ? (rawArtistRefs as Array<Record<string, unknown>>)
        : rawArtistRefs && typeof rawArtistRefs === 'object'
          ? [rawArtistRefs as Record<string, unknown>]
          : [];
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

      const albumRefContainer =
        (rel.albums as Record<string, unknown> | undefined) ||
        (rel.album as Record<string, unknown> | undefined) ||
        {};
      const rawAlbumRefs = albumRefContainer.data;
      const albumRefs = Array.isArray(rawAlbumRefs)
        ? (rawAlbumRefs as Array<Record<string, unknown>>)
        : rawAlbumRefs && typeof rawAlbumRefs === 'object'
          ? [rawAlbumRefs as Record<string, unknown>]
          : [];
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

      const durationSeconds = parseDurationSeconds(
        attrs.durationMs,
        attrs.duration,
        attrs.durationSeconds,
      );

      const title = String(attrs.title || attrs.name || '');
      return {
        id: mappedTrackId,
        title,
        artists,
        album: {
          id: String(albumFull.id || albumId || ''),
          title: String(albumAttrs.title || ''),
          cover: normalizeTidalCoverUrl(coverUrl) || undefined,
        },
        duration: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        explicit: Boolean(attrs.explicit || attrs.explicitLyrics),
        isrc: attrs.isrc ? String(attrs.isrc) : undefined,
        popularity: Number.isFinite(Number(attrs.popularity)) ? Number(attrs.popularity) : 0,
      } as TidalTrack;
    })
    .filter((track) => track.id && track.title);
}

function parseDurationSeconds(...candidates: unknown[]): number {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      if (candidate > 36000) return Math.floor(candidate / 1000);
      return Math.floor(candidate);
    }

    if (typeof candidate === 'string') {
      const value = candidate.trim();
      if (!value) continue;

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        if (numeric > 36000) return Math.floor(numeric / 1000);
        return Math.floor(numeric);
      }

      const isoMatch = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
      if (isoMatch) {
        const hours = Number(isoMatch[1] || 0);
        const minutes = Number(isoMatch[2] || 0);
        const seconds = Number(isoMatch[3] || 0);
        const total = hours * 3600 + minutes * 60 + seconds;
        if (Number.isFinite(total) && total > 0) return total;
      }
    }
  }

  return 0;
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

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    if (/^(resources\.)?(tidal|wimpmusic)\./i.test(value)) {
      value = `https://${value.replace(/^\/*/, '')}`;
    }
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

  // Se nessun ID passa il filtro normalizeTidalTrackIdForPlaylist, 
  // ritorna comunque il primo candidato disponibile (potrebbe essere UUID o altro formato)
  if (candidates.length > 0 && candidates[0]) return candidates[0];
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
 * Rimuove brano da playlist Tidal (API v1)
 */
export async function removeTrackFromTidalPlaylist(
  playlistId: string,
  trackId: string,
  accessToken: string
): Promise<void> {
  const clientId = process.env.TIDAL_CLIENT_ID || '';
  const normalizedTrackId = normalizeTidalTrackIdForPlaylist(trackId);
  console.log(`[Tidal Remove] Inizio rimozione trackId=${trackId} normalizzato=${normalizedTrackId} da playlist=${playlistId}`);

  // v1: ottieni ETag della playlist (richiesto per modifiche)
  const playlistRes = await fetch(`${TIDAL_API_BASE}/playlists/${playlistId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Tidal-Token': clientId,
    },
  });
  const etag = playlistRes.headers.get('ETag') || playlistRes.headers.get('etag') || '';
  console.log(`[Tidal Remove] Playlist GET status=${playlistRes.status} ETag=${etag}`);

  // Ottieni tutti gli items della playlist (pagina per pagina se serve)
  let offset = 0;
  const limit = 100;
  let found = false;

  while (!found) {
    const itemsRes = await fetch(`${TIDAL_API_BASE}/playlists/${playlistId}/items?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Tidal-Token': clientId,
      },
    });

    if (!itemsRes.ok) {
      console.warn(`[Tidal Remove] Items GET fallito: status=${itemsRes.status}`);
      break;
    }

    const itemsData = await itemsRes.json();
    const items = itemsData.items || [];
    const totalItems = itemsData.totalNumberOfItems || items.length;
    console.log(`[Tidal Remove] Items offset=${offset} count=${items.length} total=${totalItems}`);

    // Cerca la traccia confrontando con tutti i formati possibili
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = String(item?.item?.id ?? item?.id ?? '');
      if (itemId === normalizedTrackId || itemId === String(trackId)) {
        const absoluteIndex = offset + i;
        console.log(`[Tidal Remove] Traccia trovata a index=${absoluteIndex} itemId=${itemId}`);

        // DELETE con l'indice assoluto nella playlist
        const deleteUrl = `${TIDAL_API_BASE}/playlists/${playlistId}/items/${absoluteIndex}`;
        const deleteRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tidal-Token': clientId,
            ...(etag ? { 'If-None-Match': etag } : {}),
          },
        });

        console.log(`[Tidal Remove] DELETE status=${deleteRes.status}`);
        if (deleteRes.ok || deleteRes.status === 204) {
          found = true;
          break;
        }

        // Prova anche con body (alcuni endpoint Tidal lo richiedono)
        const deleteRes2 = await fetch(`${TIDAL_API_BASE}/playlists/${playlistId}/items`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Tidal-Token': clientId,
            'Content-Type': 'application/json',
            ...(etag ? { 'If-None-Match': etag } : {}),
          },
          body: JSON.stringify({ indices: [absoluteIndex] }),
        });
        console.log(`[Tidal Remove] DELETE (body) status=${deleteRes2.status}`);
        if (deleteRes2.ok || deleteRes2.status === 204) {
          found = true;
          break;
        }
      }
    }

    // Se non ci sono più items, esci
    if (items.length < limit || offset + items.length >= totalItems) break;
    offset += limit;
  }

  if (found) return;

  // Fallback OpenAPI
  console.log(`[Tidal Remove] Tentativo fallback OpenAPI`);
  const openApiOk = await tryRemoveTrackOpenApi(playlistId, trackId, accessToken);
  if (openApiOk) {
    console.log(`[Tidal Remove] OpenAPI fallback riuscito`);
    return;
  }

  console.warn(`[Tidal Remove] Traccia ${trackId} non rimossa dalla playlist ${playlistId}`);
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

async function tryRemoveTrackOpenApi(playlistId: string, trackId: string, accessToken: string): Promise<boolean> {
  const candidates = [
    `${TIDAL_OPENAPI_BASE}/playlists/${playlistId}/relationships/tracks`,
    `${TIDAL_OPENAPI_BASE}/playlists/${playlistId}/relationships/items`,
  ];
  const payloads = [
    { data: [{ type: 'tracks', id: String(trackId) }] },
    { data: [{ type: 'track', id: String(trackId) }] },
  ];

  for (const url of candidates) {
    for (const payload of payloads) {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 204) return true;
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
    popularity: Number.isFinite(Number((safeTrack as { popularity?: number }).popularity))
      ? Number((safeTrack as { popularity?: number }).popularity)
      : 0,
    external_urls: { tidal: `https://tidal.com/browse/track/${safeTrack.id || ''}` },
  };
}
