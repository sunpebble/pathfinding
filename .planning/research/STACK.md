# Technology Stack: Chinese Travel Platform Crawlers

**Project:** Pathfinding - Travel Guide Data Collection
**Researched:** 2026-01-25
**Overall Confidence:** MEDIUM-HIGH

## Executive Summary

The current implementation uses Chrome DevTools MCP which provides basic browser automation but lacks robust anti-detection capabilities needed for Chinese travel platforms with aggressive bot protection (Xiaohongshu, Ctrip, Mafengwo, Qunar, Tongcheng). This research identifies a 2025-optimal stack for reliable data extraction including full content, high-resolution images, and video URLs.

---

## Recommended Stack

### Core Browser Automation

| Technology               | Version | Purpose                    | Why                                                                                                                                                                                    | Confidence |
| ------------------------ | ------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **rebrowser-playwright** | 1.51.x  | Primary browser automation | Drop-in replacement for Playwright with anti-detection patches baked in. Passes Cloudflare/DataDome checks that standard Playwright fails. Maintained actively (last update May 2025). | HIGH       |
| Playwright (fallback)    | 1.51.0  | Base automation framework  | Microsoft-maintained, excellent API, but detectable without patches. Use rebrowser-playwright instead.                                                                                 | HIGH       |

**Rationale:** rebrowser-playwright is a patched version of Playwright that removes automation fingerprints at the source level. Unlike stealth plugins that inject JavaScript (detectable), rebrowser patches modify the browser binary behavior. This is critical for Xiaohongshu which actively detects `navigator.webdriver` and Chrome automation properties.

### Anti-Detection Layer

| Technology                           | Version | Purpose                    | Why                                                                                                                  | Confidence |
| ------------------------------------ | ------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| **rebrowser-patches**                | latest  | Automation leak prevention | Fixes 17+ known fingerprint leaks in Puppeteer/Playwright. Actively maintained, tested against modern bot detection. | HIGH       |
| playwright-stealth (NOT recommended) | -       | -                          | Injects JavaScript which is detectable by advanced systems. Chinese platforms use fingerprinting that catches this.  | N/A        |

**Alternative for Maximum Stealth:**

| Technology   | Version | Purpose                          | Why                                                                                                                                                                                  | Confidence |
| ------------ | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Camoufox** | latest  | Firefox-based undetected browser | Modifies fingerprints at C++ layer before JavaScript executes. Firefox-based (less fingerprinted than Chrome). Passes CreepJS tests. Consider if rebrowser-playwright gets detected. | MEDIUM     |

**Rationale:** Camoufox uses BrowserForge to rotate device fingerprints matching real-world traffic distributions. However, it's Firefox-based which may have compatibility issues with some Chinese sites optimized for Chrome.

### Session & Cookie Management

| Technology                  | Version  | Purpose                     | Why                                                                                                                | Confidence |
| --------------------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Playwright storageState** | Built-in | Persist login sessions      | Native Playwright API saves cookies + localStorage + IndexedDB to JSON. Reload across sessions without re-login.   | HIGH       |
| Custom profile directory    | -        | Browser profile persistence | Store Chrome profile with login state at `~/.pathfinding/chrome-profile`. Already implemented in current codebase. | HIGH       |

**Implementation Pattern (from Context7 official docs):**

```typescript
// Save after manual login
await context.storageState({ path: 'state.json' });

// Restore in subsequent runs
const context = await browser.newContext({
  storageState: 'state.json',
});
```

### Proxy Infrastructure

| Provider               | Use Case            | Why                                                                                  | Confidence |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------ | ---------- |
| **Oxylabs**            | Production scraping | 5M+ China residential IPs, 99.95% success rate, 0.6s response. Best for high-volume. | HIGH       |
| **Smartproxy**         | Budget alternative  | 580K China residential IPs, 99.99% uptime, more affordable.                          | MEDIUM     |
| **Self-hosted SOCKS5** | Development/testing | For local development, use VPN or cloud VM in China.                                 | LOW        |

**Rationale:** Residential proxies are essential for Chinese platforms. Datacenter IPs are immediately blocked. Oxylabs and Smartproxy are the only providers with substantial China IP pools verified in 2025.

**Proxy Rotation Strategy:**

- Rotate IP per request for listing pages
- Sticky session (same IP) for detail page sequences
- 3-5 second delay between requests from same IP

### HTML Parsing

| Technology  | Version | Purpose         | Why                                                                                                                         | Confidence |
| ----------- | ------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Cheerio** | 1.0.0+  | HTML parsing    | 40% faster than JSDOM (300ms vs 517ms benchmark). jQuery-like syntax. Perfect for static HTML extraction after page render. | HIGH       |
| JSDOM       | -       | NOT recommended | Slower, heavier, unnecessary when using Playwright for rendering.                                                           | N/A        |

### Image/Video Extraction

| Approach                     | Purpose                   | Implementation                                                                                     | Confidence |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| **Network interception**     | Capture API responses     | Intercept XHR/fetch for image/video URLs before page processes them. Get original resolution URLs. | HIGH       |
| **srcset parsing**           | High-res image URLs       | Parse `srcset` attributes, select highest resolution variant.                                      | HIGH       |
| **URL pattern manipulation** | Upgrade thumbnail to full | Replace size indicators (e.g., `_thumb` -> `_original`, `w_300` -> `w_2000`).                      | MEDIUM     |

**Platform-Specific Patterns:**

| Platform    | Image URL Pattern                                | Video URL Pattern                                    |
| ----------- | ------------------------------------------------ | ---------------------------------------------------- |
| Xiaohongshu | `sns-img-*.xhscdn.com` - replace `!nd_` suffixes | API response `video.media.stream.h264[0].master_url` |
| Ctrip       | `dimg*.c-ctrip.com` - remove `/r/` resize params | Embedded iframe or video element `src`               |
| Mafengwo    | `n*-q.mafengwo.net` - `_*_*` size suffix removal | `v.mafengwo.cn` video player API                     |

### Rate Limiting & Queue Management

| Technology     | Version | Purpose             | Why                                                 | Confidence |
| -------------- | ------- | ------------------- | --------------------------------------------------- | ---------- |
| **p-queue**    | 8.0.1   | Concurrency control | Limit concurrent requests, configurable delays.     | HIGH       |
| **Bottleneck** | 2.19.5  | Rate limiter        | More advanced rate limiting with reservoir pattern. | MEDIUM     |

**Recommended Delays:**

- Xiaohongshu: 3-5 seconds between requests (aggressive detection)
- Ctrip: 1-2 seconds (moderate detection)
- Mafengwo/Qunar/Tongcheng: 1 second (lighter detection)

---

## Alternatives Considered

| Category           | Recommended          | Alternative             | Why Not Alternative                                                                                           |
| ------------------ | -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Browser automation | rebrowser-playwright | Puppeteer               | Playwright has better API, cross-browser support, and rebrowser patches are more mature for Playwright        |
| Browser automation | rebrowser-playwright | Chrome DevTools MCP     | MCP is high-level abstraction without anti-detection. Good for simple tasks, insufficient for protected sites |
| Browser automation | rebrowser-playwright | Selenium                | Outdated, easily detected, poor async support                                                                 |
| Anti-detection     | rebrowser-patches    | playwright-stealth      | Stealth injects JS which is detectable; patches modify at binary level                                        |
| Anti-detection     | rebrowser-patches    | undetected-chromedriver | Python-only, Selenium-based, not compatible with Node.js stack                                                |
| HTML parsing       | Cheerio              | JSDOM                   | 40% slower, unnecessary DOM emulation overhead                                                                |
| HTML parsing       | Cheerio              | regex                   | Fragile, unmaintainable for complex HTML                                                                      |

---

## What NOT to Use

| Technology                         | Why Avoid                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Selenium**                       | Easily detected (`navigator.webdriver` leak), poor async support, outdated architecture                 |
| **playwright-stealth npm**         | Injects JavaScript that advanced fingerprinting detects. Chinese platforms specifically check for this. |
| **puppeteer-extra-plugin-stealth** | Same issue - JS injection is detectable by 2025 anti-bot systems                                        |
| **Datacenter proxies**             | Immediately blocked by Chinese platforms. Must use residential IPs.                                     |
| **Headless mode without patches**  | `HeadlessChrome` user-agent and missing GPU/WebGL signatures are detected                               |
| **Fixed User-Agent**               | Fingerprinting correlates UA with other browser properties. Mismatch = blocked.                         |
| **Chrome DevTools MCP alone**      | No anti-detection, no proxy support, limited network interception                                       |

---

## Installation

```bash
# Core automation with anti-detection
pnpm add rebrowser-playwright

# HTML parsing
pnpm add cheerio

# Rate limiting
pnpm add p-queue

# TypeScript types
pnpm add -D @types/node
```

**Note:** rebrowser-playwright is a drop-in replacement. Change imports:

```typescript
// Before
import { chromium } from 'playwright';

// After
import { chromium } from 'rebrowser-playwright';
```

---

## Architecture Recommendation

```
┌─────────────────────────────────────────────────────────┐
│                    Crawler Orchestrator                  │
│  (p-queue for concurrency, platform-specific configs)   │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  rebrowser-playwright│  │   Proxy Manager     │
│  (anti-detection)    │  │ (Oxylabs/Smartproxy)│
└─────────┬───────────┘  └──────────┬──────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
          ┌─────────────────────────┐
          │   Network Interceptor    │
          │ (capture API responses)  │
          └─────────────┬───────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│   Cheerio Parser    │  │  Media URL Resolver │
│ (extract content)   │  │ (high-res images)   │
└─────────────────────┘  └─────────────────────┘
```

---

## Migration Path from Current Implementation

1. **Phase 1:** Replace `chrome-devtools-mcp` with `rebrowser-playwright`
   - Minimal code changes (similar API patterns)
   - Immediate anti-detection improvement

2. **Phase 2:** Implement network interception for API capture
   - Xiaohongshu feed API returns full data including high-res media
   - More reliable than DOM scraping

3. **Phase 3:** Add proxy rotation
   - Start with Smartproxy for cost-effectiveness
   - Upgrade to Oxylabs if higher success rate needed

4. **Phase 4:** Implement per-platform rate limiting
   - Tune delays based on block frequency monitoring

---

## Confidence Assessment

| Component                  | Confidence | Rationale                                                            |
| -------------------------- | ---------- | -------------------------------------------------------------------- |
| rebrowser-playwright       | HIGH       | Actively maintained (May 2025), well-documented, drop-in replacement |
| Playwright storageState    | HIGH       | Official Microsoft API, verified via Context7 docs                   |
| Cheerio                    | HIGH       | Industry standard, verified performance benchmarks                   |
| Proxy providers            | MEDIUM     | Pricing/availability may change, verify current offerings            |
| Platform-specific patterns | MEDIUM     | URL patterns may change, monitor and adapt                           |
| Camoufox                   | MEDIUM     | Newer project, Firefox-based may have compatibility issues           |

---

## Sources

**HIGH Confidence (Official/Context7):**

- [Playwright Official Documentation](https://playwright.dev) - storageState API
- [Microsoft Playwright GitHub](https://github.com/microsoft/playwright) - v1.51.0

**MEDIUM Confidence (Verified Multiple Sources):**

- [rebrowser-patches GitHub](https://github.com/nicman23/rebrowser-patches) - Anti-detection patches
- [Oxylabs](https://oxylabs.io) - Residential proxy infrastructure
- [Smartproxy](https://smartproxy.com) - China proxy coverage
- [Cheerio vs JSDOM benchmarks](https://zenrows.com) - Performance comparison
- [Camoufox](https://camoufox.com) - Firefox-based anti-detection

**LOW Confidence (Single Source/Community):**

- Platform-specific URL patterns - Based on current implementation analysis, may change
