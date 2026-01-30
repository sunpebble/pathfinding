/**
 * Diagnostics Module
 * Utilities for diagnosing crawler issues
 *
 * Provides:
 * - Smart content stability detection (waitForContentStable)
 * - Failure categorization (acquisition vs parsing issues)
 * - Anti-bot indicator detection
 * - Human-readable diagnostic reports
 */

// Re-export waitForContentStable from utils for backwards compatibility
export { waitForContentStable } from '../utils.js';

// Report utilities
export {
  type AntiBotIndicators,
  categorizeFailure,
  detectAntiBotIndicators,
  type DiagnosticReport,
  type FailureCategory,
  formatReportAsText,
  generateDiagnosticReport,
} from './report.js';
