# Plan 01-03 Summary: Mafengwo and Tongcheng Diagnostics

**Completed:** 2026-01-25
**Status:** ✅ Success

## What Was Built

Diagnosed Mafengwo and Tongcheng crawlers, confirming the research hypothesis about list-only extraction.

### Files Created

| File | Purpose |
|------|---------|
| `.planning/phases/01-diagnosis/diagnostics/mafengwo-diagnosis.md` | Mafengwo diagnostic findings |
| `.planning/phases/01-diagnosis/diagnostics/tongcheng-diagnosis.md` | Tongcheng diagnostic findings |

## Key Findings

### ⚠️ CRITICAL: List-Only Extraction CONFIRMED

Both Mafengwo and Tongcheng crawlers have the **same fundamental architectural issue**:

```
Current:  List Page → Extract URLs → Parse 300-char context → Return PLACEHOLDER
Required: List Page → Extract URLs → Navigate to Detail → Parse FULL content
```

### Failure Category: `parsing:no_content`

Both platforms return **placeholder content** instead of actual articles:
```typescript
content: `${title} - ${city}旅游攻略`  // NOT real content!
```

### Comparison with Ctrip/Qunar

| Platform | Detail Navigation | Content Quality | Root Cause |
|----------|-------------------|-----------------|------------|
| Ctrip | ✅ Yes | Partial | Parsing issues |
| Qunar | ✅ Yes | Partial | Parsing issues |
| Mafengwo | ❌ No | Placeholder | Architecture |
| Tongcheng | ❌ No | Placeholder | Architecture |

### Data Quality Comparison

| Field | Mafengwo/Tongcheng (List-only) | Expected (Detail Page) |
|-------|-------------------------------|------------------------|
| Title | ⚠️ Partial | ✅ Full |
| Content | ❌ Placeholder | ✅ Full article (5000+ chars) |
| Images | ⚠️ 0-1 | ✅ 10-50+ |
| Author | ⚠️ Default fallback | ✅ Actual name + avatar |
| Publish Date | ❌ Missing | ✅ Available |

## Login Requirements (Mafengwo)

| Content Type | Without Login | With Login |
|--------------|---------------|------------|
| List page | ✅ Usually works | ✅ Full access |
| Detail page | ⚠️ May show captcha | ✅ Full access |
| High-res images | ⚠️ May be blocked | ✅ Full access |

Mafengwo has **moderate anti-bot protection** with captcha detection.
Tongcheng has **minimal protection** — easiest to crawl.

## Must-Haves Achieved

| Truth | Status |
|-------|--------|
| Mafengwo diagnostic produces report | ✅ |
| Tongcheng diagnostic produces report | ✅ |
| List-only extraction confirmed | ✅ Critical finding documented |
| Login requirements documented | ✅ Mafengwo needs login for full access |

## Recommended Fix Approach

### Both Platforms Need Same Fix

**PRIMARY:** Add detail page navigation following Ctrip/Qunar pattern:

```typescript
async function crawlPlatform(city, options) {
  // Phase 1: Get URLs from list page
  const guideUrls = await fetchGuideUrls(listUrl);

  // Phase 2: Visit each detail page (NEW)
  for (const url of guideUrls) {
    const guide = await fetchGuideDetail(url, city);
    if (guide) results.push(guide);
  }
}
```

**SECONDARY:**
1. Replace fixed sleep() with `waitForContentStable()`
2. Extract all required fields from detail page
3. Add login session support for Mafengwo

## Next Steps

- Plan 01-04: Diagnose Xiaohongshu (most complex: API-based, video, anti-bot)
- Plan 01-05: Consolidate all findings into DIAGNOSIS-SUMMARY.md

---

_Completed: 2026-01-25_
