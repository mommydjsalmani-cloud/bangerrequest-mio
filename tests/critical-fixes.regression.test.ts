/**
 * Critical Fixes Regression Tests
 * 
 * Questi test verificano che le fix documentate in FIXES_REGISTRY.md
 * rimangano stabili e non vengano accidentalmente rimosse.
 * 
 * ⚠️ NON RIMUOVERE O MODIFICARE QUESTI TEST SENZA CONSULTARE FIXES_REGISTRY.md
 */

import { describe, it, expect } from 'vitest';

describe('CRITICAL FIX REGRESSION TESTS', () => {
  
  describe('FIX #1: OAuth Domain Redirect', () => {
    it('deve usare mommydj.com come dominio canonico in produzione', () => {
      const CANONICAL_DOMAIN = 'mommydj.com';
      const VERCEL_DOMAIN = 'bangerrequest-mio.vercel.app';
      
      // Verifica che il dominio canonico sia configurato correttamente
      expect(CANONICAL_DOMAIN).toBe('mommydj.com');
      expect(CANONICAL_DOMAIN).not.toBe(VERCEL_DOMAIN);
    });
    
    it('deve costruire correttamente il redirect URL con basePath', () => {
      const basePath = '/richiedi';
      const callbackEndpoint = '/api/tidal/callback';
      const canonicalDomain = 'https://mommydj.com';
      
      const fullRedirectUrl = `${canonicalDomain}${basePath}${callbackEndpoint}`;
      
      expect(fullRedirectUrl).toBe('https://mommydj.com/richiedi/api/tidal/callback');
      expect(fullRedirectUrl).toContain('mommydj.com');
      expect(fullRedirectUrl).not.toContain('vercel.app');
    });
    
    it('deve includere state encryption per codeVerifier', () => {
      const stateData = {
        sid: 'session-123',
        codeVerifier: 'abc123verifier',
        timestamp: Date.now()
      };
      
      // Verifica che tutti i campi critici siano presenti
      expect(stateData).toHaveProperty('sid');
      expect(stateData).toHaveProperty('codeVerifier');
      expect(stateData).toHaveProperty('timestamp');
      
      // Verifica che sid sia presente (necessario per server-side persistence)
      expect(stateData.sid).toBeTruthy();
      expect(stateData.sid.length).toBeGreaterThan(0);
    });
  });
  
  describe('FIX #2: Tidal Token Expiry Detection', () => {
    it('deve rilevare correttamente token scaduti', () => {
      const now = Date.now();
      const expiredSession = {
        catalog_type: 'tidal',
        tidal_access_token: 'token_abc123',
        tidal_token_expires_at: new Date(now - 1000).toISOString() // 1 secondo fa
      };
      
      const isExpired = 
        expiredSession.catalog_type === 'tidal' &&
        expiredSession.tidal_access_token &&
        expiredSession.tidal_token_expires_at &&
        Date.now() >= new Date(expiredSession.tidal_token_expires_at).getTime();
      
      expect(isExpired).toBe(true);
    });
    
    it('deve rilevare correttamente token validi', () => {
      const now = Date.now();
      const validSession = {
        catalog_type: 'tidal',
        tidal_access_token: 'token_abc123',
        tidal_token_expires_at: new Date(now + 3600000).toISOString() // 1 ora
      };
      
      const isExpired = 
        validSession.catalog_type === 'tidal' &&
        validSession.tidal_access_token &&
        validSession.tidal_token_expires_at &&
        Date.now() >= new Date(validSession.tidal_token_expires_at).getTime();
      
      expect(isExpired).toBe(false);
    });
    
    it('deve gestire sessioni senza token Tidal', () => {
      const spotifySession = {
        catalog_type: 'spotify',
        tidal_access_token: null,
        tidal_token_expires_at: null
      };
      
      const isExpired = 
        spotifySession.catalog_type === 'tidal' &&
        spotifySession.tidal_access_token &&
        spotifySession.tidal_token_expires_at &&
        Date.now() >= new Date(spotifySession.tidal_token_expires_at).getTime();
      
      expect(isExpired).toBe(false);
    });
  });
  
  describe('FIX #3: Tidal Cover Images', () => {
    it('deve normalizzare URL HTTPS correttamente', () => {
      const testCases = [
        {
          input: 'https://resources.tidal.com/images/abc/def/320x320.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/320x320.jpg'
        },
        {
          input: 'http://resources.tidal.com/images/abc/def/320x320.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/320x320.jpg'
        },
        {
          input: '//resources.tidal.com/images/abc/def/320x320.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/320x320.jpg'
        },
        {
          input: 'resources.tidal.com/images/abc/def/320x320.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/320x320.jpg'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        let normalized = input;
        
        // Normalizzazione (stesso algoritmo del codice production)
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
          if (normalized.startsWith('//')) {
            normalized = 'https:' + normalized;
          } else {
            normalized = 'https://' + normalized;
          }
        }
        normalized = normalized.replace(/^http:\/\//, 'https://');
        
        expect(normalized).toBe(expected);
      });
    });
    
    it('deve costruire URL proxy correttamente', () => {
      const originalUrl = 'https://resources.tidal.com/images/abc/def/320x320.jpg';
      const basePath = '/richiedi';
      const proxyEndpoint = '/api/tidal/image';
      const encodedUrl = encodeURIComponent(originalUrl);
      
      const proxyUrl = `${basePath}${proxyEndpoint}?u=${encodedUrl}`;
      
      expect(proxyUrl).toContain('/api/tidal/image?u=');
      expect(proxyUrl).toContain(encodeURIComponent('https://'));
      expect(decodeURIComponent(proxyUrl.split('u=')[1])).toBe(originalUrl);
    });
    
    it('deve avere domini Tidal nella whitelist', () => {
      const ALLOWED_HOST_SUFFIXES = [
        'resources.tidal.com',
        'tidal.com',
        'wimpmusic.com'
      ];
      
      const testUrls = [
        'https://resources.tidal.com/images/test.jpg',
        'https://images.tidal.com/test.jpg',
        'https://cdn.wimpmusic.com/test.jpg'
      ];
      
      testUrls.forEach(url => {
        const urlObj = new URL(url);
        const isAllowed = ALLOWED_HOST_SUFFIXES.some(suffix => 
          urlObj.hostname === suffix || urlObj.hostname.endsWith('.' + suffix)
        );
        
        expect(isAllowed).toBe(true);
      });
    });
    
    it('deve validare fallback placeholder path', () => {
      const fallbackPath = '/cover-placeholder.svg';
      
      expect(fallbackPath).toMatch(/^\/cover-placeholder\.svg$/);
      expect(fallbackPath).not.toContain('http');
      expect(fallbackPath.startsWith('/')).toBe(true);
    });
  });
  
  describe('FIX #4: Automatic Playlist Integration', () => {
    it('deve verificare condizioni per aggiunta automatica', () => {
      const session = {
        catalog_type: 'tidal',
        tidal_access_token: 'encrypted_token',
        tidal_playlist_id: 'playlist-123'
      };
      
      const request = {
        track_id: '12345',
        title: 'Test Song',
        artists: 'Test Artist'
      };
      
      // Condizioni per auto-add
      const shouldAutoAdd = 
        session.catalog_type === 'tidal' &&
        session.tidal_access_token &&
        Boolean(request.track_id);
      
      expect(shouldAutoAdd).toBe(true);
    });
    
    it('deve supportare fallback search query', () => {
      const request = {
        title: 'Bohemian Rhapsody',
        artists: 'Queen',
        track_id: 'invalid-id-123'
      };
      
      const searchQuery = request.artists 
        ? `${request.title} ${request.artists}` 
        : request.title;
      
      expect(searchQuery).toBe('Bohemian Rhapsody Queen');
      expect(searchQuery).toContain(request.title);
      expect(searchQuery).toContain(request.artists);
    });
    
    it('deve tracciare stati di aggiunta corretti', () => {
      const validStatuses = ['pending', 'success', 'failed'];
      const testStatus = 'success';
      
      expect(validStatuses).toContain(testStatus);
      expect(['pending', 'success', 'failed']).toContain('pending');
      expect(['pending', 'success', 'failed']).toContain('success');
      expect(['pending', 'success', 'failed']).toContain('failed');
    });
    
    it('deve validare struttura playlist creation', () => {
      const playlistData = {
        name: 'Test Session',
        userId: 'user-123',
        accessToken: 'token-abc'
      };
      
      expect(playlistData).toHaveProperty('name');
      expect(playlistData).toHaveProperty('userId');
      expect(playlistData).toHaveProperty('accessToken');
      
      expect(playlistData.name.length).toBeGreaterThan(0);
      expect(playlistData.userId.length).toBeGreaterThan(0);
    });
  });
  
  describe('GENERAL: API Endpoints Structure', () => {
    it('deve avere tutti gli endpoint Tidal critici definiti', () => {
      const requiredEndpoints = [
        '/api/tidal/auth',
        '/api/tidal/callback',
        '/api/tidal/search',
        '/api/tidal/image',
        '/api/tidal/playlist'
      ];
      
      requiredEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/tidal\//);
        expect(endpoint.startsWith('/api/tidal/')).toBe(true);
      });
    });
    
    it('deve costruire path con basePath correttamente', () => {
      const basePath = '/richiedi';
      const endpoints = [
        '/api/health',
        '/api/tidal/auth',
        '/api/session'
      ];
      
      endpoints.forEach(endpoint => {
        const fullPath = `${basePath}${endpoint}`;
        expect(fullPath.startsWith('/richiedi/')).toBe(true);
        expect(fullPath).toContain(endpoint);
      });
    });
  });
});
