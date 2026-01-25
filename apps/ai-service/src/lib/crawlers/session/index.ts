/**
 * Session Module
 * Manages login sessions and persistence for crawlers
 *
 * Provides:
 * - Session validity checking before crawls
 * - Persistent session management for platforms requiring login
 * - Platform-specific login detection
 *
 * Usage:
 * ```typescript
 * import { needsPersistentSession, checkSession, initSessionForPlatform } from './session/index.js';
 *
 * // Initialize correct session type
 * if (needsPersistentSession('xiaohongshu')) {
 *   await initSessionForPlatform('xiaohongshu');
 * }
 *
 * // Check session after navigating
 * const result = await checkSession('xiaohongshu');
 * if (!result.isValid) {
 *   console.log('Please login first');
 * }
 * ```
 */

// Manager exports
export {
  checkSession,
  checkSessionWithGuidance,
  initSessionForPlatform,
  needsPersistentSession,
  type SessionCheckResult,
} from './manager.js';

// Validator exports (for custom validation needs)
export {
  getValidator,
  type Platform,
  validateMafengwoSession,
  validatePublicSession,
  validateXiaohongshuSession,
  type ValidationResult,
} from './validators.js';
