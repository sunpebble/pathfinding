# Phase 5: Mafengwo - Research

**Researched:** 2026-01-25
**Domain:** Mafengwo (马蜂窝) travel guide extraction using Chrome DevTools MCP accessibility tree parsing
**Confidence:** HIGH

## Summary

Phase 5 focuses on restructuring the Mafengwo crawler to navigate to detail pages and extract all 6 core fields. Unlike Ctrip/Qunar (which had parsing issues), Mafengwo has an **architecture issue**: the crawler currently only extracts from list pages and returns placeholder content. The Phase 1 diagnosis identified this as `parsing:no_content` — the crawler extracts guide URLs but never navigates to them for full content.

Key changes required:

1. **Add Detail Page Navigation**: The primary fix. Change from list-only extraction to list → detail → parse pattern (following Ctrip/Qunar architecture).
2. **Parse Full Content**: Extract the complete article (5000+ chars), all images (10-50+), author info, publish date, and engagement metrics from detail pages.
3. **Handle Anti-Bot Gracefully**: Mafengwo has moderate anti-bot protection with captcha detection. Use persistent sessions and graceful fallback on captcha.
4. **Reuse Proven Utilities**: Leverage infrastructure from Phase 2 and parsing patterns from Ctrip/Qunar phases.

The infrastructure from Phase 2 (`waitForContentStable()`, `initSessionForPlatform()`, `checkSession()`) is already integrated. This phase follows the established pattern from Ctrip/Qunar but requires restructuring the crawler architecture.

**Primary recommendation:** Restructure mafengwo.ts to follow the Ctrip/Qunar pattern: list page → extract URLs → navigate to detail pages → parse full content. Add Mafengwo-specific extractors to accessibility-parser.ts for author, stats, and high-res images.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                   | Version          | Purpose                                   | Why Standard                                     |
| ------------------------- | ---------------- | ----------------------------------------- | ------------------------------------------------ |
| @modelcontextprotocol/sdk | current          | MCP client for Chrome DevTools            | Already in use, provides browser automation      |
| chrome-devtools-mcp       | latest (via npx) | Chrome automation with accessibility tree | Already in use, provides reliable page snapshots |

### Supporting

| Library                 | Version  | Purpose                            | When to Use            |
| ----------------------- | -------- | ---------------------------------- | ---------------------- |
| accessibility-parser.ts | internal | Parse accessibility tree snapshots | All content extraction |
| diagnostics/capture.ts  | internal | Smart wait and content stability   | Already integrated     |
| session/manager.ts      | internal | Persistent session management      | Already integrated     |

### Existing Utilities to Reuse

| Utility                    | Location                  | Purpose                       | Status                              |
| -------------------------- | ------------------------- | ----------------------------- | ----------------------------------- |
| `getBestTitle()`           | `accessibility-parser.ts` | Extract title from headings   | EXISTS - use directly               |
| `getArticleContent()`      | `accessibility-parser.ts` | Extract body text             | EXISTS - use directly               |
| `extractImageUrls()`       | `accessibility-parser.ts` | Extract image URLs            | EXISTS - add MFW high-res transform |
| `extractPublishDate()`     | `accessibility-parser.ts` | Extract publish date          | EXISTS - use directly               |
| `parseChineseNumber()`     | `accessibility-parser.ts` | Parse "2.7千", "11.5万"       | EXISTS - use for stats              |
| `waitForContentStable()`   | `diagnostics/capture.ts`  | Smart content loading         | EXISTS - already in use             |
| `initSessionForPlatform()` | `session/manager.ts`      | Initialize persistent session | EXISTS - already in use             |
| `checkSession()`           | `session/manager.ts`      | Validate session status       | EXISTS - already in use             |

### New Utilities to Create

| Utility                   | Location                  | Purpose                        | Why New                        |
| ------------------------- | ------------------------- | ------------------------------ | ------------------------------ |
| `extractMafengwoAuthor()` | `accessibility-parser.ts` | Extract MFW author + avatar    | MFW has unique author patterns |
| `extractMafengwoStats()`  | `accessibility-parser.ts` | Extract MFW engagement metrics | MFW has unique stat patterns   |
| `transformToHighResMfw()` | `accessibility-parser.ts` | Transform MFW CDN to high-res  | Different CDN than Ctrip       |

**Installation:** No new dependencies required. All improvements are enhancements to existing extractors.

## Architecture Patterns

### Current vs Required Architecture

```
CURRENT (BROKEN):
  List Page → Extract URLs → Parse 300-char context → Return PLACEHOLDER

REQUIRED (FOLLOWING CTRIP/QUNAR):
  List Page → Extract URLs → Navigate to Detail → Parse FULL content → Return complete data
```

### Recommended Project Structure

```
src/lib/crawlers/
├── mafengwo.ts              # Platform crawler (RESTRUCTURE)
│   ├── crawlMafengwo()      # Entry point (modify)
│   ├── fetchGuideUrls()     # Extract URLs from list page (split from current)
│   └── fetchGuideDetail()   # NEW: Navigate to detail and parse
├── accessibility-parser.ts  # Content extraction (ADD Mafengwo-specific)
│   ├── extractMafengwoAuthor()   # NEW
│   ├── extractMafengwoStats()    # NEW
│   └── transformToHighResMfw()   # NEW
├── diagnostics/             # Already complete from Phase 1-2
├── session/                 # Already complete from Phase 2
├── mcp-client.ts            # Browser automation (no changes)
└── index.ts                 # Crawler registry (no changes)
```

### Pattern 1: Detail Page Navigation (From Ctrip/Qunar)

**What:** Restructure crawler to navigate from list to detail pages
**When to use:** This is the PRIMARY pattern for this phase
**Example:**

```typescript
// Source: Pattern from ctrip.ts/qunar.ts - proven to work
async function crawlMafengwo(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;

  try {
    // Use persistent session for better results (already exists)
    await initSessionForPlatform('mafengwo');

    // Phase 1: Get guide URLs from list page
    const destUrl = `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/${cityId}.html`;
    const guideUrls = await fetchGuideUrls(destUrl, maxGuides);

    // Phase 2: Visit each detail page (NEW - follows Ctrip/Qunar pattern)
    for (const url of guideUrls) {
      try {
        const guide = await fetchGuideDetail(url, city);
        if (guide) results.push(guide);
        await sleep(1000 / (options.rateLimit || 0.5)); // Rate limiting
      } catch (error) {
        console.error(`[Mafengwo] Error fetching guide: ${url}`, error);
      }
    }
  } finally {
    await disconnect();
  }

  return results;
}
```

### Pattern 2: Detail Page Parsing (From Ctrip/Qunar)

**What:** Extract all 6 core fields from detail page accessibility tree
**When to use:** For each detail page visited
**Example:**

```typescript
// Source: Pattern from ctrip.ts fetchGuideDetail()
async function fetchGuideDetail(
  url: string,
  city: string
): Promise<CrawlResult | null> {
  try {
    // Navigate and wait for content
    await navigateTo(url, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(3); // Load lazy images
    await sleep(1000);

    // Take accessibility tree snapshot
    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    // Check for captcha/login wall
    if (detectMafengwoCaptcha(content)) {
      console.warn(`[Mafengwo] Captcha detected on ${url}, skipping`);
      return null;
    }

    // Extract all fields using accessibility-parser utilities
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 100) {
      console.log(`[Mafengwo] Insufficient content: ${url}`);
      return null;
    }

    // Mafengwo-specific extractors
    const authorInfo = extractMafengwoAuthor(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighResMfw);
    const publishedAt = extractPublishDate(content);
    const stats = extractMafengwoStats(content);

    // Build result
    const urlMatch = url.match(/\/i\/(\d+)\.html/);
    const sourceExternalId = `mafengwo_${urlMatch?.[1] || Date.now()}`;

    const contentBlocks: ContentBlock[] = [
      { type: 'text', content: textContent },
    ];
    for (const imgUrl of imageUrls) {
      contentBlocks.push({ type: 'image', url: imgUrl });
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: textContent.substring(0, 50000),
      contentBlocks,
      contentType: 'normal',
      authorName: authorInfo.name || '马蜂窝用户',
      authorAvatar: authorInfo.avatar,
      publishedAt,
      coverImageUrl: imageUrls[0],
      imageUrls: imageUrls.slice(0, 20),
      destinations: [city],
      tags: extractTags(title || '', textContent),
      likesCount: stats.likes || 0,
      savesCount: stats.saves || 0,
      commentsCount: stats.comments || 0,
      viewsCount: stats.views || 0,
      qualityScore: calculateQualityScore(
        textContent,
        imageUrls.length,
        stats.views || 0
      ),
    };
  } catch (error) {
    console.error(`[Mafengwo] Error parsing guide:`, error);
    return null;
  }
}
```

### Pattern 3: Mafengwo Author Extraction

**What:** Extract author name and avatar URL from Mafengwo accessibility tree
**When to use:** After taking detail page snapshot
**Example:**

```typescript
// Source: Pattern derived from Mafengwo page structure analysis
export function extractMafengwoAuthor(content: string): {
  name?: string;
  avatar?: string;
} {
  let name: string | undefined;
  let avatar: string | undefined;

  // Pattern 1: Look for author section near 作者 or 发布者 labels
  const authorMatch = content.match(
    /(?:作者|发布者|by)[：:\s]+"?([^"\n\]]{2,30})"?/i
  );
  if (authorMatch && isValidMafengwoAuthor(authorMatch[1].trim())) {
    name = authorMatch[1].trim();
  }

  // Pattern 2: Look for user profile link patterns
  if (!name) {
    const profileMatch = content.match(
      /StaticText\s+"([^"]{2,20})"\s*[\s\S]{0,100}?u\.mafengwo\.cn\/\d+/
    );
    if (profileMatch && isValidMafengwoAuthor(profileMatch[1].trim())) {
      name = profileMatch[1].trim();
    }
  }

  // Pattern 3: Fallback to generic extractAuthor
  if (!name) {
    name = extractAuthor(content);
  }

  // Extract avatar (best effort)
  const avatarPatterns = [
    // User avatar images on Mafengwo CDN
    /(https?:\/\/[^\s"']*mafengwo[^\s"']*(?:avatar|head|user)[^\s"']*\.(?:jpg|jpeg|png|webp))/i,
    // Image near author context
    /(?:avatar|头像|author)[^"]*?(https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp))/i,
  ];

  for (const pattern of avatarPatterns) {
    const avatarMatch = content.match(pattern);
    if (avatarMatch?.[1] && !avatarMatch[1].includes('placeholder')) {
      avatar = avatarMatch[1];
      break;
    }
  }

  return { name, avatar };
}

function isValidMafengwoAuthor(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) return false;
  if (name.includes('http')) return false;
  if (
    /^(?:分享|收藏|关注|点赞|评论|返回|首页|登录|注册|马蜂窝|攻略)$/.test(name)
  )
    return false;
  return true;
}
```

### Pattern 4: Mafengwo Stats Extraction

**What:** Extract engagement metrics (views, likes, saves, comments) from Mafengwo pages
**When to use:** After taking detail page snapshot
**Example:**

```typescript
// Source: Pattern derived from Mafengwo page structure
export function extractMafengwoStats(content: string): {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
} {
  const stats: {
    views?: number;
    likes?: number;
    saves?: number;
    comments?: number;
  } = {};

  // Views: "浏览量 1234", "1234 次浏览", "阅读 2.5万"
  const viewsMatch =
    content.match(/(?:浏览量?|阅读量?)[：:\s]*([\\d.]+[千万kw]?)/i) ||
    content.match(/([\\d.]+[千万kw]?)\s*(?:次浏览|阅读)/i);
  if (viewsMatch) {
    stats.views = parseChineseNumber(viewsMatch[1]);
  }

  // Likes: "点赞 123", "顶 45", "123 赞"
  const likesMatch =
    content.match(/(?:点赞|顶)[：:\s]*([\\d.]+[千万kw]?)/i) ||
    content.match(/([\\d.]+[千万kw]?)\s*(?:点赞|个赞|赞)/i);
  if (likesMatch) {
    stats.likes = parseChineseNumber(likesMatch[1]);
  }

  // Saves/Favorites: "收藏 85", "85 人收藏"
  const savesMatch =
    content.match(/收藏[：:\s]*([\\d.]+[千万kw]?)/i) ||
    content.match(/([\\d.]+[千万kw]?)\s*(?:人收藏|收藏)/i);
  if (savesMatch) {
    stats.saves = parseChineseNumber(savesMatch[1]);
  }

  // Comments: "评论 30", "30 条评论"
  const commentsMatch =
    content.match(/评论[：:\s]*([\\d.]+[千万kw]?)/i) ||
    content.match(/([\\d.]+[千万kw]?)\s*条评论/i);
  if (commentsMatch) {
    stats.comments = parseChineseNumber(commentsMatch[1]);
  }

  return stats;
}
```

### Pattern 5: Mafengwo High-Res Image Transformation

**What:** Transform Mafengwo CDN image URLs to request high-resolution versions
**When to use:** After extracting image URLs, before storing
**Example:**

```typescript
// Source: Pattern derived from Mafengwo CDN URL analysis
// Mafengwo CDN domains: n1-q.mafengwo.net, p1-q.mafengwo.net, etc.
// URL pattern: /path/to/image.jpg.xxxx.xxx.xxx.jpg (thumbnail suffix)
// High-res: Remove thumbnail suffix or request original

export function transformToHighResMfw(url: string): string {
  // Check if URL is from Mafengwo CDN
  const isMfwCdn = url.includes('mafengwo.net') || url.includes('mafengwo.cn');

  if (!isMfwCdn) {
    return url;
  }

  let transformedUrl = url;

  // Pattern 1: Remove thumbnail suffix (e.g., .180.w.jpg, .320.w.jpg)
  transformedUrl = transformedUrl.replace(
    /\.\d+\.[wh]\.(?:jpg|jpeg|png|webp)$/i,
    '.jpg'
  );

  // Pattern 2: Remove size parameters in query string
  try {
    const urlObj = new URL(transformedUrl);
    if (urlObj.searchParams.has('w')) {
      urlObj.searchParams.delete('w');
    }
    if (urlObj.searchParams.has('h')) {
      urlObj.searchParams.delete('h');
    }
    if (urlObj.searchParams.has('q')) {
      urlObj.searchParams.set('q', '100');
    }
    transformedUrl = urlObj.toString();
  } catch {
    // If URL parsing fails, return what we have
  }

  return transformedUrl;
}
```

### Pattern 6: Captcha Detection

**What:** Detect captcha or login wall to skip gracefully
**When to use:** After taking snapshot, before parsing
**Example:**

```typescript
// Source: Pattern from existing mafengwo.ts and session/validators.ts
function detectMafengwoCaptcha(content: string): boolean {
  const indicators = [
    /验证码/,
    /captcha/i,
    /滑动验证/,
    /请完成验证/,
    /安全验证/,
    /频繁访问/,
    /请求过于频繁/,
  ];

  for (const pattern of indicators) {
    if (pattern.test(content)) {
      return true;
    }
  }

  // Also check for very short content (blocked page)
  if (content.length < 500) {
    return true;
  }

  return false;
}
```

### Anti-Patterns to Avoid

- **Using 300-char context for extraction:** This is the root cause of placeholder content. Always navigate to detail pages for full content.
- **Returning placeholder content:** Never use `"${title} - ${city}旅游攻略"` as content. If detail page fails, skip the guide entirely.
- **Ignoring captcha:** Always check for captcha before parsing. Proceed with null result if detected.
- **Not using persistent sessions:** Mafengwo works better with login. Always use `initSessionForPlatform('mafengwo')`.
- **Fixed sleep() without smart wait:** Use `waitForContentStable()` for reliable content loading.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build     | Use Instead                | Why                                        |
| -------------------------- | --------------- | -------------------------- | ------------------------------------------ |
| Content stability          | Custom polling  | `waitForContentStable()`   | Already implemented and tested             |
| Accessibility tree parsing | HTML parsing    | `accessibility-parser.ts`  | Already handles Chrome DevTools output     |
| Session management         | Cookie handling | `initSessionForPlatform()` | Already handles persistent Chrome profiles |
| Chinese number parsing     | Custom regex    | `parseChineseNumber()`     | Already implemented in Phase 3             |
| Date extraction            | Custom parsing  | `extractPublishDate()`     | Already handles multiple formats           |
| Title extraction           | Ad-hoc regex    | `getBestTitle()`           | Already handles fallbacks                  |
| Article content            | Manual text     | `getArticleContent()`      | Already filters UI text                    |

**Key insight:** Phase 5 is primarily about restructuring the crawler architecture (adding detail navigation) and adding Mafengwo-specific extractors. Most extraction utilities already exist from Ctrip/Qunar phases.

## Common Pitfalls

### Pitfall 1: Continuing to Use List-Only Extraction

**What goes wrong:** Crawler returns placeholder content instead of full articles
**Why it happens:** Current code never navigates to detail pages
**How to avoid:** Restructure to follow Ctrip/Qunar pattern: list → detail → parse
**Warning signs:** Content is exactly `"${title} - ${city}旅游攻略"`, images array empty or length 1

### Pitfall 2: Not Handling Captcha Gracefully

**What goes wrong:** Crawler hangs or crashes on captcha pages
**Why it happens:** Mafengwo shows captcha for suspicious access patterns
**How to avoid:** Check for captcha indicators before parsing, return null if detected
**Warning signs:** Very short content (<500 chars), "验证" in content

### Pitfall 3: Not Using Persistent Sessions

**What goes wrong:** Frequent captcha triggers, missing content
**Why it happens:** Each request looks like new user without cookies
**How to avoid:** Always use `initSessionForPlatform('mafengwo')` at start
**Warning signs:** Session status shows "Login recommended", frequent captcha

### Pitfall 4: Rate Limiting Too Aggressive or Too Lax

**What goes wrong:** Either captcha triggers (too fast) or crawl takes hours (too slow)
**Why it happens:** Mafengwo has moderate anti-bot protection
**How to avoid:** Use 1-2 second delay between detail page fetches
**Warning signs:** Captcha on 3rd+ request (too fast), >5 min for 10 guides (too slow)

### Pitfall 5: Missing Content Due to Lazy Loading

**What goes wrong:** Images and content at bottom of page not captured
**Why it happens:** Mafengwo uses lazy loading for images
**How to avoid:** Use `scrollToLoadContent(3)` before taking snapshot
**Warning signs:** Only 1-2 images when page visually has 20+

### Pitfall 6: Invalid Image URLs After Transformation

**What goes wrong:** Transformed image URLs return 404
**Why it happens:** Not all images support all size variants
**How to avoid:** Keep original URL if transformation doesn't work; test transformations
**Warning signs:** Broken images in downstream applications

## Code Examples

Verified patterns from codebase analysis:

### Current Broken Pattern (to be replaced)

```typescript
// Source: Current mafengwo.ts lines 121-175 - THIS IS WRONG
// Only uses 300 chars of context, never navigates to detail page

const contextStart = Math.max(0, match.index! - 300);
const contextEnd = Math.min(content.length, match.index! + 300);
const context = content.substring(contextStart, contextEnd);

// ... extraction from 300 char context ...

const contentBlocks: ContentBlock[] = [
  { type: 'text', content: `${title} - ${city}旅游攻略` }, // PLACEHOLDER!
];
```

### Working Pattern to Follow (from Ctrip)

```typescript
// Source: ctrip.ts lines 114-194 - THIS IS CORRECT PATTERN
async function fetchGuideDetail(
  url: string,
  city: string
): Promise<CrawlResult | null> {
  try {
    await navigateTo(url, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(3);
    await sleep(1000);

    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    // Use accessibility tree parser for extraction
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 50) {
      return null;
    }

    // Extract all fields from FULL page content
    const authorInfo = extractAuthorWithAvatar(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighRes);
    const publishedAt = extractPublishDate(content);
    const stats = extractCtripStats(content);

    // Return complete result
    return {
      // ... all fields populated from full content
    };
  } catch (error) {
    return null;
  }
}
```

### Mafengwo URL Patterns

```typescript
// List page URL pattern:
// https://www.mafengwo.cn/travel-scenic-spot/mafengwo/{cityId}.html

// Detail page URL pattern (extracted from list, then navigated to):
// https://www.mafengwo.cn/i/{guideId}.html

// City ID mapping (already exists):
const CITY_IDS: Record<string, string> = {
  北京: '10065',
  上海: '10099',
  // ... etc
};
```

## State of the Art

| Old Approach             | Current Approach         | When Changed | Impact                       |
| ------------------------ | ------------------------ | ------------ | ---------------------------- |
| List-only extraction     | List → Detail navigation | Phase 5      | Will fix placeholder content |
| 300-char context parsing | Full page parsing        | Phase 5      | Will get complete articles   |
| Placeholder content      | Actual article content   | Phase 5      | Will get 5000+ char content  |
| Isolated browser session | Persistent session       | Phase 2      | Already done, better access  |
| Fixed sleep(3000)        | `waitForContentStable()` | Phase 2      | Already done                 |

**Deprecated/outdated:**

- `fetchGuidesFromDestPage()` - current function that only extracts from list page. Will be split into `fetchGuideUrls()` + `fetchGuideDetail()`.

## Open Questions

Things that require runtime validation:

1. **Mafengwo CDN High-Res Pattern**
   - What we know: URLs contain `.180.w.jpg` or similar thumbnail suffixes
   - What's unclear: Exact transformation to get original quality
   - Recommendation: Try removing suffix first; if 404, keep original

2. **Author Avatar Availability**
   - What we know: User profiles exist on `u.mafengwo.cn`
   - What's unclear: Whether avatar is in detail page or requires separate fetch
   - Recommendation: Mark as best-effort; extract if present, don't fail if missing

3. **Rate Limit Sweet Spot**
   - What we know: Too fast triggers captcha, too slow is inefficient
   - What's unclear: Exact threshold (varies by session, time of day)
   - Recommendation: Start with 2 second delay, adjust based on captcha rate

4. **Engagement Metrics Location**
   - What we know: Stats exist somewhere on detail page
   - What's unclear: Exact format and location in accessibility tree
   - Recommendation: Implement patterns, validate with live pages, iterate

## Sources

### Primary (HIGH confidence)

- **mafengwo.ts codebase** - Current implementation analyzed, confirmed list-only architecture
- **ctrip.ts codebase** - Reference pattern for detail navigation
- **qunar.ts codebase** - Reference pattern for detail navigation
- **accessibility-parser.ts** - Existing extractors analyzed
- **Phase 1 diagnosis** - `/Users/shikun/Developer/opensource/pathfinding/.planning/phases/01-diagnosis/diagnostics/mafengwo-diagnosis.md`
- **Phase 2 research** - Infrastructure patterns for sessions and smart wait
- **Phase 3 research** - Extraction patterns for Ctrip

### Secondary (MEDIUM confidence)

- **Session validators** - `session/validators.ts` shows Mafengwo validation patterns
- **Ctrip/Qunar phases** - Proven patterns that work on similar platforms

### Tertiary (LOW confidence)

- **Mafengwo CDN patterns** - Inferred from URL structure, needs runtime validation
- **Engagement metric formats** - Based on common Chinese travel site patterns, needs validation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based entirely on existing codebase
- Architecture: HIGH - Pattern proven with Ctrip/Qunar, diagnosis confirms issue
- Detail navigation: HIGH - Following proven Ctrip/Qunar pattern
- Mafengwo extractors: MEDIUM - Patterns need runtime validation
- Image URL transformation: LOW - CDN patterns inferred, needs testing

**Research date:** 2026-01-25
**Valid until:** 30 days (Mafengwo page structure may change)

---

## Implementation Checklist for Planner

Based on this research, Phase 5 should implement:

### MFW-01: Add Detail Page Navigation

- [ ] Restructure `crawlMafengwo()` to follow Ctrip/Qunar pattern
- [ ] Split current function into `fetchGuideUrls()` and `fetchGuideDetail()`
- [ ] Navigate to each detail page URL extracted from list
- [ ] Use `waitForContentStable()` after navigation
- [ ] Add rate limiting delay between requests (1-2 seconds)

### MFW-02: Extract Full Article Content

- [ ] Use `getArticleContent()` on detail page snapshot
- [ ] Ensure content is actual article, not placeholder
- [ ] Skip guides with insufficient content (<100 chars)
- [ ] Store in `content` and `contentBlocks` fields

### MFW-03: Extract High-Resolution Images

- [ ] Use `extractImageUrls()` on detail page snapshot
- [ ] Add `transformToHighResMfw()` function
- [ ] Apply transformation to all extracted URLs
- [ ] Store in `imageUrls` and `coverImageUrl` fields

### MFW-04: Extract Author Information

- [ ] Add `extractMafengwoAuthor()` function to accessibility-parser
- [ ] Extract author name with Mafengwo-specific patterns
- [ ] Attempt avatar extraction (best effort)
- [ ] Store in `authorName` and `authorAvatar` fields

### MFW-05: Extract Publish Date

- [ ] Use existing `extractPublishDate()` function
- [ ] Store in `publishedAt` field

### MFW-06: Extract Engagement Metrics

- [ ] Add `extractMafengwoStats()` function to accessibility-parser
- [ ] Use `parseChineseNumber()` for "2.7千" patterns
- [ ] Extract: views, likes, saves, comments
- [ ] Store in corresponding Count fields

### MFW-07: Handle Captcha/Login Gracefully

- [ ] Add `detectMafengwoCaptcha()` function
- [ ] Check for captcha before parsing
- [ ] Return null (skip guide) if captcha detected
- [ ] Log warning with captcha URL

### MFW-08: Verification

- [ ] Run test crawler for at least 10 guides
- [ ] Verify content is actual article (>100 chars, not placeholder)
- [ ] Verify image URLs are high-resolution
- [ ] Verify author name is extracted (not just default)
- [ ] Log extraction success rate per field
- [ ] Create `verifyMafengwoExtraction()` test function
