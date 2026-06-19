# Pathfinding — Domain & Architecture Glossary

This file names the seams the codebase is built around. Architecture vocabulary —
**module, interface, depth, seam, adapter, leverage, locality** — is used precisely.
Decision IDs (D2, D4, …) reference `docs/superpowers/specs/2026-06-10-data-pipeline-overhaul-design.md`.

## Guide ingest domain

- **Crawled Detail** — the raw payload the Go crawler returns from `POST /api/crawler/mafengwo/detail`.
  An untyped, inter-process shape; it is _not_ trusted until decoded.

- **Canonical Guide** — the validated, scored, in-process domain model of one travel guide, produced
  from a Crawled Detail (crawl origin) or from user input (CRUD origin). The single shape every writer
  and every reader agrees on. `enrichedData.aiDays` is its source of truth for day plans (D13);
  `dayItineraries` is always _derived_, never authored.

- **Guide Shape** (`@pathfinding/guide-shape`) — the module that owns the Canonical Guide ↔ wire-shape
  transforms: `aiDaysToDayItineraries(aiDays)` (the D13 derive, one owner) and `toResponseDto(guide)`
  (the read projection). Consumed by the Guide Writer, the read route, the poi-coordinates PATCH, and
  `batch-ai-process`. Its existence is what lets the read route stop re-deriving aiDays. Replaces the
  scattered `deriveDayItineraries` + `toClientGuide` + enrichedData blob accessors in `routes/guides.ts`.

- **Guide Writer** (`persistGuide`) — the _sole_ writer of the `travel_guides` table (D2, enforced not
  just declared). Takes a Canonical Guide + the existing row, owns the D7 upsert refresh policy
  (keep-longer-content gate, `CONTENT_DERIVED_KEYS` stripping, no-overwrite-with-empty, empty-shell full
  refresh, enrichedData key-merge), the D6 `raw_crawl_records` audit write, the D9 `guide_destinations`
  mirror, and the D4 count null-handling (never fabricate 0 to mask a parse failure). The database
  handle is injected, not fetched internally — the writer is a **local-substitutable** seam.

- **Guide Ingest** (`normalizeGuide`) — the pure crawl-origin step: Crawled Detail → Canonical Guide via
  `cleanContent → validateGuideEnhanced → calculateQualityScoreUnified → calculateCompletenessLevel`
  (D5 order) + the D4 `resolveCount` fallback. No IO; testable as one golden assertion. Composes the
  exported `@pathfinding/crawler-types` primitives rather than absorbing them (those stay deep
  sub-modules with their own TIER A tests). The TS quality score is the truth; the Go `qualityScore` is
  reference-only and never persisted (D5).

- **Go Crawler Port** — the injected, Zod-validated interface in front of the Go crawler's HTTP boundary
  (`/detail`, `/list`). A genuine **ports-and-adapters** seam: a separate compiled binary owns the
  headless-browser crawl, so it can never collapse in-process. The Zod decode is an anti-corruption
  layer closing the silent-drift gap (Go emits `map[string]any`, TS previously did an unchecked `as`
  cast). The Crawled Detail contract type is exported and pinned by a contract-parity test.

- **Discovery** — the `/list` verb (find new guide URLs for a city, mddId lookup + city-scoping). A
  different verb from ingest; today duplicated across `discoverFromMafengwo` and `backfill-executor`.

## Cross-cutting invariants (must survive any refactor)

- **D2 single writer** — only the Guide Writer may insert/update `travel_guides`. (Today violated in ≥9
  sites; the deepening is what makes the invariant real.)
- **D4 counts** — view/like counts are `number | null` with a raw-string fallback; a parse failure is
  `null` + a warning, never a fabricated 0; refresh never degrades an existing value to 0.
- **D5 score order** — clean → validate → score → completeness; TS score is canonical.
- **D7 refresh policy** — content only overwritten when strictly longer; content-derived keys stripped
  otherwise; enrichedData key-merge preserves `aiDays`/`manualFix`.
- **D13 single-truth aiDays** — `enrichedData.aiDays` is authored truth; `dayItineraries` is derived by
  the Guide Shape module, nowhere else.
