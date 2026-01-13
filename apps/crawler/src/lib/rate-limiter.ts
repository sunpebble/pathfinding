/**
 * Rate Limiter
 * Per-platform token bucket rate limiting to prevent getting blocked
 */

/**
 * Supported platforms with rate limiting
 */
export type Platform = 'xiaohongshu' | 'ctrip' | 'weibo' | 'mafengwo';

/**
 * Rate limit configuration for a platform
 */
export interface RateLimitConfig {
  /** Maximum number of tokens in the bucket */
  maxTokens: number;
  /** Rate at which tokens refill (tokens per second) */
  refillRate: number;
  /** Platform identifier */
  platform: Platform;
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  /** Available tokens (rounded down) */
  availableTokens: number;
  /** Maximum tokens */
  maxTokens: number;
  /** Refill rate (tokens per second) */
  refillRate: number;
  /** Time until next token is available (ms) */
  nextTokenIn: number;
}

/**
 * Default rate limit configurations per platform
 * Based on observed platform behavior to avoid rate limiting
 */
const PLATFORM_RATE_LIMITS: Record<Platform, Omit<RateLimitConfig, 'platform'>> = {
  xiaohongshu: {
    maxTokens: 5,
    refillRate: 0.5, // 1 request per 2 seconds
  },
  ctrip: {
    maxTokens: 5,
    refillRate: 1.0, // 1 request per second
  },
  weibo: {
    maxTokens: 5,
    refillRate: 0.33, // 1 request per 3 seconds
  },
  mafengwo: {
    maxTokens: 5,
    refillRate: 0.5, // 1 request per 2 seconds (conservative default)
  },
};

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token was acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const tokensNeeded = 1 - this.tokens;
    const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;

    await sleep(waitTimeMs);
    return this.acquire();
  }

  /**
   * Get current status
   */
  getStatus(): RateLimitStatus {
    this.refill();

    const availableTokens = Math.floor(this.tokens);
    const nextTokenIn = this.tokens >= 1
      ? 0
      : ((1 - this.tokens) / this.refillRate) * 1000;

    return {
      availableTokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      nextTokenIn: Math.ceil(nextTokenIn),
    };
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Global rate limiters per platform
 */
const rateLimiters = new Map<Platform, TokenBucket>();

/**
 * Get or create rate limiter for a platform
 */
function getRateLimiter(platform: Platform): TokenBucket {
  let limiter = rateLimiters.get(platform);

  if (!limiter) {
    const config = PLATFORM_RATE_LIMITS[platform];
    limiter = new TokenBucket(config.maxTokens, config.refillRate);
    rateLimiters.set(platform, limiter);
    console.warn(`[RateLimiter] Created rate limiter for ${platform}: ${config.refillRate} req/s`);
  }

  return limiter;
}

/**
 * Acquire a token for the specified platform
 * Waits if necessary until a token is available
 *
 * @param platform - Platform to acquire token for
 */
export async function acquireToken(platform: Platform): Promise<void> {
  const limiter = getRateLimiter(platform);
  const status = limiter.getStatus();

  if (status.availableTokens === 0) {
    console.warn(
      `[RateLimiter] Rate limit reached for ${platform}, waiting ${status.nextTokenIn}ms`
    );
  }

  await limiter.acquire();
}

/**
 * Get current rate limit status for a platform
 *
 * @param platform - Platform to check status for
 * @returns Current rate limit status
 */
export function getStatus(platform: Platform): RateLimitStatus {
  const limiter = getRateLimiter(platform);
  return limiter.getStatus();
}

/**
 * Get status for all active platforms
 *
 * @returns Map of platform to rate limit status
 */
export function getAllStatus(): Map<Platform, RateLimitStatus> {
  const statusMap = new Map<Platform, RateLimitStatus>();

  for (const [platform, limiter] of rateLimiters.entries()) {
    statusMap.set(platform, limiter.getStatus());
  }

  return statusMap;
}

/**
 * Reset rate limiter for a platform (for testing)
 *
 * @param platform - Platform to reset
 */
export function resetRateLimiter(platform: Platform): void {
  rateLimiters.delete(platform);
  console.warn(`[RateLimiter] Reset rate limiter for ${platform}`);
}

/**
 * Export TokenBucket class for advanced use cases
 */
export { TokenBucket };

/**
 * Export RateLimiter class alias for backward compatibility
 */
export class RateLimiter {
  constructor(
    private readonly platform: Platform,
    maxTokens?: number,
    refillRate?: number
  ) {
    if (maxTokens !== undefined && refillRate !== undefined) {
      rateLimiters.set(
        platform,
        new TokenBucket(maxTokens, refillRate)
      );
    }
  }

  async acquire(): Promise<void> {
    return acquireToken(this.platform);
  }

  getStatus(): RateLimitStatus {
    return getStatus(this.platform);
  }
}
