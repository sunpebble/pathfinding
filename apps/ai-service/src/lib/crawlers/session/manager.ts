/**
 * Session Manager
 * Manages login sessions for crawlers
 */

import type { BrowserClient } from '../clients/types.js';
import type { Platform, ValidationResult } from './validators.js';
import { getValidator } from './validators.js';

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
 * @param client - BrowserClient instance
 * @param platform - Platform to check
 * @returns ValidationResult with session status
 */
export async function checkSession(
  client: BrowserClient,
  platform: Platform,
): Promise<ValidationResult> {
  const snapshot = await client.takeSnapshot();
  const validator = getValidator(platform);
  return validator(snapshot.content);
}

/**
 * Initialize browser client with appropriate session type for platform
 *
 * @param client - BrowserClient instance
 * @param platform - Platform to initialize for
 */
export async function initSessionForPlatform(
  client: BrowserClient,
  platform: Platform,
): Promise<void> {
  const needsPersistent = needsPersistentSession(platform);

  // Initialize session with appropriate persistence setting
  await client.init({ persistent: needsPersistent });
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
 *
 * @param client - BrowserClient instance
 * @param platform - Platform to check
 */
export async function checkSessionWithGuidance(
  client: BrowserClient,
  platform: Platform,
): Promise<SessionCheckResult> {
  const validation = await checkSession(client, platform);

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
