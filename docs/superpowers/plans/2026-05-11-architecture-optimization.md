# Architecture Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Dashboard proxy routing, guide response contracts, and low-risk workspace ownership boundaries without changing product behavior.

**Architecture:** Introduce a shared guide response DTO in `@pathfinding/types`, move guide list semantics into `packages/api`, and make Dashboard `/api/crawler/*` handlers thin wrappers around a shared server-side proxy helper. Keep Go and iOS behavior stable by preserving existing snake_case JSON fields.

**Tech Stack:** TypeScript, Next.js App Router route handlers, Hono, Drizzle, Vitest, pnpm workspaces, Nx.

---

## Scope Check

The approved spec covers three related boundaries. This plan keeps them in one implementation track because each phase depends on the same guide/proxy contract:

- Tasks 1-2 establish API/shared DTO behavior.
- Tasks 3-5 migrate Dashboard transport and types to that behavior.
- Task 6 handles only low-risk workspace ownership cleanup.
- Task 7 verifies the integrated result.

Do not rewrite Go or Swift code in this pass. iOS compatibility is protected by keeping `content_html` and `content_markdown` in API JSON responses.

## File Structure

- Create `packages/types/src/travel-guide.ts`: shared client-facing guide DTOs.
- Modify `packages/types/src/index.ts`: export the new DTOs.
- Modify `packages/api/src/routes/guides.ts`: use shared DTOs, include missing response fields, and own guide sorting/filtering/pagination.
- Modify `packages/api/src/routes/guides.test.ts`: cover response contract and API-side list semantics.
- Modify `apps/dashboard/src/lib/api/backend.ts`: expose `BackendApiError` so proxy helpers can preserve backend status codes.
- Create `apps/dashboard/src/lib/api/backend.test.ts`: verify backend error typing.
- Create `apps/dashboard/src/lib/api/proxy.ts`: shared Dashboard server-side proxy helper.
- Create `apps/dashboard/src/lib/api/proxy.test.ts`: verify auth, forwarding, and error mapping.
- Modify `apps/dashboard/src/app/api/crawler/**/*.ts`: migrate route handlers to the proxy helper.
- Modify `apps/dashboard/src/app/api/crawler/route-handlers.test.ts`: assert auth forwarding and thin proxy behavior.
- Modify `apps/dashboard/src/lib/api/crawler.ts`: align Dashboard `TravelGuide` with the shared DTO.
- Modify `apps/dashboard/src/types/api.ts`: align `GuideWithAI` with the shared DTO while keeping AI compatibility fields.
- Modify `apps/dashboard/package.json`: add `@pathfinding/types` workspace dependency.
- Modify root `package.json` and `pnpm-lock.yaml`: remove unused Tencent SDK and move root script-only parser/browser dependencies to dev ownership if pnpm resolves cleanly.

---

### Task 1: Add Shared Guide Response DTO

**Files:**
- Create: `packages/types/src/travel-guide.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Create the shared DTO file**

Add `packages/types/src/travel-guide.ts`:

```typescript
/**
 * Client-facing travel guide DTOs.
 *
 * These shapes describe REST API JSON responses. They intentionally use
 * snake_case because Dashboard and iOS both consume the external API contract.
 */

export type TravelGuidePlatform
  = | 'xiaohongshu'
    | 'weibo'
    | 'ctrip'
    | 'douyin'
    | 'tripadvisor'
    | 'tongcheng'
    | 'mafengwo'
    | 'qunar'
    | 'qyer'
    | string;

export interface TravelGuideContentDto {
  content: string;
  content_html?: string | null;
  content_markdown?: string | null;
}

export interface TravelGuideAiDayDto {
  day_number?: number;
  dayNumber?: number;
  theme?: string;
  pois?: Array<Record<string, unknown>>;
}

export interface TravelGuideGeocodingMetricsDto {
  total_pois: number;
  average_confidence: number;
  low_confidence_count: number;
}

export interface TravelGuideResponseDto extends TravelGuideContentDto {
  id: string;
  _id?: string;
  title: string;
  summary?: string | null;
  source_platform: TravelGuidePlatform;
  source_external_id?: string | null;
  source_url?: string | null;
  author_name?: string | null;
  author_id?: string | null;
  cover_image_url?: string | null;
  image_urls: string[];
  quality_score: number;
  views_count: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  destinations: string[];
  tags: string[];
  published_at?: string | null;
  crawled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ai_summary?: string | null;
  ai_tips?: string[] | null;
  ai_best_time?: string | null;
  ai_duration?: string | null;
  ai_budget?: string | null;
  ai_days?: TravelGuideAiDayDto[] | null;
  ai_processed_at?: string | null;
  ai_version?: string | null;
  ai_model?: string | null;
  geocoding_metrics?: TravelGuideGeocodingMetricsDto | null;
}
```

- [ ] **Step 2: Export the DTO**

In `packages/types/src/index.ts`, add this export near the other domain exports:

```typescript
export * from './travel-guide';
```

- [ ] **Step 3: Run package typecheck**

Run:

```bash
pnpm --filter @pathfinding/types typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/travel-guide.ts packages/types/src/index.ts
git commit -m "feat(types): add travel guide response dto"
```

---

### Task 2: Move Guide List Semantics Into API

**Files:**
- Modify: `packages/api/src/routes/guides.test.ts`
- Modify: `packages/api/src/routes/guides.ts`

- [ ] **Step 1: Add failing API response-contract tests**

In `packages/api/src/routes/guides.test.ts`, add these helpers near `guideMock`:

```typescript
const richGuideMock = {
  ...guideMock,
  sourceUrl: 'https://example.com/guide/1',
  externalId: 'mfw-1',
  commentCount: 7,
  updatedAt: new Date('2026-05-10T00:00:00.000Z'),
  tags: ['museum', 'family'],
  imageUrls: ['https://img.example.com/cover.jpg'],
  enrichedData: {
    contentHtml: '<p>富文本内容</p>',
    contentMarkdown: '## 富文本内容',
    aiSummary: '结构化摘要',
    aiTips: ['提前预约'],
    aiBestTime: '春秋',
    aiDuration: '2 days',
    aiBudget: '1000 CNY',
    aiDays: [{ day_number: 1, pois: [] }],
  },
};
```

In the `describe('gET /api/guides'...)` block, add:

```typescript
it('returns the shared guide response contract for list results', async () => {
  const chain = createPaginatedSelectChain([richGuideMock]);
  const countChain = createWhereSelectChain([{ count: 1 }]);
  mockDb.select
    .mockReturnValueOnce(chain)
    .mockReturnValueOnce(countChain);

  const response = await createApp().request('/api/guides?limit=5&offset=10&sort=quality_score&order=asc');
  expect(response.status).toBe(200);

  const body = await response.json();
  expect(chain.limit).toHaveBeenCalledWith(5);
  expect(chain.offset).toHaveBeenCalledWith(10);
  expect(body.pagination).toEqual({ limit: 5, offset: 10, total: 1 });
  expect(body.data[0]).toEqual(expect.objectContaining({
    id: '1',
    _id: '1',
    title: 'Paris Guide',
    source_platform: 'xiaohongshu',
    source_url: 'https://example.com/guide/1',
    content_html: '<p>富文本内容</p>',
    content_markdown: '## 富文本内容',
    comments_count: 7,
    tags: ['museum', 'family'],
    image_urls: ['https://img.example.com/cover.jpg'],
    updated_at: '2026-05-10T00:00:00.000Z',
    ai_summary: '结构化摘要',
    ai_tips: ['提前预约'],
    ai_best_time: '春秋',
    ai_duration: '2 days',
    ai_budget: '1000 CNY',
    ai_days: [{ day_number: 1, pois: [] }],
  }));
});
```

- [ ] **Step 2: Run the focused API test and verify it fails**

Run:

```bash
pnpm --dir packages/api exec vitest run src/routes/guides.test.ts -t "shared guide response contract"
```

Expected: FAIL because the current list response does not include every shared DTO field such as `_id`, `source_url`, `comments_count`, `tags`, and `updated_at`.

- [ ] **Step 3: Update the guide route implementation**

In `packages/api/src/routes/guides.ts`, update imports:

```typescript
import type { TravelGuideResponseDto } from '@pathfinding/types';
import { and, asc, desc, eq, gte, like, sql } from 'drizzle-orm';
```

Add helpers near `stringArrayFromRecord`:

```typescript
function dateString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function numberFromGuide(guide: Guide, key: keyof Guide, fallback = 0): number {
  const value = guide[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function parseGuideOrder(value: string | undefined): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc';
}
```

Replace `toClientGuide` with:

```typescript
function toClientGuide(guide: Guide): TravelGuideResponseDto {
  const enrichedData = recordFromJson(guide.enrichedData);
  const id = String(guide.id);

  return {
    id,
    _id: id,
    title: guide.title ?? 'Untitled guide',
    author_name: guide.authorName ?? null,
    author_id: null,
    content: guide.content ?? '',
    content_html: stringFromRecord(enrichedData, ['contentHtml', 'content_html']),
    content_markdown: stringFromRecord(enrichedData, ['contentMarkdown', 'content_markdown']),
    source_external_id: typeof guide.externalId === 'string' ? guide.externalId : null,
    source_url: guide.sourceUrl ?? null,
    summary: stringFromRecord(enrichedData, ['summary', 'aiSummary', 'ai_summary']),
    cover_image_url: guide.coverImageUrl ?? null,
    image_urls: stringArray(guide.imageUrls),
    source_platform: guide.platform,
    quality_score: guide.qualityScore ?? 0,
    views_count: guide.viewCount ?? 0,
    likes_count: guide.likeCount ?? 0,
    saves_count: 0,
    comments_count: numberFromGuide(guide, 'commentCount' as keyof Guide),
    published_at: dateString(guide.publishedAt),
    crawled_at: dateString(guide.crawledAt),
    created_at: dateString(guide.createdAt),
    updated_at: dateString(guide.updatedAt),
    destinations: stringArray(guide.destinations),
    tags: stringArray(guide.tags),
    ai_summary: stringFromRecord(enrichedData, ['aiSummary', 'summary', 'ai_summary']),
    ai_tips: stringArrayFromRecord(enrichedData, ['aiTips', 'tips', 'ai_tips']),
    ai_best_time: stringFromRecord(enrichedData, ['aiBestTime', 'bestTime', 'ai_best_time']),
    ai_duration: stringFromRecord(enrichedData, ['aiDuration', 'duration', 'ai_duration']),
    ai_budget: stringFromRecord(enrichedData, ['aiBudget', 'budget', 'ai_budget']),
    ai_days: Array.isArray(guide.dayItineraries)
      ? guide.dayItineraries as TravelGuideResponseDto['ai_days']
      : (Array.isArray(enrichedData.aiDays) ? enrichedData.aiDays as TravelGuideResponseDto['ai_days'] : null),
    ai_processed_at: stringFromRecord(enrichedData, ['aiProcessedAt', 'ai_processed_at']),
    ai_version: stringFromRecord(enrichedData, ['aiVersion', 'ai_version']),
    ai_model: stringFromRecord(enrichedData, ['aiModel', 'ai_model']),
    geocoding_metrics: recordFromJson(enrichedData.geocodingMetrics ?? enrichedData.geocoding_metrics) as TravelGuideResponseDto['geocoding_metrics'],
  };
}
```

In `app.get('/')`, parse sort and order:

```typescript
const sort = c.req.query('sort');
const order = parseGuideOrder(c.req.query('order'));
const guideOrderBy
  = sort === 'quality_score'
    ? order === 'asc' ? asc(travelGuides.qualityScore) : desc(travelGuides.qualityScore)
    : desc(travelGuides.createdAt);
```

Use `.orderBy(guideOrderBy)` in the select query.

- [ ] **Step 4: Run the focused API test and verify it passes**

Run:

```bash
pnpm --dir packages/api exec vitest run src/routes/guides.test.ts -t "shared guide response contract"
```

Expected: PASS.

- [ ] **Step 5: Run all guide route tests**

Run:

```bash
pnpm --dir packages/api exec vitest run src/routes/guides.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/guides.ts packages/api/src/routes/guides.test.ts packages/types/src/travel-guide.ts
git commit -m "refactor(api): standardize guide response contract"
```

---

### Task 3: Add Backend Error Type And Proxy Helper

**Files:**
- Modify: `apps/dashboard/src/lib/api/backend.ts`
- Create: `apps/dashboard/src/lib/api/backend.test.ts`
- Create: `apps/dashboard/src/lib/api/proxy.ts`
- Create: `apps/dashboard/src/lib/api/proxy.test.ts`

- [ ] **Step 1: Add failing backend error tests**

Create `apps/dashboard/src/lib/api/backend.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('fetchBackendApi', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.com';
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NODE_ENV;
  });

  it('throws a typed backend error with status and parsed body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createJsonResponse({ error: 'Invalid input' }, { status: 400 }),
    ));

    const { BackendApiError, fetchBackendApi } = await import('./backend');

    await expect(fetchBackendApi('/api/guides')).rejects.toBeInstanceOf(BackendApiError);
    await expect(fetchBackendApi('/api/guides')).rejects.toMatchObject({
      message: 'Invalid input',
      status: 400,
      data: { error: 'Invalid input' },
    });
  });
});
```

- [ ] **Step 2: Run the backend test and verify it fails**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/lib/api/backend.test.ts
```

Expected: FAIL because `BackendApiError` is not exported.

- [ ] **Step 3: Implement `BackendApiError`**

In `apps/dashboard/src/lib/api/backend.ts`, add before `parseErrorMessage`:

```typescript
export class BackendApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.data = data;
  }
}
```

In `fetchBackendApi`, replace the non-OK throw:

```typescript
throw new Error(parseErrorMessage(error, res.status));
```

with:

```typescript
throw new BackendApiError(parseErrorMessage(error, res.status), res.status, error);
```

At the top of the `catch (error)` block in `fetchBackendApi`, preserve real
backend HTTP failures before development mock fallback:

```typescript
if (error instanceof BackendApiError) {
  throw error;
}
```

- [ ] **Step 4: Add proxy helper tests**

Create `apps/dashboard/src/lib/api/proxy.test.ts`:

```typescript
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('proxyBackendApiResponse', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.com';
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NODE_ENV;
  });

  it('returns 401 before calling the backend when auth is required', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/guides'),
      { endpoint: '/api/guides' },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('forwards bearer auth and transforms successful responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ data: [{ id: 1, title: 'Guide' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse<{ data: Array<{ id: number; title: string }> }>(
      new NextRequest('http://localhost/api/crawler/guides', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      {
        endpoint: '/api/guides',
        transform: payload => ({ data: payload.data.map(item => ({ ...item, id: String(item.id) })) }),
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: '1', title: 'Guide' }] });
  });

  it('preserves backend validation status and message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createJsonResponse({ error: '至少需要选择一个补齐目标' }, { status: 400 }),
    ));

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/backfill-jobs', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      { endpoint: '/api/crawl-jobs/backfill-jobs', method: 'POST', fallbackError: 'Failed to create backfill jobs' },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '至少需要选择一个补齐目标' });
  });
});
```

- [ ] **Step 5: Run proxy tests and verify they fail**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/lib/api/backend.test.ts src/lib/api/proxy.test.ts
```

Expected: FAIL because `proxy.ts` does not exist yet.

- [ ] **Step 6: Implement the proxy helper**

Create `apps/dashboard/src/lib/api/proxy.ts`:

```typescript
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { BackendApiError, fetchBackendApi } from './backend';

type ProxyBodyFactory = () => Promise<unknown> | unknown;

export interface BackendProxyOptions<TBackend, TClient = TBackend> {
  endpoint: string;
  method?: string;
  requireAuth?: boolean;
  body?: unknown | ProxyBodyFactory;
  headers?: HeadersInit;
  successStatus?: number;
  fallbackError?: string;
  transform?: (payload: TBackend) => TClient;
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

function errorMessageFromData(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.error === 'string' && record.error.length > 0) {
      return record.error;
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      return record.message;
    }
  }
  return fallback;
}

async function resolveBody(body: unknown | ProxyBodyFactory | undefined): Promise<unknown> {
  if (typeof body === 'function') {
    return (body as ProxyBodyFactory)();
  }
  return body;
}

export async function proxyBackendApiResponse<TBackend, TClient = TBackend>(
  request: NextRequest | Request,
  options: BackendProxyOptions<TBackend, TClient>,
) {
  const requireAuth = options.requireAuth ?? true;
  const token = getBearerToken(request);

  if (requireAuth && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = normalizeHeaders(options.headers);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = await resolveBody(options.body);

  try {
    const payload = await fetchBackendApi<TBackend>(options.endpoint, {
      method: options.method ?? 'GET',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const transformed = options.transform ? options.transform(payload) : payload;
    return NextResponse.json(transformed, { status: options.successStatus ?? 200 });
  }
  catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: errorMessageFromData(error.data, error.message) },
        { status: error.status },
      );
    }

    console.error(options.fallbackError ?? 'Backend proxy request failed', error);
    return NextResponse.json(
      { error: options.fallbackError ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 7: Run proxy tests and verify they pass**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/lib/api/backend.test.ts src/lib/api/proxy.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/lib/api/backend.ts apps/dashboard/src/lib/api/backend.test.ts apps/dashboard/src/lib/api/proxy.ts apps/dashboard/src/lib/api/proxy.test.ts
git commit -m "refactor(dashboard): add backend proxy helper"
```

---

### Task 4: Migrate Dashboard Crawler Route Handlers

**Files:**
- Modify: `apps/dashboard/src/app/api/crawler/route-handlers.test.ts`
- Modify: `apps/dashboard/src/app/api/crawler/guides/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/guides/[id]/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/crawl-jobs/[...slug]/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/backfill-analysis/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/backfill-jobs/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/backfill-execute/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/backfill-all/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/discover-guides/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/import-guides/route.ts`
- Modify as follow-up in the same task if tests cover them: `apps/dashboard/src/app/api/crawler/pois/route.ts`, `apps/dashboard/src/app/api/crawler/training-datasets/route.ts`

- [ ] **Step 1: Strengthen route handler tests**

In `apps/dashboard/src/app/api/crawler/route-handlers.test.ts`, update the list-guides fetch assertion to require auth forwarding and API-side filters:

```typescript
expect(fetchMock).toHaveBeenCalledWith(
  'http://api.example.com/api/guides?platform=weibo&limit=1',
  expect.objectContaining({
    method: 'GET',
    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
  }),
);
```

Add this missing-auth test:

```typescript
it('rejects protected crawler routes before reaching the backend when auth is missing', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const { GET } = await import('./crawl-jobs/route');
  const response = await GET(new NextRequest('http://localhost/api/crawler/crawl-jobs'));
  const payload = await response.json();

  expect(fetchMock).not.toHaveBeenCalled();
  expect(response.status).toBe(401);
  expect(payload).toEqual({ error: 'Unauthorized' });
});
```

Update the start-job test request to include auth because the migrated route is protected:

```typescript
const response = await POST(new NextRequest('http://localhost/api/crawler/crawl-jobs/12/start', {
  method: 'POST',
  headers: { Authorization: 'Bearer test-token' },
}), {
  params: Promise.resolve({ slug: ['12', 'start'] }),
});
```

- [ ] **Step 2: Run route handler tests and verify they fail**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/app/api/crawler/route-handlers.test.ts
```

Expected: FAIL because current route handlers do not consistently forward auth and some protected handlers accept missing auth.

- [ ] **Step 3: Migrate the guides list route**

Replace `apps/dashboard/src/app/api/crawler/guides/route.ts` with:

```typescript
import type { NextRequest } from 'next/server';
import { normalizeTravelGuide } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

type GuidesResponse = {
  data: Array<Record<string, unknown>>;
  pagination?: { total: number; limit: number; offset: number };
};

type Platform
  = | 'xiaohongshu'
    | 'weibo'
    | 'ctrip'
    | 'douyin'
    | 'tripadvisor'
    | 'qunar'
    | 'tongcheng'
    | 'mafengwo'
    | 'qyer';

const validPlatforms: Platform[] = [
  'xiaohongshu',
  'weibo',
  'ctrip',
  'douyin',
  'tripadvisor',
  'qunar',
  'tongcheng',
  'mafengwo',
  'qyer',
];

function getValidPlatform(platform: string | null): Platform | undefined {
  return platform && validPlatforms.includes(platform as Platform)
    ? platform as Platform
    : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = positiveInt(searchParams.get('limit'), 20);
  const offset = Math.max(0, Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const backendParams = new URLSearchParams();
  const platform = getValidPlatform(searchParams.get('platforms') || searchParams.get('platform'));

  if (platform) {
    backendParams.set('platform', platform);
  }
  for (const key of ['q', 'min_quality', 'max_quality', 'sort', 'order']) {
    const value = searchParams.get(key);
    if (value) {
      backendParams.set(key, value);
    }
  }
  backendParams.set('limit', String(limit));
  backendParams.set('offset', String(offset));

  return proxyBackendApiResponse<GuidesResponse>(
    request,
    {
      endpoint: `/api/guides?${backendParams.toString()}`,
      transform: response => ({
        data: response.data.map(normalizeTravelGuide),
        pagination: response.pagination ?? {
          total: response.data.length,
          limit,
          offset,
        },
      }),
      fallbackError: 'Internal server error',
    },
  );
}
```

- [ ] **Step 4: Migrate single-guide and crawl-job routes**

Use the same helper pattern:

`apps/dashboard/src/app/api/crawler/guides/[id]/route.ts`:

```typescript
import type { NextRequest } from 'next/server';
import { normalizeTravelGuide } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendApiResponse<{ data: Record<string, unknown> }>(
    request,
    {
      endpoint: `/api/guides/${encodeURIComponent(id)}`,
      transform: response => ({ data: normalizeTravelGuide(response.data) }),
      fallbackError: 'Internal server error',
    },
  );
}
```

`apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts`:

```typescript
import type { NextRequest } from 'next/server';
import { normalizeCrawlJob } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = positiveInt(searchParams.get('limit'), 50);
  const backendParams = new URLSearchParams();

  for (const key of ['status', 'platform']) {
    const value = searchParams.get(key);
    if (value) {
      backendParams.set(key, value);
    }
  }
  backendParams.set('limit', String(limit));

  return proxyBackendApiResponse<{ data: Array<Record<string, unknown>> }>(
    request,
    {
      endpoint: `/api/crawl-jobs?${backendParams.toString()}`,
      transform: response => {
        const jobs = response.data.map(normalizeCrawlJob);
        return {
          data: jobs,
          pagination: { total: jobs.length, limit, offset: 0 },
        };
      },
      fallbackError: 'Internal server error',
    },
  );
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<{ data: Record<string, unknown> }>(
    request,
    {
      endpoint: '/api/crawl-jobs',
      method: 'POST',
      body: async () => {
        const body = await request.json();
        return {
          name: body.name,
          platform: body.platform,
          jobType: body.job_type || 'full',
          config: body.config || {},
          scheduleCron: body.schedule_cron,
        };
      },
      transform: response => ({ data: normalizeCrawlJob(response.data) }),
      successStatus: 201,
      fallbackError: 'Failed to create job',
    },
  );
}
```

- [ ] **Step 5: Migrate action and backfill routes**

For action routes, keep existing slug validation and replace backend calls with `proxyBackendApiResponse`.

For body-forwarding routes, use this shape:

```typescript
return proxyBackendApiResponse<BackendResponse>(
  request,
  {
    endpoint: '/api/crawl-jobs/backfill-jobs',
    method: 'POST',
    body: async () => {
      const body = await request.json();
      return {
        fieldGapGuideIds: body.fieldGapGuideIds,
        destinationGapCities: body.destinationGapCities,
      };
    },
    successStatus: 201,
    fallbackError: 'Failed to create backfill jobs',
  },
);
```

For no-body protected POST routes such as `backfill-execute` and `backfill-all`, accept `request: NextRequest` and call:

```typescript
return proxyBackendApiResponse<BackendResponse>(
  request,
  {
    endpoint: '/api/crawl-jobs/backfill-execute',
    method: 'POST',
    fallbackError: 'Failed to execute backfill jobs',
  },
);
```

- [ ] **Step 6: Run route handler tests**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/app/api/crawler/route-handlers.test.ts src/lib/api/backend.test.ts src/lib/api/proxy.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/app/api/crawler apps/dashboard/src/lib/api
git commit -m "refactor(dashboard): consolidate crawler proxy routes"
```

---

### Task 5: Align Dashboard Guide Types With Shared DTO

**Files:**
- Modify: `apps/dashboard/package.json`
- Modify: `apps/dashboard/src/lib/api/crawler.ts`
- Modify: `apps/dashboard/src/types/api.ts`

- [ ] **Step 1: Add workspace dependency**

In `apps/dashboard/package.json`, add to `dependencies`:

```json
"@pathfinding/types": "workspace:*"
```

Keep the dependency list alphabetized around existing `@...` package names where practical.

- [ ] **Step 2: Update Dashboard crawler guide type**

In `apps/dashboard/src/lib/api/crawler.ts`, add at the top:

```typescript
import type { TravelGuideResponseDto } from '@pathfinding/types';
```

Replace the local `TravelGuide` interface with:

```typescript
export interface TravelGuide extends TravelGuideResponseDto {
  _id?: string;
  source_external_id?: string | null;
  source_url?: string | null;
  author_id?: string | null;
  published_at?: string | null;
  crawled_at?: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Update detail-page guide type**

In `apps/dashboard/src/types/api.ts`, add:

```typescript
import type { TravelGuideResponseDto } from '@pathfinding/types';
```

Replace `export interface GuideWithAI { ... }` with:

```typescript
export interface GuideWithAI extends TravelGuideResponseDto {
  _id: string;
  aiSummary?: string;
  aiTips?: string[];
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: AiDay[];
  aiProcessedAt?: number;
}
```

Keep the existing `AiDay` and `AiPoi` interfaces below it because the guide detail page still reads both camelCase and snake_case AI fields.

- [ ] **Step 4: Run Dashboard typecheck and fix only guide-contract errors**

Run:

```bash
pnpm --dir apps/dashboard typecheck
```

Expected: PASS. If it fails because nullable shared fields meet code that assumes arrays or strings, keep the runtime normalizer defaults in `normalizeTravelGuide` and narrow the Dashboard `TravelGuide` interface to required values as shown in Step 2.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/package.json apps/dashboard/src/lib/api/crawler.ts apps/dashboard/src/types/api.ts pnpm-lock.yaml
git commit -m "refactor(dashboard): use shared guide dto"
```

---

### Task 6: Clean Low-Risk Workspace Dependency Ownership

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Verify Tencent SDK is unused**

Run:

```bash
rg -n "tencentcloud|tencentcloud-sdk-nodejs" package.json scripts packages apps -g '!**/node_modules/**' -g '!**/.next/**' -g '!**/coverage/**'
```

Expected before cleanup: matches only `package.json` and lockfile metadata. If source files import it, stop this task and leave the dependency in place.

- [ ] **Step 2: Move script-owned dependencies to dev ownership and remove unused SDK**

Run:

```bash
pnpm add -D cheerio@^1.2.0 playwright@^1.58.2
pnpm remove tencentcloud-sdk-nodejs
```

Expected: `cheerio` and `playwright` are under root `devDependencies`, `tencentcloud-sdk-nodejs` is removed, and `pnpm-lock.yaml` is updated.

- [ ] **Step 3: Replace root dependency notes**

In root `package.json`, replace `__dependency_notes__` with:

```json
"__dependency_notes__": [
  "Root devDependencies include runtime libraries for repo-level TypeScript scripts under scripts/.",
  "- cheerio: scripts/crawl-mafengwo.ts parses remote HTML.",
  "- playwright: scripts/crawl-mafengwo.ts performs a brief headless session for WAF cookie challenges."
]
```

- [ ] **Step 4: Run install consistency check**

Run:

```bash
pnpm install --lockfile-only
```

Expected: PASS with no additional package manifest drift.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: clarify root script dependencies"
```

---

### Task 7: Integrated Verification

**Files:**
- No source files unless a verification failure identifies a real regression from Tasks 1-6.

- [ ] **Step 1: Run focused Dashboard tests**

Run:

```bash
pnpm --dir apps/dashboard exec vitest run src/lib/api/backend.test.ts src/lib/api/proxy.test.ts src/app/api/crawler/route-handlers.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused API tests**

Run:

```bash
pnpm --dir packages/api exec vitest run src/routes/guides.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run package typechecks**

Run:

```bash
pnpm --filter @pathfinding/types typecheck
pnpm --filter @pathfinding/api typecheck
pnpm --dir apps/dashboard typecheck
```

Expected: PASS.

- [ ] **Step 4: Run broader repo checks**

Run:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

Expected: PASS. If a broad check fails outside the touched architecture area, capture the exact failing command and error, then decide whether the failure is a pre-existing repo issue or a regression introduced by this plan.

- [ ] **Step 5: Final review**

Run:

```bash
git status --short
git log --oneline -8
git diff --check HEAD
```

Expected:

- `git status --short` shows no uncommitted source changes after final commits.
- Recent commits are the task-level architecture commits.
- `git diff --check HEAD` prints no whitespace errors.

---

## Self-Review

- Spec coverage: Task 1 covers the shared guide contract. Task 2 moves guide response semantics into the API. Tasks 3-4 consolidate Dashboard proxy transport and error behavior. Task 5 aligns Dashboard DTO consumers. Task 6 addresses low-risk workspace dependency ownership. Task 7 covers final verification.
- Placeholder scan: This plan contains concrete files, code snippets, commands, and expected outcomes for each task.
- Type consistency: Shared DTO names are `TravelGuideContentDto`, `TravelGuideResponseDto`, `TravelGuideAiDayDto`, and `TravelGuideGeocodingMetricsDto`; later tasks import those exact names from `@pathfinding/types`.
