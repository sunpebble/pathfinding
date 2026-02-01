/**
 * Smart Retry Strategy
 *
 * Three-layer retry strategy:
 * 1. Request-level: Exponential backoff for transient failures
 * 2. Session-level: Clear cookies and re-auth for session expiration
 * 3. Browser-level: Recreate browser instance for IP bans
 */

import type { AntiDetectionBrowserClient } from '../clients/anti-detection-client';
import type {
  BlockDetectionResult,
  BlockDetector,
  BlockType,
  RetryAttempt,
  RetryConfig,
  RetryMetrics,
} from './types';
import { createLogger } from '../../logger.js';
import { DEFAULT_RETRY_CONFIG } from './types';

const log = createLogger('retry-strategy');

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * 2 ** attempt;
  return Math.min(delay, maxDelay);
}

/**
 * Smart Retry Strategy Class
 *
 * Implements three-layer retry:
 * - Layer 1: Request retry with exponential backoff
 * - Layer 2: Session refresh (clear cookies, re-auth)
 * - Layer 3: Browser recreation (new IP via Kernel)
 */
export class RetryStrategy {
  private config: RetryConfig;
  private platform: string;
  private blockDetector: BlockDetector;
  private attempts: RetryAttempt[] = [];
  private startTime: number = 0;

  constructor(
    platform: string,
    blockDetector: BlockDetector,
    config?: Partial<RetryConfig>,
  ) {
    this.platform = platform;
    this.blockDetector = blockDetector;
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute an operation with retry strategy
   */
  async execute<T>(
    client: AntiDetectionBrowserClient,
    operation: () => Promise<T>,
    validateResult?: (result: T) => BlockDetectionResult,
  ): Promise<T> {
    this.startTime = Date.now();
    this.attempts = [];

    let lastError: Error | null = null;
    let lastBlockType: BlockType = 'none';

    // Layer 1: Request-level retries
    for (let requestAttempt = 0; requestAttempt < this.config.maxRequestRetries; requestAttempt++) {
      try {
        const result = await operation();

        // Validate result if validator provided
        if (validateResult) {
          const blockResult = validateResult(result);
          if (blockResult.type !== 'none') {
            lastBlockType = blockResult.type;
            this.recordAttempt('request', requestAttempt, blockResult.type, false);

            // Skip to appropriate layer based on block type
            if (blockResult.type === 'ip-ban' || blockResult.type === 'rate-limit') {
              break; // Go to browser-level retry
            }
            if (blockResult.type === 'session-expired' || blockResult.type === 'captcha') {
              // Try session refresh first
              const sessionResult = await this.trySessionRetry(client, operation, validateResult);
              if (sessionResult.success) {
                return sessionResult.result!;
              }
              break; // Go to browser-level retry
            }

            // For other cases, continue with request retry
            const delay = calculateBackoff(requestAttempt, this.config.baseDelay, this.config.maxDelay);
            log.info({ platform: this.platform, attempt: requestAttempt, delay }, 'Request retry after block detection');
            await sleep(delay);
            continue;
          }
        }

        // Success
        this.recordAttempt('request', requestAttempt, 'none', true);
        this.logMetrics('success');
        return result;
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.recordAttempt('request', requestAttempt, 'none', false);

        if (requestAttempt < this.config.maxRequestRetries - 1) {
          const delay = calculateBackoff(requestAttempt, this.config.baseDelay, this.config.maxDelay);
          log.warn({ platform: this.platform, attempt: requestAttempt, error: lastError.message, delay }, 'Request retry after error');
          await sleep(delay);
        }
      }
    }

    // Layer 2: Session-level retry (if not already tried)
    if (lastBlockType === 'none' || lastBlockType === 'captcha' || lastBlockType === 'session-expired') {
      const sessionResult = await this.trySessionRetry(client, operation, validateResult);
      if (sessionResult.success) {
        return sessionResult.result!;
      }
    }

    // Layer 3: Browser-level retry
    const browserResult = await this.tryBrowserRetry(client, operation, validateResult);
    if (browserResult.success) {
      return browserResult.result!;
    }

    // All retries exhausted
    this.logMetrics('failed');
    throw lastError || new Error(`All retry layers exhausted for ${this.platform}`);
  }

  /**
   * Try session-level retry
   */
  private async trySessionRetry<T>(
    client: AntiDetectionBrowserClient,
    operation: () => Promise<T>,
    validateResult?: (result: T) => BlockDetectionResult,
  ): Promise<{ success: boolean; result?: T }> {
    for (let sessionAttempt = 0; sessionAttempt < this.config.maxSessionRetries; sessionAttempt++) {
      try {
        log.info({ platform: this.platform, attempt: sessionAttempt }, 'Session-level retry: clearing cookies');
        await client.clearSession();

        // Wait before retry
        await sleep(this.config.baseDelay * 2);

        const result = await operation();

        if (validateResult) {
          const blockResult = validateResult(result);
          if (blockResult.type !== 'none') {
            this.recordAttempt('session', sessionAttempt, blockResult.type, false);
            continue;
          }
        }

        this.recordAttempt('session', sessionAttempt, 'none', true);
        this.logMetrics('success');
        return { success: true, result };
      }
      catch (error) {
        this.recordAttempt('session', sessionAttempt, 'none', false);
        log.warn({ platform: this.platform, attempt: sessionAttempt, error }, 'Session retry failed');
      }
    }

    return { success: false };
  }

  /**
   * Try browser-level retry
   */
  private async tryBrowserRetry<T>(
    client: AntiDetectionBrowserClient,
    operation: () => Promise<T>,
    validateResult?: (result: T) => BlockDetectionResult,
  ): Promise<{ success: boolean; result?: T }> {
    for (let browserAttempt = 0; browserAttempt < this.config.maxBrowserRetries; browserAttempt++) {
      try {
        log.info({ platform: this.platform, attempt: browserAttempt }, 'Browser-level retry: recreating browser');
        await client.recreate();

        // Wait before retry
        await sleep(this.config.baseDelay * 4);

        const result = await operation();

        if (validateResult) {
          const blockResult = validateResult(result);
          if (blockResult.type !== 'none') {
            this.recordAttempt('browser', browserAttempt, blockResult.type, false);
            continue;
          }
        }

        this.recordAttempt('browser', browserAttempt, 'none', true);
        this.logMetrics('success');
        return { success: true, result };
      }
      catch (error) {
        this.recordAttempt('browser', browserAttempt, 'none', false);
        log.warn({ platform: this.platform, attempt: browserAttempt, error }, 'Browser retry failed');
      }
    }

    return { success: false };
  }

  /**
   * Record a retry attempt
   */
  private recordAttempt(
    layer: 'request' | 'session' | 'browser',
    attempt: number,
    blockType: BlockType,
    success: boolean,
  ): void {
    this.attempts.push({
      layer,
      attempt,
      blockType,
      timestamp: Date.now(),
      success,
      duration: Date.now() - this.startTime,
    });
  }

  /**
   * Log retry metrics
   */
  private logMetrics(finalStatus: 'success' | 'failed'): void {
    const metrics: RetryMetrics = {
      platform: this.platform,
      totalAttempts: this.attempts.length,
      layers: {
        request: this.attempts.filter(a => a.layer === 'request').length,
        session: this.attempts.filter(a => a.layer === 'session').length,
        browser: this.attempts.filter(a => a.layer === 'browser').length,
      },
      blockTypes: this.attempts.reduce(
        (acc, a) => {
          acc[a.blockType] = (acc[a.blockType] || 0) + 1;
          return acc;
        },
        {} as Record<BlockType, number>,
      ),
      finalStatus,
      totalDuration: Date.now() - this.startTime,
    };

    log.info({ metrics }, 'Retry strategy complete');
  }

  /**
   * Get current retry attempts
   */
  getAttempts(): RetryAttempt[] {
    return [...this.attempts];
  }
}
