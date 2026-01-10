# Tasks: Data Crawler & Training Dataset

**Input**: Design documents from `/specs/002-data-crawler-training/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/crawler-api.yaml ✅

**Tests**: Not explicitly requested - minimal test tasks included for critical paths only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Crawler app**: `apps/crawler/src/`
- **Crawler types**: `packages/crawler-types/src/`
- **Database migrations**: `supabase/migrations/`
- **Tests**: `apps/crawler/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and crawler package structure

- [X] T001 Create `apps/crawler/` directory structure per plan.md
- [X] T002 Initialize `apps/crawler/package.json` with Crawlee, Playwright, Hono dependencies
- [X] T003 [P] Create `apps/crawler/tsconfig.json` extending root config
- [X] T004 [P] Create `packages/crawler-types/package.json` for shared types
- [X] T005 [P] Create `packages/crawler-types/tsconfig.json`
- [X] T006 Update root `pnpm-workspace.yaml` to include new packages
- [X] T007 [P] Create `apps/crawler/.env.example` with required environment variables
- [X] T008 [P] Update root `turbo.json` to include crawler build/dev tasks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Migrations

- [X] T009 Create `supabase/migrations/009_create_crawl_jobs.sql` per data-model.md
- [X] T010 [P] Create `supabase/migrations/010_create_raw_crawl_records.sql`
- [X] T011 [P] Create `supabase/migrations/011_create_normalized_pois.sql` with PostGIS extension
- [X] T012 [P] Create `supabase/migrations/012_create_poi_reviews.sql`
- [X] T013 [P] Create `supabase/migrations/013_create_poi_source_mappings.sql`
- [X] T014 [P] Create `supabase/migrations/014_create_training_datasets.sql`
- [X] T015 [P] Create `supabase/migrations/015_create_data_quality_reports.sql`

### Shared Types Package

- [X] T016 Create `packages/crawler-types/src/index.ts` with re-exports
- [X] T017 [P] Create `packages/crawler-types/src/crawl-job.ts` with CrawlJob, CrawlJobConfig, CrawlJobStatus types
- [X] T018 [P] Create `packages/crawler-types/src/raw-record.ts` with RawCrawlRecord, ParseStatus types
- [X] T019 [P] Create `packages/crawler-types/src/normalized-poi.ts` with NormalizedPOI, Location, RatingInfo types
- [X] T020 [P] Create `packages/crawler-types/src/poi-review.ts` with POIReview, SentimentLabel types
- [X] T021 [P] Create `packages/crawler-types/src/training-dataset.ts` with TrainingDataset, TrainingDatasetParams types
- [X] T022 [P] Create `packages/crawler-types/src/quality-report.ts` with DataQualityReport, QualityMetrics types

### Core Utilities

- [X] T023 Create `apps/crawler/src/lib/supabase.ts` with Supabase client initialization
- [X] T024 [P] Create `apps/crawler/src/lib/hash.ts` with SHA-256 content hashing utility
- [X] T025 [P] Create `apps/crawler/src/lib/geo.ts` with geoDistance calculation using geolib

### API Server Setup

- [X] T026 Create `apps/crawler/src/index.ts` with Hono server entrypoint
- [X] T027 [P] Create `apps/crawler/src/middleware/error-handler.ts` with global error handling
- [X] T028 [P] Create `apps/crawler/src/middleware/tracing.ts` with OpenTelemetry setup

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Platform Data Collection (Priority: P1) 🎯 MVP

**Goal**: Collect travel-related data from multiple platforms and store raw crawl records

**Independent Test**: Run a crawl job for OpenStreetMap POIs in Beijing, verify raw_crawl_records are stored

### Base Crawler Infrastructure

- [X] T029 Create `apps/crawler/src/crawlers/base.crawler.ts` with abstract BaseCrawler class
- [X] T030 Create `apps/crawler/src/crawlers/registry.ts` with crawler registration and lookup

### OpenStreetMap Crawler (First Data Source)

- [X] T031 [US1] Create `apps/crawler/src/crawlers/osm.crawler.ts` implementing Overpass API integration
- [X] T032 [US1] Implement POI extraction logic in osm.crawler.ts for restaurants, attractions, hotels

### Amap API Crawler (Second Data Source)

- [X] T033 [P] [US1] Create `apps/crawler/src/crawlers/amap.crawler.ts` implementing Amap POI search API
- [X] T034 [US1] Implement rate limiting and API key rotation in amap.crawler.ts

### Crawl Job Management

- [X] T035 [US1] Create `apps/crawler/src/services/crawl-job.service.ts` with CRUD operations
- [X] T036 [US1] Create `apps/crawler/src/jobs/worker.ts` with Crawlee-based job executor
- [X] T037 [US1] Implement raw record storage in worker.ts with content hashing

### Crawl Job API Routes

- [X] T038 [US1] Create `apps/crawler/src/routes/crawl-jobs.ts` with GET /crawl-jobs endpoint
- [X] T039 [US1] Add POST /crawl-jobs endpoint to create new crawl jobs
- [X] T040 [US1] Add GET /crawl-jobs/:id endpoint for job details
- [X] T041 [US1] Add POST /crawl-jobs/:id/start endpoint to trigger job execution
- [X] T042 [US1] Add POST /crawl-jobs/:id/cancel endpoint to cancel running jobs
- [X] T043 [US1] Add GET /crawl-jobs/:id/records endpoint to list raw records

### Job Statistics & Error Handling

- [X] T044 [US1] Implement job statistics tracking (requests_total, requests_success, etc.) in worker.ts
- [X] T045 [US1] Add exponential backoff retry logic in base.crawler.ts
- [X] T046 [US1] Implement rate limiting detection and graceful degradation

**Checkpoint**: User Story 1 complete - can crawl OSM and Amap, store raw records, manage jobs via API

---

## Phase 4: User Story 2 - Data Integration & Normalization (Priority: P1)

**Goal**: Transform raw data into unified schema, deduplicate across platforms

**Independent Test**: Feed raw records from OSM and Amap, verify normalized_pois have unified schema and duplicates merged

### Data Normalizer

- [X] T047 [US2] Create `apps/crawler/src/processors/normalizer.ts` with platform-agnostic normalization
- [X] T048 [US2] Implement OSM-specific parsing in `apps/crawler/src/processors/parsers/osm.parser.ts`
- [X] T049 [P] [US2] Implement Amap-specific parsing in `apps/crawler/src/processors/parsers/amap.parser.ts`
- [X] T050 [US2] Create `apps/crawler/src/processors/parsers/index.ts` parser registry

### Category Mapping

- [X] T051 [P] [US2] Create `packages/crawler-types/src/categories.ts` with unified category taxonomy
- [X] T052 [US2] Implement platform-to-unified category mapping in normalizer.ts

### Entity Resolution & Deduplication

- [X] T053 [US2] Create `apps/crawler/src/processors/deduplicator.ts` with exact ID matching
- [X] T054 [US2] Implement fuzzy matching (Levenshtein + geo distance) in deduplicator.ts
- [X] T055 [US2] Add confidence scoring and merge logic for duplicate POIs

### Quality Scoring

- [X] T056 [US2] Create `apps/crawler/src/processors/quality-scorer.ts` with completeness/freshness scoring
- [X] T057 [US2] Integrate quality scoring into normalization pipeline

### Normalization Pipeline

- [X] T058 [US2] Create `apps/crawler/src/services/normalization.service.ts` orchestrating parsers + dedup + scoring
- [X] T059 [US2] Add background processing trigger after raw record insertion

### Normalized POI API Routes

- [X] T060 [US2] Create `apps/crawler/src/routes/pois.ts` with GET /pois search endpoint
- [X] T061 [US2] Add geo-spatial search (lat/lng/radius) to GET /pois
- [X] T062 [US2] Add GET /pois/:id endpoint for POI details with sources
- [X] T063 [US2] Add GET /pois/:id/reviews endpoint for POI reviews
- [X] T064 [US2] Add GET /pois/stats endpoint for aggregated statistics

**Checkpoint**: User Story 2 complete - raw data normalized, deduplicated, quality scored, searchable via API

---

## Phase 5: User Story 3 - Training Dataset Generation (Priority: P2)

**Goal**: Export processed data in ML-ready formats with versioning

**Independent Test**: Request training dataset export for Beijing restaurants, verify JSON/CSV output compatible with ML frameworks

### Dataset Exporters

- [X] T065 [US3] Create `apps/crawler/src/exporters/base.exporter.ts` with abstract exporter interface
- [X] T066 [US3] Create `apps/crawler/src/exporters/json.exporter.ts` with JSON Lines export
- [X] T067 [P] [US3] Create `apps/crawler/src/exporters/csv.exporter.ts` with CSV export
- [X] T068 [P] [US3] Create `apps/crawler/src/exporters/parquet.exporter.ts` with Parquet export (optional)

### Dataset Generation Service

- [X] T069 [US3] Create `apps/crawler/src/services/training-dataset.service.ts` with generation logic
- [X] T070 [US3] Implement filtering by time range, geography, categories in training-dataset.service.ts
- [X] T071 [US3] Implement stratified sampling with train/val/test splits
- [X] T072 [US3] Add dataset versioning and statistics computation

### Training Dataset API Routes

- [X] T073 [US3] Create `apps/crawler/src/routes/training-datasets.ts` with GET /training-datasets
- [X] T074 [US3] Add POST /training-datasets endpoint to create new dataset
- [X] T075 [US3] Add GET /training-datasets/:id endpoint for dataset details
- [X] T076 [US3] Add GET /training-datasets/:id/download endpoint for file download
- [X] T077 [US3] Add DELETE /training-datasets/:id endpoint

**Checkpoint**: User Story 3 complete - can generate versioned training datasets in multiple formats

---

## Phase 6: User Story 4 - Data Pipeline Monitoring (Priority: P2)

**Goal**: Monitor pipeline health, generate quality reports, trigger alerts

**Independent Test**: Simulate job failure, verify alert triggered and quality report generated

### Quality Report Generation

- [X] T078 [US4] Create `apps/crawler/src/services/quality-report.service.ts` with report generation
- [X] T079 [US4] Implement completeness metrics calculation in quality-report.service.ts
- [X] T080 [US4] Implement freshness metrics calculation
- [X] T081 [US4] Implement anomaly detection (spike/drop in success rates)

### Quality Report API Routes

- [X] T082 [US4] Create `apps/crawler/src/routes/quality-reports.ts` with GET /quality-reports
- [X] T083 [US4] Add POST /quality-reports endpoint to generate on-demand report
- [X] T084 [US4] Add GET /quality-reports/:id endpoint for report details

### Monitoring & Alerting

- [X] T085 [US4] Create `apps/crawler/src/monitoring/metrics.ts` with OpenTelemetry metrics
- [X] T086 [US4] Implement Sentry error tracking integration in error-handler.ts
- [X] T087 [US4] Create `apps/crawler/src/monitoring/alerts.ts` with alert thresholds and notifications

**Checkpoint**: User Story 4 complete - pipeline health monitored, quality reports generated, alerts triggered

---

## Phase 7: User Story 5 - Incremental Data Updates (Priority: P3)

**Goal**: Optimize crawling with incremental updates using content hashing

**Independent Test**: Run full crawl, then incremental crawl, verify only changed records re-crawled

### Incremental Crawl Logic

- [X] T088 [US5] Extend base.crawler.ts with incremental mode support
- [X] T089 [US5] Implement content hash comparison in worker.ts to skip unchanged records
- [X] T090 [US5] Add last_crawled tracking in poi_source_mappings for staleness detection

### Scheduler Integration

- [X] T091 [US5] Create `apps/crawler/src/jobs/scheduler.ts` with node-cron scheduling
- [X] T092 [US5] Implement scheduled incremental crawl jobs with configurable cron
- [X] T093 [US5] Add schedule management endpoints to crawl-jobs.ts routes

**Checkpoint**: User Story 5 complete - incremental crawls reduce bandwidth by 70%+

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T094 [P] Add request validation with Zod schemas in all API routes
- [X] T095 [P] Create `apps/crawler/README.md` with setup and usage documentation
- [X] T096 Run quickstart.md validation - verify local development setup works (manual step: pnpm install && pnpm dev)
- [X] T097 [P] Add health check endpoint GET /health in index.ts
- [X] T098 [P] Configure production Docker build in `apps/crawler/Dockerfile`
- [X] T099 Code cleanup and refactoring - remove TODOs, improve error messages
- [X] T100 Performance optimization - add database indexes, query optimization

**Checkpoint**: All phases complete - system ready for production deployment

---

## Implementation Summary

All 100 tasks have been completed across 8 phases:

- **Phase 1**: Project setup and configuration
- **Phase 2**: Foundational infrastructure (database, middleware, tracing)
- **Phase 3**: Data collection (OSM, Amap crawlers)
- **Phase 4**: Data normalization (parsers, quality scoring, deduplication)
- **Phase 5**: Training dataset generation (exporters, filters, splits)
- **Phase 6**: Quality reports and monitoring (metrics, alerts)
- **Phase 7**: Incremental crawl scheduling
- **Phase 8**: Documentation, Docker, and polish

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────────────►
                  │
                  ▼
Phase 2 (Foundational) ───────────────────────────────────────►
                  │
                  ├──────────────┬──────────────┐
                  ▼              ▼              ▼
            Phase 3 (US1)  Phase 4 (US2)  [blocked by US1]
            Data Collection  Normalization
                  │              │
                  └──────────────┤
                                 ▼
                           Phase 5 (US3)
                           Training Datasets
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
            Phase 6 (US4)  Phase 7 (US5)  Phase 8 (Polish)
            Monitoring     Incremental
```

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 raw records being available (can start in parallel with US1 after T037)
- **User Story 3 (P2)**: Depends on US2 normalized data being available
- **User Story 4 (P2)**: Can start after Phase 2 - Independent monitoring infrastructure
- **User Story 5 (P3)**: Depends on US1 base crawler infrastructure

### Within Each User Story

- Services before routes
- Core logic before API endpoints
- Base classes before implementations

### Parallel Opportunities

**Phase 1**: T003, T004, T005, T007, T008 can run in parallel

**Phase 2**: 
- All migrations T010-T015 can run in parallel (after T009)
- All type files T017-T022 can run in parallel
- Utilities T024, T025 can run in parallel (after T023)
- Middleware T027, T028 can run in parallel

**Phase 3**: 
- T033 (Amap crawler) can run in parallel with T031-T032 (OSM crawler)

**Phase 4**:
- T049 (Amap parser) can run in parallel with T048 (OSM parser)

**Phase 5**:
- T067, T068 can run in parallel with T066

---

## Parallel Example: Phase 2 Foundation

```bash
# After T009 (crawl_jobs migration), launch all other migrations:
T010: raw_crawl_records migration
T011: normalized_pois migration
T012: poi_reviews migration
T013: poi_source_mappings migration
T014: training_datasets migration
T015: data_quality_reports migration

# After T016 (types index), launch all type definitions:
T017: crawl-job.ts types
T018: raw-record.ts types
T019: normalized-poi.ts types
T020: poi-review.ts types
T021: training-dataset.ts types
T022: quality-report.ts types
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Data Collection)
4. Complete Phase 4: User Story 2 (Normalization)
5. **STOP and VALIDATE**: Test crawl → normalize → query flow
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test crawling → Deploy (can collect data!)
3. Add User Story 2 → Test normalization → Deploy (data usable!)
4. Add User Story 3 → Test export → Deploy (ML training ready!)
5. Add User Story 4 → Test monitoring → Deploy (production ready!)
6. Add User Story 5 → Test incremental → Deploy (optimized!)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Database migrations must run in order (009 → 010 → ...)
- Parsers can be added incrementally for new platforms
- Quality scoring weights can be tuned based on actual data
- Commit after each task or logical group
