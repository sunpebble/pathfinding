# Domain Pitfalls: Chinese Travel Platform Crawlers

**Domain:** 旅行平台爬虫数据采集 (Chinese Travel Platform Scraping)
**Researched:** 2026-01-25
**Overall Confidence:** MEDIUM-HIGH (based on current codebase analysis + web research)

---

## Executive Summary

Chinese travel platforms (小红书, 马蜂窝, 携程, 去哪儿, 同程) employ sophisticated anti-bot measures that evolve frequently. The current codebase shows several patterns that are vulnerable to common pitfalls. This document catalogs critical mistakes to avoid, with specific prevention strategies mapped to implementation phases.

**Current Problem Context:** Pages are accessible but content is incomplete. Xiaohongshu and Mafengwo perform worst; Ctrip is relatively complete. The issue may be in the fetch phase, parse phase, or both.

---

## Critical Pitfalls

Mistakes that cause complete data loss or require architectural rewrites.

### Pitfall 1: Signature Algorithm Dependency (小红书 x-s)

**What goes wrong:** Xiaohongshu's `x-s` and `x-t` signature parameters are dynamically generated and change frequently (sometimes quarterly). Crawlers that rely on reverse-engineered signatures suddenly fail with 403 errors when the algorithm updates.

**Why it happens:**

- Developers spend effort reverse-engineering JavaScript to extract signature algorithms
- These algorithms are obfuscated and frequently rotated
- No fallback strategy exists when signatures fail

**Consequences:**

- Complete API failure (403 Forbidden)
- All data collection stops until algorithm is re-reversed
- Days/weeks of downtime per algorithm update

**Warning signs:**

- Sudden spike in 403 errors
- API requests return empty or error responses
- `x-s` signature validation fails server-side

**Prevention:**

1. **Prefer browser automation over API reverse-engineering** - Use Playwright/browser-based MCP approach (as current codebase does) to let the browser handle signatures
2. **Implement dual-path extraction** - API interception as primary, accessibility tree parsing as fallback
3. **Monitor signature validity** - Log API success rates, alert on degradation

**Phase to address:** Phase 1 (Foundation) - Ensure architecture doesn't depend on fragile signatures

**Current codebase status:** The xiaohongshu.ts correctly uses browser automation and API response interception, avoiding direct signature dependency. This is a GOOD pattern.

---

### Pitfall 2: Insufficient Wait Strategies for Dynamic Content

**What goes wrong:** Content appears incomplete because JavaScript hasn't finished rendering. Fixed `sleep()` delays are unreliable - sometimes too short (missing content), sometimes too long (wasting time).

**Why it happens:**

- Chinese travel sites use heavy JavaScript frameworks
- Content loads in waves (skeleton → basic → images → comments)
- Network conditions vary; fixed delays don't adapt

**Consequences:**

- Missing main content, images, or metadata
- Inconsistent data quality between runs
- False "content not found" errors

**Warning signs:**

- Snapshot content length varies wildly for same page type
- Images array is empty but page has visible images
- Title extraction fails despite page loading

**Prevention:**

1. **Replace fixed `sleep()` with condition-based waits:**
   ```typescript
   // BAD: await sleep(3000);
   // GOOD: await page.waitForSelector('.content-loaded', { timeout: 10000 });
   ```
2. **Implement content stability detection** - Wait until DOM stops changing
3. **Use network idle detection** - Wait for XHR/fetch requests to complete
4. **Progressive content verification** - Check expected elements exist before proceeding

**Phase to address:** Phase 2 (Content Loading) - Replace all fixed delays with smart waits

**Current codebase status:** All crawlers use `sleep()` with fixed delays (e.g., `sleep(3000)`). This is VULNERABLE to timing issues.

---

### Pitfall 3: CDN Image/Video URL Expiration

**What goes wrong:** Extracted image and video URLs work at crawl time but expire within minutes to hours. Stored URLs become broken links.

**Why it happens:**

- Chinese CDNs (xhscdn, mafengwocdn, ctripcdn) use signed URLs with short TTLs
- Xiaohongshu video URLs expire in ≤30 seconds
- Image URLs may expire in 10-60 minutes

**Consequences:**

- Broken images in stored content
- Video playback fails
- User experience degradation
- Need to re-crawl to refresh URLs

**Warning signs:**

- Image URLs contain timestamps or signature parameters (`?t=`, `&sign=`, `&expires=`)
- 403/404 errors when accessing stored URLs later
- URL patterns like `sns-img-qc.xhscdn.com` with query parameters

**Prevention:**

1. **Download and store media locally** during crawl, not just URLs
2. **Implement URL refresh mechanism** for time-sensitive media
3. **Store both CDN URL and permanent identifiers** (file IDs that can regenerate URLs)
4. **Add URL expiration metadata** to track when re-fetch is needed

**Phase to address:** Phase 3 (Media Handling) - Implement media download pipeline

**Current codebase status:** Current crawlers only store URLs without downloading. Video URLs from Xiaohongshu (`master_url`) will expire quickly.

---

### Pitfall 4: Login/Session State Loss

**What goes wrong:** Crawlers lose authenticated session state mid-crawl, causing content to become restricted or captcha walls to appear.

**Why it happens:**

- Cookies expire dynamically (小红书: ~10 minutes for some cookies)
- Session tokens invalidated by anti-bot systems
- IP rotation breaks session continuity
- Browser context isolation loses stored auth

**Consequences:**

- Partial data collection (some pages work, others don't)
- Captcha/verification walls block progress
- Inconsistent content access (logged-in vs guest view)

**Warning signs:**

- Snapshot contains "登录" (login) or "验证" (verify) prompts
- Content suddenly becomes minimal mid-crawl
- Different content quality for same page type

**Prevention:**

1. **Implement session health checks** before each page
2. **Use persistent browser contexts** with saved auth state
3. **Cookie refresh middleware** - detect expiration, re-authenticate
4. **Graceful degradation** - fall back to guest content when auth fails

**Phase to address:** Phase 1 (Foundation) - Session management infrastructure

**Current codebase status:** Code checks for login walls (`initialSnapshot.content.includes('登录')`) but lacks recovery mechanism. The `persistent: false` option discards auth between runs.

---

## Moderate Pitfalls

Mistakes that cause data quality issues or significant rework.

### Pitfall 5: Accessibility Tree Parsing Fragility

**What goes wrong:** Parsing assumes specific accessibility tree structure that varies between pages, updates, and browser versions.

**Why it happens:**

- Regex patterns are too rigid (`/heading\s+"([^"]+)"/`)
- Sites update their HTML structure frequently
- Accessibility tree format depends on Chrome version
- Edge cases in content formatting break parsers

**Consequences:**

- Titles extracted incorrectly or not at all
- Author names missing
- Stats (views, likes) not captured

**Prevention:**

1. **Use multiple extraction strategies with fallbacks**
2. **Implement fuzzy matching for labels** (not exact string match)
3. **Add extraction success metrics** to detect degradation
4. **Version-tag parsing rules** for different site layouts

**Phase to address:** Phase 2 (Parsing Enhancement)

**Current codebase status:** `accessibility-parser.ts` has good fallback chains but rigid regex patterns.

---

### Pitfall 6: Anti-Bot Detection via Browser Fingerprinting

**What goes wrong:** Even with Playwright, sites detect automation through fingerprinting and block or serve degraded content.

**Why it happens:**

- `navigator.webdriver = true` signals automation
- Canvas/WebGL fingerprints differ from real browsers
- Request timing patterns are too uniform
- Missing or inconsistent browser plugins/fonts

**Consequences:**

- Captcha challenges
- Empty or limited API responses
- IP bans (temporary or permanent)
- Degraded content (low-res images, no videos)

**Prevention:**

1. **Use stealth plugins** (`playwright-stealth` or equivalent)
2. **Randomize request timing** with human-like delays
3. **Rotate user agents** matching real browser distributions
4. **Configure realistic viewport/screen sizes**
5. **Use residential proxies** for sensitive platforms

**Phase to address:** Phase 1 (Foundation) - Browser configuration

---

### Pitfall 7: Incomplete Lazy Loading Handling

**What goes wrong:** Infinite scroll or lazy-loaded content is only partially captured because scrolling stops too early.

**Why it happens:**

- Fixed scroll count doesn't account for variable content lengths
- Scroll triggers happen before previous content loads
- No detection of "end of content" state

**Consequences:**

- Only first page of results captured
- Missing images that load on scroll
- Incomplete guide content

**Prevention:**

1. **Scroll until content stops growing:**
   ```typescript
   let previousHeight = 0;
   while (true) {
     await scroll();
     await waitForNetworkIdle();
     const newHeight = await getScrollHeight();
     if (newHeight === previousHeight) break;
     previousHeight = newHeight;
   }
   ```
2. **Detect loading indicators** and wait for them to disappear
3. **Count content items** and continue until stable

**Phase to address:** Phase 2 (Content Loading)

**Current codebase status:** Uses `scrollToLoadContent(3)` with fixed scroll count - may miss content.

---

### Pitfall 8: Rate Limiting and IP Bans

**What goes wrong:** Aggressive crawling triggers rate limits or permanent IP bans.

**Why it happens:**

- Request frequency too high
- Same IP hits multiple endpoints rapidly
- No backoff on 429 responses
- Patterns look like attacks, not users

**Consequences:**

- Temporary blocks (minutes to hours)
- Permanent IP blacklisting
- Degraded response quality (empty results)

**Prevention:**

1. **Implement exponential backoff** on rate limit responses
2. **Add random delays** between requests (2-5 seconds typical)
3. **Use proxy rotation** for high-volume crawling
4. **Respect robots.txt** (even if not enforced, shows good intent)
5. **Monitor response codes** and pause on degradation

**Phase to address:** Phase 1 (Foundation) - Request management

**Current codebase status:** Has `rateLimit` option but implementation is basic.

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable.

### Pitfall 9: City ID Mapping Incompleteness

**What goes wrong:** Crawler fails for cities not in hardcoded mapping.

**Prevention:**

- Implement city name search/lookup API
- Add fuzzy matching for city names
- Graceful fallback to search-based discovery

**Current codebase status:** Both `mafengwo.ts` and `ctrip.ts` have limited `CITY_IDS` maps.

---

### Pitfall 10: Character Encoding Issues

**What goes wrong:** Chinese characters display incorrectly or cause parsing failures.

**Prevention:**

- Ensure UTF-8 throughout pipeline
- Handle BOM markers in responses
- Validate Chinese content extraction with test cases

---

### Pitfall 11: Duplicate Content Detection Gaps

**What goes wrong:** Same content scraped multiple times wastes storage and processing.

**Prevention:**

- Deduplicate by `sourceExternalId` (current approach is correct)
- Add content hash comparison for edge cases
- Track last-crawled timestamps

**Current codebase status:** Uses `seenIds` Set for deduplication - good pattern.

---

## Phase-Specific Warnings

| Phase Topic      | Likely Pitfall        | Mitigation                          |
| ---------------- | --------------------- | ----------------------------------- |
| Browser Setup    | Fingerprint detection | Use stealth mode, realistic configs |
| Page Navigation  | Session loss          | Persistent contexts, auth refresh   |
| Content Loading  | Incomplete rendering  | Smart waits, stability detection    |
| API Interception | Signature changes     | Fallback to DOM parsing             |
| Data Extraction  | Parser fragility      | Multiple strategies, fuzzy matching |
| Media Handling   | URL expiration        | Download media, store identifiers   |
| Rate Management  | IP bans               | Backoff, proxy rotation, delays     |
| Storage          | Data quality          | Validation, dedup, encoding checks  |

---

## Platform-Specific Risk Matrix

| Platform             | Anti-Bot Level | Main Risks                                   | Recommended Approach                               |
| -------------------- | -------------- | -------------------------------------------- | -------------------------------------------------- |
| 小红书 (Xiaohongshu) | VERY HIGH      | x-s signature, 10min cookies, fingerprinting | Browser automation, API interception with fallback |
| 马蜂窝 (Mafengwo)    | MEDIUM-HIGH    | Captcha, session detection                   | Browser automation, login state management         |
| 携程 (Ctrip)         | MEDIUM         | Rate limiting, dynamic content               | Browser automation, generous delays                |
| 去哪儿 (Qunar)       | MEDIUM         | Similar to Ctrip                             | Browser automation                                 |
| 同程 (Tongcheng)     | LOW-MEDIUM     | Basic rate limiting                          | Browser automation                                 |

---

## Diagnostic Checklist

When content is incomplete, check in order:

1. **Is the page loading at all?**
   - Check snapshot length (>1000 chars for meaningful content)
   - Look for login/captcha walls in snapshot

2. **Is dynamic content loading?**
   - Increase scroll count
   - Add longer waits after scroll
   - Check for loading indicators

3. **Is the parser extracting correctly?**
   - Log raw snapshot content for manual inspection
   - Test regex patterns against actual content
   - Check for site layout changes

4. **Are API responses being captured?**
   - Verify network request interception is working
   - Check if expected endpoints are being hit
   - Parse response body for actual data

5. **Are media URLs valid?**
   - Test URLs immediately after extraction
   - Check for expiration parameters
   - Verify CDN accessibility

---

## Sources

- [CSDN - 小红书反爬机制分析 2025](https://csdn.net) - HIGH confidence (multiple articles)
- [CSDN - 携程动态加载解决方案](https://csdn.net) - MEDIUM confidence
- [Stack Overflow - Playwright infinite scroll handling](https://stackoverflow.com) - HIGH confidence
- [Medium - Playwright anti-bot bypass techniques](https://medium.com) - MEDIUM confidence
- [Scraperapi - CDN URL expiration handling](https://scraperapi.com) - MEDIUM confidence
- Current codebase analysis: `/apps/ai-service/src/lib/crawlers/` - HIGH confidence
