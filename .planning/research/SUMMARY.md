# Project Research Summary

**Project:** Pathfinding - Chinese Travel Platform Crawler Enhancement
**Domain:** Travel content data extraction with dynamic JavaScript rendering
**Researched:** 2026-01-25
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project involves crawling five Chinese travel platforms (Xiaohongshu, Mafengwo, Ctrip, Qunar, Tongcheng) to extract travel guides with full content, high-resolution images, videos, author information, and engagement metrics. The current implementation uses Chrome DevTools MCP for browser automation, which is fundamentally sound for handling dynamic content, but suffers from critical architectural gaps causing incomplete data extraction.

The research reveals a clear pattern: **Ctrip and Qunar extract complete content because they navigate to detail pages, while Mafengwo and Tongcheng extract only partial content because they stop at list pages**. Xiaohongshu has the richest data but the strongest anti-bot protection. The recommended approach is a multi-strategy extraction architecture with rebrowser-playwright for anti-detection, API interception as primary extraction method with DOM/accessibility tree fallback, and persistent session management for login-protected platforms.

Key risks include signature algorithm dependency (especially Xiaohongshu's x-s parameter), CDN URL expiration for images/videos, session state loss during crawls, and aggressive rate limiting. These are mitigated through browser-based automation (avoiding direct API reverse engineering), immediate media download rather than URL storage, persistent session pools, and adaptive rate limiting with residential proxies.

## Key Findings

### Recommended Stack

The current Chrome DevTools MCP approach is appropriate for basic browser automation but lacks anti-detection capabilities required for platforms with aggressive bot protection (Xiaohongshu, Mafengwo). Migration to **rebrowser-playwright** provides the same Playwright API with built-in anti-detection patches that remove automation fingerprints at the browser binary level rather than through detectable JavaScript injection.

**Core technologies:**

- **rebrowser-playwright 1.51.x**: Drop-in replacement for standard Playwright with 17+ automation leak fixes baked in - critical for passing Cloudflare/DataDome checks on Xiaohongshu
- **Cheerio 1.0.0+**: HTML parsing with jQuery-like syntax, 40% faster than JSDOM for post-render extraction
- **p-queue 8.0.1**: Concurrency control and rate limiting to avoid IP bans (3-5 second delays for Xiaohongshu, 1-2 seconds for others)
- **Playwright storageState API**: Native session persistence for cookies + localStorage + IndexedDB to maintain login state across runs
- **Residential proxies (Oxylabs/Smartproxy)**: Essential for China-based platforms - datacenter IPs are immediately blocked

**Critical migration path:**

1. Replace Chrome DevTools MCP with rebrowser-playwright (minimal code changes, immediate anti-detection improvement)
2. Implement network request interception for API data capture
3. Add proxy rotation with sticky sessions
4. Implement per-platform adaptive rate limiting

### Expected Features

The six core data fields have varying extraction difficulty across platforms. Current implementation achieves HIGH quality on Ctrip/Qunar but POOR quality on Mafengwo/Tongcheng due to architectural issues, not platform limitations.

**Must have (table stakes):**

- **Full body content** (正文内容) - Currently only working on Ctrip/Qunar; Mafengwo/Tongcheng extract title snippets only because they don't navigate to detail pages
- **High-resolution images** - Available on all platforms but extraction is unreliable; Xiaohongshu provides image dimensions via API
- **Author information** - Pattern matching works but inconsistent; Xiaohongshu API provides complete author data (name, avatar, ID)
- **Publish date** - MISSING from all current implementations despite being available in HTML/API
- **Title and source URL** - Working across all platforms

**Should have (competitive):**

- **Video URLs with quality options** - Xiaohongshu provides H264/H265 master URLs via API, but these expire in ≤30 seconds (need immediate download)
- **Engagement metrics** (views, likes, comments, saves) - Xiaohongshu has richest data via API; others need DOM parsing improvements
- **Native tags/hashtags** - Xiaohongshu provides via API; others use keyword extraction (lower quality)
- **Multiple images** (up to 20) - Working on Ctrip/Qunar, needs improvement on other platforms

**Defer (v2+):**

- **Real-time comment content** - High API load, often blocked
- **User contact information** - Privacy law concerns (PIPL in China)
- **POI/itinerary structured data** - Platform-specific, requires deep extraction

**Anti-features (do NOT build):**

- Session hijacking or credential storage (use browser-based login helpers only)
- Bypassing captcha programmatically (detect and prompt user instead)
- High-frequency scraping without rate limits (current 0.5-2 req/sec is appropriate)

### Architecture Approach

The current single-path extraction architecture (accessibility tree only) is too fragile for platforms with rich API data and dynamic rendering. A multi-strategy approach dramatically improves data quality and resilience.

**Major components:**

1. **Crawler Orchestrator** - Manages platform registry, session pools, per-domain rate limiting, and retry coordination with exponential backoff

2. **Session Manager** - Handles login state detection, cookie persistence using Chrome user data directories (~/.pathfinding/chrome-profile/{platform}/), session validation, and graceful degradation to anonymous access

3. **Content Loader** - Replaces fixed sleep() delays with smart wait strategies (network idle detection, element visibility polling, content stability detection), implements progressive lazy loading until content stops growing

4. **Data Extractor** - Three-tier extraction strategy:
   - **Priority 1**: API responses via network interception (most reliable for Xiaohongshu)
   - **Priority 2**: DOM structured data (data-\* attributes, JSON-LD)
   - **Priority 3**: Accessibility tree parsing (fallback for when APIs fail)

5. **Browser Adapter** - Wraps rebrowser-playwright with network interception, proxy configuration, and debugging capabilities

**Critical architecture patterns:**

- **Smart wait strategies** instead of fixed delays - wait for network idle, specific elements, or DOM stability
- **Multi-strategy extraction** with fallbacks - API first, DOM second, accessibility tree last
- **Persistent session pools** - maintain authenticated sessions across crawl runs to avoid repeated logins
- **Progressive content loading** - scroll until content stops growing, not fixed iteration count

### Critical Pitfalls

Research identified 11 domain-specific pitfalls; top 5 by severity:

1. **Signature algorithm dependency (Xiaohongshu x-s)** - Reverse-engineered API signatures break quarterly causing complete data loss. **Prevention**: Use browser automation to let browser handle signatures, never depend on manually-computed request signatures. Current codebase correctly uses this approach.

2. **Insufficient wait strategies for dynamic content** - Fixed sleep() delays cause missing content when too short or wasted time when too long. **Prevention**: Replace all sleep() calls with condition-based waits (network idle, element visibility, content stability). Current codebase is VULNERABLE - all crawlers use fixed sleep(2000-3000).

3. **CDN image/video URL expiration** - Xiaohongshu video URLs expire in ≤30 seconds, image URLs in 10-60 minutes. **Prevention**: Download and store media locally during crawl, not just URLs. Current codebase only stores URLs - will have broken links within hours.

4. **Login/session state loss** - Cookies expire mid-crawl (Xiaohongshu ~10 minutes), causing captcha walls. **Prevention**: Implement session health checks before each page, use persistent browser contexts. Current code detects login walls but has no recovery mechanism; `persistent: false` discards auth between runs.

5. **Accessibility tree parsing fragility** - Rigid regex patterns break when sites update HTML structure. **Prevention**: Multiple extraction strategies with fuzzy matching, extraction success metrics to detect degradation. Current parser has good fallback chains but brittle patterns.

## Implications for Roadmap

Based on research, the work naturally divides into 4 phases addressing architectural gaps before adding new capabilities.

### Phase 1: Foundation - Browser Automation & Session Management

**Rationale:** Current architecture lacks anti-detection and persistent sessions, blocking access to protected content (especially Xiaohongshu and Mafengwo). Must fix before any extraction improvements have value.

**Delivers:**

- Migration from Chrome DevTools MCP to rebrowser-playwright
- Persistent session management with login state detection and recovery
- Basic rate limiting infrastructure per domain
- Proxy configuration support (prepared for Phase 3)

**Addresses:**

- Anti-bot detection (Pitfall #6)
- Session state loss (Pitfall #4)
- Rate limiting foundation (Pitfall #8)

**Avoids:**

- Signature algorithm dependency by using browser automation
- Fingerprint detection through rebrowser patches

**Technologies:** rebrowser-playwright, Playwright storageState API, session-manager module

### Phase 2: Content Loading - Smart Wait Strategies

**Rationale:** Incomplete content extraction is primarily caused by premature snapshot capture before dynamic content loads. Fixing wait strategies has immediate impact on data completeness across all platforms.

**Delivers:**

- Network idle detection to wait for API responses
- Element visibility polling for critical content markers
- Content stability detection (DOM stops changing)
- Progressive lazy loading (scroll until content stops growing, not fixed count)

**Addresses:**

- Insufficient wait strategies (Pitfall #2) - CRITICAL
- Incomplete lazy loading (Pitfall #7)
- Missing content sections on all platforms

**Avoids:**

- False "content not found" errors
- Inconsistent data quality between runs
- Wasted time on overly long fixed delays

**Technologies:** Network request monitoring, DOM mutation observers, scroll height tracking

### Phase 3: Extraction Pipeline - Multi-Strategy Architecture

**Rationale:** Xiaohongshu API provides dramatically better data than accessibility tree parsing (author avatars, video URLs, engagement metrics), but current architecture doesn't prioritize it. Other platforms need DOM fallbacks when accessibility parsing fails.

**Delivers:**

- API response interception and parsing (expand current Xiaohongshu approach)
- DOM structured data extraction (data-\* attributes, JSON-LD schemas)
- Enhanced accessibility tree parser with fuzzy matching
- Extraction coordinator that tries strategies in priority order
- Content validation (required fields, minimum quality thresholds)

**Addresses:**

- Missing publish dates (Priority 2 from FEATURES.md)
- Incomplete engagement metrics
- Accessibility tree fragility (Pitfall #5)

**Avoids:**

- Over-reliance on fragile parsing patterns
- Missing structured data available via APIs
- Low-confidence extraction without validation

**Technologies:** Network request interception, Cheerio for DOM parsing, validation schemas

### Phase 4: Detail Page Navigation - Complete Content Extraction

**Rationale:** Mafengwo and Tongcheng only extract from list pages, not detail pages. This is why they have POOR data quality despite platform content being available. Following Ctrip/Qunar pattern yields dramatic improvement.

**Delivers:**

- Detail page navigation for Mafengwo (similar to Ctrip pattern)
- Detail page navigation for Tongcheng
- Full article content extraction (vs title snippets)
- Multi-image extraction from detail pages
- Comments count and additional metadata

**Addresses:**

- List-only extraction problem (Priority 1 from FEATURES.md)
- Mafengwo data quality: LOW → HIGH
- Tongcheng data quality: LOW → HIGH

**Avoids:**

- Incomplete content that frustrates users
- Quality disparity between platforms

**Technologies:** Existing pattern from ctrip.ts and qunar.ts

### Phase 5: Media Handling - Download & Persistence

**Rationale:** CDN URLs expire quickly (Xiaohongshu videos ≤30 seconds, images 10-60 minutes). Storing URLs creates broken links. Must download during crawl window.

**Delivers:**

- Media download pipeline during crawl
- Local storage with organized directory structure
- URL expiration detection and metadata
- High-resolution image selection from srcset
- Video quality option handling

**Addresses:**

- CDN URL expiration (Pitfall #3) - CRITICAL for Xiaohongshu
- Broken images/videos in stored content
- High-resolution media capture

**Avoids:**

- Re-crawling to refresh expired URLs
- User experience degradation from broken media
- Loss of time-sensitive video URLs

**Technologies:** File download streams, CDN URL parsing, storage organization

### Phase 6: Production Hardening - Proxies & Monitoring

**Rationale:** High-volume crawling requires proxy rotation to avoid IP bans and monitoring to detect when platforms change anti-bot measures.

**Delivers:**

- Residential proxy rotation (Smartproxy/Oxylabs integration)
- Sticky session management per detail page sequence
- Extraction success rate monitoring
- Circuit breaker for persistently failing platforms
- Retry with exponential backoff

**Addresses:**

- IP bans from aggressive crawling (Pitfall #8)
- Platform changes breaking extraction (detection)
- Production reliability

**Avoids:**

- Permanent IP blacklisting
- Silent failures when sites update
- Cascading failures across platforms

**Technologies:** Proxy providers, metrics collection, circuit breaker pattern

### Phase Ordering Rationale

- **Phase 1 first** because rebrowser-playwright and session management are prerequisites for accessing protected content. Without this, Xiaohongshu and Mafengwo return login walls or empty results.

- **Phase 2 before Phase 3** because smart wait strategies ensure content is loaded before extraction attempts. No point improving extraction if content isn't rendered yet.

- **Phase 3 before Phase 4** because multi-strategy extraction patterns established here are reused in Phase 4 detail page navigation.

- **Phase 4 mid-sequence** because it delivers the largest data quality improvement (Mafengwo/Tongcheng LOW → HIGH) but depends on stable extraction from Phases 2-3.

- **Phase 5 after content extraction works** because downloading media is pointless if we're not extracting complete content yet.

- **Phase 6 last** because production hardening (proxies, monitoring) is needed for scale but not for functionality.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1**: Rebrowser-playwright migration patterns, MCP client wrapper architecture
- **Phase 5**: Platform-specific CDN URL patterns, video download authentication
- **Phase 6**: Proxy provider China IP pool verification, cost optimization

**Phases with standard patterns (skip research-phase):**

- **Phase 2**: Wait strategies are well-documented in Playwright docs
- **Phase 3**: DOM parsing and API interception are established patterns
- **Phase 4**: Pattern already exists in ctrip.ts/qunar.ts, just replicate

## Confidence Assessment

| Area         | Confidence  | Notes                                                                                                                             |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH        | rebrowser-playwright actively maintained (May 2025), drop-in replacement verified; Cheerio is industry standard                   |
| Features     | MEDIUM      | Based on codebase analysis and data model, not live testing; platform APIs may have changed                                       |
| Architecture | HIGH        | Current codebase analysis reveals clear gaps; recommended patterns are proven (Crawlee, browser automation best practices)        |
| Pitfalls     | MEDIUM-HIGH | Xiaohongshu x-s signature and session expiration verified in multiple sources; URL expiration patterns inferred from CDN behavior |

**Overall confidence:** MEDIUM-HIGH

Research is strong on technology stack and architecture patterns (verified through codebase analysis and official docs). Moderate confidence on platform-specific features because based on code review rather than live crawling. Pitfalls are well-researched from community sources but may evolve as platforms update anti-bot measures.

### Gaps to Address

**During Phase 1 planning:**

- Verify rebrowser-playwright handles MCP client patterns (network interception, snapshot API)
- Test whether session persistence works with MCP or requires direct Playwright
- Confirm proxy configuration compatibility with Chrome DevTools Protocol

**During Phase 3 planning:**

- Map current API endpoints for each platform (may have changed since code was written)
- Verify Xiaohongshu API response structure still matches current parser expectations
- Identify publish date extraction patterns for each platform (currently missing)

**During Phase 5 planning:**

- Test actual CDN URL expiration timings (currently based on community reports)
- Verify video URL authentication requirements (some may need cookies/headers)
- Determine storage requirements for high-volume media download

**During implementation:**

- Monitor extraction success rates to detect when platforms change structure
- A/B test wait strategies to find optimal balance between speed and completeness
- Validate that anti-detection measures actually work on live platforms (not just in theory)

## Sources

### Primary (HIGH confidence)

- Current codebase: `/Users/shikun/Developer/opensource/pathfinding/apps/ai-service/src/lib/crawlers/` - Direct analysis of implementation patterns, data models, and architectural gaps
- [Playwright Official Documentation](https://playwright.dev) - storageState API, wait strategies, network interception
- [Microsoft Playwright GitHub](https://github.com/microsoft/playwright) - Version 1.51.0 features and patterns

### Secondary (MEDIUM confidence)

- [rebrowser-patches GitHub](https://github.com/nicman23/rebrowser-patches) - Anti-detection patch details (May 2025 update)
- [Oxylabs](https://oxylabs.io) - China residential proxy infrastructure and success rates
- [Smartproxy](https://smartproxy.com) - China proxy pool coverage (580K IPs)
- [Cheerio vs JSDOM benchmarks](https://zenrows.com) - Performance comparison (40% faster)
- [BrowserStack - Playwright Web Scraping](https://www.browserstack.com/) - Browser automation best practices
- [Crawlee Documentation](https://crawlee.dev/) - Session pool management patterns
- CSDN articles on Xiaohongshu anti-bot mechanisms (2025) - Multiple sources on x-s signature rotation

### Tertiary (LOW confidence)

- Platform-specific URL patterns - Based on current implementation analysis, may change
- CDN URL expiration timings - Community reports, needs validation
- Video download authentication - Inferred from API structure, not tested

---

**Research completed:** 2026-01-25
**Ready for roadmap:** Yes

**Next steps:** Orchestrator can proceed to requirements definition using suggested 6-phase structure. Phase 1 (Foundation) and Phase 2 (Content Loading) should be prioritized as they address critical architectural gaps causing current data incompleteness.
