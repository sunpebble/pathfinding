# Phase 7: Xiaohongshu - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Xiaohongshu crawler extracts all 6 core fields including video with login support. This is the most complex platform due to video extraction (H264/H265), strong anti-bot protection, and short CDN URL expiry (30 seconds). The crawler should work with saved login sessions from the existing login-helper infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Content quality thresholds

- Minimum 100+ characters of text for a note to be worth extracting
- Images are optional — text-only notes with good content are acceptable
- Author extraction is optional — nice-to-have, not a hard requirement
- Placeholder content (from login wall): store with low quality score and flag for re-crawl later, don't skip entirely

### Failure handling

- Session expires mid-crawl: auto-refresh session from saved cookies
- Single note fails (timeout, parse error): skip and continue to next note, log the failure
- Anti-bot detection (high placeholder rate): report statistics at end, no threshold-based stopping
- Session validation: detect validity on first note, no pre-crawl validation check

### Claude's Discretion

- Login flow UX (existing login-helper handles this)
- Video extraction approach (H264 vs H265 preference, expiring URL handling)
- Rate limiting between requests
- Exact quality score calculation formula

</decisions>

<specifics>
## Specific Ideas

- Xiaohongshu is "bimodal" per Phase 1 diagnosis — excellent with API/login, placeholder without
- CDN URLs expire quickly (30 seconds for video) — may need special handling
- Session module already exists at `crawlers/session/` from Phase 2
- Follow established pattern: platform-specific extractors (extractXiaohongshuStats, etc.) + enhanced crawler

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 07-xiaohongshu_
_Context gathered: 2026-01-25_
