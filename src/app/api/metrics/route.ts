import { NextResponse } from 'next/server';
import { withErrorHandler, AuthenticationError } from '@/lib/errorHandler';
import { createMetricsDashboard, healthTracker, metricsCollector } from '@/lib/monitoring';

async function metricsHandler(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  const auth = req.headers.get('authorization');
  
  // Simple auth check per metriche (optional, commenta se vuoi accesso pubblico)
  const expectedAuth = process.env.METRICS_AUTH_TOKEN;
  if (expectedAuth && auth !== `Bearer ${expectedAuth}`) {
    throw new AuthenticationError('Invalid metrics auth token');
  }

  if (format === 'prometheus') {
    // Formato Prometheus per integrazione con sistemi di monitoring
    const lines: string[] = [];
    const snapshot = metricsCollector.getSnapshot();
    
    // Aggiungi contatori
    for (const [key, value] of Object.entries(snapshot.counters)) {
      lines.push(`# TYPE ${key} counter`);
      lines.push(`${key} ${value}`);
    }
    
    // Aggiungi gauges
    for (const [key, value] of Object.entries(snapshot.gauges)) {
      lines.push(`# TYPE ${key} gauge`);
      lines.push(`${key} ${value}`);
    }
    
    // Health status
    const health = healthTracker.getOverallHealth();
    lines.push('# TYPE app_health gauge');
    lines.push(`app_health ${health.healthy ? 1 : 0}`);
    
    for (const [service, status] of Object.entries(health.services)) {
      lines.push(`# TYPE app_health_${service} gauge`);
      lines.push(`app_health_${service} ${status.healthy ? 1 : 0}`);
    }
    
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4'
      }
    });
  }

  // Formato JSON (default)
  const dashboard = createMetricsDashboard();
  
  return NextResponse.json(dashboard, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export const GET = withErrorHandler(metricsHandler);