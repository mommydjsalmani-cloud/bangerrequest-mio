import { NextResponse } from 'next/server';
import { getTidalAuthUrl, generatePKCE } from '@/lib/tidal';

/**
 * GET /api/tidal/test-auth-url
 * Debug: mostra l'URL di authorize che viene generata
 */
export async function GET() {
  try {
    const state = 'test-state-123';
    const { codeChallenge } = generatePKCE();
    const authUrl = getTidalAuthUrl(state, codeChallenge);
    
    return NextResponse.json({
      ok: true,
      authUrl,
      endpoint: 'https://login.tidal.com/authorize',
      clientId: process.env.TIDAL_CLIENT_ID ? '✓ SET' : '✗ NOT SET',
      redirectUri: process.env.TIDAL_REDIRECT_URI || '✗ NOT SET',
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
