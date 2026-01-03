/**
 * Monitoring Index
 * Export all monitoring modules
 */

export {
  addThreshold,
  type Alert,
  type AlertNotifier,
  type AlertThreshold,
  clearOldAlerts,
  ConsoleNotifier,
  evaluateMetrics,
  getActiveAlerts,
  getAllAlerts,
  getThresholds,
  registerNotifier,
  removeThreshold,
  resetAlerts,
  sendAlert,
} from './alerts.js';

export {
  addBreadcrumb,
  captureError,
  captureMessage,
  CrawlerMetrics,
  getMetrics,
  incrementCounter,
  initSentry,
  recordHistogram,
  resetMetrics,
  setGauge,
  setUser,
} from './metrics.js';
