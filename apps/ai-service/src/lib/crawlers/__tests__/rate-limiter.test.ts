import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformRateLimitConfig, PLATFORM_RATE_LIMITS } from '../rate-limiter/config.js';
import { PlatformRateLimiter } from '../rate-limiter/index.js';

// Mock the logger
vi.mock('../../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('platformRateLimiter', () => {
  let rateLimiter: PlatformRateLimiter;

  beforeEach(() => {
    rateLimiter = new PlatformRateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('waitBeforeRequest', () => {
    it('should skip rate limiting for ctrip (excluded platform)', async () => {
      const startTime = Date.now();
      const promise = rateLimiter.waitBeforeRequest('ctrip');
      await vi.runAllTimersAsync();
      await promise;
      const elapsed = Date.now() - startTime;

      // Should return immediately without delay
      expect(elapsed).toBeLessThan(100);
    });

    it('should apply delay for xiaohongshu', async () => {
      // Record the promise
      const promise = rateLimiter.waitBeforeRequest('xiaohongshu');

      // Advance timers to allow the delay to complete
      await vi.runAllTimersAsync();
      await promise;

      // Request should be recorded
      const stats = rateLimiter.getStats('xiaohongshu');
      expect(stats.recentRequests).toBe(1);
    });

    it('should apply cooldown when burst limit is reached', async () => {
      const config = getPlatformRateLimitConfig('mafengwo');

      // Make requests up to burst limit
      for (let i = 0; i < config.burstLimit; i++) {
        const promise = rateLimiter.waitBeforeRequest('mafengwo');
        await vi.runAllTimersAsync();
        await promise;
      }

      const stats = rateLimiter.getStats('mafengwo');
      expect(stats.recentRequests).toBe(config.burstLimit);
    });
  });

  describe('notifyRateLimitDetected', () => {
    it('should increase backoff multiplier', () => {
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(1);

      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(2);

      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(4);
    });

    it('should cap backoff multiplier at 4x', () => {
      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      rateLimiter.notifyRateLimitDetected('xiaohongshu');

      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(4);
    });
  });

  describe('resetBackoff', () => {
    it('should reset backoff multiplier to 1', () => {
      rateLimiter.notifyRateLimitDetected('xiaohongshu');
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(2);

      rateLimiter.resetBackoff('xiaohongshu');
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(1);
    });

    it('should handle reset when no backoff was set', () => {
      // Should not throw
      rateLimiter.resetBackoff('xiaohongshu');
      expect(rateLimiter.getStats('xiaohongshu').backoffMultiplier).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct stats for platform', async () => {
      const promise = rateLimiter.waitBeforeRequest('mafengwo');
      await vi.runAllTimersAsync();
      await promise;

      rateLimiter.notifyRateLimitDetected('mafengwo');

      const stats = rateLimiter.getStats('mafengwo');
      expect(stats.recentRequests).toBe(1);
      expect(stats.backoffMultiplier).toBe(2);
      expect(stats.config).toEqual(PLATFORM_RATE_LIMITS.mafengwo);
    });

    it('should return default config for unknown platform', () => {
      const stats = rateLimiter.getStats('unknown-platform');
      expect(stats.config.minDelay).toBe(3000);
      expect(stats.config.maxDelay).toBe(6000);
    });
  });
});

describe('getPlatformRateLimitConfig', () => {
  it('should return correct config for known platforms', () => {
    expect(getPlatformRateLimitConfig('xiaohongshu')).toEqual(PLATFORM_RATE_LIMITS.xiaohongshu);
    expect(getPlatformRateLimitConfig('mafengwo')).toEqual(PLATFORM_RATE_LIMITS.mafengwo);
    expect(getPlatformRateLimitConfig('ctrip')).toEqual(PLATFORM_RATE_LIMITS.ctrip);
  });

  it('should return default config for unknown platforms', () => {
    const config = getPlatformRateLimitConfig('unknown');
    expect(config.minDelay).toBe(3000);
    expect(config.maxDelay).toBe(6000);
    expect(config.burstLimit).toBe(5);
  });

  it('should mark ctrip as excluded', () => {
    const config = getPlatformRateLimitConfig('ctrip');
    expect(config.excluded).toBe(true);
  });
});
