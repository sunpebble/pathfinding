/**
 * Platform Rate Limiter Configuration
 *
 * Defines rate limit parameters for each platform.
 * ctrip is excluded from rate limiting per requirements.
 */

/**
 * Rate limit configuration for a platform
 */
export interface PlatformRateLimitConfig {
  /** Minimum delay between requests (ms) */
  minDelay: number;
  /** Maximum delay between requests (ms) */
  maxDelay: number;
  /** Maximum requests per minute before cooldown */
  burstLimit: number;
  /** Cooldown period after burst limit (ms) */
  cooldownPeriod: number;
  /** Whether this platform is excluded from rate limiting */
  excluded?: boolean;
}

/**
 * Platform rate limit configurations
 */
export const PLATFORM_RATE_LIMITS: Record<string, PlatformRateLimitConfig> = {
  xiaohongshu: {
    minDelay: 2000,
    maxDelay: 5000,
    burstLimit: 10,
    cooldownPeriod: 60000,
  },
  mafengwo: {
    minDelay: 1500,
    maxDelay: 3000,
    burstLimit: 20,
    cooldownPeriod: 30000,
  },
  tongcheng: {
    minDelay: 1500,
    maxDelay: 3000,
    burstLimit: 20,
    cooldownPeriod: 30000,
  },
  qyer: {
    minDelay: 1500,
    maxDelay: 3500,
    burstLimit: 15,
    cooldownPeriod: 45000,
  },
  qunar: {
    minDelay: 1500,
    maxDelay: 3000,
    burstLimit: 20,
    cooldownPeriod: 30000,
  },
  // ctrip is excluded from rate limiting
  ctrip: {
    minDelay: 0,
    maxDelay: 0,
    burstLimit: 0,
    cooldownPeriod: 0,
    excluded: true,
  },
};

/**
 * Default configuration for unknown platforms
 */
export const DEFAULT_RATE_LIMIT_CONFIG: PlatformRateLimitConfig = {
  minDelay: 3000,
  maxDelay: 6000,
  burstLimit: 5,
  cooldownPeriod: 60000,
};

/**
 * Get rate limit config for a platform
 */
export function getPlatformRateLimitConfig(platform: string): PlatformRateLimitConfig {
  return PLATFORM_RATE_LIMITS[platform] || DEFAULT_RATE_LIMIT_CONFIG;
}
