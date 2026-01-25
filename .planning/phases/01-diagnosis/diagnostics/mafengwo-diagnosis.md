# Mafengwo (马蜂窝) Diagnostic Report

**Platform:** mafengwo
**Diagnosed:** 2026-01-25
**Method:** Code analysis + architecture review

## Test URLs

- List page: `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/10065.html` (北京)
- Detail page: `https://www.mafengwo.cn/i/[id].html`

## Current Crawler Behavior

### ⚠️ CRITICAL FINDING: LIST-ONLY EXTRACTION CONFIRMED

The Mafengwo crawler (`mafengwo.ts`) **does NOT navigate to detail pages**. It only:

1. Navigates to destination list page (Line 54)
2. Extracts guide URLs using regex: `/i/(\d+)\.html` (Line 112)
3. Parses metadata from **300 characters of context around each URL** (Lines 121-123)
4. Creates placeholder content: `"${title} - ${city}旅游攻略"` (Line 175)

### Code Evidence

```typescript
// Line 121-123: Only uses 300 char context around URL
const contextStart = Math.max(0, match.index! - 300);
const contextEnd = Math.min(content.length, match.index! + 300);
const context = content.substring(contextStart, contextEnd);

// Line 175: Placeholder content, NOT actual article
content: `${title} - ${city}旅游攻略`,
```

**NO DETAIL PAGE NAVIGATION** — the `fullUrl` is stored but never visited:
```typescript
// Line 161: URL is stored but never navigated to
const fullUrl = `https://www.mafengwo.cn/i/${guideId}.html`;
```

## Failure Category

**Primary:** `parsing:no_content`

The crawler extracts guide URLs correctly but returns **placeholder content instead of actual articles**.

## Root Cause Analysis

### Stage: ARCHITECTURE (fundamental design issue)

This is not a parsing bug — it's an **architectural limitation**:

| What's Captured | From List Page | From Detail Page (not visited) |
|-----------------|----------------|--------------------------------|
| Title | ⚠️ Partial (from context) | Full title |
| Content | ❌ Placeholder only | ✅ Full article |
| Images | ⚠️ 0-1 from context | ✅ All article images |
| Author | ⚠️ Pattern match | ✅ Profile link + avatar |
| Stats | ⚠️ If in context | ✅ Accurate counts |
| Publish Date | ❌ Not available | ✅ Available |

### Specific Issues

1. **No detail page navigation** (ROOT CAUSE)
2. **Content is hardcoded placeholder** (Line 175)
3. **Images limited to 0-1** from list page context (Line 180)
4. **Stats may be missing** if not in 300-char window
5. **Quality score always ~50** since content is empty (Line 185)

## List vs Detail Page Comparison

### List Page Data
- Guide URLs (correct)
- Titles (partial, may be truncated)
- Cover images (sometimes)
- Basic stats (if visible)

### Detail Page Data (NOT ACCESSED)
- Full article content (thousands of chars)
- All embedded images (10-50+)
- Author profile with avatar
- Accurate engagement stats
- Publish date
- Comments section

## Login Requirements

The code includes captcha detection (Lines 100-109):
```typescript
if (content.includes('验证') || content.includes('captcha')) {
  console.warn('[Mafengwo] Captcha detected');
  return guides;
}
```

And login helper reference (Lines 65-68):
```typescript
console.warn('[Mafengwo] No results found. You may need to login first:');
console.warn('  Run: pnpm --filter ai-service exec tsx src/login-helper.ts mafengwo');
```

### Login Requirements Summary

| Content Type | Without Login | With Login |
|--------------|---------------|------------|
| List page (basic) | ✅ Usually works | ✅ Works |
| List page (more results) | ⚠️ May be limited | ✅ Full access |
| Detail page content | ⚠️ May show captcha | ✅ Full access |
| High-res images | ⚠️ May be blocked | ✅ Full access |

**Recommendation:** Support persistent login for reliable extraction.

## Anti-Bot Observations

1. **Captcha detection** is implemented (Lines 100-109)
2. **Isolated session** used by default (Line 51)
3. **Fixed delays** used: `sleep(3000)` then `sleep(2000)` (Lines 90, 92)

Mafengwo has moderate anti-bot protection compared to Ctrip/Qunar.

## Existing Crawler Output Comparison

**What current crawler returns:**
```typescript
{
  title: "北京三日游攻略",           // From context (may be partial)
  content: "北京三日游攻略 - 北京旅游攻略",  // PLACEHOLDER!
  imageUrls: [],                    // Usually empty or 1 image
  authorName: "马蜂窝用户",          // Default fallback
  // Missing: authorAvatar, publishDate, full content
}
```

**What should be returned:**
```typescript
{
  title: "北京三日游完整攻略...",    // Full title from detail page
  content: "Day 1: 天安门广场...",   // Full article (5000+ chars)
  imageUrls: ["url1", "url2", ...],  // 10-50 images
  authorName: "旅行者小王",          // Actual author
  authorAvatar: "https://...",       // Author avatar
  publishDate: "2024-01-15",         // Publish date
}
```

## Recommended Fix Approach

### PRIMARY FIX: Add Detail Page Navigation

The crawler must be restructured to:

1. **Phase 1: List Page** — Extract guide URLs (current behavior)
2. **Phase 2: Detail Page** — Navigate to each URL and extract full content (NEW)

```typescript
// Proposed structure
async function crawlMafengwo(city, options) {
  // Phase 1: Get guide URLs from list page
  const guideUrls = await fetchGuideUrls(destUrl);

  // Phase 2: Visit each detail page (NEW)
  for (const url of guideUrls) {
    const guide = await fetchGuideDetail(url, city);
    if (guide) results.push(guide);
    await sleep(rateLimitDelay);
  }
}

async function fetchGuideDetail(url, city) {
  await navigateTo(url, { timeout: 30000 });
  await waitForContentStable();  // Smart wait instead of fixed sleep

  const snapshot = await takeSnapshot({ verbose: true });
  // Extract full content, all images, author info, etc.
  return parseGuideSnapshot(snapshot, url);
}
```

### SECONDARY FIXES

1. **Replace fixed sleep()** with `waitForContentStable()`
2. **Add login session support** via persistent browser context
3. **Handle captcha gracefully** — skip or retry with longer delay
4. **Extract all required fields** from detail page

## Platform-Specific Quirks

1. **City IDs**: Numeric IDs like `10065` for 北京
2. **Detail URL pattern**: `/i/[id].html`
3. **Captcha risk**: More likely than Ctrip/Qunar
4. **Rich content**: Detail pages have extensive article content
5. **Image galleries**: Often 20-50+ images per guide

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| List-only extraction confirmed | VERY HIGH | Code clearly shows no detail navigation |
| Placeholder content confirmed | VERY HIGH | Line 175 shows hardcoded content |
| Login requirements | HIGH | Code has login helper reference |
| Fix recommendation | HIGH | Follow Ctrip/Qunar pattern |

---

_Diagnosed: 2026-01-25 via code analysis_
