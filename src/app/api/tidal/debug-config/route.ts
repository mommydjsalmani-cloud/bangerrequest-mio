import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/tidal/debug-config
 * Mostra lo stato della configurazione Tidal (per debug)
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  const redirectUri = process.env.TIDAL_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY_TIDAL;

  return NextResponse.json({
    TIDAL_CLIENT_ID: clientId ? '✓ SET (' + clientId.substring(0, 10) + '...)' : '✗ NOT SET',
    TIDAL_CLIENT_SECRET: clientSecret ? '✓ SET (' + clientSecret.length + ' chars)' : '✗ NOT SET',
    TIDAL_REDIRECT_URI: redirectUri || '✗ NOT SET',
    ENCRYPTION_KEY_TIDAL: encryptionKey ? '✓ SET (' + encryptionKey.length + ' chars)' : '✗ NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
}
