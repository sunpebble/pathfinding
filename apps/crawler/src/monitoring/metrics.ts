/**
 * OpenTelemetry Metrics
 * Custom metrics for crawler pipeline monitoring
 */

import * as Sentry from '@sentry/node';

// Metric counters (simplified version without full OTEL SDK)
const counters: Map<string, number> = new Map();
const gauges: Map<string, number> = new Map();
const histograms: Map<string, number[]> = new Map();

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: string,
  value: number = 1,
  labels: Record<string, string> = {}
): void {
  const key = formatKey(name, labels);
  counters.set(key, (counters.get(key) || 0) + value);
}

/**
 * Set a gauge metric
 */
export function setGauge(
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  const key = formatKey(name, labels);
  gauges.set(key, value);
}

/**
 * Record a histogram value
 */
export function recordHistogram(
  name: string,
  value: number,
  labels: Record<string, string> = {}
): void {
  const key = formatKey(name, labels);
  if (!histograms.has(key)) {
    histograms.set(key, []);
  }
  histograms.get(key)!.push(value);
}

/**
 * Format metric key with labels
 */
function formatKey(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return labelStr ? `${name}{${labelStr}}` : name;
}

// Crawler-specific metrics
export const CrawlerMetrics = {
  /**
   * Record a crawl job event
   */
  recordCrawlJob(
    status: 'started' | 'completed' | 'failed',
    platform: string
  ): void {
    incrementCounter('crawler_jobs_total', 1, { status, platform });
  },

  /**
   * Record crawled records count
   */
  recordCrawledRecords(count: number, platform: string): void {
    incrementCounter('crawler_records_total', count, { platform });
  },

  /**
   * Record crawl duration
   */
  recordCrawlDuration(durationMs: number, platform: string): void {
    recordHistogram('crawler_duration_ms', durationMs, { platform });
  },

  /**
   * Record API request
   */
  recordApiRequest(endpoint: string, method: string, status: number): void {
    incrementCounter('api_requests_total', 1, {
      endpoint,
      method,
      status: String(status),
    });
  },

  /**
   * Record normalization events
   */
  recordNormalization(
    status: 'success' | 'failed' | 'skipped',
    platform: string
  ): void {
    incrementCounter('normalization_total', 1, { status, platform });
  },

  /**
   * Record deduplication events
   */
  recordDeduplication(merged: boolean): void {
    incrementCounter('deduplication_total', 1, { merged: String(merged) });
  },

  /**
   * Set current POI count
   */
  setPOICount(count: number, category?: string): void {
    if (category) {
      setGauge('pois_total', count, { category });
    } else {
      setGauge('pois_total', count);
    }
  },

  /**
   * Set pending records count
   */
  setPendingRecords(count: number): void {
    setGauge('pending_records', count);
  },

  /**
   * Set running jobs count
   */
  setRunningJobs(count: number): void {
    setGauge('running_jobs', count);
  },
};

/**
 * Get all metrics for reporting
 */
export function getMetrics(): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<
    string,
    { count: number; sum: number; avg: number; min: number; max: number }
  >;
} {
  const histogramStats: Record<string, any> = {};

  for (const [key, values] of histograms) {
    if (values.length > 0) {
      histogramStats[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
  }

  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: histogramStats,
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

/**
 * Initialize Sentry for error tracking
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number.parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
    ),
    integrations: [
      // Enable HTTP calls tracing
      Sentry.httpIntegration(),
    ],
  });

  // Log initialization status
  console.warn('Sentry initialized for error tracking');
}

/**
 * Capture an error with Sentry
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string }): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for Sentry
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}
