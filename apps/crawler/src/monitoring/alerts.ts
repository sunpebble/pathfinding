/**
 * Alert System
 * Threshold-based alerting for crawler pipeline monitoring
 */

import { captureError, captureMessage } from './metrics.js';

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface Alert {
  id: string;
  threshold: AlertThreshold;
  currentValue: number;
  triggeredAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

// Active alerts tracking
const activeAlerts: Map<string, Alert> = new Map();

// Default thresholds
const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    metric: 'failedParseRate',
    operator: 'gt',
    value: 10,
    severity: 'warning',
    message: 'Failed parse rate exceeded 10%',
  },
  {
    metric: 'failedParseRate',
    operator: 'gt',
    value: 25,
    severity: 'critical',
    message: 'Critical: Failed parse rate exceeded 25%',
  },
  {
    metric: 'pendingRecords',
    operator: 'gt',
    value: 10000,
    severity: 'warning',
    message: 'Pending records backlog exceeded 10,000',
  },
  {
    metric: 'stalePOIRate',
    operator: 'gt',
    value: 30,
    severity: 'warning',
    message: 'Stale POI rate exceeded 30%',
  },
  {
    metric: 'crawlJobFailures',
    operator: 'gt',
    value: 5,
    severity: 'critical',
    message: 'More than 5 crawl job failures in the last hour',
  },
  {
    metric: 'duplicateRate',
    operator: 'gt',
    value: 20,
    severity: 'info',
    message: 'Duplicate rate exceeded 20%',
  },
];

// Custom thresholds
let customThresholds: AlertThreshold[] = [];

/**
 * Add a custom alert threshold
 */
export function addThreshold(threshold: AlertThreshold): void {
  customThresholds.push(threshold);
}

/**
 * Remove a custom threshold
 */
export function removeThreshold(metric: string): void {
  customThresholds = customThresholds.filter((t) => t.metric !== metric);
}

/**
 * Get all thresholds
 */
export function getThresholds(): AlertThreshold[] {
  return [...DEFAULT_THRESHOLDS, ...customThresholds];
}

/**
 * Check if a value triggers a threshold
 */
function checkThreshold(threshold: AlertThreshold, value: number): boolean {
  switch (threshold.operator) {
    case 'gt':
      return value > threshold.value;
    case 'lt':
      return value < threshold.value;
    case 'eq':
      return value === threshold.value;
    case 'gte':
      return value >= threshold.value;
    case 'lte':
      return value <= threshold.value;
    default:
      return false;
  }
}

/**
 * Evaluate metrics against thresholds and generate alerts
 */
export function evaluateMetrics(metrics: Record<string, number>): Alert[] {
  const now = new Date().toISOString();
  const newAlerts: Alert[] = [];
  const thresholds = getThresholds();

  for (const threshold of thresholds) {
    const value = metrics[threshold.metric];
    if (value === undefined) continue;

    const alertId = `${threshold.metric}_${threshold.operator}_${threshold.value}`;
    const isTriggered = checkThreshold(threshold, value);
    const existingAlert = activeAlerts.get(alertId);

    if (isTriggered) {
      if (!existingAlert) {
        // New alert
        const alert: Alert = {
          id: alertId,
          threshold,
          currentValue: value,
          triggeredAt: now,
          resolved: false,
        };
        activeAlerts.set(alertId, alert);
        newAlerts.push(alert);

        // Send to Sentry based on severity
        if (threshold.severity === 'critical') {
          captureError(new Error(threshold.message), {
            metric: threshold.metric,
            value,
            threshold: threshold.value,
          });
        } else {
          captureMessage(
            threshold.message,
            threshold.severity === 'warning' ? 'warning' : 'info'
          );
        }
      } else {
        // Update existing alert value
        existingAlert.currentValue = value;
      }
    } else if (existingAlert && !existingAlert.resolved) {
      // Resolve alert
      existingAlert.resolved = true;
      existingAlert.resolvedAt = now;
      captureMessage(`Alert resolved: ${threshold.message}`, 'info');
    }
  }

  return newAlerts;
}

/**
 * Get active (unresolved) alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values()).filter((a) => !a.resolved);
}

/**
 * Get all alerts (including resolved)
 */
export function getAllAlerts(): Alert[] {
  return Array.from(activeAlerts.values());
}

/**
 * Clear resolved alerts older than specified hours
 */
export function clearOldAlerts(olderThanHours: number = 24): number {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  let cleared = 0;

  for (const [id, alert] of activeAlerts) {
    if (alert.resolved && alert.resolvedAt) {
      const resolvedTime = new Date(alert.resolvedAt).getTime();
      if (resolvedTime < cutoff) {
        activeAlerts.delete(id);
        cleared++;
      }
    }
  }

  return cleared;
}

/**
 * Reset all alerts (for testing)
 */
export function resetAlerts(): void {
  activeAlerts.clear();
  customThresholds = [];
}

/**
 * Alert notification interface
 */
export interface AlertNotifier {
  notify: (alert: Alert) => Promise<void>;
}

// Registered notifiers
const notifiers: AlertNotifier[] = [];

/**
 * Register an alert notifier
 */
export function registerNotifier(notifier: AlertNotifier): void {
  notifiers.push(notifier);
}

/**
 * Send alert to all registered notifiers
 */
export async function sendAlert(alert: Alert): Promise<void> {
  await Promise.all(
    notifiers.map((n) => n.notify(alert).catch((err) => console.error(err)))
  );
}

/**
 * Console notifier for development
 */
export class ConsoleNotifier implements AlertNotifier {
  async notify(alert: Alert): Promise<void> {
    const severityIcon =
      alert.threshold.severity === 'critical'
        ? '🚨'
        : alert.threshold.severity === 'warning'
          ? '⚠️'
          : 'ℹ️';

    console.warn(
      `${severityIcon} [ALERT] ${alert.threshold.message} (${alert.threshold.metric}: ${alert.currentValue})`
    );
  }
}

// Register console notifier by default in development
if (process.env.NODE_ENV !== 'production') {
  registerNotifier(new ConsoleNotifier());
}
