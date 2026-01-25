/**
 * Session Manager
 * Manages login sessions for crawlers
 */

import type {Platform, ValidationResult} from './validators.js';
import { initMCP, isPersistentSession, takeSnapshot } from '../mcp-client.js';
import {
  getValidator
  
  
} from './validators.js';

/**
 * Platforms that require or benefit from persistent sessions
 */
const PERSISTENT_PLATFORMS: Platform[] = ['xiaohongshu', 'mafengwo'];

/**
 * Check if platform needs persistent Chrome session (with saved cookies)
 */
export function needsPersistentSession(platform: Platform): boolean {
  return PERSISTENT_PLATFORMS.includes(platform);
}

/**
 * Check if current session is valid for the given platform
 * Must be called after navigating to the platform's page
 *
 * @param platform - Platform to check
 * @returns ValidationResult with session status
 */
export async function checkSession(
  platform: Platform
): Promise<ValidationResult> {
  const snapshot = await takeSnapshot();
  const validator = getValidator(platform);
  return validator(snapshot.content);
}

/**
 * Initialize MCP with appropriate session type for platform
 * Uses persistent session for platforms that need login
 */
export async function initSessionForPlatform(
  platform: Platform
): Promise<void> {
  const needsPersistent = needsPersistentSession(platform);

  // Only reinitialize if current session type doesn't match
  if (needsPersistent && !isPersistentSession()) {
    await initMCP({ persistent: true });
  } else if (!needsPersistent && isPersistentSession()) {
    await initMCP({ persistent: false });
  }
  // Otherwise, current session is already correct type
}

/**
 * Session check result with actionable guidance
 */
export interface SessionCheckResult {
  platform: Platform;
  isValid: boolean;
  canCrawl: boolean;
  action?: 'login' | 'continue' | 'switch_session';
  message: string;
}

/**
 * Full session check with guidance
 */
export async function checkSessionWithGuidance(
  platform: Platform
): Promise<SessionCheckResult> {
  const validation = await checkSession(platform);

  if (!validation.isValid && validation.requiresLogin) {
    return {
      platform,
      isValid: false,
      canCrawl: false,
      action: 'login',
      message: `${platform} requires login. Run: pnpm --filter ai-service exec tsx src/login-helper.ts ${platform}`,
    };
  }

  if (!validation.isValid) {
    return {
      platform,
      isValid: false,
      canCrawl: false,
      action: 'switch_session',
      message: validation.reason || 'Session invalid',
    };
  }

  return {
    platform,
    isValid: true,
    canCrawl: true,
    action: 'continue',
    message: validation.reason || 'Session valid',
  };
}
