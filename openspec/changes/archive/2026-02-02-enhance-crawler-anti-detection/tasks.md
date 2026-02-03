## 1. Anti-Detection Browser Client

- [x] 1.1 Create `AntiDetectionBrowserClient` class in `apps/ai-service/src/lib/crawlers/clients/anti-detection-client.ts`
- [x] 1.2 Implement Kernel.sh stealth initialization with `stealth: true` option
- [x] 1.3 Implement fingerprint randomization (User-Agent, viewport, timezone, language)
- [x] 1.4 Implement fallback to Stagehand LOCAL mode when Kernel unavailable
- [x] 1.5 Integrate Stagehand AI capabilities (act/extract) through Kernel browser context
- [x] 1.6 Update `clients/index.ts` to export `createAntiDetectionClient()` factory

## 2. Smart Retry Strategy

- [x] 2.1 Create `RetryStrategy` class in `apps/ai-service/src/lib/crawlers/retry/strategy.ts`
- [x] 2.2 Define `BlockType` enum: `none`, `captcha`, `rate-limit`, `ip-ban`, `session-expired`
- [x] 2.3 Implement request-level retry with exponential backoff (1s, 2s, 4s, max 3 attempts)
- [x] 2.4 Implement session-level retry (cookie clear, re-auth)
- [x] 2.5 Implement browser-level retry (destroy and recreate Kernel instance)
- [x] 2.6 Add retry metrics logging (platform, layer, attempt, block type, duration)

## 3. Platform Block Detection

- [x] 3.1 Create `detectBlock` interface in `apps/ai-service/src/lib/crawlers/retry/types.ts`
- [x] 3.2 Implement `detectBlock` for xiaohongshu (login wall, rate limit patterns)
- [x] 3.3 Implement `detectBlock` for mafengwo (验证码, 频繁访问 patterns)
- [x] 3.4 Implement `detectBlock` for tongcheng
- [x] 3.5 Implement `detectBlock` for qyer
- [x] 3.6 Implement `detectBlock` for qunar

## 4. Platform Rate Limiter

- [x] 4.1 Create platform config in `apps/ai-service/src/lib/crawlers/rate-limiter/config.ts`
- [x] 4.2 Define rate limit params: xiaohongshu (2000-5000ms), mafengwo (1500-3000ms), etc.
- [x] 4.3 Implement `PlatformRateLimiter` class with adaptive delay calculation
- [x] 4.4 Implement burst limit enforcement (requests per minute tracking)
- [x] 4.5 Implement backoff multiplier after rate-limit detection (up to 4x)
- [x] 4.6 Add ctrip bypass logic (skip rate limiting for ctrip platform)

## 5. Crawler Integration

- [x] 5.1 Update `xiaohongshu.ts` to use AntiDetectionBrowserClient and RetryStrategy
- [x] 5.2 Update `mafengwo.ts` to use AntiDetectionBrowserClient and RetryStrategy
- [x] 5.3 Update `tongcheng.ts` to use AntiDetectionBrowserClient and RetryStrategy
- [x] 5.4 Update `qyer.ts` to use AntiDetectionBrowserClient and RetryStrategy
- [x] 5.5 Update `qunar.ts` to use AntiDetectionBrowserClient and RetryStrategy
- [x] 5.6 Verify ctrip.ts remains unchanged (excluded from this change)

## 6. Configuration & Testing

- [x] 6.1 Add new environment variables to `.env.example` (KERNEL_API_KEY, USE_LEGACY_CLIENT)
- [x] 6.2 Add rollback switch: `USE_LEGACY_CLIENT=true` to bypass new client
- [x] 6.3 Write unit tests for RetryStrategy
- [x] 6.4 Write unit tests for PlatformRateLimiter
- [x] 6.5 Manual integration test: crawl 10 guides from each platform and verify success rate
