---
phase: 07-xiaohongshu
plan: 02
subsystem: crawlers
tags: [xiaohongshu, video-notes, quality-filtering, detail-page, cdn-expiry]

# Dependency graph
requires:
  - phase: 07-xiaohongshu-01
    provides: detectPlaceholderContent, isContentQualityAcceptable, calculateXhsQualityScore, handleSessionRefresh
provides:
  - fetchNoteDetail() for video note detail page navigation
  - Quality filtering integrated into convertNoteToResult()
  - needs-recrawl tag for placeholder content
  - videoUrlCapturedAt timestamp for CDN URL freshness
  - Enhanced stats tracking (fullContent, placeholders, videoDetailFetches)
affects: [07-03, 08-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Video detail page navigation for fresh CDN URLs
    - Quality-first filtering in result conversion
    - Placeholder tagging with needs-recrawl for re-crawl prioritization

key-files:
  created: []
  modified:
    - apps/ai-service/src/lib/crawlers/xiaohongshu.ts
    - apps/ai-service/src/lib/crawlers/index.ts

key-decisions:
  - 'Move quality filtering into convertNoteToResult() for early rejection'
  - 'Remove deprecated calculateQualityScore() in favor of calculateXhsQualityScore()'
  - 'Add videoUrlCapturedAt to CrawlResult interface for URL freshness tracking'
  - 'Wire fetchNoteDetail for video notes to capture fresh CDN URLs'

patterns-established:
  - 'Quality filtering at result conversion: filter early, return null for unacceptable content'
  - 'Placeholder tagging: add needs-recrawl tag for low-quality content'
  - 'Video URL freshness: capture timestamp when video URLs are fetched'
  - 'Stats tracking: track fullContent, placeholders, and videoDetailFetches counts'

# Metrics
duration: 16min
completed: 2026-01-25
---

# Phase 7 Plan 02: Crawler Enhancement Summary

**Added detail page navigation for video notes and integrated quality filtering into result conversion pipeline**

## Performance

- **Duration:** 16 min
- **Started:** 2026-01-25T15:24:26Z
- **Completed:** 2026-01-25T15:40:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `fetchNoteDetail()` function for navigating to individual note detail pages with smart waiting and rate limiting
- Integrated quality filtering into `convertNoteToResult()` - notes with <100 chars are skipped early
- Placeholder detection now uses `calculateXhsQualityScore()` with `needsRecrawl` flag
- Placeholder notes get low quality score (20) and 'needs-recrawl' tag for re-crawl prioritization
- Video notes (type === 'video') now get fresh URLs from detail page via `fetchNoteDetail()`
- Added `videoUrlCapturedAt` field to CrawlResult interface for CDN URL freshness tracking
- Enhanced stats logging: reports fullContent, placeholders, and videoDetailFetches counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add videoUrlCapturedAt field** - `74ba542d` (feat)
2. **Task 1+2: Add fetchNoteDetail and quality filtering integration** - `0886fc1b` (feat)

## Files Created/Modified

- `apps/ai-service/src/lib/crawlers/index.ts` - Added videoUrlCapturedAt optional field to CrawlResult interface
- `apps/ai-service/src/lib/crawlers/xiaohongshu.ts` - Added fetchNoteDetail(), updated convertNoteToResult() with quality filtering, wired video detail fetching

## Decisions Made

- Moved quality filtering from fetchNotesFromExplore() into convertNoteToResult() for cleaner separation
- Removed deprecated `calculateQualityScore()` function - replaced by exported `calculateXhsQualityScore()`
- Added `videoUrlCapturedAt` to CrawlResult interface (video CDN URLs expire in ~30 seconds)
- Wired fetchNoteDetail() only for video notes to minimize unnecessary detail page navigations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript compilation errors in convex/ folder (unrelated to this work)
- Used tsx module loading to verify syntax correctness

## Next Phase Readiness

- Video notes can now fetch fresh URLs from detail pages
- Quality filtering integrated into crawler pipeline
- All utilities from 07-01 and 07-02 ready for verification in 07-03

---

_Phase: 07-xiaohongshu_
_Completed: 2026-01-25_
