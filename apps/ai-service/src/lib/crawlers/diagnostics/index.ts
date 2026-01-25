/**
 * Diagnostics Module
 * Utilities for diagnosing crawler issues
 *
 * Provides:
 * - Raw data capture before parsing (captureForDiagnosis)
 * - Smart content stability detection (waitForContentStable)
 * - Failure categorization (acquisition vs parsing issues)
 * - Anti-bot indicator detection
 * - Human-readable diagnostic reports
 */

// Capture utilities
export {
  type DiagnosticCapture,
  captureForDiagnosis,
  waitForContentStable,
} from './capture.js';

// Report utilities
export {
  type FailureCategory,
  type AntiBotIndicators,
  type DiagnosticReport,
  detectAntiBotIndicators,
  categorizeFailure,
  generateDiagnosticReport,
  formatReportAsText,
} from './report.js';
