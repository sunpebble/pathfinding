# Travel Guide Data Backfill System Design

**Date:** 2026-05-01
**Author:** OpenCode
**Status:** Approved

## Overview

Extend the existing crawl job infrastructure to support automated analysis and backfilling of missing travel guide data. The system addresses two problems:

1. **Field gaps**: Existing `travel_guides` records have empty/null fields (`content`, `imageUrls`, `destinations`, `dayItineraries`, `geoData`, `enrichedData`, `coverImageUrl`)
2. **Destination gaps**: Some destinations (from the `cities` table) have zero travel guides in the database

## Goals

- Provide a data gap analysis dashboard
- Allow users to review gaps before creating backfill tasks
- Generate crawl jobs that target specific guides or destinations for backfilling
- Reuse existing crawl job infrastructure (no new tables or major schema changes)

## Architecture

```
Dashboard "Data Backfill" Page
    |
    v
/api/crawler/backfill-analysis (Next.js proxy)
    |
    v
/api/crawl-jobs/backfill-analysis (Hono API)
    |
    v
Backfill Service (packages/api/src/services/backfill.service.ts)
    |-- analyzeFieldGaps()     -> scan travel_guides for missing fields
    |-- analyzeDestinationGaps() -> compare cities vs guide_destinations
    |-- generateBackfillJobs() -> create crawl_jobs with backfill config
    |
    v
Crawl Jobs Queue (existing)
    |
    v
Crawler Worker (future / external)
    |-- Reads job.config.targetGuideIds     -> refetch specific guides
    |-- Reads job.config.targetDestinations -> crawl new guides for city
    |
    v
Update travel_guides / Insert new travel_guides
```

## API Changes

### Backfill Service

**File:** `packages/api/src/services/backfill.service.ts`

```typescript
interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

interface BackfillJobConfig {
  backfillType: 'field' | 'destination';
  targetGuideIds?: number[];
  targetDestinations?: string[];
  priorityFields?: string[];
}
```

**Methods:**

- `analyzeFieldGaps(limit = 100)`: Queries `travel_guides` for records with NULL/empty fields. Returns top `limit` records sorted by `missingCount DESC`.
- `analyzeDestinationGaps()`: LEFT JOINs `cities` with `guide_destinations` to find cities with zero guides.
- `generateBackfillJobs(analysis: BackfillAnalysis, options?: { maxJobs: number })`: Creates `crawl_jobs` rows with `job_type` set to `'field_backfill'` or `'destination_fill'`.

### Crawl Jobs Route Extensions

**File:** `packages/api/src/routes/crawl-jobs.ts`

New endpoints:

| Method | Endpoint             | Description                                         |
| ------ | -------------------- | --------------------------------------------------- |
| `POST` | `/backfill-analysis` | Run analysis and return report                      |
| `POST` | `/backfill-jobs`     | Accept analysis report + options, create crawl jobs |

Extend `jobType` enum values:

- `'field_backfill'` — re-crawl specific guides to fill missing fields
- `'destination_fill'` — crawl new guides for destinations with zero coverage

### Guides Route Extensions

**File:** `packages/api/src/routes/guides.ts`

New endpoint:

| Method | Endpoint      | Description                                                                     |
| ------ | ------------- | ------------------------------------------------------------------------------- |
| `GET`  | `/gap-report` | Return aggregate stats on data gaps (counts per field, blank destination count) |

## Database

### Zero Migration Strategy

Reuse the existing `crawl_jobs` table. The `config` JSON column is extended at runtime:

```json
{
  "backfillType": "field",
  "targetGuideIds": [123, 456],
  "priorityFields": ["content", "imageUrls"]
}
```

```json
{
  "backfillType": "destination",
  "targetDestinations": ["Chengdu", "Hangzhou"],
  "platforms": ["xiaohongshu", "mafengwo"]
}
```

No new tables, no new columns, no Drizzle migration needed.

## Dashboard Changes

### New Page: `/jobs/backfill`

**File:** `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx`

Components:

1. **Gap Overview Cards**
   - Total guides with missing fields
   - Total blank destinations
   - Missing field distribution (bar chart)

2. **Field Gap Table**
   - Columns: Guide ID, Title, Platform, Missing Fields, Missing Count
   - Row-level checkboxes for selection
   - "Generate Field Backfill Tasks" button

3. **Destination Gap Table**
   - Columns: City, Country, Current Guide Count
   - Row-level checkboxes for selection
   - "Generate Destination Fill Tasks" button

4. **Task Generation Dialog**
   - Confirm selections
   - Show estimated number of crawl jobs to be created
   - Submit to create jobs

### API Client Extensions

**File:** `apps/dashboard/src/lib/api/crawler.ts`

```typescript
export async function getBackfillAnalysis(): Promise<BackfillAnalysis>;
export async function createBackfillJobs(payload: {
  fieldGapGuideIds?: number[];
  destinationGapCities?: string[];
}): Promise<{ jobsCreated: number }>;
```

### New Proxy Route

**File:** `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`

- `GET`: Proxy to `/api/crawl-jobs/backfill-analysis` (analysis report)
- `POST`: Proxy to `/api/crawl-jobs/backfill-jobs` (create jobs)

## Data Flow

1. User navigates to Dashboard → Jobs → Data Backfill
2. Page mounts → calls `getBackfillAnalysis()`
3. Backend scans `travel_guides` and `cities` tables
4. User reviews gap tables, selects targets via checkboxes
5. User clicks "Generate Tasks" → calls `createBackfillJobs()`
6. Backend creates `crawl_jobs` rows with backfill config
7. User redirected to `/jobs` to see new backfill tasks
8. User starts tasks; crawler worker reads `config` and executes
9. Results written back to `travel_guides` or new inserts

## Testing

### Unit Tests (API)

- `backfill.service.test.ts`
  - `analyzeFieldGaps()` returns correct missing field counts
  - `analyzeDestinationGaps()` returns cities with zero guides
  - `generateBackfillJobs()` creates correct number of crawl jobs

- `crawl-jobs.test.ts` (extend)
  - `POST /backfill-analysis` returns analysis report
  - `POST /backfill-jobs` creates jobs with correct config

- `guides.test.ts` (extend)
  - `GET /gap-report` returns aggregate stats

### Unit Tests (Dashboard)

- `backfill/page.test.tsx`
  - Renders gap overview cards
  - Checkboxes update selection state
  - Submit button calls API with correct payload

## Error Handling

- Analysis queries are read-only; failures return empty reports with error message
- Job creation is atomic per job; partial failures return created count + error list
- Invalid `targetGuideIds` or non-existent destinations are filtered out before job creation

## Security

- All backfill endpoints require `adminRequired()` middleware
- Zod validation on all request bodies
- No raw SQL injection vectors (all queries use Drizzle ORM)

## Future Enhancements

- **Auto-scheduled backfill**: Cron job that runs analysis weekly and auto-creates tasks
- **Retry logic**: Failed backfill jobs automatically create `refetch_tasks`
- **Progress tracking**: Real-time progress via WebSocket for long-running backfills
- **Smart prioritization**: Use ML quality score to prioritize high-value gaps first

## Acceptance Criteria

- [ ] Dashboard shows data gap analysis with real database stats
- [ ] User can select field gaps and destination gaps separately
- [ ] Clicking "Generate Tasks" creates valid crawl jobs in the database
- [ ] New crawl jobs appear in the existing Jobs list
- [ ] All new code has >60% test coverage
- [ ] `pnpm check` passes (typecheck + lint + test)
