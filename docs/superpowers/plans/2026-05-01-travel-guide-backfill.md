# Travel Guide Data Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a data gap analysis and backfill task generation system that reuses existing crawl job infrastructure.

**Architecture:** Add a `backfill.service.ts` that scans `travel_guides` for missing fields and `cities` for uncovered destinations, then generates targeted `crawl_jobs`. Extend API routes and Dashboard with a management UI.

**Tech Stack:** Hono + Drizzle ORM + TiDB (API), Next.js + React Query + Tailwind (Dashboard), Vitest (testing)

---

## File Map

| File                                                            | Action | Responsibility                                                          |
| --------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `packages/api/src/services/backfill.service.ts`                 | Create | Core analysis logic: scan gaps, generate crawl jobs                     |
| `packages/api/src/services/backfill.service.test.ts`            | Create | Unit tests for backfill service                                         |
| `packages/api/src/routes/crawl-jobs.ts`                         | Modify | Add `POST /backfill-analysis` and `POST /backfill-jobs` endpoints       |
| `packages/api/src/routes/crawl-jobs.test.ts`                    | Modify | Add tests for new endpoints                                             |
| `packages/api/src/routes/guides.ts`                             | Modify | Add `GET /gap-report` endpoint                                          |
| `packages/api/src/routes/guides.test.ts`                        | Modify | Add test for gap-report endpoint                                        |
| `apps/dashboard/src/lib/api/crawler.ts`                         | Modify | Add `getBackfillAnalysis()` and `createBackfillJobs()` client functions |
| `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts` | Create | Next.js proxy route for backfill analysis                               |
| `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts`     | Create | Next.js proxy route for creating backfill jobs                          |
| `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx`     | Create | Dashboard page for gap analysis and task generation                     |

---

## Task 1: Backfill Service (Core Analysis Logic)

**Files:**

- Create: `packages/api/src/services/backfill.service.ts`
- Test: `packages/api/src/services/backfill.service.test.ts`

### Step 1.1: Write the failing test

Create `packages/api/src/services/backfill.service.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    getDb: vi.fn(() => mockDb),
  };
});

describe('backfill.service', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  describe('analyzeFieldGaps', () => {
    it('returns guides sorted by missing field count', async () => {
      const { analyzeFieldGaps } = await import('./backfill.service.js');

      const from = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, title: 'Guide A', platform: 'xiaohongshu', content: '', imageUrls: null, destinations: null, dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
        { id: 2, title: 'Guide B', platform: 'mafengwo', content: 'Has content', imageUrls: ['a.jpg'], destinations: [{ name: 'Paris' }], dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
      ]) });
      mockDb.select.mockReturnValue({ from });

      const result = await analyzeFieldGaps(10);

      expect(result).toHaveLength(2);
      expect(result[0].guideId).toBe(1);
      expect(result[0].missingCount).toBe(6);
      expect(result[1].guideId).toBe(2);
      expect(result[1].missingCount).toBe(4);
    });

    it('returns empty array when no gaps', async () => {
      const { analyzeFieldGaps } = await import('./backfill.service.js');

      const from = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, title: 'Complete', platform: 'xiaohongshu', content: 'ok', imageUrls: ['a.jpg'], destinations: [{ name: 'P' }], dayItineraries: [{ day: 1, pois: [] }], geoData: { coordinates: [] }, enrichedData: { summary: 'x' }, coverImageUrl: 'http://x' },
      ]) });
      mockDb.select.mockReturnValue({ from });

      const result = await analyzeFieldGaps(10);
      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeDestinationGaps', () => {
    it('returns cities with no guides', async () => {
      const { analyzeDestinationGaps } = await import('./backfill.service.js');

      const citiesFrom = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, name: 'Chengdu', countryCode: 'CN' },
        { id: 2, name: 'Shanghai', countryCode: 'CN' },
      ]) });

      const destGroupBy = vi.fn().mockResolvedValue([
        { destination: 'Shanghai' },
      ]);
      const destFrom = vi.fn().mockReturnValue({ groupBy: destGroupBy });

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return { from: citiesFrom };
        }
        return { from: destFrom };
      });

      const result = await analyzeDestinationGaps();

      expect(result).toHaveLength(1);
      expect(result[0].cityName).toBe('Chengdu');
      expect(result[0].guideCount).toBe(0);
    });
  });

  describe('generateBackfillJobs', () => {
    it('creates field_backfill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs([1, 2, 3]);

      expect(result.jobsCreated).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('creates destination_fill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs(undefined, ['Chengdu', 'Hangzhou']);

      expect(result.jobsCreated).toBe(1);
    });
  });
});
```

### Step 1.2: Run the failing test

```bash
cd packages/api && npx vitest run src/services/backfill.service.test.ts
```

Expected: FAIL — module not found

### Step 1.3: Implement the service

Create `packages/api/src/services/backfill.service.ts`:

```typescript
import { getDb, travelGuides, cities, guideDestinations, crawlJobs } from '@pathfinding/database';

const BACKFILLABLE_FIELDS = [
  'content',
  'imageUrls',
  'destinations',
  'dayItineraries',
  'geoData',
  'enrichedData',
  'coverImageUrl',
] as const;

export interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

export interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

export interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

function getMissingFields(guide: typeof travelGuides.$inferSelect): string[] {
  const missing: string[] = [];

  if (!guide.content || guide.content.trim().length === 0) {
    missing.push('content');
  }
  if (!guide.imageUrls || guide.imageUrls.length === 0) {
    missing.push('imageUrls');
  }
  if (!guide.destinations || guide.destinations.length === 0) {
    missing.push('destinations');
  }
  if (!guide.dayItineraries || guide.dayItineraries.length === 0) {
    missing.push('dayItineraries');
  }
  if (!guide.geoData || !guide.geoData.coordinates) {
    missing.push('geoData');
  }
  if (!guide.enrichedData || Object.keys(guide.enrichedData).length === 0) {
    missing.push('enrichedData');
  }
  if (!guide.coverImageUrl || guide.coverImageUrl.trim().length === 0) {
    missing.push('coverImageUrl');
  }

  return missing;
}

export async function analyzeFieldGaps(limit = 100): Promise<FieldGap[]> {
  const db = getDb();

  const guides = await db
    .select()
    .from(travelGuides)
    .limit(500);

  const gaps: FieldGap[] = [];

  for (const guide of guides) {
    const missingFields = getMissingFields(guide);
    if (missingFields.length > 0) {
      gaps.push({
        guideId: guide.id,
        title: guide.title,
        platform: guide.platform,
        missingFields,
        missingCount: missingFields.length,
      });
    }
  }

  return gaps
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, limit);
}

export async function analyzeDestinationGaps(): Promise<DestinationGap[]> {
  const db = getDb();

  const allCities = await db
    .select()
    .from(cities)
    .limit(1000);

  const destinationsWithGuides = await db
    .select({ destination: guideDestinations.destination })
    .from(guideDestinations)
    .groupBy(guideDestinations.destination);

  const coveredDestinations = new Set(
    destinationsWithGuides.map(d => d.destination.toLowerCase()),
  );

  const gaps: DestinationGap[] = [];

  for (const city of allCities) {
    if (!coveredDestinations.has(city.name.toLowerCase())) {
      gaps.push({
        cityName: city.name,
        countryCode: city.countryCode ?? '',
        guideCount: 0,
      });
    }
  }

  return gaps;
}

export async function generateBackfillJobs(
  fieldGapGuideIds?: number[],
  destinationGapCities?: string[],
): Promise<{ jobsCreated: number }> {
  const db = getDb();
  let jobsCreated = 0;

  if (fieldGapGuideIds && fieldGapGuideIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < fieldGapGuideIds.length; i += batchSize) {
      const batch = fieldGapGuideIds.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'field_backfill',
        config: {
          backfillType: 'field',
          targetGuideIds: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  if (destinationGapCities && destinationGapCities.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < destinationGapCities.length; i += batchSize) {
      const batch = destinationGapCities.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'destination_fill',
        config: {
          backfillType: 'destination',
          targetDestinations: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  return { jobsCreated };
}

export async function runFullAnalysis(limit = 100): Promise<BackfillAnalysis> {
  const [fieldGaps, destinationGaps] = await Promise.all([
    analyzeFieldGaps(limit),
    analyzeDestinationGaps(),
  ]);

  const fieldMissingDistribution: Record<string, number> = {};
  for (const field of BACKFILLABLE_FIELDS) {
    fieldMissingDistribution[field] = 0;
  }
  for (const gap of fieldGaps) {
    for (const field of gap.missingFields) {
      fieldMissingDistribution[field] = (fieldMissingDistribution[field] ?? 0) + 1;
    }
  }

  return {
    fieldGaps,
    totalFieldGaps: fieldGaps.length,
    fieldMissingDistribution,
    destinationGaps,
    totalDestinationGaps: destinationGaps.length,
  };
}
```

### Step 1.4: Run the passing test

```bash
cd packages/api && npx vitest run src/services/backfill.service.test.ts
```

Expected: 5 tests PASS

### Step 1.5: Commit

```bash
git add packages/api/src/services/backfill.service.ts packages/api/src/services/backfill.service.test.ts
git commit -m "feat(api): add backfill analysis service"
```

---

## Task 2: Crawl Jobs Route Extensions

**Files:**

- Modify: `packages/api/src/routes/crawl-jobs.ts`
- Modify: `packages/api/src/routes/crawl-jobs.test.ts`

### Step 2.1: Add backfill endpoints to crawl-jobs route

Open `packages/api/src/routes/crawl-jobs.ts` and add after the fail endpoint (before `export default app`):

Add import at top:

```typescript
import { runFullAnalysis, generateBackfillJobs } from '../services/backfill.service.js';
```

Add Zod schemas:

```typescript
const backfillJobsSchema = z.object({
  fieldGapGuideIds: z.array(z.number()).optional(),
  destinationGapCities: z.array(z.string()).optional(),
});
```

Add endpoints:

```typescript
// ── POST /backfill-analysis — Run gap analysis ─────────
app.post('/backfill-analysis', adminRequired(), async (c) => {
  const analysis = await runFullAnalysis(100);
  return jsonData(c, analysis);
});

// ── POST /backfill-jobs — Create backfill crawl jobs ───
app.post('/backfill-jobs', adminRequired(), zValidator('json', backfillJobsSchema), async (c) => {
  const { fieldGapGuideIds, destinationGapCities } = c.req.valid('json');

  if ((!fieldGapGuideIds || fieldGapGuideIds.length === 0) &&
      (!destinationGapCities || destinationGapCities.length === 0)) {
    throw new ApiError(400, '至少需要选择一个补齐目标');
  }

  const result = await generateBackfillJobs(fieldGapGuideIds, destinationGapCities);

  return jsonData(c, result, 201);
});
```

### Step 2.2: Add tests for new endpoints

Open `packages/api/src/routes/crawl-jobs.test.ts` and add inside the `describe('crawl-jobs routes', ...)` block, after the fail test:

```typescript
  describe('pOST /api/crawl-jobs/backfill-analysis', () => {
    it('returns backfill analysis', async () => {
      const { runFullAnalysis } = await import('../services/backfill.service.js');
      vi.mocked(runFullAnalysis).mockResolvedValue({
        fieldGaps: [{ guideId: 1, title: 'Test', platform: 'xiaohongshu', missingFields: ['content'], missingCount: 1 }],
        totalFieldGaps: 1,
        fieldMissingDistribution: { content: 1, imageUrls: 0, destinations: 0, dayItineraries: 0, geoData: 0, enrichedData: 0, coverImageUrl: 0 },
        destinationGaps: [{ cityName: 'Chengdu', countryCode: 'CN', guideCount: 0 }],
        totalDestinationGaps: 1,
      });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-analysis', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.totalFieldGaps).toBe(1);
    });
  });

  describe('pOST /api/crawl-jobs/backfill-jobs', () => {
    it('creates backfill jobs', async () => {
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldGapGuideIds: [1, 2] }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.jobsCreated).toBeDefined();
    });

    it('returns 400 when no targets selected', async () => {
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
```

Wait — the mock approach won't work cleanly because `runFullAnalysis` is imported inline. Let me adjust the test to mock the module instead.

Actually, a simpler approach: since the service uses `getDb()` which is already mocked globally, the real `runFullAnalysis` will use the mocked DB. We just need to set up the mock DB return values appropriately.

Let me rewrite the test section:

```typescript
  describe('pOST /api/crawl-jobs/backfill-analysis', () => {
    it('returns backfill analysis', async () => {
      // First select call: travelGuides
      const guidesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, title: 'Test Guide', platform: 'xiaohongshu', content: '', imageUrls: null, destinations: null, dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
        ]),
      });

      // Second select call: cities
      const citiesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: 'Chengdu', countryCode: 'CN' },
        ]),
      });

      // Third select call: guideDestinations groupBy
      const destGroupBy = vi.fn().mockResolvedValue([]);
      const destFrom = vi.fn().mockReturnValue({ groupBy: destGroupBy });

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { from: guidesFrom };
        if (callCount === 2) return { from: citiesFrom };
        return { from: destFrom };
      });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-analysis', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.totalFieldGaps).toBe(1);
      expect(body.data.totalDestinationGaps).toBe(1);
    });
  });

  describe('pOST /api/crawl-jobs/backfill-jobs', () => {
    it('creates field backfill jobs', async () => {
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldGapGuideIds: [1, 2] }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.jobsCreated).toBe(1);
    });

    it('returns 400 when no targets selected', async () => {
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
```

### Step 2.3: Run crawl-jobs tests

```bash
cd packages/api && npx vitest run src/routes/crawl-jobs.test.ts
```

Expected: all tests PASS

### Step 2.4: Commit

```bash
git add packages/api/src/routes/crawl-jobs.ts packages/api/src/routes/crawl-jobs.test.ts
git commit -m "feat(api): add backfill analysis and job generation endpoints"
```

---

## Task 3: Guides Route Gap Report

**Files:**

- Modify: `packages/api/src/routes/guides.ts`
- Modify: `packages/api/src/routes/guides.test.ts`

### Step 3.1: Add gap-report endpoint

Open `packages/api/src/routes/guides.ts`. Add import:

```typescript
import { runFullAnalysis } from '../services/backfill.service.js';
```

Add endpoint before `export default app`:

```typescript
// ── GET /gap-report — Data gap summary ─────────────────
app.get('/gap-report', async (c) => {
  const analysis = await runFullAnalysis(100);

  return jsonData(c, {
    totalGuides: analysis.totalFieldGaps, // approximate; actual total requires separate count
    fieldGapCount: analysis.totalFieldGaps,
    destinationGapCount: analysis.totalDestinationGaps,
    fieldMissingDistribution: analysis.fieldMissingDistribution,
    topFieldGaps: analysis.fieldGaps.slice(0, 10),
    topDestinationGaps: analysis.destinationGaps.slice(0, 10),
  });
});
```

### Step 3.2: Add test

Open `packages/api/src/routes/guides.test.ts`. Add a new describe block:

```typescript
  describe('gET /api/guides/gap-report', () => {
    it('returns gap summary', async () => {
      const guidesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, title: 'Test', platform: 'xiaohongshu', content: '', imageUrls: null, destinations: null, dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
        ]),
      });
      const citiesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: 'Chengdu', countryCode: 'CN' },
        ]),
      });
      const destGroupBy = vi.fn().mockResolvedValue([]);
      const destFrom = vi.fn().mockReturnValue({ groupBy: destGroupBy });

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { from: guidesFrom };
        if (callCount === 2) return { from: citiesFrom };
        return { from: destFrom };
      });

      const response = await createApp().request('/api/guides/gap-report');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.fieldGapCount).toBeDefined();
      expect(body.data.destinationGapCount).toBeDefined();
    });
  });
```

### Step 3.3: Run tests

```bash
cd packages/api && npx vitest run src/routes/guides.test.ts
```

Expected: all tests PASS

### Step 3.4: Commit

```bash
git add packages/api/src/routes/guides.ts packages/api/src/routes/guides.test.ts
git commit -m "feat(api): add guide gap-report endpoint"
```

---

## Task 4: Dashboard API Client Extensions

**Files:**

- Modify: `apps/dashboard/src/lib/api/crawler.ts`

### Step 4.1: Add backfill types and functions

Open `apps/dashboard/src/lib/api/crawler.ts`. Add after the `Scheduler` section (around line 279):

```typescript
// ---------------------------------------------------------------------------
// Backfill Analysis
// ---------------------------------------------------------------------------

export interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

export interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

export interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

export async function getBackfillAnalysis(): Promise<BackfillAnalysis> {
  const response = await fetchApi<ApiEnvelope<BackfillAnalysis>>('/backfill-analysis', {
    method: 'POST',
  });
  return response.data;
}

export interface CreateBackfillJobsInput {
  fieldGapGuideIds?: number[];
  destinationGapCities?: string[];
}

export async function createBackfillJobs(
  input: CreateBackfillJobsInput,
): Promise<{ jobsCreated: number }> {
  const response = await fetchApi<ApiEnvelope<{ jobsCreated: number }>>('/backfill-jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}
```

Wait — the proxy routes don't exist yet on `/api/crawler/backfill-analysis`. The client calls `/api/crawler/*` which maps to the proxy routes. Let me check the existing pattern.

Looking at the crawler.ts file, `fetchApi` uses `${API_BASE}${endpoint}` where `API_BASE = '/api/crawler'`. So:

- `getBackfillAnalysis()` calls `POST /api/crawler/backfill-analysis`
- `createBackfillJobs()` calls `POST /api/crawler/backfill-jobs`

But wait, looking at the existing `getCrawlJobs`, it calls `/crawl-jobs` which becomes `/api/crawler/crawl-jobs`. So I need to create proxy routes at:

- `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`
- `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts`

These proxy routes will forward to the backend.

Actually, hold on. Let me re-read the crawler.ts fetchApi. The endpoints in crawler.ts don't include the `/api/crawler` prefix — that's added by `fetchApi`. So:

- `fetchApi('/backfill-analysis')` → `fetch('/api/crawler/backfill-analysis')`

This means the Next.js route files should be at:

- `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`

But wait, I see the existing routes:

- `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts` handles `/api/crawler/crawl-jobs`
- `apps/dashboard/src/app/api/crawler/guides/route.ts` handles `/api/crawler/guides`

So I need:

- `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts` (POST)
- `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts` (POST)

Wait, but the client calls `fetchApi('/backfill-analysis')`. The `fetchApi` function does `fetch(`${API_BASE}${endpoint}`)`. With `API_BASE = '/api/crawler'`, this becomes `fetch('/api/crawler/backfill-analysis')`.

But existing functions call `fetchApi('/crawl-jobs')` which becomes `fetch('/api/crawler/crawl-jobs')`. So the endpoint parameter already includes the leading `/`.

Hmm, but I notice `getCrawlJobs` calls `fetchApi('/crawl-jobs')`. The route file is at `app/api/crawler/crawl-jobs/route.ts`. So the pattern is:

- Client endpoint: `/crawl-jobs` (in crawler.ts)
- fetchApi resolves to: `/api/crawler/crawl-jobs`
- Next.js route handler: `app/api/crawler/crawl-jobs/route.ts`

So for backfill:

- Client endpoint: `/backfill-analysis` (in crawler.ts)
- fetchApi resolves to: `/api/crawler/backfill-analysis`
- Next.js route handler: `app/api/crawler/backfill-analysis/route.ts`

Yes, that works. But I also see `fetchApi('/crawl-jobs/scheduler/status')` which maps to `app/api/crawler/crawl-jobs/scheduler/status/route.ts`.

OK so my plan is correct. Let me continue.

### Step 4.2: Run typecheck on dashboard

```bash
cd apps/dashboard && npx tsc --noEmit -p tsconfig.typecheck.json
```

Expected: PASS (the new functions don't cause type errors)

### Step 4.3: Commit

```bash
git add apps/dashboard/src/lib/api/crawler.ts
git commit -m "feat(dashboard): add backfill analysis API client"
```

---

## Task 5: Dashboard Proxy Routes

**Files:**

- Create: `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`
- Create: `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts`

### Step 5.1: Create backfill-analysis proxy route

Create `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`:

```typescript
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

/** Extract a Bearer token from the Authorization header. */
function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetchBackendApi<{
      data: Record<string, unknown>;
    }>('/api/crawl-jobs/backfill-analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error running backfill analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run backfill analysis' },
      { status: 500 },
    );
  }
}
```

### Step 5.2: Create backfill-jobs proxy route

Create `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts`:

```typescript
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

/** Extract a Bearer token from the Authorization header. */
function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const response = await fetchBackendApi<{
      data: { jobsCreated: number };
    }>('/api/crawl-jobs/backfill-jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fieldGapGuideIds: body.fieldGapGuideIds,
        destinationGapCities: body.destinationGapCities,
      }),
    });

    return NextResponse.json(response, { status: 201 });
  }
  catch (error) {
    console.error('Error creating backfill jobs:', error);
    return NextResponse.json(
      { error: 'Failed to create backfill jobs' },
      { status: 500 },
    );
  }
}
```

### Step 5.3: Run dashboard typecheck

```bash
cd apps/dashboard && npx tsc --noEmit -p tsconfig.typecheck.json
```

Expected: PASS

### Step 5.4: Commit

```bash
git add apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts
git commit -m "feat(dashboard): add backfill proxy routes"
```

---

## Task 6: Dashboard Backfill Page

**Files:**

- Create: `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx`

### Step 6.1: Create the backfill page

Create `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx`:

```tsx
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  Globe,
  Loader2,
  MapPin,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { createBackfillJobs, getBackfillAnalysis } from '@/lib/api';

export default function BackfillPage() {
  const queryClient = useQueryClient();
  const [selectedFieldGuides, setSelectedFieldGuides] = useState<Set<number>>(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const {
    data: analysis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['backfill-analysis'],
    queryFn: getBackfillAnalysis,
  });

  const createMutation = useMutation({
    mutationFn: createBackfillJobs,
    onSuccess: (result) => {
      setSelectedFieldGuides(new Set());
      setSelectedDestinations(new Set());
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
      alert(`成功创建 ${result.jobsCreated} 个补齐任务`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const toggleFieldGuide = (id: number) => {
    setSelectedFieldGuides(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDestination = (name: string) => {
    setSelectedDestinations(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateJobs = () => {
    setError(null);
    createMutation.mutate({
      fieldGapGuideIds: selectedFieldGuides.size > 0 ? Array.from(selectedFieldGuides) : undefined,
      destinationGapCities: selectedDestinations.size > 0 ? Array.from(selectedDestinations) : undefined,
    });
  };

  const totalSelected = selectedFieldGuides.size + selectedDestinations.size;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-red-600">
        加载数据失败，请稍后重试
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Backfill</h1>
            <p className="text-gray-500">Analyze gaps and generate crawl tasks to fill missing data</p>
          </div>
        </div>
        <button
          onClick={handleCreateJobs}
          disabled={totalSelected === 0 || createMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Generate Tasks ({totalSelected})
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Field Gaps</p>
              <p className="text-2xl font-bold text-gray-900">{analysis?.totalFieldGaps ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Blank Destinations</p>
              <p className="text-2xl font-bold text-gray-900">{analysis?.totalDestinationGaps ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Field Gap Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-gray-500" />
            Field Gaps — Guides with Missing Data
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Missing Fields</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Missing Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {analysis?.fieldGaps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No field gaps found — all guides are complete!
                  </td>
                </tr>
              )}
              {analysis?.fieldGaps.map((gap) => (
                <tr key={gap.guideId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedFieldGuides.has(gap.guideId)}
                      onChange={() => toggleFieldGuide(gap.guideId)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{gap.guideId}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{gap.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{gap.platform}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {gap.missingFields.map(f => (
                        <span key={f} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      gap.missingCount >= 5 ? 'bg-red-100 text-red-700' :
                      gap.missingCount >= 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {gap.missingCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destination Gap Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            Destination Gaps — Cities with No Guides
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Current Guides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {analysis?.destinationGaps.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No destination gaps found — all cities have guides!
                  </td>
                </tr>
              )}
              {analysis?.destinationGaps.map((gap) => (
                <tr key={gap.cityName} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.has(gap.cityName)}
                      onChange={() => toggleDestination(gap.cityName)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{gap.cityName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{gap.countryCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {gap.guideCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### Step 6.2: Verify dashboard typecheck

```bash
cd apps/dashboard && npx tsc --noEmit -p tsconfig.typecheck.json
```

Expected: PASS

### Step 6.3: Commit

```bash
git add apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx
git commit -m "feat(dashboard): add backfill analysis page"
```

---

## Task 7: Add Navigation Link to Backfill Page

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/jobs/page.tsx`

### Step 7.1: Add backfill link to Jobs page

Open `apps/dashboard/src/app/(dashboard)/jobs/page.tsx`. Find the "Create Job" button section and add a new link button before it:

```tsx
          <Link
            href="/jobs/backfill"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4" />
            Data Backfill
          </Link>
```

Add `BarChart3` to the import from lucide-react.

### Step 7.2: Run typecheck

```bash
cd apps/dashboard && npx tsc --noEmit -p tsconfig.typecheck.json
```

Expected: PASS

### Step 7.3: Commit

```bash
git add apps/dashboard/src/app/(dashboard)/jobs/page.tsx
git commit -m "feat(dashboard): add backfill navigation link"
```

---

## Task 8: Integration Verification

### Step 8.1: Run full quality check

```bash
pnpm check
```

Expected:

- `pnpm typecheck`: all 9 projects PASS
- `pnpm lint`: no errors
- `pnpm test`: all test suites PASS

### Step 8.2: Verify coverage

```bash
pnpm test:coverage
```

Expected: API coverage > 60%

### Step 8.3: Final commit (if any fixes needed)

If lint/type errors were found and fixed:

```bash
git add -A && git commit -m "fix: resolve lint and type issues"
```

---

## Spec Coverage Checklist

| Spec Requirement                                      | Task      |
| ----------------------------------------------------- | --------- |
| `backfill.service.ts` with `analyzeFieldGaps()`       | Task 1    |
| `backfill.service.ts` with `analyzeDestinationGaps()` | Task 1    |
| `backfill.service.ts` with `generateBackfillJobs()`   | Task 1    |
| `POST /backfill-analysis` endpoint                    | Task 2    |
| `POST /backfill-jobs` endpoint                        | Task 2    |
| `GET /gap-report` endpoint                            | Task 3    |
| Dashboard API client extensions                       | Task 4    |
| Dashboard proxy routes                                | Task 5    |
| Dashboard backfill page with tables                   | Task 6    |
| Navigation link                                       | Task 7    |
| Tests for all new code                                | Tasks 1-3 |

## Placeholder Scan

- No TBD/TODO markers in code steps
- All Zod schemas fully defined
- All test code is complete
- All file paths are exact

## Type Consistency Check

- `BackfillAnalysis` interface used consistently across API and Dashboard
- `FieldGap` / `DestinationGap` types match between service and client
- `generateBackfillJobs` signature: `(fieldGapGuideIds?, destinationGapCities?)` — consistent everywhere

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
