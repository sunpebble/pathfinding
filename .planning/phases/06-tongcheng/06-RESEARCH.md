# Phase 6: Tongcheng - Research

**Researched:** 2026-01-25
**Domain:** Tongcheng (同程, ly.com) travel guide extraction using Chrome DevTools MCP accessibility tree parsing
**Confidence:** HIGH

## Summary

Phase 6 focuses on restructuring the Tongcheng crawler to navigate to detail pages and extract all 6 core fields. Like Mafengwo (Phase 5), Tongcheng has an **architecture issue**: the crawler currently only extracts from list pages and returns placeholder content. The Phase 1 diagnosis confirmed this as `parsing:no_content` — the crawler extracts guide URLs but never navigates to them for full content.

Key changes required:

1. **Add Detail Page Navigation**: The primary fix. Change from list-only extraction to list → detail → parse pattern (following Ctrip/Qunar/Mafengwo architecture).
2. **Parse Full Content**: Extract the complete article, all images, author info, publish date, and engagement metrics from detail pages.
3. **Add Tongcheng-Specific Extractors**: Create platform-specific utilities for author, stats, and high-res image transformation.
4. **Minimal Anti-Bot Complexity**: Tongcheng has the **lowest anti-bot protection** among all platforms — no captcha detection, no login required.

The infrastructure from Phase 2 (`waitForContentStable()`) is already integrated. This phase follows the **exact same pattern as Mafengwo (Phase 5)** with Tongcheng-specific adaptations. Since Tongcheng doesn't require login (confirmed Phase 2), no session management is needed.

**Primary recommendation:** Restructure tongcheng.ts to follow the Mafengwo/Ctrip pattern: list page → extract URLs → navigate to detail pages → parse full content. Add Tongcheng-specific extractors to accessibility-parser.ts for author, stats, and high-res images.

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

### Existing Utilities to Reuse

| Utility                  | Location                  | Purpose                     | Status                             |
| ------------------------ | ------------------------- | --------------------------- | ---------------------------------- |
| `getBestTitle()`         | `accessibility-parser.ts` | Extract title from headings | EXISTS - use directly              |
| `getArticleContent()`    | `accessibility-parser.ts` | Extract body text           | EXISTS - use directly              |
| `extractImageUrls()`     | `accessibility-parser.ts` | Extract image URLs          | EXISTS - add TC high-res transform |
| `extractPublishDate()`   | `accessibility-parser.ts` | Extract publish date        | EXISTS - use directly              |
| `parseChineseNumber()`   | `accessibility-parser.ts` | Parse "2.7千", "11.5万"     | EXISTS - use for stats             |
| `waitForContentStable()` | `diagnostics/capture.ts`  | Smart content loading       | EXISTS - already imported          |

### New Utilities to Create

| Utility                    | Location                  | Purpose                       | Why New                          |
| -------------------------- | ------------------------- | ----------------------------- | -------------------------------- |
| `extractTongchengAuthor()` | `accessibility-parser.ts` | Extract TC author + avatar    | TC has unique author patterns    |
| `extractTongchengStats()`  | `accessibility-parser.ts` | Extract TC engagement metrics | TC may have unique stat patterns |
| `transformToHighResTc()`   | `accessibility-parser.ts` | Transform TC CDN to high-res  | Different CDN than other sites   |

**Installation:** No new dependencies required. All improvements are enhancements to existing extractors.

## Architecture Patterns

### Current vs Required Architecture

```
CURRENT (BROKEN):
  List Page → Extract URLs → Parse 300-char context → Return PLACEHOLDER

REQUIRED (FOLLOWING MAFENGWO/CTRIP):
  List Page → Extract URLs → Navigate to Detail → Parse FULL content → Return complete data
```

### Recommended Project Structure

```
src/lib/crawlers/
├── tongcheng.ts              # Platform crawler (RESTRUCTURE)
│   ├── crawlTongcheng()      # Entry point (modify)
│   ├── fetchGuideUrls()      # Extract URLs from list page (split from current)
│   └── fetchGuideDetail()    # NEW: Navigate to detail and parse
├── accessibility-parser.ts   # Content extraction (ADD Tongcheng-specific)
│   ├── extractTongchengAuthor()   # NEW
│   ├── extractTongchengStats()    # NEW
│   └── transformToHighResTc()     # NEW
├── diagnostics/              # Already complete from Phase 1-2
├── mcp-client.ts             # Browser automation (no changes)
└── index.ts                  # Crawler registry (no changes)
```

### Pattern 1: Detail Page Navigation (From Mafengwo/Ctrip/Qunar)

**What:** Restructure crawler to navigate from list to detail pages
**When to use:** This is the PRIMARY pattern for this phase
**Example:**

```typescript
// Source: Pattern from mafengwo.ts - proven to work
async function crawlTongcheng(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;

  try {
    // Phase 1: Get guide URLs from list page
    // Tongcheng uses a global list page (not city-specific)
    const listUrl = 'https://www.ly.com/travels/';
    const guideUrls = await fetchGuideUrls(listUrl, city, maxGuides);

    // Phase 2: Visit each detail page (NEW - follows Mafengwo pattern)
    for (const url of guideUrls) {
      try {
        const guide = await fetchGuideDetail(url, city);
        if (guide) results.push(guide);
        await sleep(1000 / (options.rateLimit || 0.5)); // Rate limiting
      } catch (error) {
        console.error(`[Tongcheng] Error fetching guide: ${url}`, error);
      }
    }
  } finally {
    await disconnect();
  }

  return results;
}
```

### Pattern 2: Detail Page Parsing (From Mafengwo/Ctrip/Qunar)

**What:** Extract all 6 core fields from detail page accessibility tree
**When to use:** For each detail page visited
**Example:**

```typescript
// Source: Pattern from mafengwo.ts fetchGuideDetail()
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

    // Extract all fields using accessibility-parser utilities
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 100) {
      console.log(`[Tongcheng] Insufficient content: ${url}`);
      return null;
    }

    // Tongcheng-specific extractors
    const authorInfo = extractTongchengAuthor(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighResTc);
    const publishedAt = extractPublishDate(content);
    const stats = extractTongchengStats(content);

    // Build result
    const urlMatch = url.match(/\/travels\/(\d+)\.html/);
    const sourceExternalId = `tongcheng_${urlMatch?.[1] || Date.now()}`;

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
      authorName: authorInfo.name || '同程用户',
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
    console.error(`[Tongcheng] Error parsing guide:`, error);
    return null;
  }
}
```

### Pattern 3: Tongcheng Author Extraction

**What:** Extract author name and avatar URL from Tongcheng accessibility tree
**When to use:** After taking detail page snapshot
**Example:**

```typescript
// Source: Pattern derived from Mafengwo and Tongcheng page structure analysis
export function extractTongchengAuthor(content: string): {
  name?: string;
  avatar?: string;
} {
  let name: string | undefined;
  let avatar: string | undefined;

  // Pattern 1: Look for author section near 作者 or 发布者 labels
  const authorMatch = content.match(
    /(?:作者|发布者|by)[：:\s]+\"?([^"\n\]]{2,30})\"?/i
  );
  if (authorMatch && isValidTongchengAuthor(authorMatch[1].trim())) {
    name = authorMatch[1].trim();
  }

  // Pattern 2: Look for user profile link patterns (ly.com specific)
  if (!name) {
    const profileMatch = content.match(
      /StaticText\s+"([^"]{2,20})"\s*[\s\S]{0,100}?(?:ly\.com\/user|member)/
    );
    if (profileMatch && isValidTongchengAuthor(profileMatch[1].trim())) {
      name = profileMatch[1].trim();
    }
  }

  // Pattern 3: Fallback to generic extractAuthor
  if (!name) {
    name = extractAuthor(content);
  }

  // Extract avatar (best effort)
  const avatarPatterns = [
    // User avatar images on Tongcheng CDN
    /(https?:\/\/[^\s"']*(?:ly\.com|tcimg)[^\s"']*(?:avatar|head|user)[^\s"']*\.(?:jpg|jpeg|png|webp))/i,
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

function isValidTongchengAuthor(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) return false;
  if (name.includes('http')) return false;
  if (
    /^(?:分享|收藏|关注|点赞|评论|返回|首页|登录|注册|同程|攻略|旅游)$/.test(
      name
    )
  )
    return false;
  return true;
}
```

### Pattern 4: Tongcheng Stats Extraction

**What:** Extract engagement metrics (views, likes, saves, comments) from Tongcheng pages
**When to use:** After taking detail page snapshot
**Example:**

```typescript
// Source: Pattern derived from Mafengwo and generic stats extraction
export function extractTongchengStats(content: string): {
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
    content.match(/(?:浏览量?|阅读量?)[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:次浏览|阅读)/i);
  if (viewsMatch) {
    stats.views = parseChineseNumber(viewsMatch[1]);
  }

  // Accessibility tree fallback for views
  if (!stats.views) {
    const accessibilityViewsMatch = content.match(
      /StaticText\s+"(?:浏览量?|阅读量?)"[\s\S]{0,100}?StaticText\s+"([0-9.]+[千万kw]?)"/i
    );
    if (accessibilityViewsMatch) {
      stats.views = parseChineseNumber(accessibilityViewsMatch[1]);
    }
  }

  // Likes: "点赞 123", "顶 45", "123 赞"
  const likesMatch =
    content.match(/(?:点赞|顶)[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:点赞|个赞|赞)/i);
  if (likesMatch) {
    stats.likes = parseChineseNumber(likesMatch[1]);
  }

  // Saves/Favorites: "收藏 85", "85 人收藏"
  const savesMatch =
    content.match(/收藏[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:人收藏|收藏)/i);
  if (savesMatch) {
    stats.saves = parseChineseNumber(savesMatch[1]);
  }

  // Comments: "评论 30", "30 条评论"
  const commentsMatch =
    content.match(/评论[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*条评论/i);
  if (commentsMatch) {
    stats.comments = parseChineseNumber(commentsMatch[1]);
  }

  return stats;
}
```

### Pattern 5: Tongcheng High-Res Image Transformation

**What:** Transform Tongcheng CDN image URLs to request high-resolution versions
**When to use:** After extracting image URLs, before storing
**Example:**

```typescript
// Source: Pattern derived from Mafengwo and Tongcheng CDN URL analysis
// Tongcheng CDN domains: ly.com, tcimg.net, etc.
// URL patterns may include size constraints that can be modified

export function transformToHighResTc(url: string): string {
  // Check if URL is from Tongcheng CDN
  const isTcCdn =
    url.includes('ly.com') ||
    url.includes('tcimg') ||
    url.includes('tongcheng');

  if (!isTcCdn) {
    return url;
  }

  let transformedUrl = url;

  // Pattern 1: Remove thumbnail suffix (e.g., _small, _thumb)
  transformedUrl = transformedUrl.replace(
    /(_small|_thumb|_s)\.(?:jpg|jpeg|png|webp)/gi,
    '.$1'
  );

  // Pattern 2: Remove size constraints in path (e.g., /180x180/)
  transformedUrl = transformedUrl.replace(/\/\d+x\d+\//g, '/');

  // Pattern 3: Handle query parameters
  try {
    const urlObj = new URL(transformedUrl);

    // Remove size-limiting query params
    if (urlObj.searchParams.has('w')) {
      urlObj.searchParams.delete('w');
    }
    if (urlObj.searchParams.has('h')) {
      urlObj.searchParams.delete('h');
    }
    // Set quality to max if present
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

### Anti-Patterns to Avoid

- **Using 300-char context for extraction:** This is the root cause of placeholder content. Always navigate to detail pages for full content.
- **Returning placeholder content:** Never use `"${title} - ${city}旅游攻略"` as content. If detail page fails, skip the guide entirely.
- **Hardcoding quality score:** Current code uses `qualityScore: 50`. Calculate based on actual content.
- **Fixed sleep() without smart wait:** Use `waitForContentStable()` for reliable content loading.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build    | Use Instead               | Why                                    |
| -------------------------- | -------------- | ------------------------- | -------------------------------------- |
| Content stability          | Custom polling | `waitForContentStable()`  | Already implemented and tested         |
| Accessibility tree parsing | HTML parsing   | `accessibility-parser.ts` | Already handles Chrome DevTools output |
| Chinese number parsing     | Custom regex   | `parseChineseNumber()`    | Already implemented in Phase 3         |
| Date extraction            | Custom parsing | `extractPublishDate()`    | Already handles multiple formats       |
| Title extraction           | Ad-hoc regex   | `getBestTitle()`          | Already handles fallbacks              |
| Article content            | Manual text    | `getArticleContent()`     | Already filters UI text                |

**Key insight:** Phase 6 is primarily about restructuring the crawler architecture (adding detail navigation) and adding Tongcheng-specific extractors. Most extraction utilities already exist from previous phases. Tongcheng is the **simplest platform** to crawl due to minimal anti-bot protection.

## Common Pitfalls

### Pitfall 1: Continuing to Use List-Only Extraction

**What goes wrong:** Crawler returns placeholder content instead of full articles
**Why it happens:** Current code never navigates to detail pages
**How to avoid:** Restructure to follow Mafengwo/Ctrip pattern: list → detail → parse
**Warning signs:** Content is exactly `"${title} - ${city}旅游攻略"`, images array empty or length 1

### Pitfall 2: Hardcoded Quality Score

**What goes wrong:** All guides have score 50 regardless of actual quality
**Why it happens:** Current code uses `qualityScore: 50` constant
**How to avoid:** Calculate based on content length, image count, view count (like Mafengwo)
**Warning signs:** Every result has identical qualityScore: 50

### Pitfall 3: Not Using City Filtering Properly

**What goes wrong:** Guides for wrong cities are included
**Why it happens:** Tongcheng uses global list page, not city-specific URLs
**How to avoid:** Filter guide URLs/content by city relevance after extraction
**Warning signs:** Results include guides for Beijing when searching Hangzhou

### Pitfall 4: Missing Content Due to Lazy Loading

**What goes wrong:** Images and content at bottom of page not captured
**Why it happens:** Tongcheng likely uses lazy loading for images
**How to avoid:** Use `scrollToLoadContent(3)` before taking snapshot
**Warning signs:** Only 1-2 images when page visually has 20+

### Pitfall 5: Ignoring Extraction Failures

**What goes wrong:** Crawl completes with empty or poor results
**Why it happens:** Not validating content length before returning
**How to avoid:** Check for minimum content (100+ chars), skip if insufficient
**Warning signs:** Many results with very short content

## Code Examples

Verified patterns from codebase analysis:

### Current Broken Pattern (to be replaced)

```typescript
// Source: Current tongcheng.ts lines 93-156 - THIS IS WRONG
// Only uses 300 chars of context, never navigates to detail page

const contextStart = Math.max(0, match.index! - 300);
const contextEnd = Math.min(content.length, match.index! + 300);
const context = content.substring(contextStart, contextEnd);

// ... extraction from 300 char context ...

const contentBlocks: ContentBlock[] = [
  { type: 'text', content: `${title} - ${city}旅游攻略` }, // PLACEHOLDER!
];

// ...
qualityScore: 50, // HARDCODED!
```

### Working Pattern to Follow (from Mafengwo)

```typescript
// Source: mafengwo.ts lines 189-269 - THIS IS CORRECT PATTERN
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

    if (!textContent || textContent.length < 100) {
      return null;
    }

    // Extract all fields from FULL page content
    const authorInfo = extractMafengwoAuthor(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighResMfw);
    const publishedAt = extractPublishDate(content);
    const stats = extractMafengwoStats(content);

    // Return complete result
    return {
      // ... all fields populated from full content
      qualityScore: calculateQualityScore(
        textContent,
        imageUrls.length,
        stats.views || 0
      ),
    };
  } catch (error) {
    return null;
  }
}
```

### Tongcheng URL Patterns

```typescript
// List page URL pattern (global, not city-specific):
// https://www.ly.com/travels/

// Detail page URL pattern (extracted from list, then navigated to):
// https://www.ly.com/travels/[id].html

// City slug mapping (already exists):
const CITY_SLUGS: Record<string, string> = {
  北京: 'beijing',
  上海: 'shanghai',
  // ... etc
};

// Note: CITY_SLUGS is currently unused because list page is global
// May be useful for city filtering in future
```

## State of the Art

| Old Approach             | Current Approach         | When Changed | Impact                       |
| ------------------------ | ------------------------ | ------------ | ---------------------------- |
| List-only extraction     | List → Detail navigation | Phase 6      | Will fix placeholder content |
| 300-char context parsing | Full page parsing        | Phase 6      | Will get complete articles   |
| Placeholder content      | Actual article content   | Phase 6      | Will get 5000+ char content  |
| Hardcoded qualityScore   | Calculated score         | Phase 6      | Accurate quality assessment  |
| Fixed sleep(3000)        | `waitForContentStable()` | Phase 2      | Already done                 |

**Deprecated/outdated:**

- `fetchGuidesFromTravelsList()` - current function that only extracts from list page. Will be split into `fetchGuideUrls()` + `fetchGuideDetail()`.

## Open Questions

Things that require runtime validation:

1. **Tongcheng CDN High-Res Pattern**
   - What we know: ly.com is the main domain
   - What's unclear: Exact CDN domains and transformation patterns
   - Recommendation: Try common transformations; if 404, keep original

2. **Author Avatar Availability**
   - What we know: User profiles may exist
   - What's unclear: Whether avatar is in detail page or requires separate fetch
   - Recommendation: Mark as best-effort; extract if present, don't fail if missing

3. **City Filtering Strategy**
   - What we know: List page is global, not city-specific
   - What's unclear: Best way to filter for city relevance
   - Recommendation: Check title/content for city mentions; may need to use city-specific search URLs

4. **Engagement Metrics Location**
   - What we know: Stats exist somewhere on detail page
   - What's unclear: Exact format and location in accessibility tree
   - Recommendation: Implement patterns, validate with live pages, iterate

## Sources

### Primary (HIGH confidence)

- **tongcheng.ts codebase** - Current implementation analyzed, confirmed list-only architecture
- **mafengwo.ts codebase** - Reference pattern for detail navigation (Phase 5 completed)
- **ctrip.ts codebase** - Reference pattern for detail navigation
- **accessibility-parser.ts** - Existing extractors analyzed
- **Phase 1 diagnosis** - `.planning/phases/01-diagnosis/diagnostics/tongcheng-diagnosis.md`
- **Phase 5 research** - `.planning/phases/05-mafengwo/05-RESEARCH.md` (same pattern)
- **session/validators.ts** - Confirms Tongcheng doesn't require login

### Secondary (MEDIUM confidence)

- **Mafengwo implementation** - Proven pattern that works on similar architecture issue
- **Ctrip/Qunar phases** - Proven patterns that work on similar platforms

### Tertiary (LOW confidence)

- **Tongcheng CDN patterns** - Inferred from URL structure, needs runtime validation
- **Engagement metric formats** - Based on common Chinese travel site patterns, needs validation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based entirely on existing codebase
- Architecture: HIGH - Pattern proven with Mafengwo/Ctrip/Qunar, diagnosis confirms issue
- Detail navigation: HIGH - Following proven Mafengwo pattern
- Tongcheng extractors: MEDIUM - Patterns need runtime validation
- Image URL transformation: LOW - CDN patterns inferred, needs testing

**Research date:** 2026-01-25
**Valid until:** 30 days (Tongcheng page structure may change)

---

## Implementation Checklist for Planner

Based on this research, Phase 6 should implement:

### TC-01: Add Detail Page Navigation

- [ ] Restructure `crawlTongcheng()` to follow Mafengwo pattern
- [ ] Split current function into `fetchGuideUrls()` and `fetchGuideDetail()`
- [ ] Navigate to each detail page URL extracted from list
- [ ] Use `waitForContentStable()` after navigation
- [ ] Add rate limiting delay between requests (1-2 seconds)

### TC-02: Extract Full Article Content

- [ ] Use `getArticleContent()` on detail page snapshot
- [ ] Ensure content is actual article, not placeholder
- [ ] Skip guides with insufficient content (<100 chars)
- [ ] Store in `content` and `contentBlocks` fields

### TC-03: Extract High-Resolution Images

- [ ] Use `extractImageUrls()` on detail page snapshot
- [ ] Add `transformToHighResTc()` function
- [ ] Apply transformation to all extracted URLs
- [ ] Store in `imageUrls` and `coverImageUrl` fields

### TC-04: Extract Author Information

- [ ] Add `extractTongchengAuthor()` function to accessibility-parser
- [ ] Extract author name with Tongcheng-specific patterns
- [ ] Attempt avatar extraction (best effort)
- [ ] Store in `authorName` and `authorAvatar` fields

### TC-05: Extract Publish Date

- [ ] Use existing `extractPublishDate()` function
- [ ] Store in `publishedAt` field

### TC-06: Extract Engagement Metrics

- [ ] Add `extractTongchengStats()` function to accessibility-parser
- [ ] Use `parseChineseNumber()` for "2.7千" patterns
- [ ] Extract: views, likes, saves, comments
- [ ] Store in corresponding Count fields

### TC-07: Verification

- [ ] Run test crawler for at least 10 guides
- [ ] Verify content is actual article (>100 chars, not placeholder)
- [ ] Verify image URLs are extracted
- [ ] Verify author name is extracted (not just default)
- [ ] Verify quality score is calculated (not hardcoded 50)
- [ ] Log extraction success rate per field
