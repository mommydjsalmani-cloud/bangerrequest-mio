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
      // Prima controlla se le env vars sono configurate
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const hasKey = hasServiceRole || hasAnon;

      // Se mancano le credenziali, ritorna subito senza fare fetch
      if (!hasUrl || !hasKey) {
        healthTracker.setHealthy('database', false);
        return {
          ok: false,
          mode: 'in-memory',
          error: 'missing_credentials',
          hasUrl,
          hasServiceRole,
          hasAnon
        };
      }

      const supabase = getSupabase();
      if (!supabase) {
        // getSupabase può ritornare null in test mode anche con env vars presenti
        healthTracker.setHealthy('database', false);
        return {
          ok: false,
          mode: 'in-memory',
          error: 'missing_credentials',
          hasUrl,
          hasServiceRole,
          hasAnon
        };
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
        const errorMessage = err instanceof Error ? err.message : 'Connection failed';
        
        // Errori di connessione/rete
        return {
          ok: false,
          mode: 'supabase',
          error: 'fetch_failed',
          details: errorMessage
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
        // In production, non esporre quali credenziali mancano
        const isProd = process.env.NODE_ENV === 'production';
        return {
          ok: false,
          error: 'missing_credentials',
          ...(isProd ? {} : {
            hasClientId: !!process.env.SPOTIFY_CLIENT_ID,
            hasClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET
          })
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
