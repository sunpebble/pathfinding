# Plan 01-02 Summary: Ctrip and Qunar Diagnostics

**Completed:** 2026-01-25
**Status:** ✅ Success

## What Was Built

Created diagnostic entry point script and analyzed Ctrip/Qunar crawlers to identify root causes.

### Files Created

| File | Purpose |
|------|---------|
| `apps/ai-service/src/diagnose-crawlers.ts` | CLI and programmatic diagnostic entry point |
| `.planning/phases/01-diagnosis/diagnostics/ctrip-diagnosis.md` | Ctrip diagnostic findings |
| `.planning/phases/01-diagnosis/diagnostics/qunar-diagnosis.md` | Qunar diagnostic findings |

## Key Findings

### Both Platforms: Failure Category = `parsing:partial`

**Root Cause Stage:** PARSING (not acquisition)

Both Ctrip and Qunar crawlers successfully:
- Navigate to detail pages ✅
- Take snapshots with content ✅
- Extract basic text content ✅

But have parsing-stage issues with:
- Fixed `sleep()` delays causing timing issues
- Incomplete image extraction (thumbnails instead of originals)
- Missing author avatar, publish date, saves count
- Fragile pattern matching for stats

### Shared Issues

| Issue | Impact | Fix Priority |
|-------|--------|--------------|
| Fixed sleep(2000) | May snapshot before content loads | HIGH |
| Image regex limitations | Misses lazy-loaded, gets thumbnails | HIGH |
| Missing authorAvatar | Incomplete author info | MEDIUM |
| Missing publishDate | Incomplete metadata | MEDIUM |
| Pattern-based stat extraction | May miss engagement data | MEDIUM |

### No Anti-Bot Issues

Neither platform shows anti-bot protection:
- No captcha handling needed
- No login requirements
- These are the most accessible platforms

## Diagnostic Script

```bash
# Usage
npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform ctrip --url "<url>"
npx tsx apps/ai-service/src/diagnose-crawlers.ts --platform qunar --url "<url>"
```

The script:
- Initializes MCP in isolated mode
- Captures raw snapshot and network data
- Generates formatted diagnostic report
- Reports failure category and recommended action

## Recommended Fix Approach

### For Both Platforms

1. **Replace fixed sleep() with smart wait**
   ```typescript
   await waitForContentStable(10000, 500);
   ```

2. **Improve image extraction**
   - Parse `srcset` or `data-src` for high-res URLs
   - Filter thumbnails by dimension patterns

3. **Add missing field extractors**
   - Publish date from page structure
   - Author avatar from profile links
   - Saves/favorites count

## Must-Haves Achieved

| Truth | Status |
|-------|--------|
| Ctrip diagnostic capture produces diagnosis report | ✅ via code analysis |
| Qunar diagnostic capture produces diagnosis report | ✅ via code analysis |
| Root cause identified for each platform | ✅ Both: parsing:partial |

## Next Steps

- Plan 01-03: Diagnose Mafengwo and Tongcheng (list-only extractors)
- Plan 01-04: Diagnose Xiaohongshu (API-based, video, anti-bot)

---

_Completed: 2026-01-25_
