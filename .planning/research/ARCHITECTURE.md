# Architecture Patterns: Travel Platform Crawler System

**Domain:** Web scraping for Chinese travel platforms with dynamic content
**Researched:** 2026-01-25
**Confidence:** HIGH (based on codebase analysis + verified best practices)

## Executive Summary

The current crawler architecture uses Chrome DevTools MCP for browser automation, which is a sound choice for handling dynamic JavaScript content. However, the architecture has several gaps that cause incomplete content extraction:

1. **Accessibility tree parsing is lossy** - The current snapshot approach captures accessibility tree text, missing rich structured data
2. **No explicit wait strategies** - Fixed `sleep()` delays don't account for varying load times
3. **Session management is incomplete** - Login state detection exists but isn't integrated into crawl flow
4. **No retry/fallback architecture** - Single extraction path with no resilience

## Current Architecture (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│                     crawlPlatform(platform, city)               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Platform-Specific Crawler                          │
│   (ctrip.ts, xiaohongshu.ts, mafengwo.ts, etc.)                │
│                                                                 │
│   1. Navigate to list page                                      │
│   2. Fixed sleep (2000ms)                                       │
│   3. Scroll to trigger lazy load                                │
│   4. Take accessibility tree snapshot                           │
│   5. Parse with regex + accessibility-parser                    │
│   6. Navigate to detail pages                                   │
│   7. Repeat extraction                                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    mcp-client.ts                                │
│                                                                 │
│   - navigateTo()      → new_page tool                           │
│   - takeSnapshot()    → take_snapshot tool (accessibility tree) │
│   - scrollToLoadContent() → press_key PageDown                  │
│   - listNetworkRequests() → list_network_requests               │
│   - getNetworkRequest()   → get_network_request (API data)      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               accessibility-parser.ts                           │
│                                                                 │
│   - extractPageTitle()    - extractHeadings()                   │
│   - extractStaticText()   - extractImageUrls()                  │
│   - extractAuthor()       - extractStats()                      │
└─────────────────────────────────────────────────────────────────┘
```

### Identified Problems

| Problem                 | Root Cause                                     | Impact                              |
| ----------------------- | ---------------------------------------------- | ----------------------------------- |
| Incomplete text content | Accessibility tree loses paragraph structure   | Articles missing sections           |
| Missing images          | Image URLs extracted via regex, not structured | Inconsistent image capture          |
| Login walls not handled | `persistent: false` in xiaohongshu.ts          | Zero results on protected platforms |
| Lazy content missed     | Fixed 2s wait doesn't ensure content loaded    | Partial page captures               |
| No API data fallback    | Network interception exists but underutilized  | Missing structured data             |

## Recommended Architecture (To-Be)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Crawler Orchestrator                         │
│   - Platform registry                                           │
│   - Session pool management                                     │
│   - Rate limiter (per-domain)                                   │
│   - Retry coordinator                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  Session Manager  │ │  Content Loader   │ │  Data Extractor   │
│                   │ │                   │ │                   │
│  - Login state    │ │  - Smart waiting  │ │  - Multi-strategy │
│  - Cookie persist │ │  - Scroll trigger │ │  - API + DOM      │
│  - Session pool   │ │  - Lazy detection │ │  - Validation     │
└───────────────────┘ └───────────────────┘ └───────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Adapter                              │
│   - MCP client wrapper                                          │
│   - Network interception                                        │
│   - Screenshot/debugging                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component                | Responsibility                                | Inputs                  | Outputs                  |
| ------------------------ | --------------------------------------------- | ----------------------- | ------------------------ |
| **Crawler Orchestrator** | Coordinate crawl jobs, manage concurrency     | Platform, city, options | CrawlResult[]            |
| **Session Manager**      | Handle login state, persist sessions          | Platform config         | Session (cookies, state) |
| **Content Loader**       | Navigate, wait for content, trigger lazy load | URL, wait strategy      | Page ready signal        |
| **Data Extractor**       | Extract structured content from page          | Page snapshot, API data | Extracted content        |
| **Browser Adapter**      | Abstract Chrome DevTools MCP                  | Commands                | MCP tool results         |

## Data Flow

### Primary Flow (API-First Strategy)

```
1. Orchestrator dispatches crawl job
        │
        ▼
2. Session Manager checks login state
   ├── If logged in: Continue with session
   └── If not logged in: Attempt anonymous OR fail gracefully
        │
        ▼
3. Content Loader navigates to URL
   ├── Start network request monitoring
   ├── Apply wait strategy (network idle OR element visible)
   └── Trigger lazy loading (scroll, intersection)
        │
        ▼
4. Data Extractor attempts extraction (priority order):
   ├── [Priority 1] API responses (XHR/Fetch JSON)
   ├── [Priority 2] DOM structured data (data-* attributes, JSON-LD)
   └── [Priority 3] Accessibility tree text (fallback)
        │
        ▼
5. Validation & normalization
   ├── Validate required fields present
   ├── Normalize content blocks
   └── Calculate quality score
        │
        ▼
6. Return CrawlResult (or retry with different strategy)
```

### Session Flow (Login-Protected Content)

```
1. Check for cached session (cookies in user data dir)
        │
        ▼
2. Navigate to platform with session
        │
        ▼
3. Detect login state from page content
   ├── Look for login prompts, captchas
   └── Look for user-specific elements (avatar, username)
        │
        ▼
4. If not logged in:
   ├── For automated: Use saved credentials (if available)
   └── For manual: Trigger login-helper flow, cache result
```

## Patterns to Follow

### Pattern 1: Smart Wait Strategy

**What:** Wait for specific conditions instead of fixed delays
**When:** After navigation, before content extraction
**Why:** Fixed delays either waste time or miss content

```typescript
// BAD: Fixed delay
await sleep(2000);
const snapshot = await takeSnapshot();

// GOOD: Wait for content signals
async function waitForContent(options: WaitOptions): Promise<void> {
  const { timeout = 30000, strategy = 'networkIdle' } = options;

  switch (strategy) {
    case 'networkIdle':
      // Wait until no network requests for 500ms
      await waitForNetworkIdle({ timeout, idleTime: 500 });
      break;
    case 'selector':
      // Wait for specific element
      await waitForElement(options.selector, { timeout });
      break;
    case 'text':
      // Wait for text to appear
      await waitForText(options.text, timeout);
      break;
  }
}
```

### Pattern 2: Multi-Strategy Extraction

**What:** Try multiple extraction methods in priority order
**When:** Extracting content from any page
**Why:** Different platforms expose data differently; fallbacks ensure resilience

```typescript
async function extractContent(page: Page): Promise<ExtractedContent> {
  // Strategy 1: API responses (most reliable, structured)
  const apiData = await extractFromNetworkRequests();
  if (apiData && isComplete(apiData)) {
    return { ...apiData, source: 'api' };
  }

  // Strategy 2: Structured DOM data
  const domData = await extractFromDOM();
  if (domData && isComplete(domData)) {
    return { ...domData, source: 'dom' };
  }

  // Strategy 3: Accessibility tree (fallback)
  const a11yData = await extractFromAccessibilityTree();
  return { ...a11yData, source: 'accessibility', confidence: 'low' };
}
```

### Pattern 3: Persistent Session Pool

**What:** Maintain authenticated sessions across crawl runs
**When:** Accessing login-protected content
**Why:** Avoids repeated login flows, reduces detection risk

```typescript
interface SessionPool {
  getSession(platform: string): Promise<Session | null>;
  saveSession(platform: string, session: Session): Promise<void>;
  isSessionValid(platform: string): Promise<boolean>;
  refreshSession(platform: string): Promise<Session>;
}

// Implementation uses Chrome user data directory
// ~/.pathfinding/chrome-profile/{platform}/
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fixed Sleep Delays

**What:** Using `sleep(2000)` instead of waiting for content
**Why bad:** Content may load faster (wasted time) or slower (missed content)
**Instead:** Use smart wait strategies based on network activity or DOM state

### Anti-Pattern 2: Single Extraction Path

**What:** Only using accessibility tree for content extraction
**Why bad:** Loses structured data, unreliable for rich content
**Instead:** Prioritize API/network data, fall back to DOM, then accessibility

### Anti-Pattern 3: Ignoring Login State

**What:** Proceeding with crawl when login wall is detected
**Why bad:** Returns empty or partial results without indication
**Instead:** Detect login walls early, fail fast with actionable message

### Anti-Pattern 4: No Rate Limiting Between Requests

**What:** Making requests as fast as possible
**Why bad:** Triggers anti-bot protection, gets IP blocked
**Instead:** Implement per-domain rate limits with jitter

## Suggested Build Order

Based on the analysis, here's the recommended order to fix the crawler architecture:

### Phase 1: Content Loading (Fix Wait Strategies)

**Priority:** CRITICAL
**Files:** `mcp-client.ts`
**What:** Replace fixed sleeps with smart wait strategies

- Add `waitForNetworkIdle()` function
- Add `waitForElement()` using snapshot polling
- Modify `scrollToLoadContent()` to detect when lazy content actually loads
- Add timeout handling with meaningful errors

**Why first:** This is the root cause of incomplete content. Until pages are properly loaded, extraction improvements won't help.

### Phase 2: Extraction Pipeline (Multi-Strategy)

**Priority:** HIGH
**Files:** `accessibility-parser.ts`, new `dom-extractor.ts`, new `api-extractor.ts`
**What:** Implement multi-strategy extraction

- Create `api-extractor.ts` to parse network responses (already partially done in xiaohongshu.ts)
- Enhance `accessibility-parser.ts` with better content block reconstruction
- Add extraction coordinator that tries strategies in order
- Add content validation (required fields, minimum content length)

**Why second:** Once content loads properly, better extraction yields more complete data.

### Phase 3: Session Management

**Priority:** MEDIUM
**Files:** `mcp-client.ts`, `login-helper.ts`, new `session-manager.ts`
**What:** Integrate session management into crawl flow

- Extract session logic from `login-helper.ts` into reusable module
- Add login state detection to each platform crawler
- Implement session persistence and validation
- Add graceful degradation for anonymous access

**Why third:** Many platforms work without login; this extends capability but isn't blocking.

### Phase 4: Orchestration & Resilience

**Priority:** MEDIUM
**Files:** new `orchestrator.ts`, `index.ts`
**What:** Add coordination, rate limiting, retries

- Implement rate limiter per domain
- Add retry logic with exponential backoff
- Add circuit breaker for persistently failing platforms
- Implement parallel crawling with concurrency limits

**Why fourth:** Improves reliability and efficiency once core extraction works.

## Scalability Considerations

| Concern                | At 10 pages                | At 1000 pages                | At 100K pages               |
| ---------------------- | -------------------------- | ---------------------------- | --------------------------- |
| **Browser instances**  | Single browser, sequential | Single browser with tab pool | Multiple browser instances  |
| **Session management** | Single user profile        | Rotating session pool        | Distributed session storage |
| **Rate limiting**      | Simple delay               | Per-domain adaptive          | Distributed rate limiter    |
| **Data storage**       | In-memory                  | SQLite/file-based            | Database with queue         |

## Sources

- Codebase analysis: `/Users/shikun/Developer/opensource/pathfinding/apps/ai-service/src/lib/crawlers/`
- [BrowserStack - Playwright Web Scraping](https://www.browserstack.com/) - Browser automation best practices
- [BrightData - Dynamic Content Scraping](https://www.brightdata.com/) - Dynamic JS content handling
- [Zyte - CDP Scraping Guide](https://www.zyte.com/) - Chrome DevTools Protocol patterns
- [Crawlee Documentation](https://crawlee.dev/) - Session pool management patterns
- [Google Search Documentation](https://developers.google.com/search/docs/crawling-indexing/lazy-loading) - Lazy loading indexability
