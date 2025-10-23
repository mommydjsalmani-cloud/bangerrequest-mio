import { NextResponse } from 'next/server';
import { withErrorHandler, logger, withTimeout } from '@/lib/errorHandler';
import { config, validateEnvironment, getSystemInfo } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { healthTracker, measureAsync } from '@/lib/monitoring';

async function healthCheckHandler(): Promise<NextResponse> {
  const startTime = Date.now();
  const checks: Record<string, unknown> = {};

  // Check environment variables
  const envCheck = validateEnvironment();
  checks.environment = {
    valid: envCheck.valid,
    missing: envCheck.missing,
    warnings: envCheck.warnings,
    nodeEnv: process.env.NODE_ENV
  };

  // Check Supabase connection
  checks.database = await measureAsync(
    'health_check.database',
    async () => {
      const supabase = getSupabase();
      if (!supabase) {
        const result = {
          ok: false,
          mode: 'in-memory',
          error: 'missing_credentials',
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        };
        healthTracker.setHealthy('database', false);
        return result;
      }

      try {
        // Test connessione con query semplice
        const { error } = await supabase
          .from('sessioni_libere')
          .select('count', { count: 'exact', head: true });
        
        const isHealthy = !error;
        healthTracker.setHealthy('database', isHealthy);
        
        return {
          ok: isHealthy,
          mode: 'supabase',
          error: error?.message,
          tables: { sessioni_libere: isHealthy }
        };
      } catch (err) {
        healthTracker.setHealthy('database', false);
        return {
          ok: false,
          mode: 'supabase',
          error: err instanceof Error ? err.message : 'Connection failed'
        };
      }
    }
  );

  // Check Spotify API
  checks.spotify = await measureAsync(
    'health_check.spotify',
    async () => {
      const hasCredentials = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
      if (!hasCredentials) {
        healthTracker.setHealthy('spotify', false);
        return {
          ok: false,
          error: 'missing_credentials',
          hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
          hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET
        };
      }

      try {
        // Import dinamico per evitare problemi con edge runtime
        const { getSpotifyToken } = await import('@/lib/spotify');
        await withTimeout(getSpotifyToken(), config.spotify.searchTimeout, 'spotify_token_health');
        healthTracker.setHealthy('spotify', true);
        return { ok: true };
      } catch (err) {
        healthTracker.setHealthy('spotify', false);
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Token fetch failed'
        };
      }
    }
  );

  // Check DJ authentication
  const authOk = !!(process.env.DJ_PANEL_USER && process.env.DJ_PANEL_SECRET);
  healthTracker.setHealthy('auth', authOk);
  checks.auth = {
    ok: authOk,
    hasUser: !!process.env.DJ_PANEL_USER,
    hasSecret: !!process.env.DJ_PANEL_SECRET
  };

  // System info
  const systemInfo = getSystemInfo();
  checks.system = {
    ...systemInfo,
    responseTime: Date.now() - startTime
  };

  // Overall health
  const overallOk = (
    (checks.environment as { valid: boolean }).valid &&
    (checks.database as { ok: boolean }).ok &&
    (checks.auth as { ok: boolean }).ok
  );

  // Update overall health
  healthTracker.setHealthy('overall', overallOk);

  const response = {
    ok: overallOk,
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.app.environment,
    checks
  };

  // Log se ci sono problemi
  if (!overallOk) {
    logger.warn('Health check failed', { response });
  }

  return NextResponse.json(response, {
    status: overallOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export const GET = withErrorHandler(healthCheckHandler);
