---
phase: 06-tongcheng
plan: 02
subsystem: crawlers
tags: [tongcheng, crawler, detail-navigation, accessibility-parser]

# Dependency graph
requires:
  - phase: 06-tongcheng-01
    provides: Tongcheng-specific extraction utilities (extractTongchengStats, extractTongchengAuthor, transformToHighResTc)
provides:
  - Restructured Tongcheng crawler with two-phase crawling (list → detail)
  - fetchGuideUrls() for list page URL extraction
  - fetchGuideDetail() for detail page content extraction
  - Dynamic quality score calculation based on content metrics
affects: [06-tongcheng-03, 07-xiaohongshu]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-phase-crawling, detail-page-navigation]

key-files:
  modified:
    - apps/ai-service/src/lib/crawlers/tongcheng.ts

key-decisions:
  - 'Follow Mafengwo pattern for crawler restructure'
  - 'Rate limiting 1-2 seconds between detail page requests'
  - 'Quality score base 30 with up to +70 from content/images/views'

patterns-established:
  - 'Two-phase crawling: fetchGuideUrls() → fetchGuideDetail() pattern for platforms without API'
  - 'Dynamic quality score calculation with content length, image count, and view metrics'

# Metrics
duration: 11min
completed: 2026-01-25
---

# Phase 06 Plan 02: Tongcheng Crawler Restructure Summary

**Restructured Tongcheng crawler to navigate from list page to detail pages, extracting full article content instead of placeholder text**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-25T13:01:12Z
- **Completed:** 2026-01-25T13:12:15Z
- **Tasks:** 2 (Task 2 inherently completed with Task 1)
- **Files modified:** 1

## Accomplishments

- Restructured `crawlTongcheng()` to use two-phase crawling pattern
- Created `fetchGuideUrls()` function to extract guide URLs from list page
- Created `fetchGuideDetail()` function to navigate to each detail page and extract full content
- Implemented dynamic quality score calculation (base 30, up to 100 based on content length, image count, views)
- Removed placeholder content pattern `${title} - ${city}旅游攻略`
- Added comprehensive debug logging for troubleshooting

## Task Commits

1. **Task 1: Restructure crawler with fetchGuideUrls and fetchGuideDetail** - `8c5910c6` (feat)

**Note:** Task 2's requirements were inherently satisfied by Task 1 implementation (full content extraction, quality score calculation, and logging were all part of the restructure).

## Files Created/Modified

- `apps/ai-service/src/lib/crawlers/tongcheng.ts` - Restructured with fetchGuideUrls() and fetchGuideDetail() functions

## Decisions Made

1. **Follow Mafengwo pattern** - Used same two-phase crawling architecture (list → detail) for consistency
2. **Rate limiting** - Added 1-2 second random delay between detail page requests to avoid rate limiting
3. **Quality score algorithm** - Base 30 points with:
   - Content length: +10/+20/+30 for 500/1000/2000+ chars
   - Image count: +5/+10/+15/+20 for 1/2/5/10+ images
   - Views: +5/+10/+15/+20 for 1/100/1000/10000+ views

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `convex/http.ts` are unrelated to crawler changes
- These errors exist in the project before and after our changes

## Next Phase Readiness

- Tongcheng crawler restructure complete
- Ready for 06-03 verification plan
- Pattern established for Xiaohongshu restructure in Phase 7

---

_Phase: 06-tongcheng_
_Completed: 2026-01-25_
