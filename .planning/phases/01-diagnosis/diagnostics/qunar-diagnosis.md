# Qunar (去哪儿) Diagnostic Report

**Platform:** qunar
**Diagnosed:** 2026-01-25
**Method:** Code analysis + architecture review

## Test URLs

- List page: `https://travel.qunar.com/p-cs300028-beijing/youji?page=1`
- Detail page: `https://travel.qunar.com/youji/[id]`

## Current Crawler Behavior

The Qunar crawler (`qunar.ts`) follows the same two-phase pattern as Ctrip:

1. **List Page Navigation**: Fetches list page, extracts guide URLs via regex
2. **Detail Page Navigation**: Navigates to each detail page and extracts content

### Extraction Flow

```
List Page → Extract URLs (/youji/[id]) → Navigate to Detail → Scroll → Take Snapshot → Parse
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

Similar to Ctrip - the crawler successfully acquires page content but extraction is incomplete.

## Root Cause Analysis

### Stage: PARSING (not acquisition)

The issue is **parsing stage**, not acquisition:
- Pages load successfully
- No anti-bot indicators in code
- Detail page navigation works correctly

### Specific Issues

1. **Fixed sleep() delays** (Lines 94, 96, 125, 127):
   ```typescript
   await sleep(2000);  // List page
   await scrollToLoadContent(2);
   await sleep(1000);
   ```
   - Same timing issues as Ctrip

2. **City ID requirement**:
   - Requires exact city ID mapping (e.g., `300028-beijing`)
   - Returns empty if city not in `CITY_IDS` map
   - 20 cities pre-mapped

3. **Content validation threshold**:
   ```typescript
   if (!textContent || textContent.length < 100) {
     console.log(`[Qunar] Skipping guide with insufficient content: ${url}`);
     return null;
   }
   ```
   - Stricter than Ctrip (100 chars vs 50 chars)
   - May skip valid short-form content

4. **Image URL extraction limitations**:
   - Same regex-based extraction as Ctrip
   - Misses lazy-loaded images
   - No high-resolution distinction

5. **Missing fields**:
   - `authorAvatar`: Not extracted
   - `publishDate`: Not extracted
   - `savesCount`: Not extracted
   - `commentsCount`: Not extracted

6. **Same content/image limits**:
   - Content limited to 50,000 chars (Line 160)
   - Images limited to 20 (Line 165)

## Anti-Bot Observations

No significant anti-bot protection observed:
- No captcha handling
- No login requirement
- No rate limiting detection

Qunar appears similarly accessible to Ctrip.

## Existing Crawler Output Comparison

**What current crawler extracts:**
- ✅ Title (from headings)
- ✅ Content text (from StaticText nodes)
- ⚠️ Author name (pattern matching, falls back to "去哪儿用户")
- ⚠️ Image URLs (may get thumbnails, may miss some)
- ⚠️ Engagement stats (pattern matching)

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

### Priority 2: Expand city ID mapping
- Add more cities or implement dynamic city ID lookup
- Consider fallback to search-based approach

### Priority 3: Improve image extraction
- Same improvements as Ctrip
- Extract high-resolution variants
- Handle lazy-loaded images

### Priority 4: Add missing field extraction
- Parse publish date from page structure
- Extract author avatar
- Capture engagement metrics more reliably

### Priority 5: Adjust content threshold
- Consider lowering threshold or making it configurable
- Short-form travel tips may still be valuable

## Platform-Specific Quirks

1. **URL Structure**: City IDs include hyphen format (`300028-beijing`)
2. **Detail URL Pattern**: Simple `/youji/[id]` format
3. **Content Structure**: Similar to Ctrip, uses StaticText nodes
4. **Tag Extraction**: More extensive tag patterns (12 patterns vs Ctrip's 9)

## Differences from Ctrip

| Aspect | Ctrip | Qunar |
|--------|-------|-------|
| Content threshold | 50 chars | 100 chars |
| City ID format | `Beijing1` | `300028-beijing` |
| Tag patterns | 9 patterns | 12 patterns |
| Default author | "携程用户" | "去哪儿用户" |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Root cause identification | HIGH | Same pattern as Ctrip |
| Anti-bot assessment | HIGH | No anti-bot code paths |
| Fix recommendations | MEDIUM | Need runtime testing |

---

_Diagnosed: 2026-01-25 via code analysis_
