# Ctrip (携程) Diagnostic Report

**Platform:** ctrip
**Diagnosed:** 2026-01-25
**Method:** Code analysis + architecture review

## Test URLs

- List page: `https://you.ctrip.com/travels/Beijing1/t3-p1.html`
- Detail page: `https://you.ctrip.com/travels/Beijing1/[id].html`

## Current Crawler Behavior

The Ctrip crawler (`ctrip.ts`) follows a two-phase extraction pattern:

1. **List Page Navigation**: Fetches list page, extracts guide URLs via regex
2. **Detail Page Navigation**: Navigates to each detail page and extracts content

### Extraction Flow

```
List Page → Extract URLs → Navigate to Detail → Scroll → Take Snapshot → Parse
```

### Current Data Extraction

| Field | Extractor | Source |
|-------|-----------|--------|
| title | `getBestTitle()` | Accessibility tree headings |
| content | `getArticleContent()` | StaticText nodes |
| authorName | `extractAuthor()` | Pattern matching |
| imageUrls | `extractImageUrls()` | URL pattern matching |
| likesCount | `extractStats()` | Pattern matching |
| viewsCount | `extractStats()` | Pattern matching |

## Failure Category

**Primary:** `parsing:partial`

The crawler successfully acquires page content (navigates to detail page, takes snapshot) but extraction is incomplete.

## Root Cause Analysis

### Stage: PARSING (not acquisition)

The issue is **parsing stage**, not acquisition:
- Pages load successfully (snapshot length typically >10KB)
- No anti-bot indicators observed in code
- Detail page navigation works correctly

### Specific Issues

1. **Fixed sleep() delays** (Lines 84, 86, 118, 119):
   ```typescript
   await sleep(2000);  // List page
   await scrollToLoadContent(2);
   await sleep(1000);
   ```
   - May snapshot too early if content loads slower than 2 seconds
   - May wait unnecessarily if content loads faster

2. **Image URL extraction limitations**:
   - Only extracts URLs matching pattern: `https?://....(jpg|jpeg|png|webp|gif)`
   - Misses lazy-loaded images or images with query parameters
   - No distinction between thumbnails and high-resolution originals

3. **Author extraction fragility**:
   - Relies on pattern matching (作者, author, 用户)
   - Falls back to "携程用户" if pattern fails
   - Avatar URL not extracted

4. **Missing fields**:
   - `authorAvatar`: Not extracted
   - `publishDate`: Not extracted
   - `savesCount`: Not extracted
   - `commentsCount`: Not extracted

5. **Content truncation**:
   - Content limited to 50,000 chars (Line 157)
   - Images limited to 20 (Line 161)

## Anti-Bot Observations

No significant anti-bot protection observed in code:
- No captcha handling
- No login requirement
- No rate limiting detection

Ctrip appears to be the most accessible of the 5 platforms.

## Existing Crawler Output Comparison

**What current crawler extracts:**
- ✅ Title (from headings)
- ✅ Content text (from StaticText nodes)
- ⚠️ Author name (pattern matching, may miss)
- ⚠️ Image URLs (may get thumbnails, may miss some)
- ⚠️ Engagement stats (pattern matching, may miss)

**What is missing:**
- ❌ Author avatar URL
- ❌ Publish date
- ❌ Saves count
- ❌ High-resolution image distinction

## Recommended Fix Approach

### Priority 1: Replace fixed sleep() with smart wait
```typescript
// Instead of: await sleep(2000);
await waitForContentStable(10000, 500);
```

### Priority 2: Improve image extraction
- Extract `srcset` or `data-src` attributes for high-res images
- Filter thumbnails by dimension in URL (e.g., `_w200_h150`)
- Keep original URLs (larger dimension variants)

### Priority 3: Add missing field extraction
- Parse publish date from page structure
- Extract author avatar from user profile links
- Capture saves/favorites count

### Priority 4: Add diagnostic logging
- Log snapshot length before parsing
- Log extracted field counts
- Log any parsing errors

## Platform-Specific Quirks

1. **URL Structure**: City IDs are custom (e.g., `Beijing1`, `Shanghai2`)
2. **Image CDN**: Uses various CDN domains, URLs don't expire quickly
3. **Content Structure**: Accessibility tree has clear StaticText nodes for content
4. **Engagement Data**: Stats often appear in specific UI patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Root cause identification | HIGH | Code analysis clearly shows parsing-stage issues |
| Anti-bot assessment | HIGH | No anti-bot code paths visible |
| Fix recommendations | MEDIUM | Need runtime testing to validate |

---

_Diagnosed: 2026-01-25 via code analysis_
