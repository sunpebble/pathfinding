# Phase 3: Ctrip - Research

**Researched:** 2026-01-25
**Domain:** Ctrip (you.ctrip.com) travel guide extraction using Chrome DevTools MCP accessibility tree parsing
**Confidence:** HIGH

## Summary

Phase 3 focuses on improving the existing Ctrip crawler to extract all 6 core fields completely. The crawler already has the correct architecture (detail page navigation) but needs parsing enhancements. The Phase 1 diagnosis identified the issue as `parsing:partial` - the crawler successfully acquires content but extraction is incomplete.

Key improvements needed:

1. **Image URL Enhancement**: Current extraction gets images at `_W_640_0_Q90` resolution. Need to extract high-resolution variants by modifying URL parameters.
2. **Missing Field Extraction**: Add extractors for publish date (present as "2023-05-09" format), author avatar (may require profile link inspection), saves count, and comments count.
3. **Engagement Metrics Improvement**: Current regex patterns miss formatted numbers like "2.7千" (2.7k) and "11.5万" (115k).

The infrastructure from Phase 2 (`waitForContentStable()`, session management) is already integrated into the Ctrip crawler.

**Primary recommendation:** Enhance the accessibility-parser.ts extractors for Ctrip-specific patterns and add image URL transformation for high-resolution originals.

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

### Existing Utilities

| Utility                  | Location                  | Purpose                     | Status                                        |
| ------------------------ | ------------------------- | --------------------------- | --------------------------------------------- |
| `getBestTitle()`         | `accessibility-parser.ts` | Extract title from headings | EXISTS - working                              |
| `getArticleContent()`    | `accessibility-parser.ts` | Extract body text           | EXISTS - working                              |
| `extractAuthor()`        | `accessibility-parser.ts` | Extract author name         | EXISTS - needs enhancement for Ctrip patterns |
| `extractImageUrls()`     | `accessibility-parser.ts` | Extract image URLs          | EXISTS - needs high-res transformation        |
| `extractStats()`         | `accessibility-parser.ts` | Extract engagement metrics  | EXISTS - needs Chinese number parsing         |
| `waitForContentStable()` | `diagnostics/capture.ts`  | Smart content loading       | EXISTS - already in use                       |

**No new dependencies required.** All improvements are enhancements to existing extractors.

## Architecture Patterns

### Recommended Project Structure

```
src/lib/crawlers/
├── ctrip.ts               # Platform crawler (enhance)
├── accessibility-parser.ts # Content extraction (enhance)
├── diagnostics/           # Already complete from Phase 1-2
├── session/               # Already complete from Phase 2
├── mcp-client.ts          # Browser automation (no changes)
└── index.ts               # Crawler registry (no changes)
```

### Pattern 1: High-Resolution Image URL Transformation

**What:** Transform Ctrip CDN URLs to request higher resolution images
**When to use:** After extracting image URLs from accessibility tree
**Example:**

```typescript
// Source: Pattern derived from Ctrip CDN URL analysis
// Original: https://dimg04.c-ctrip.com/images/xxx_W_640_0_Q90.jpg?proc=autoorient
// High-res: https://dimg04.c-ctrip.com/images/xxx_W_0_0_Q100.jpg (or remove _W_ params entirely)

export function transformToHighRes(url: string): string {
  // Pattern: _W_[width]_[height]_Q[quality]
  // Width 0 = original, Height 0 = auto, Q100 = max quality

  if (url.includes('c-ctrip.com')) {
    // Replace dimension/quality params with max settings
    return url
      .replace(/_W_\d+_\d+_Q\d+/, '_W_0_0_Q100')
      .replace(/\?proc=autoorient$/, ''); // Optional: remove processing
  }

  return url;
}
```

### Pattern 2: Chinese Number Parsing

**What:** Parse Chinese formatted numbers like "2.7千" (2.7k) and "11.5万" (115k)
**When to use:** When extracting engagement metrics from accessibility tree
**Example:**

```typescript
// Source: Pattern derived from Ctrip page analysis
export function parseChineseNumber(text: string): number {
  // Match patterns: "2.7千", "11.5万", "1234", "阅读量2.7千"
  const match = text.match(/([\d.]+)\s*(千|万|k|w)?/i);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case '千':
    case 'k':
      return Math.round(num * 1000);
    case '万':
    case 'w':
      return Math.round(num * 10000);
    default:
      return Math.round(num);
  }
}
```

### Pattern 3: Publish Date Extraction

**What:** Extract publish date from accessibility tree content
**When to use:** When parsing Ctrip detail pages
**Example:**

```typescript
// Source: Pattern derived from Ctrip page analysis
// Date formats observed: "2023-05-09", "发布时间：2023-05-09"
export function extractPublishDate(content: string): string | undefined {
  const patterns = [
    // ISO-like date
    /(\d{4}-\d{2}-\d{2})/,
    // Chinese format
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    // With label
    /发布(?:时间)?[：:]\s*(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      if (match[2] && match[3]) {
        // Chinese format: pad month/day
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
      return match[1];
    }
  }

  return undefined;
}
```

### Pattern 4: Enhanced Engagement Metrics

**What:** Extract likes, saves, comments, views with Chinese number support
**When to use:** When parsing Ctrip detail pages
**Example:**

```typescript
// Source: Pattern for comprehensive stats extraction
export function extractCtripStats(content: string): {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
} {
  const stats: Record<string, number | undefined> = {};

  // Views: "阅读量2.7千", "浏览量 11.5万", "2.7千次浏览"
  const viewsMatch = content.match(/(?:阅读|浏览)量?\s*([\d.]+\s*[千万kw]?)/i);
  if (viewsMatch) stats.views = parseChineseNumber(viewsMatch[1]);

  // Likes: "点赞 120", "120个赞", "赞 2.1千"
  const likesMatch = content.match(/(?:点赞|个赞|赞)\s*([\d.]+\s*[千万kw]?)/i);
  if (likesMatch) stats.likes = parseChineseNumber(likesMatch[1]);

  // Saves/Favorites: "收藏 85", "85收藏"
  const savesMatch = content.match(/收藏\s*([\d.]+\s*[千万kw]?)/i);
  if (savesMatch) stats.saves = parseChineseNumber(savesMatch[1]);

  // Comments: "评论 61", "61条评论"
  const commentsMatch = content.match(
    /(?:评论|条评论)\s*([\d.]+\s*[千万kw]?)/i
  );
  if (commentsMatch) stats.comments = parseChineseNumber(commentsMatch[1]);

  return stats;
}
```

### Anti-Patterns to Avoid

- **Hardcoding image dimensions:** Use URL transformation, not fixed dimensions. Ctrip CDN supports dynamic sizing.
- **Simple parseInt for metrics:** Chinese pages use "千" (k) and "万" (10k) suffixes. Always use `parseChineseNumber()`.
- **Ignoring content structure:** Ctrip has clear sections (前言, 第1天, etc.) - preserve structure in content extraction.
- **Modifying working navigation logic:** The list-to-detail navigation already works correctly. Focus only on parsing improvements.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build    | Use Instead                           | Why                                                 |
| -------------------------- | -------------- | ------------------------------------- | --------------------------------------------------- |
| Content stability          | Custom polling | `waitForContentStable()`              | Already implemented and tested                      |
| Accessibility tree parsing | HTML parsing   | `accessibility-parser.ts`             | Already handles Chrome DevTools output              |
| Anti-bot detection         | Ad-hoc checks  | `detectAntiBotIndicators()`           | Already implemented with platform-specific patterns |
| Image extraction           | Custom regex   | `extractImageUrls()` + transformation | Base extraction exists, just add high-res transform |

**Key insight:** Phase 3 is about enhancing existing extractors, not building new infrastructure. The heavy lifting (navigation, waiting, capture) is already done.

## Common Pitfalls

### Pitfall 1: Image URLs Already Work But Return Thumbnails

**What goes wrong:** Images extract successfully but are 640px wide, not original resolution
**Why it happens:** Ctrip CDN URLs include size parameters like `_W_640_0_Q90`
**How to avoid:** Add post-extraction transformation to request high-res versions
**Warning signs:** Image URLs contain `_W_320_` or `_W_640_` patterns

### Pitfall 2: Missing Stats Due to Chinese Number Format

**What goes wrong:** Views/likes show as 0 when page shows "2.7千"
**Why it happens:** `parseInt("2.7千")` returns 2, missing the multiplier
**How to avoid:** Use `parseChineseNumber()` for all stat extraction
**Warning signs:** Stats are unexpectedly low or zero when content has values

### Pitfall 3: Author Extraction Falls Back Too Often

**What goes wrong:** All authors show as "携程用户" (fallback)
**Why it happens:** Generic patterns don't match Ctrip's specific author section
**How to avoid:** Add Ctrip-specific patterns before generic ones
**Warning signs:** High percentage of results have default author name

### Pitfall 4: Publish Date Not in CrawlResult Interface

**What goes wrong:** Date extracted but nowhere to store it
**Why it happens:** CrawlResult interface doesn't have a publishDate field
**How to avoid:** Check if interface needs extending, or use content/metadata
**Warning signs:** Extracted data has no destination

### Pitfall 5: Content Truncation at 50KB

**What goes wrong:** Long travel guides are cut off
**Why it happens:** Current code: `textContent.substring(0, 50000)`
**How to avoid:** Consider if truncation is intentional (likely yes for DB limits)
**Warning signs:** Content ends abruptly mid-sentence

## Code Examples

Verified patterns from codebase analysis and page investigation:

### Image URL Patterns (from WebFetch)

```typescript
// Observed patterns from Ctrip pages:
// List page thumbnails: _W_320_0_Q80.jpg
// Detail page images: _W_640_0_Q90.jpg?proc=autoorient
// High-res pattern: _W_0_0_Q100.jpg (width 0 = original)

// CDN domains observed:
// - dimg04.c-ctrip.com
// - pages.c-ctrip.com
```

### Engagement Metrics (from WebFetch)

```typescript
// Observed patterns from Ctrip pages:
// Views: "阅读量2.7千", "11.5万"
// Likes: "120", displayed near thumbs-up icon
// Comments: "61", displayed near comment icon
// Date: "2023-05-09", "2020-09-03"
```

### Current Ctrip Extraction Flow

```typescript
// Source: ctrip.ts - existing working pattern
async function fetchGuideDetail(
  url: string,
  city: string
): Promise<CrawlResult | null> {
  // 1. Navigate to detail page
  await navigateTo(url, { timeout: 30000 });
  await waitForContentStable(); // Phase 2 infrastructure
  await scrollToLoadContent(3); // Load lazy images
  await sleep(1000); // Rate limiting

  // 2. Take accessibility tree snapshot
  const snapshot = await takeSnapshot({ verbose: true });
  const content = snapshot.content;

  // 3. Extract using accessibility-parser
  const title = getBestTitle(content, `${city}旅游攻略`);
  const textContent = getArticleContent(content);
  const authorName = extractAuthor(content) || '携程用户';
  const imageUrls = extractImageUrls(content);
  const stats = extractStats(content);

  // 4. Build result (needs enhancement here)
  return {
    sourceExternalId,
    sourceUrl: url,
    title,
    content: textContent.substring(0, 50000),
    authorName,
    imageUrls: imageUrls.slice(0, 20),
    likesCount: stats.likes || 0,
    viewsCount: stats.views || 0,
    // Missing: authorAvatar, publishedAt, savesCount, commentsCount
  };
}
```

## State of the Art

| Old Approach         | Current Approach         | When Changed    | Impact                         |
| -------------------- | ------------------------ | --------------- | ------------------------------ |
| Fixed sleep(2000)    | `waitForContentStable()` | Phase 2         | Already updated in ctrip.ts    |
| Raw image URLs       | Transform for high-res   | Phase 3 (to do) | Will improve image quality     |
| Simple parseInt      | Chinese number parsing   | Phase 3 (to do) | Will fix engagement metrics    |
| Fallback author only | Ctrip-specific patterns  | Phase 3 (to do) | Will improve author extraction |

**Deprecated/outdated:**

- Using `sleep()` after navigation - replaced with `waitForContentStable()` (already done)

## Open Questions

Things that couldn't be fully resolved:

1. **Author Avatar URL Location**
   - What we know: WebFetch couldn't locate avatar in detail page content
   - What's unclear: Avatar may be in user profile link, require separate fetch, or not consistently present
   - Recommendation: Mark as "best effort" - extract if present, don't fail if missing

2. **Saves/Favorites Count Visibility**
   - What we know: List page shows engagement metrics, detail page structure unclear
   - What's unclear: Whether saves count appears on detail page or only list page
   - Recommendation: Try extraction, fall back to 0 if not found

3. **Maximum Image Resolution**
   - What we know: `_W_0_0_Q100` pattern likely returns original
   - What's unclear: Whether all images have high-res versions, or some are user uploads at lower res
   - Recommendation: Apply transformation, accept whatever resolution CDN returns

4. **publishedAt Field in CrawlResult**
   - What we know: CrawlResult interface doesn't have publishedAt
   - What's unclear: Whether to add it to interface or use alternative storage
   - Recommendation: Check if adding publishedAt to CrawlResult is acceptable for v1

## Sources

### Primary (HIGH confidence)

- **Ctrip.ts codebase** - Current implementation analyzed
- **accessibility-parser.ts** - Current extractors analyzed
- **Phase 1 diagnosis** - `/Users/shikun/Developer/opensource/pathfinding/.planning/phases/01-diagnosis/diagnostics/ctrip-diagnosis.md`
- **Phase 2 research** - `/Users/shikun/Developer/opensource/pathfinding/.planning/phases/02-infrastructure/02-RESEARCH.md`

### Secondary (MEDIUM confidence)

- **WebFetch: List page** - `https://you.ctrip.com/travels/shanghai2/t3-p1.html`
  - Confirmed: Image patterns `_W_320_0_Q80.jpg`, CDN domains, author/date visibility
- **WebFetch: Detail page** - `https://you.ctrip.com/travels/shanghai2/4098321.html`
  - Confirmed: Date format "2023-05-09", views "阅读量2.7千", image patterns `_W_640_0_Q90.jpg`

### Tertiary (LOW confidence)

- None - all findings verified against codebase or live pages

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based entirely on existing codebase
- Architecture: HIGH - Ctrip crawler architecture is correct, only needs parsing enhancements
- Pitfalls: HIGH - Derived from Phase 1 diagnosis and verified with WebFetch
- Image URL transformation: MEDIUM - Pattern inferred from URL analysis, needs runtime validation

**Research date:** 2026-01-25
**Valid until:** 60 days (Ctrip page structure may change, but patterns are stable)

---

## Implementation Checklist for Planner

Based on this research, Phase 3 should implement:

### CTRIP-01: Complete Content Extraction

- [x] Already working - `getArticleContent()` extracts StaticText nodes
- [ ] Verify content is not truncated prematurely (50KB limit may be acceptable)

### CTRIP-02: High-Resolution Image URLs

- [ ] Add `transformToHighRes()` function to accessibility-parser or ctrip.ts
- [ ] Apply transformation to all extracted image URLs
- [ ] Pattern: Replace `_W_640_0_Q90` with `_W_0_0_Q100`

### CTRIP-03: Author Information

- [ ] Add Ctrip-specific patterns to `extractAuthor()` or create platform override
- [ ] Attempt avatar extraction (best effort - may not be consistently present)
- [ ] Consider adding `authorAvatar` to CrawlResult if not present

### CTRIP-04: Publish Date Extraction

- [ ] Add `extractPublishDate()` function
- [ ] Parse ISO dates (2023-05-09) and Chinese dates (2023年5月9日)
- [ ] Determine where to store: add to CrawlResult interface or use metadata

### CTRIP-05: Engagement Metrics

- [ ] Add `parseChineseNumber()` utility for "2.7千", "11.5万" patterns
- [ ] Enhance `extractStats()` or create `extractCtripStats()` with Chinese number support
- [ ] Extract: views, likes, saves (if available), comments

### CTRIP-06: Verification

- [ ] Run test crawler for at least 10 guides
- [ ] Verify all 6 core fields have non-empty values
- [ ] Verify image URLs are high-resolution (check dimensions)
- [ ] Log extraction success rate per field

### Optional: CrawlResult Interface

- [ ] Consider adding `publishedAt?: string` field
- [ ] Consider adding `savesCount?: number` field (currently has `likesCount` and `viewsCount`)
- [ ] Note: `commentsCount` already exists in interface
