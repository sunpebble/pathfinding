---
phase: 07-xiaohongshu
plan: 01
subsystem: crawlers
tags: [xiaohongshu, content-quality, session-management, placeholder-detection]

# Dependency graph
requires:
  - phase: 02-infrastructure
    provides: session management module, waitForContentStable
provides:
  - detectPlaceholderContent() for login-wall detection
  - isContentQualityAcceptable() for 100+ char minimum
  - calculateXhsQualityScore() with needsRecrawl flag
  - handleSessionRefresh() for mid-crawl session recovery
  - Extraction statistics tracking and logging
affects: [07-02, 07-03, 08-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Content quality filtering pattern (100+ char minimum)
    - Placeholder detection for login-wall content
    - Session expiry detection via placeholder shift pattern
    - Extraction statistics logging

key-files:
  created: []
  modified:
    - apps/ai-service/src/lib/crawlers/xiaohongshu.ts

key-decisions:
  - 'Export utility functions for potential reuse in other crawlers'
  - 'Use non-capturing group in regex to fix eslint warning'
  - 'Trigger session refresh when 3+ consecutive placeholders after good content'

patterns-established:
  - 'Placeholder detection: <300 chars + generic phrases = login-wall placeholder'
  - 'Quality filtering: skip notes with <100 chars content'
  - 'Session refresh: detect expiry via sudden placeholder shift pattern'
  - 'Statistics logging: report full content vs placeholder counts at crawl end'

# Metrics
duration: 15min
completed: 2026-01-25
---

# Phase 7 Plan 01: Content Quality Utilities Summary

**Added placeholder detection, quality filtering, and session auto-refresh capabilities to Xiaohongshu crawler**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-25T14:54:26Z
- **Completed:** 2026-01-25T15:09:52Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `detectPlaceholderContent()` that identifies login-wall placeholder content based on short length + generic phrases
- Added `isContentQualityAcceptable()` that enforces 100+ character minimum with clear rejection reason
- Added `calculateXhsQualityScore()` returning `{ score, needsRecrawl }` with placeholder penalty (score=20)
- Added `handleSessionRefresh()` for automatic session recovery when session expires mid-crawl
- Enhanced `fetchNotesFromExplore()` with extraction statistics tracking and quality filtering
- Statistics logged at extraction end: "Extraction stats: X full content, Y placeholders"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add placeholder detection and enhanced quality scoring** - `54794358` (feat)
2. **Task 2: Add session auto-refresh detection and handling** - `0f80e61f` (feat)

## Files Created/Modified

- `apps/ai-service/src/lib/crawlers/xiaohongshu.ts` - Added quality utilities, session refresh, statistics tracking

## Decisions Made

- Exported new utility functions (`detectPlaceholderContent`, `isContentQualityAcceptable`, `calculateXhsQualityScore`, `handleSessionRefresh`) for potential reuse
- Preserved original `calculateQualityScore()` for backward compatibility
- Session refresh triggers when pattern detected: had good content (fullContent > 0) then 3+ consecutive placeholders
- Quality filtering applied: notes with <100 characters are skipped with log message

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript compilation errors in convex/ folder (unrelated to this work)
- Used tsx module loading to verify syntax correctness instead of full tsc build

## Next Phase Readiness

- Quality utilities ready for integration into crawler flow
- Session auto-refresh logic ready for production use
- Next plan (07-02) can integrate these utilities into the main crawling process

---

_Phase: 07-xiaohongshu_
_Completed: 2026-01-25_
