# Phase 1: Diagnosis - Research

**Researched:** 2026-01-25
**Domain:** Web Crawler Diagnostics / Data Extraction Analysis
**Confidence:** HIGH

## Summary

This research addresses how to systematically diagnose why each platform's crawler returns incomplete data. The analysis covers the existing codebase using Chrome DevTools MCP for browser automation, which provides accessibility tree snapshots and network request monitoring capabilities.

**Key findings:**

1. The current crawlers use fixed `sleep()` delays which cause inconsistent extraction - they may complete before content loads or wait unnecessarily long
2. Ctrip and Qunar crawlers navigate to detail pages and extract full content; Mafengwo and Tongcheng only parse list pages (extracting minimal metadata from surrounding context)
3. Chrome DevTools MCP provides built-in diagnostics through `take_snapshot`, `list_network_requests`, `get_network_request`, and `list_console_messages` - these should be used systematically
4. All platforms require distinguishing between **acquisition issues** (page didn't load, anti-bot blocked, login required) vs **parsing issues** (HTML loaded but parser didn't extract correctly)

**Primary recommendation:** Create a diagnostic workflow that captures raw responses (accessibility tree + network data) before any parsing, then compares expected vs actual data to pinpoint root causes.

## Standard Stack

The crawlers already use the correct foundational stack. For diagnostics, leverage existing tools:

### Core

| Library                   | Version | Purpose            | Why Standard                                                                  |
| ------------------------- | ------- | ------------------ | ----------------------------------------------------------------------------- |
| chrome-devtools-mcp       | latest  | Browser automation | Already in use - provides anti-detection, accessibility tree, network capture |
| @modelcontextprotocol/sdk | 1.x     | MCP client         | Already in use - connects to Chrome DevTools MCP                              |

### Supporting (for Diagnostics)

| Library              | Version | Purpose                   | When to Use                                   |
| -------------------- | ------- | ------------------------- | --------------------------------------------- |
| fs (node built-in)   | -       | Save diagnostic artifacts | Dump raw HTML/snapshots for manual inspection |
| path (node built-in) | -       | File path handling        | Organize diagnostic outputs by platform       |

### Alternatives Considered

| Instead of                 | Could Use                 | Tradeoff                                                                      |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Chrome DevTools MCP        | Playwright directly       | MCP provides better anti-detection; already integrated                        |
| Accessibility tree parsing | HTML parsing with cheerio | Accessibility tree is what MCP returns; HTML would require additional capture |

**Installation:**
No additional packages needed - use existing MCP client and Node.js built-ins.

## Architecture Patterns

### Recommended Diagnostic Structure

```
apps/ai-service/src/
├── lib/crawlers/
│   ├── diagnostics/           # NEW: Diagnostic utilities
│   │   ├── capture.ts         # Raw response capture
│   │   ├── compare.ts         # Expected vs actual comparison
│   │   └── report.ts          # Diagnostic output formatting
│   ├── accessibility-parser.ts
│   ├── mcp-client.ts
│   └── [platform].ts
└── diagnose-crawlers.ts       # NEW: Diagnostic entry point
```

### Pattern 1: Two-Phase Diagnostic Capture

**What:** Capture raw data separately from parsing, enabling root cause identification
**When to use:** Every diagnostic run
**Example:**

```typescript
// Source: Chrome DevTools MCP documentation
interface DiagnosticCapture {
  platform: string;
  url: string;
  timestamp: number;
  // Raw acquisition data
  snapshot: string; // Full accessibility tree
  networkRequests: NetworkRequest[];
  consoleMessages: string[]; // Errors/warnings
  // Timing data
  navigationTime: number;
  contentLoadTime: number;
  // Parsed results
  parseResult: CrawlResult | null;
  parseErrors: string[];
}

async function captureForDiagnosis(
  platform: string,
  url: string
): Promise<DiagnosticCapture> {
  const startNav = Date.now();
  await navigateTo(url, { timeout: 30000 });
  const navigationTime = Date.now() - startNav;

  // Wait for content with smart detection
  await waitForContentStable();
  const contentLoadTime = Date.now() - startNav - navigationTime;

  // Capture all raw data
  const snapshot = await takeSnapshot({ verbose: true });
  const networkRequests = await listNetworkRequests([
    'xhr',
    'fetch',
    'document',
  ]);
  const consoleMessages = await listConsoleMessages({
    types: ['error', 'warning'],
  });

  return {
    platform,
    url,
    timestamp: Date.now(),
    snapshot: snapshot.content,
    networkRequests,
    consoleMessages,
    navigationTime,
    contentLoadTime,
    parseResult: null, // Filled by parser
    parseErrors: [],
  };
}
```

### Pattern 2: Content Stability Detection

**What:** Replace fixed sleep() with smart waiting that detects when content is fully loaded
**When to use:** Before taking snapshots
**Example:**

```typescript
// Source: Derived from Chrome DevTools MCP wait_for patterns
async function waitForContentStable(
  maxWait: number = 10000,
  stabilityWindow: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  let lastSnapshotLength = 0;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    const snapshot = await takeSnapshot();
    const currentLength = snapshot.content.length;

    if (currentLength === lastSnapshotLength && currentLength > 0) {
      stableCount++;
      if (stableCount >= 2) {
        return true; // Content is stable
      }
    } else {
      stableCount = 0;
    }

    lastSnapshotLength = currentLength;
    await sleep(stabilityWindow);
  }

  return false; // Timed out before stabilizing
}
```

### Pattern 3: Acquisition vs Parsing Distinction

**What:** Categorize failures into acquisition (page not loaded) vs parsing (data not extracted)
**When to use:** Every diagnostic report
**Example:**

```typescript
type FailureCategory =
  | 'acquisition:blocked' // Anti-bot detected
  | 'acquisition:login_required' // Login wall shown
  | 'acquisition:timeout' // Page didn't load
  | 'acquisition:captcha' // Captcha challenge
  | 'acquisition:empty' // Page loaded but empty
  | 'parsing:no_content' // Snapshot exists but no text extracted
  | 'parsing:no_images' // Text extracted but no images
  | 'parsing:partial' // Some fields missing
  | 'parsing:selector_miss' // Pattern didn't match
  | 'success'; // All expected data present

function categorizeFailure(capture: DiagnosticCapture): FailureCategory {
  const { snapshot, parseResult, consoleMessages } = capture;

  // Check for acquisition issues first
  if (snapshot.length < 500) return 'acquisition:empty';
  if (/验证|captcha|verify/i.test(snapshot)) return 'acquisition:captcha';
  if (/登录|sign.?in|login/i.test(snapshot) && !/退出|logout/i.test(snapshot)) {
    return 'acquisition:login_required';
  }
  if (consoleMessages.some((m) => m.includes('ERR_BLOCKED'))) {
    return 'acquisition:blocked';
  }

  // Check parsing issues
  if (!parseResult) return 'parsing:no_content';
  if (!parseResult.content || parseResult.content.length < 100) {
    return 'parsing:no_content';
  }
  if (!parseResult.imageUrls?.length) return 'parsing:no_images';
  if (!parseResult.title) return 'parsing:partial';

  return 'success';
}
```

### Anti-Patterns to Avoid

- **Fixed sleep() for all pages:** Different pages load at different speeds; use content stability detection
- **Parsing without raw capture:** Always capture raw data first so you can diagnose failures later
- **Silent failures:** Log why extraction failed, not just that it failed
- **Detail page skipping:** Mafengwo and Tongcheng only extract from list pages - they must navigate to detail pages for complete data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build            | Use Instead                                         | Why                         |
| -------------------------- | ---------------------- | --------------------------------------------------- | --------------------------- |
| Waiting for page load      | Fixed sleep() delays   | `wait_for` text + content stability detection       | Fixed delays are unreliable |
| Network request inspection | Manual fetch() logging | `list_network_requests` + `get_network_request`     | MCP captures all traffic    |
| Console error detection    | Try-catch only         | `list_console_messages`                             | Captures all JS errors      |
| Anti-bot detection         | Manual UA checks       | Inspect console errors + snapshot for captcha/login | More comprehensive          |

**Key insight:** Chrome DevTools MCP already provides diagnostic capabilities - use them systematically rather than building custom solutions.

## Common Pitfalls

### Pitfall 1: Testing with Wrong Session Type

**What goes wrong:** Using `persistent: false` for platforms that require login, getting incomplete data
**Why it happens:** Some crawlers use isolated sessions by default, losing login state
**How to avoid:** For Xiaohongshu and Mafengwo, always test with `persistent: true` after running login-helper
**Warning signs:** "登录" or "扫码登录" in snapshot; 0 results from platforms that should work

### Pitfall 2: Snapshot Too Early

**What goes wrong:** Taking snapshot before dynamic content loads
**Why it happens:** JavaScript-heavy pages load content asynchronously
**How to avoid:** Use content stability detection, check for expected elements with `wait_for`
**Warning signs:** Snapshot length much smaller than expected; missing content blocks

### Pitfall 3: Conflating List Page and Detail Page Extraction

**What goes wrong:** Extracting minimal metadata from list page context instead of full content from detail page
**Why it happens:** Simpler implementation, avoiding extra navigation
**How to avoid:** Ctrip and Qunar pattern - navigate to each guide's URL and extract full content
**Warning signs:** Very short content (< 200 chars), no body text, only title/cover image

### Pitfall 4: Not Checking Console Errors

**What goes wrong:** Missing JavaScript errors that prevent content from rendering
**Why it happens:** Errors are silent in automated browser
**How to avoid:** Always call `list_console_messages({ types: ['error', 'warning'] })` during diagnosis
**Warning signs:** Page renders but content sections are empty

### Pitfall 5: Ignoring API Responses

**What goes wrong:** Xiaohongshu serves data via API, not in HTML - parsing only snapshot misses data
**Why it happens:** Focus on DOM/accessibility tree only
**How to avoid:** Check `list_network_requests` for API calls, parse JSON responses directly
**Warning signs:** Xiaohongshu crawler returns limited data even when logged in

## Code Examples

### Example 1: Complete Diagnostic Capture

```typescript
// Source: Derived from Chrome DevTools MCP documentation
import {
  navigateTo,
  takeSnapshot,
  listNetworkRequests,
  getNetworkRequest,
  sleep,
} from './mcp-client.js';

async function runDiagnostic(platform: string, url: string): Promise<void> {
  console.log(`[Diagnostic] ${platform}: ${url}`);

  // 1. Navigate and measure timing
  const navStart = Date.now();
  await navigateTo(url, { timeout: 30000 });
  console.log(`[Diagnostic] Navigation: ${Date.now() - navStart}ms`);

  // 2. Wait for content stability (not fixed sleep)
  let stable = false;
  let lastLength = 0;
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const snap = await takeSnapshot();
    if (snap.content.length === lastLength && lastLength > 1000) {
      stable = true;
      break;
    }
    lastLength = snap.content.length;
  }
  console.log(`[Diagnostic] Content stable: ${stable}, length: ${lastLength}`);

  // 3. Capture full snapshot
  const snapshot = await takeSnapshot({ verbose: true });
  console.log(`[Diagnostic] Snapshot: ${snapshot.content.length} chars`);
  console.log(`[Diagnostic] Preview: ${snapshot.content.substring(0, 500)}`);

  // 4. Check for anti-bot indicators
  const antiBot = detectAntiBotIndicators(snapshot.content);
  console.log(`[Diagnostic] Anti-bot detected: ${JSON.stringify(antiBot)}`);

  // 5. List network requests
  const requests = await listNetworkRequests(['xhr', 'fetch', 'document']);
  console.log(`[Diagnostic] Network requests: ${requests.length}`);
  for (const req of requests.slice(0, 10)) {
    console.log(`  [${req.status}] ${req.method} ${req.url.substring(0, 80)}`);
  }

  // 6. Check for API data (especially Xiaohongshu)
  const apiRequests = requests.filter(
    (r) => r.url.includes('/api/') || r.url.includes('/v1/')
  );
  for (const req of apiRequests.slice(0, 5)) {
    const detail = await getNetworkRequest(req.reqid);
    if (detail?.responseBody) {
      console.log(
        `[Diagnostic] API response (${req.url.substring(0, 50)}): ${detail.responseBody.substring(0, 200)}`
      );
    }
  }
}

function detectAntiBotIndicators(content: string): Record<string, boolean> {
  return {
    captcha: /验证|captcha|verify/i.test(content),
    loginWall:
      /登录|sign.?in|login/i.test(content) && !/退出|logout/i.test(content),
    blocked: /blocked|forbidden|access denied/i.test(content),
    empty: content.length < 500,
  };
}
```

### Example 2: Platform-Specific Diagnostics

```typescript
// Diagnostic checklist for each platform
const PLATFORM_DIAGNOSTICS = {
  ctrip: {
    listPagePattern: /\/travels\/[A-Za-z]+\d+\/t3-p\d+\.html/,
    detailPagePattern: /\/travels\/[A-Za-z]+\d+\/\d+\.html/,
    requiredFields: ['title', 'content', 'authorName', 'imageUrls'],
    expectsLogin: false,
    antiBot: ['captcha', 'verify'],
    contentMinLength: 1000,
  },
  mafengwo: {
    listPagePattern: /\/travel-scenic-spot\/mafengwo\/\d+\.html/,
    detailPagePattern: /\/i\/\d+\.html/,
    requiredFields: ['title', 'content', 'authorName'],
    expectsLogin: true, // For full content
    antiBot: ['验证', 'captcha'],
    contentMinLength: 500,
  },
  qunar: {
    listPagePattern: /\/p-cs.*\/youji\?page=\d+/,
    detailPagePattern: /\/youji\/\d+/,
    requiredFields: ['title', 'content', 'authorName', 'imageUrls'],
    expectsLogin: false,
    antiBot: ['captcha'],
    contentMinLength: 1000,
  },
  tongcheng: {
    listPagePattern: /\/travels\//,
    detailPagePattern: /\/travels\/\d+\.html/,
    requiredFields: ['title', 'content'],
    expectsLogin: false,
    antiBot: [],
    contentMinLength: 500,
  },
  xiaohongshu: {
    listPagePattern: /\/explore$/,
    detailPagePattern: /\/explore\/[a-f0-9]{24}/,
    requiredFields: ['title', 'content', 'authorName', 'imageUrls'],
    expectsLogin: true, // For full data
    antiBot: ['登录', '验证', 'captcha', 'security'],
    contentMinLength: 100,
    apiEndpoints: ['/api/sns/web/v1/feed', '/api/sns/web/v1/homefeed'],
  },
};
```

## State of the Art

| Old Approach               | Current Approach              | When Changed          | Impact                   |
| -------------------------- | ----------------------------- | --------------------- | ------------------------ |
| Fixed sleep() delays       | Content stability detection   | Current best practice | More reliable extraction |
| HTML parsing               | Accessibility tree parsing    | Chrome DevTools MCP   | Better anti-detection    |
| Ignoring network traffic   | Capturing API responses       | Especially for XHS    | More complete data       |
| One-size-fits-all crawling | Platform-specific diagnostics | Current need          | Targeted fixes           |

**Deprecated/outdated:**

- Playwright with standard automation: Detected by anti-bot systems; Chrome DevTools MCP provides better stealth
- cheerio HTML parsing: Not applicable since MCP returns accessibility tree, not HTML

## Open Questions

1. **API Response Encryption**
   - What we know: Xiaohongshu API responses may be encrypted or signed
   - What's unclear: Exact encryption mechanism and whether responses can be parsed
   - Recommendation: Capture raw API responses during diagnosis to analyze structure

2. **Rate Limiting Thresholds**
   - What we know: All platforms have some rate limiting
   - What's unclear: Exact thresholds before blocking
   - Recommendation: Log timing data during diagnosis to identify patterns

3. **Content Lazy Loading Triggers**
   - What we know: Some content loads on scroll
   - What's unclear: Optimal scroll count and timing per platform
   - Recommendation: Compare snapshot length at different scroll counts

## Sources

### Primary (HIGH confidence)

- `/chromedevtools/chrome-devtools-mcp` - Context7 documentation for take_snapshot, list_network_requests, get_network_request, list_console_messages, wait_for
- `/microsoft/playwright` - Context7 documentation for debugging patterns (HAR recording concepts)
- Codebase analysis of all 5 crawler implementations in `apps/ai-service/src/lib/crawlers/`

### Secondary (MEDIUM confidence)

- Pattern analysis from existing `accessibility-parser.ts` and `mcp-client.ts` implementations
- Login helper script patterns from `login-helper.ts`

### Tertiary (LOW confidence)

- General web scraping diagnostic patterns (no specific authoritative source)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing codebase tools
- Architecture: HIGH - Based on MCP documentation and codebase patterns
- Pitfalls: HIGH - Derived from analysis of current crawler implementations
- Diagnostic methodology: MEDIUM - Synthesized from multiple sources

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain)
