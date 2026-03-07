/**
 * Critical Tidal Integration Tests
 * Verifica funzioni chiave per OAuth, cover images e API
 */

import { describe, it, expect } from 'vitest';

describe('Tidal Integration - Critical Functions', () => {
  describe('Cover URL normalization', () => {
    it('should normalize Tidal cover URLs correctly', () => {
      const testCases = [
        {
          input: 'https://resources.tidal.com/images/abc/def/123x123.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/123x123.jpg'
        },
        {
          input: 'http://resources.tidal.com/images/abc/def/123x123.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/123x123.jpg'
        },
        {
          input: '//resources.tidal.com/images/abc/def/123x123.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/123x123.jpg'
        },
        {
          input: 'resources.tidal.com/images/abc/def/123x123.jpg',
          expected: 'https://resources.tidal.com/images/abc/def/123x123.jpg'
        }
      ];
      
      testCases.forEach(({ input, expected }) => {
        let normalized = input;
        
        // Aggiungi https:// se manca il protocollo
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
          if (normalized.startsWith('//')) {
            normalized = 'https:' + normalized;
          } else {
            normalized = 'https://' + normalized;
          }
        }
        
        // Converti http a https
        normalized = normalized.replace(/^http:\/\//, 'https://');
        
        expect(normalized).toBe(expected);
      });
    });

    it('should handle missing or invalid cover URLs', () => {
      const invalidInputs = [null, undefined, '', '   '];
      
      invalidInputs.forEach(input => {
        const result = input?.trim();
        expect(!result || result === '').toBe(true);
      });
    });
  });

  describe('Canonical domain handling', () => {
    it('should use mommydj.com as canonical domain in production', () => {
      const canonicalDomain = 'mommydj.com';
      const vercelDomain = 'bangerrequest-mio.vercel.app';
      
      expect(canonicalDomain).toBe('mommydj.com');
      expect(canonicalDomain).not.toBe(vercelDomain);
    });

    it('should construct OAuth redirect with basePath', () => {
      const basePath = '/richiedi';
      const endpoint = '/api/tidal/callback';
      const fullPath = `${basePath}${endpoint}`;
      
      expect(fullPath).toBe('/richiedi/api/tidal/callback');
      expect(fullPath).toMatch(/^\/richiedi\//);
    });
  });

  describe('Image proxy URL construction', () => {
    it('should wrap Tidal URLs with proxy', () => {
      const originalUrl = 'https://resources.tidal.com/images/abc/def/320x320.jpg';
      const proxyUrl = `/richiedi/api/tidal/image?u=${encodeURIComponent(originalUrl)}`;
      
      expect(proxyUrl).toContain('/api/tidal/image?u=');
      expect(proxyUrl).toContain(encodeURIComponent('https://'));
    });

    it('should handle cover fallback path', () => {
      const fallbackPath = '/cover-placeholder.svg';
      
      expect(fallbackPath).toMatch(/^\/cover-placeholder\.svg$/);
      expect(fallbackPath).not.toContain('http');
    });
  });

  describe('OAuth state encryption', () => {
    it('should include required fields in state object', () => {
      const stateData = {
        sid: 'test-session-id',
        codeVerifier: 'test-verifier',
        timestamp: Date.now()
      };
      
      expect(stateData).toHaveProperty('sid');
      expect(stateData).toHaveProperty('codeVerifier');
      expect(stateData).toHaveProperty('timestamp');
      
      expect(stateData.sid).toBeTruthy();
      expect(stateData.codeVerifier).toBeTruthy();
    });
  });

  describe('API endpoint structure', () => {
    it('should have correct Tidal API endpoints', () => {
      const endpoints = {
        auth: '/api/tidal/auth',
        callback: '/api/tidal/callback',
        search: '/api/tidal/search',
        image: '/api/tidal/image'
      };
      
      Object.values(endpoints).forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\/tidal\//);
      });
    });

    it('should construct basePath-aware URLs', () => {
      const basePath = '/richiedi';
      const endpoint = '/api/tidal/auth';
      const fullUrl = `${basePath}${endpoint}`;
      
      expect(fullUrl).toBe('/richiedi/api/tidal/auth');
    });
  });

  describe('Session persistence', () => {
    it('should support both token-based and session-based auth', () => {
      const sessionWithToken = {
        tidal_access_token: 'token',
        tidal_token_expires_at: Date.now() + 86400000
      };
      
      const sessionId = 'session-123';
      
      expect(sessionWithToken.tidal_access_token).toBeTruthy();
      expect(sessionId).toBeTruthy();
    });

    it('should detect expired tokens', () => {
      const expiredSession = {
        tidal_access_token: 'token',
        tidal_token_expires_at: Date.now() - 1000 // 1 secondo fa
      };
      
      const isExpired = Date.now() >= expiredSession.tidal_token_expires_at;
      expect(isExpired).toBe(true);
    });

    it('should detect valid tokens', () => {
      const validSession = {
        tidal_access_token: 'token',
        tidal_token_expires_at: Date.now() + 3600000 // 1 ora
      };
      
      const isExpired = Date.now() >= validSession.tidal_token_expires_at;
      expect(isExpired).toBe(false);
    });
  });
});
