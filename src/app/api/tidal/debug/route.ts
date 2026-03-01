import { NextResponse } from 'next/server';

/**
 * Debug endpoint per verificare configurazione Tidal
 */
export async function GET() {
  const clientId = process.env.TIDAL_CLIENT_ID;
  const clientSecret = process.env.TIDAL_CLIENT_SECRET;
  const redirectUri = process.env.TIDAL_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY_TIDAL;

  return NextResponse.json({
    configured: {
      client_id: !!clientId,
      client_secret: !!clientSecret,
      redirect_uri: !!redirectUri,
      encryption_key: !!encryptionKey,
    },
    values: {
      client_id: clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET',
      redirect_uri: redirectUri || 'NOT SET',
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
