/**
 * Platform Rate Limiter
 *
 * Implements adaptive rate limiting with:
 * - Platform-specific delay configuration
 * - Burst limit enforcement
 * - Backoff multiplier after rate-limit detection
 * - ctrip bypass
 */

import type { PlatformRateLimitConfig } from './config.js';
import { createLogger } from '../../logger.js';
import { getPlatformRateLimitConfig } from './config.js';

const log = createLogger('rate-limiter');

/**
 * Request timestamp record
 */
interface RequestRecord {
  timestamp: number;
}

/**
 * Platform Rate Limiter
 *
 * Manages request timing to avoid triggering anti-bot detection.
 */
export class PlatformRateLimiter {
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private backoffMultipliers: Map<string, number> = new Map();
  private readonly maxHistorySize = 100;
  private readonly historyTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Wait before making a request (respects rate limits)
   */
  async waitBeforeRequest(platform: string): Promise<void> {
    const config = getPlatformRateLimitConfig(platform);

    // Skip rate limiting for excluded platforms (ctrip)
    if (config.excluded) {
      return;
    }

    // Check burst limit
    const history = this.getRequestHistory(platform);
    const recentRequests = this.countRecentRequests(history, 60000); // Last minute

    if (recentRequests >= config.burstLimit) {
      log.info({ platform, recentRequests, burstLimit: config.burstLimit }, 'Burst limit reached, applying cooldown');
      await this.sleep(config.cooldownPeriod);
    }

    // Calculate adaptive delay
    const delay = this.calculateDelay(platform, config);

    if (delay > 0) {
      log.debug({ platform, delay }, 'Rate limiting delay');
      await this.sleep(delay);
    }

    // Record this request
    this.recordRequest(platform);
  }

  /**
   * Notify rate limit detection (increases backoff)
   */
  notifyRateLimitDetected(platform: string): void {
    const currentMultiplier = this.backoffMultipliers.get(platform) || 1;
    const newMultiplier = Math.min(currentMultiplier * 2, 4); // Max 4x
    this.backoffMultipliers.set(platform, newMultiplier);
    log.info({ platform, multiplier: newMultiplier }, 'Rate limit detected, increasing backoff');
  }

  /**
   * Reset backoff multiplier (after successful request)
   */
  resetBackoff(platform: string): void {
    if (this.backoffMultipliers.has(platform)) {
      this.backoffMultipliers.delete(platform);
      log.debug({ platform }, 'Backoff reset');
    }
  }

  /**
   * Calculate delay based on config and backoff
   */
  private calculateDelay(platform: string, config: PlatformRateLimitConfig): number {
    const multiplier = this.backoffMultipliers.get(platform) || 1;
    const minDelay = config.minDelay * multiplier;
    const maxDelay = config.maxDelay * multiplier;

    // Random delay within range
    return minDelay + Math.random() * (maxDelay - minDelay);
  }

  /**
   * Get request history for a platform
   */
  private getRequestHistory(platform: string): RequestRecord[] {
    if (!this.requestHistory.has(platform)) {
      this.requestHistory.set(platform, []);
    }
    return this.requestHistory.get(platform)!;
  }

  /**
   * Record a request
   */
  private recordRequest(platform: string): void {
    const history = this.getRequestHistory(platform);
    history.push({ timestamp: Date.now() });

    // Cleanup old entries
    this.cleanupHistory(platform);
  }

  /**
   * Count requests in the last N milliseconds
   */
  private countRecentRequests(history: RequestRecord[], windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return history.filter(r => r.timestamp > cutoff).length;
  }

  /**
   * Cleanup old history entries
   */
  private cleanupHistory(platform: string): void {
    const history = this.getRequestHistory(platform);
    const cutoff = Date.now() - this.historyTTL;

    // Remove entries older than TTL
    const filtered = history.filter(r => r.timestamp > cutoff);

    // Also limit to maxHistorySize
    if (filtered.length > this.maxHistorySize) {
      filtered.splice(0, filtered.length - this.maxHistorySize);
    }

    this.requestHistory.set(platform, filtered);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current stats for a platform
   */
  getStats(platform: string): {
    recentRequests: number;
    backoffMultiplier: number;
    config: PlatformRateLimitConfig;
  } {
    const config = getPlatformRateLimitConfig(platform);
    const history = this.getRequestHistory(platform);

    return {
      recentRequests: this.countRecentRequests(history, 60000),
      backoffMultiplier: this.backoffMultipliers.get(platform) || 1,
      config,
    };
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new PlatformRateLimiter();
