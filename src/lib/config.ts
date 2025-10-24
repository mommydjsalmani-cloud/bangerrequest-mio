// Sistema di configurazione centralizzato per l'app
export type AppConfig = {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    baseUrl: string;
  };
  api: {
    timeout: number;
    retries: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
      blockDurationMs: number;
    };
  };
  database: {
    connectionTimeout: number;
    queryTimeout: number;
    retries: number;
  };
  spotify: {
    tokenCacheDuration: number;
    searchTimeout: number;
    apiRetries: number;
  };
  dj: {
    sessionTimeout: number;
    maxFileSize: number;
  };
  monitoring: {
    healthCheckInterval: number;
    errorReportingEnabled: boolean;
    performanceMonitoring: boolean;
  };
  security: {
    maxRequestSize: number;
    cors: {
      enabled: boolean;
      origins: string[];
    };
    headers: {
      hsts: boolean;
      nosniff: boolean;
      frameOptions: string;
    };
  };
};

// Configurazione di default con override da environment variables
function createConfig(): AppConfig {
  const env = process.env.NODE_ENV as AppConfig['app']['environment'] || 'development';
  const isDev = env === 'development';
  const isProd = env === 'production';

  return {
    app: {
      name: 'Banger Request',
      version: process.env.npm_package_version || '1.0.0',
      environment: env,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 
        (isDev ? 'http://localhost:3000' : 'https://bangerrequest-mio.vercel.app')
    },
    api: {
      timeout: parseInt(process.env.API_TIMEOUT || '30000'), // 30s
      retries: parseInt(process.env.API_RETRIES || '3'),
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '3'),
        blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS || '300000') // 5 minuti
      }
    },
    database: {
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10s
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '15000'), // 15s
      retries: parseInt(process.env.DB_RETRIES || '2')
    },
    spotify: {
      tokenCacheDuration: parseInt(process.env.SPOTIFY_TOKEN_CACHE_DURATION || '3300000'), // 55 minuti
      searchTimeout: parseInt(process.env.SPOTIFY_SEARCH_TIMEOUT || '5000'), // 5s
      apiRetries: parseInt(process.env.SPOTIFY_API_RETRIES || '2')
    },
    dj: {
      sessionTimeout: parseInt(process.env.DJ_SESSION_TIMEOUT || '7200000'), // 2 ore
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
    },
    monitoring: {
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000'), // 5 minuti
      errorReportingEnabled: process.env.ERROR_REPORTING_ENABLED === 'true' || isProd,
      performanceMonitoring: process.env.PERFORMANCE_MONITORING_ENABLED === 'true' || isProd
    },
    security: {
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '1048576'), // 1MB
      cors: {
        enabled: process.env.CORS_ENABLED === 'true' || isProd,
        origins: process.env.CORS_ORIGINS?.split(',') || [
          isDev ? 'http://localhost:3000' : 'https://bangerrequest.vercel.app'
        ]
      },
      headers: {
        hsts: process.env.SECURITY_HSTS === 'true' || isProd,
        nosniff: process.env.SECURITY_NOSNIFF === 'true' || isProd,
        frameOptions: process.env.SECURITY_FRAME_OPTIONS || 'DENY'
      }
    }
  };
}

export const config = createConfig();

// Helper per verificare le configurazioni richieste
export function validateEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Variabili obbligatorie per il funzionamento base
  const required = [
    'DJ_PANEL_USER',
    'DJ_PANEL_SECRET'
  ];

  // Variabili raccomandate
  const recommended = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET'
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  for (const envVar of recommended) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} not set - some features may be limited`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

// Helper per ottenere info sistema
export function getSystemInfo() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    environment: config.app.environment,
    timestamp: new Date().toISOString()
  };
}

export default config;