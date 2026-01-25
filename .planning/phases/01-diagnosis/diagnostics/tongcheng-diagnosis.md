# Tongcheng (同程) Diagnostic Report

**Platform:** tongcheng
**Diagnosed:** 2026-01-25
**Method:** Code analysis + architecture review

## Test URLs

- List page: `https://www.ly.com/travels/`
- Detail page: `https://www.ly.com/travels/[id].html`

## Current Crawler Behavior

### ⚠️ CRITICAL FINDING: LIST-ONLY EXTRACTION CONFIRMED

The Tongcheng crawler (`tongcheng.ts`) has the **exact same architectural issue as Mafengwo**:

1. Navigates to travels list page (Line 50)
2. Extracts guide URLs using regex: `/travels/(\d+)\.html` (Line 84)
3. Parses metadata from **300 characters of context around each URL** (Lines 93-95)
4. Creates placeholder content: `"${title} - ${city}旅游攻略"` (Line 146)

### Code Evidence

```typescript
// Line 93-95: Only uses 300 char context around URL
const contextStart = Math.max(0, match.index! - 300);
const contextEnd = Math.min(content.length, match.index! + 300);
const context = content.substring(contextStart, contextEnd);

// Line 146: Placeholder content, NOT actual article
content: `${title} - ${city}旅游攻略`,
```

**NO DETAIL PAGE NAVIGATION** — the `fullUrl` is stored but never visited:
```typescript
// Line 132: URL is stored but never navigated to
const fullUrl = `https://www.ly.com/travels/${guideId}.html`;
```

## Failure Category

**Primary:** `parsing:no_content`

Identical to Mafengwo — returns **placeholder content instead of actual articles**.

## Root Cause Analysis

### Stage: ARCHITECTURE (fundamental design issue)

Same architectural limitation as Mafengwo:

| What's Captured | From List Page | From Detail Page (not visited) |
|-----------------|----------------|--------------------------------|
| Title | ⚠️ Partial (from context) | Full title |
| Content | ❌ Placeholder only | ✅ Full article |
| Images | ⚠️ 0-1 from context | ✅ All article images |
| Author | ⚠️ Pattern match | ✅ Profile info |
| Stats | ⚠️ If in context | ✅ Accurate counts |
| Publish Date | ❌ Not available | ✅ Available |

### Specific Issues

1. **No detail page navigation** (ROOT CAUSE)
2. **Content is hardcoded placeholder** (Line 146)
3. **Images limited to 0-1** from list page context (Line 151)
4. **Quality score hardcoded to 50** (Line 156)
5. **Title minimum 5 chars** vs Mafengwo's 3 chars (Line 124)

### Difference from Mafengwo

| Aspect | Mafengwo | Tongcheng |
|--------|----------|-----------|
| List page URL | Destination-specific | Global `/travels/` |
| Title min length | 3 chars | 5 chars |
| Quality score | Calculated | Hardcoded 50 |
| Captcha detection | Yes | No |
| Login helper ref | Yes | No |

## List vs Detail Page Comparison

### List Page Data
- Guide URLs (correct)
- Titles (partial, may be truncated)
- Cover images (sometimes)
- Basic stats (if visible in context)

### Detail Page Data (NOT ACCESSED)
- Full article content
- All embedded images
- Author information
- Accurate engagement stats
- Publish date

## Anti-Bot Observations

Tongcheng appears to have **minimal anti-bot protection**:

1. **No captcha detection** in code
2. **No login helper reference**
3. Uses standard `sleep(3000)` delays (Lines 77, 79)
4. No session persistence

Tongcheng is likely the **easiest platform** to crawl among all 5.

## Existing Crawler Output Comparison

**What current crawler returns:**
```typescript
{
  title: "苏州两日游攻略",           // From context (may be partial)
  content: "苏州两日游攻略 - 苏州旅游攻略",  // PLACEHOLDER!
  imageUrls: [],                    // Usually empty or 1 image
  authorName: "同程用户",            // Default fallback
  qualityScore: 50,                 // Always 50
  // Missing: authorAvatar, publishDate, full content
}
```

**What should be returned:**
```typescript
{
  title: "苏州两日游完整攻略...",    // Full title from detail page
  content: "Day 1: 拙政园...",       // Full article
  imageUrls: ["url1", "url2", ...],  // Multiple images
  authorName: "江南旅人",            // Actual author
  publishDate: "2024-02-20",         // Publish date
  qualityScore: 75,                  // Based on actual content
}
```

## Recommended Fix Approach

### PRIMARY FIX: Add Detail Page Navigation

Same fix strategy as Mafengwo — restructure to two-phase crawling:

1. **Phase 1: List Page** — Extract guide URLs (current behavior)
2. **Phase 2: Detail Page** — Navigate to each URL and extract full content (NEW)

```typescript
// Proposed structure
async function crawlTongcheng(city, options) {
  // Phase 1: Get guide URLs from list page
  const guideUrls = await fetchGuideUrls(listUrl);

  // Phase 2: Visit each detail page (NEW)
  for (const url of guideUrls) {
    const guide = await fetchGuideDetail(url, city);
    if (guide) results.push(guide);
    await sleep(rateLimitDelay);
  }
}

async function fetchGuideDetail(url, city) {
  await navigateTo(url, { timeout: 30000 });
  await waitForContentStable();

  const snapshot = await takeSnapshot({ verbose: true });
  return parseGuideSnapshot(snapshot, url);
}
```

### SECONDARY FIXES

1. **Replace fixed sleep()** with `waitForContentStable()`
2. **Calculate quality score** based on actual content length and image count
3. **Extract all required fields** from detail page
4. **Add city-specific list URLs** (currently uses global list)

### OPTIONAL ENHANCEMENTS

Since Tongcheng has minimal anti-bot protection:
- Can potentially increase crawl rate
- May not need persistent login
- Could be used for quick data validation

## Platform-Specific Quirks

1. **City slugs**: Uses lowercase English names (`beijing`, `shanghai`)
2. **Global list page**: Currently ignores city parameter for list navigation
3. **Detail URL pattern**: `/travels/[id].html`
4. **Minimal protection**: No captcha, no login needed
5. **Tag patterns**: Most extensive (12 patterns including "省钱攻略", "短途游")

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| List-only extraction confirmed | VERY HIGH | Code clearly shows no detail navigation |
| Placeholder content confirmed | VERY HIGH | Line 146 shows hardcoded content |
| Minimal anti-bot protection | HIGH | No captcha/login code paths |
| Fix recommendation | HIGH | Follow Ctrip/Qunar pattern |

---

_Diagnosed: 2026-01-25 via code analysis_
