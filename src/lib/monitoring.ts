// Sistema di monitoring e metriche per l'app
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class MetricsCollector {
  private metrics: Metric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Limite per evitare memory leak
  
  // Contatori
  private counters = new Map<string, number>();
  
  // Gauges (valori istantanei)
  private gauges = new Map<string, number>();
  
  // Histograms per timing
  private histograms = new Map<string, number[]>();

  // Incrementa un contatore
  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    const key = this.createKey(name, tags);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
    
    this.addMetric({
      name,
      value: this.counters.get(key) || 0,
      timestamp: Date.now(),
      tags,
      unit: 'count'
    });
  }

  // Imposta un gauge
  gauge(name: string, value: number, tags?: Record<string, string>) {
    const key = this.createKey(name, tags);
    this.gauges.set(key, value);
    
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit: 'gauge'
    });
  }

  // Registra un timing
  timing(name: string, duration: number, tags?: Record<string, string>) {
    const key = this.createKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(duration);
    
    // Mantieni solo gli ultimi 100 valori per histogram
    if (values.length > 100) {
      values.shift();
    }
    
    this.histograms.set(key, values);
    
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      tags,
      unit: 'ms'
    });
  }

  // Registra performance di un'operazione
  recordPerformance(metric: PerformanceMetric) {
    this.performanceMetrics.push(metric);
    
    // Pulisci metriche vecchie
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - this.maxMetrics);
    }

    // Registra anche come timing
    this.timing(`${metric.operation}.duration`, metric.duration, {
      success: metric.success.toString()
    });

    // Incrementa contatore successi/errori
    if (metric.success) {
      this.increment(`${metric.operation}.success`);
    } else {
      this.increment(`${metric.operation}.error`);
    }
  }

  // Ottieni statistiche per un histogram
  getHistogramStats(name: string, tags?: Record<string, string>) {
    const key = this.createKey(name, tags);
    const values = this.histograms.get(key) || [];
    
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Ottieni tutte le metriche recenti
  getMetrics(since?: number): Metric[] {
    if (!since) return [...this.metrics];
    
    return this.metrics.filter(m => m.timestamp >= since);
  }

  // Ottieni metriche di performance
  getPerformanceMetrics(since?: number): PerformanceMetric[] {
    if (!since) return [...this.performanceMetrics];
    
    return this.performanceMetrics.filter(m => m.timestamp >= since);
  }

  // Ottieni snapshot dello stato attuale
  getSnapshot() {
    const now = Date.now();
    const lastHour = now - 3600000; // 1 ora fa
    
    return {
      timestamp: now,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key]) => [
          key,
          this.getHistogramStats(key)
        ])
      ),
      recentMetrics: this.getMetrics(lastHour).length,
      recentPerformance: this.getPerformanceMetrics(lastHour).length
    };
  }

  // Pulisci metriche vecchie
  cleanup(olderThan: number = 3600000) { // 1 ora di default
    const cutoff = Date.now() - olderThan;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);
  }

  private addMetric(metric: Metric) {
    this.metrics.push(metric);
    
    // Pulisci metriche vecchie
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }
  }

  private createKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }
}

// Collector globale
export const metricsCollector = new MetricsCollector();

// Cleanup automatico ogni 10 minuti
setInterval(() => {
  metricsCollector.cleanup();
}, 600000);

// Helper per timing di operazioni async
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now();
  let success = false;
  let error: Error | undefined;

  try {
    const result = await operation();
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    throw error;
  } finally {
    const duration = Date.now() - start;
    
    metricsCollector.timing(name, duration, tags);
    metricsCollector.recordPerformance({
      operation: name,
      duration,
      success,
      timestamp: start,
      metadata: {
        tags,
        error: error?.message
      }
    });
  }
}

// Helper per timing di operazioni sync
export function measureSync<T>(
  name: string,
  operation: () => T,
  tags?: Record<string, string>
): T {
  const start = Date.now();
  let success = false;
  let error: Error | undefined;

  try {
    const result = operation();
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    throw error;
  } finally {
    const duration = Date.now() - start;
    
    metricsCollector.timing(name, duration, tags);
    metricsCollector.recordPerformance({
      operation: name,
      duration,
      success,
      timestamp: start,
      metadata: {
        tags,
        error: error?.message
      }
    });
  }
}

// Middleware per misurare automaticamente le API routes
export function withMetrics<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
  operationName: string
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as Request;
    const url = new URL(request.url);
    
    return measureAsync(
      operationName,
      () => handler(...args),
      {
        method: request.method,
        path: url.pathname
      }
    );
  };
}

// Tracker per system health
export class HealthTracker {
  private readonly healthChecks = new Map<string, boolean>();
  private readonly lastChecks = new Map<string, number>();

  setHealthy(service: string, healthy: boolean) {
    this.healthChecks.set(service, healthy);
    this.lastChecks.set(service, Date.now());
    
    metricsCollector.gauge(`health.${service}`, healthy ? 1 : 0);
  }

  isHealthy(service: string): boolean {
    return this.healthChecks.get(service) || false;
  }

  getOverallHealth(): { healthy: boolean; services: Record<string, { healthy: boolean; lastCheck: number }> } {
    const services: Record<string, { healthy: boolean; lastCheck: number }> = {};
    let overallHealthy = true;

    for (const [service, healthy] of this.healthChecks) {
      const lastCheck = this.lastChecks.get(service) || 0;
      services[service] = { healthy, lastCheck };
      
      // Se il servizio è unhealthy o non è stato controllato da più di 5 minuti
      if (!healthy || (Date.now() - lastCheck > 300000)) {
        overallHealthy = false;
      }
    }

    return { healthy: overallHealthy, services };
  }
}

export const healthTracker = new HealthTracker();

// Helper per creare dashboard metriche
export function createMetricsDashboard() {
  const snapshot = metricsCollector.getSnapshot();
  const health = healthTracker.getOverallHealth();
  const now = Date.now();
  const lastHour = now - 3600000;
  
  // Statistiche errori ultima ora
  const recentErrors = metricsCollector.getPerformanceMetrics(lastHour)
    .filter(m => !m.success);
  
  // Operazioni più lente
  const slowestOps = metricsCollector.getPerformanceMetrics(lastHour)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return {
    timestamp: now,
    health: health,
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version
    },
    metrics: {
      snapshot,
      recentErrors: recentErrors.length,
      errorRate: recentErrors.length / Math.max(metricsCollector.getPerformanceMetrics(lastHour).length, 1),
      slowestOperations: slowestOps.map(op => ({
        operation: op.operation,
        duration: op.duration,
        timestamp: op.timestamp
      }))
    }
  };
}