# Guide Ingest Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the leaky multi-service guide ingest into one deep module — a shared canonical-shape converter, a Zod-validated Go crawler port, a pure `normalizeGuide`, and a single `guide-writer` module that is the *only* writer of `travel_guides` (D2 enforced, not just declared).

**Architecture:** Three layers, built in order. (1) `@pathfinding/guide-shape` owns the `aiDays ↔ dayItineraries` derive (D13) and the response projection, killing 3-way duplication. (2) `GoCrawlerPort` puts a Zod anti-corruption layer in front of the Go `/detail` HTTP boundary (the `/list` discovery dedup is deferred — see Self-Review). (3) `normalizeGuide` (pure: raw → CanonicalGuide) + `guide-writer.ts` (sole `travel_guides` writer, exposing intent-named operations for crawl/CRUD/coordinate/enrichment). All 11 existing direct `travelGuides` write sites fold into `guide-writer.ts`.

**Tech Stack:** TypeScript (ESM, `verbatimModuleSyntax`), Hono, Drizzle ORM + TiDB (MySQL), Zod, Vitest, pnpm workspaces, Nx, tsdown. `@pathfinding/crawler-types` (pure pipeline primitives), `@pathfinding/database` (schema), `@pathfinding/types` (DTOs).

## Global Constraints

- **D2 single writer:** after this plan, only `packages/api/src/services/guide-writer.ts` may call `db.insert(travelGuides)` / `db.update(travelGuides)`. Every other site routes through its exported operations. A lint guard enforces this (Task 15).
- **D4 counts:** view/like counts are `number | null` with a raw-string fallback via `parseChineseNumber`. A parse failure is `null` + an `ingestWarnings` entry — never a fabricated `0`. On refresh, a `null` count never degrades an existing value to 0.
- **D5 score order:** clean → validate → score → completeness; the TS `calculateQualityScoreUnified` score is canonical. The Go `qualityScore` is reference-only and never persisted.
- **D6 audit:** every decoded crawl writes a `raw_crawl_records` row (sha256 `contentHash`); the hard fetch-failure branch writes none (preserve this gap deliberately).
- **D7 refresh policy:** content only overwritten when strictly longer; `CONTENT_DERIVED_KEYS = ['contentFormatVersion','contentHtml','contentMarkdown']` stripped when content not improved; no-overwrite-with-empty; empty-shell full refresh; `enrichedData` merged by key, preserving `aiDays`/`manualFix`.
- **D9 destinations:** `syncGuideDestinations` mirrors destination names into `guide_destinations`, idempotently.
- **D13 single-truth aiDays:** `enrichedData.aiDays` is authored truth; `dayItineraries` is derived ONLY by `@pathfinding/guide-shape` `aiDaysToDayItineraries`.
- **D10 city attribution:** the request city is attributed to a guide's destinations ONLY when `cityScoped === true` (strict). Owned by `resolveDestinationNames` in `guide-normalize.ts`.
- **lastUpdatedAt:** the crawl path stamps `lastUpdatedAt` on insert and refresh (folds the script's behavior into the canonical writer). Carried on `CanonicalGuide.values` and written by `guide-writer`.
- **Module resolution:** new packages resolve via pnpm symlink + `exports` → `./src/index.ts`. Do NOT add `paths` to `tsconfig.base.json` (none exists); do NOT edit `pnpm-workspace.yaml` (`packages/*` glob already matches). Type-only imports MUST use `import type`.
- **Commits:** Conventional Commits. Run `pnpm typecheck && pnpm test` (or the package-scoped `vitest run`) before each commit step.
- **Coverage:** minimum 60%; every new module ships with tests.

## File Structure

**New package `packages/guide-shape/`** — the shared canonical-shape module:
- `package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `project.json` — mirror `@pathfinding/utils`.
- `src/index.ts` — barrel.
- `src/ai-days.ts` — `aiDaysToDayItineraries` + untrusted-blob accessors (`isRecord`, `aiDayNumber`, `recordFromJson`, `arrayFromRecord`, `normalizeAiDays`). The single D13 derive.
- `src/response.ts` — `toResponseDto` + its blob accessors (`stringFromRecord`, `stringArrayFromRecord`, `dateString`, `numberFromGuide`, `stringArray`, `destinationsFromGuide`, `geocodingMetricsFromRecord`).
- `src/ai-days.test.ts`, `src/response.test.ts`.

**`packages/api/src/services/`** — the deepened ingest:
- `go-crawler-port.ts` (Create) — `RawCrawlDetail` Zod schema + type, `GoCrawlerPort` interface, `HttpGoCrawlerPort` adapter, `createGoCrawlerPort(env)`.
- `go-crawler-port.test.ts` (Create) — decode + contract-parity test.
- `guide-normalize.ts` (Create) — `CanonicalGuide`, `NormalizeResult`, pure `normalizeGuide` + all pure helpers moved out of `guide-import.service.ts`.
- `guide-normalize.test.ts` (Create) — golden raw→canonical assertions.
- `guide-writer.ts` (Create) — the sole `travel_guides` writer: `persistIngestedGuide`, `createUserGuide`, `updateUserGuide`, `applyPoiCoordinateFix`, `applyGuideEnrichment`, plus `syncGuideDestinations` (moved). Owns `findExistingGuide`, the D7 write policy, `recordRawCrawl`.
- `guide-writer.test.ts` (Create) — table-aware mock writer tests.
- `guide-import.service.ts` (Modify) — becomes a thin composition: `GoCrawlerPort → normalizeGuide → persistIngestedGuide`; keeps `discoverNewGuides`/`importGuide`/`batchImportGuides`.

**Fold sites (Modify):** `routes/guides.ts`, `services/backfill-executor.service.ts`, `scripts/crawl-mafengwo.ts`, `scripts/batch-ai-process.ts`, `scripts/generate-content-html.ts`, `scripts/clean-historical-guides.ts`.

**Lint guard (Create):** `eslint` `no-restricted-syntax` rule (or a test) banning `db.insert(travelGuides)`/`db.update(travelGuides)` outside `guide-writer.ts`.

---

## Phase 1 — `@pathfinding/guide-shape` (the shared converter, build first)

### Task 1: Scaffold the `@pathfinding/guide-shape` package

**Files:**
- Create: `packages/guide-shape/package.json`
- Create: `packages/guide-shape/tsconfig.json`
- Create: `packages/guide-shape/tsdown.config.ts`
- Create: `packages/guide-shape/vitest.config.ts`
- Create: `packages/guide-shape/project.json`
- Create: `packages/guide-shape/src/index.ts`
- Modify: `packages/api/package.json` (add dependency)

**Interfaces:**
- Consumes: nothing.
- Produces: a resolvable workspace package `@pathfinding/guide-shape` exporting from `./src/index.ts`.

- [ ] **Step 1: Create `packages/guide-shape/package.json`**

```json
{
  "name": "@pathfinding/guide-shape",
  "type": "module",
  "version": "1.0.0",
  "description": "Canonical travel-guide shape: aiDays<->dayItineraries derive (D13) and response projection",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "dev": "tsdown --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@pathfinding/database": "workspace:*",
    "@pathfinding/types": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsdown": "0.21.0-beta.2",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create the build/test config files (copied verbatim from `@pathfinding/utils`)**

`packages/guide-shape/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

`packages/guide-shape/tsdown.config.ts`:
```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

`packages/guide-shape/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

`packages/guide-shape/project.json`:
```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "guide-shape",
  "projectType": "library",
  "sourceRoot": "packages/guide-shape/src",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": { "command": "tsdown", "cwd": "packages/guide-shape" },
      "outputs": ["{projectRoot}/dist"]
    },
    "dev": {
      "executor": "nx:run-commands",
      "options": { "command": "tsdown --watch", "cwd": "packages/guide-shape" }
    },
    "typecheck": {
      "executor": "nx:run-commands",
      "options": { "command": "tsc --noEmit", "cwd": "packages/guide-shape" }
    }
  }
}
```

- [ ] **Step 3: Create a placeholder barrel `packages/guide-shape/src/index.ts`**

```ts
// @pathfinding/guide-shape - canonical travel-guide shape
export * from './ai-days';
export * from './response';
```

Create empty stubs so the barrel resolves until Tasks 2-3 fill them:

`packages/guide-shape/src/ai-days.ts`:
```ts
export {};
```

`packages/guide-shape/src/response.ts`:
```ts
export {};
```

- [ ] **Step 4: Register the dependency and install**

Add to `packages/api/package.json` `dependencies` (keep alphabetical):
```json
    "@pathfinding/guide-shape": "workspace:*",
```

Run: `pnpm install`
Expected: pnpm links `@pathfinding/guide-shape` into `packages/api/node_modules/@pathfinding/`.

- [ ] **Step 5: Verify the package typechecks**

Run: `pnpm --filter @pathfinding/guide-shape typecheck`
Expected: PASS (no errors; empty modules compile).

- [ ] **Step 6: Commit**

```bash
git add packages/guide-shape packages/api/package.json pnpm-lock.yaml
git commit -m "feat(guide-shape): scaffold canonical-shape package"
```

---

### Task 2: `aiDaysToDayItineraries` — the single D13 derive

**Files:**
- Modify: `packages/guide-shape/src/ai-days.ts`
- Test: `packages/guide-shape/src/ai-days.test.ts`

**Interfaces:**
- Consumes: `DayItinerary`, `PoiCoordinate` (type-only) from `@pathfinding/database`.
- Produces:
  - `isRecord(value: unknown): value is Record<string, unknown>`
  - `aiDayNumber(day: Record<string, unknown>): number | null`
  - `recordFromJson(value: unknown): Record<string, unknown>`
  - `arrayFromRecord(record: Record<string, unknown>, keys: string[]): unknown[] | null`
  - `aiDaysToDayItineraries(aiDays: unknown[]): DayItinerary[]`
  - `resolveAiDays(enrichedData: Record<string, unknown>, fallback: unknown): unknown[] | null` (reads `aiDays`/`ai_days`, else fallback)

- [ ] **Step 1: Write the failing test**

`packages/guide-shape/src/ai-days.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { aiDayNumber, aiDaysToDayItineraries, isRecord, resolveAiDays } from './ai-days';

describe('aiDayNumber', () => {
  it('reads day_number, dayNumber, then day', () => {
    expect(aiDayNumber({ day_number: 2 })).toBe(2);
    expect(aiDayNumber({ dayNumber: 3 })).toBe(3);
    expect(aiDayNumber({ day: 4 })).toBe(4);
  });

  it('returns null when no finite number present', () => {
    expect(aiDayNumber({ day: 'x' })).toBeNull();
    expect(aiDayNumber({})).toBeNull();
  });
});

describe('aiDaysToDayItineraries', () => {
  it('keeps days with a valid number and emits POIs that have name+lat+lng', () => {
    const result = aiDaysToDayItineraries([
      {
        day_number: 1,
        theme: '抵达',
        pois: [
          { name: '天安门', latitude: 39.9, longitude: 116.4, type: 'attraction' },
          { name: '无坐标', latitude: null, longitude: 116.4 },
        ],
      },
    ]);

    expect(result).toEqual([
      { day: 1, title: '抵达', pois: [{ name: '天安门', lat: 39.9, lng: 116.4, category: 'attraction' }] },
    ]);
  });

  it('prefers title over theme and keeps a day even when all POIs are filtered out', () => {
    const result = aiDaysToDayItineraries([{ dayNumber: 2, title: '第二天', theme: 'fallback', pois: [] }]);

    expect(result).toEqual([{ day: 2, title: '第二天', pois: [] }]);
  });

  it('skips entries without a valid day number and non-record entries', () => {
    const result = aiDaysToDayItineraries([{ pois: [] }, 'nope', null]);

    expect(result).toEqual([]);
  });
});

describe('resolveAiDays', () => {
  it('prefers aiDays, then ai_days, then the fallback', () => {
    expect(resolveAiDays({ aiDays: [{ day: 1, pois: [] }] }, null)).toEqual([{ day: 1, pois: [] }]);
    expect(resolveAiDays({ ai_days: [{ day: 2, pois: [] }] }, null)).toEqual([{ day: 2, pois: [] }]);
    expect(resolveAiDays({}, [{ day: 3, pois: [] }])).toEqual([{ day: 3, pois: [] }]);
    expect(resolveAiDays({}, null)).toBeNull();
  });
});

describe('isRecord', () => {
  it('accepts plain objects and rejects arrays/null', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/guide-shape test ai-days`
Expected: FAIL with "aiDaysToDayItineraries is not a function" (module is the empty stub).

- [ ] **Step 3: Write the implementation**

`packages/guide-shape/src/ai-days.ts`:
```ts
import type { DayItinerary } from '@pathfinding/database';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function recordFromJson(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function arrayFromRecord(record: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

/** Read the day number of an aiDays entry (day_number / dayNumber / day) — D13 unified 3-key reader. */
export function aiDayNumber(day: Record<string, unknown>): number | null {
  const value = day.day_number ?? day.dayNumber ?? day.day;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Derive schema-shaped dayItineraries from an aiDays blob — the single source of
 * truth (D13). A day is kept when it has a valid day number; a POI is kept only
 * when it has a string name and finite latitude/longitude. title falls back to theme.
 */
export function aiDaysToDayItineraries(aiDays: unknown[]): DayItinerary[] {
  const itineraries: DayItinerary[] = [];

  for (const day of aiDays) {
    if (!isRecord(day)) {
      continue;
    }
    const dayNumber = aiDayNumber(day);
    if (dayNumber === null) {
      continue;
    }

    const title = typeof day.title === 'string'
      ? day.title
      : typeof day.theme === 'string'
        ? day.theme
        : undefined;
    const pois = (Array.isArray(day.pois) ? day.pois : [])
      .filter(isRecord)
      .filter(poi =>
        typeof poi.name === 'string'
        && typeof poi.latitude === 'number' && Number.isFinite(poi.latitude)
        && typeof poi.longitude === 'number' && Number.isFinite(poi.longitude),
      )
      .map(poi => ({
        name: poi.name as string,
        lat: poi.latitude as number,
        lng: poi.longitude as number,
        ...(typeof poi.type === 'string' ? { category: poi.type } : {}),
      }));

    itineraries.push({ day: dayNumber, ...(title ? { title } : {}), pois });
  }

  return itineraries;
}

/** Pick the authored aiDays blob: enrichedData.aiDays, then ai_days, then a caller fallback. */
export function resolveAiDays(
  enrichedData: Record<string, unknown>,
  fallback: unknown,
): unknown[] | null {
  return (
    arrayFromRecord(enrichedData, ['aiDays', 'ai_days'])
    ?? (Array.isArray(fallback) ? fallback : null)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/guide-shape test ai-days`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add packages/guide-shape/src/ai-days.ts packages/guide-shape/src/ai-days.test.ts
git commit -m "feat(guide-shape): add aiDaysToDayItineraries D13 derive"
```

---

### Task 3: `toResponseDto` — the read projection

**Files:**
- Modify: `packages/guide-shape/src/response.ts`
- Test: `packages/guide-shape/src/response.test.ts`

**Interfaces:**
- Consumes: `aiDaysToDayItineraries`-adjacent helpers (`recordFromJson`, `arrayFromRecord` from `./ai-days`), `normalizeAiDays` (defined here), `travelGuides.$inferSelect` (type, from `@pathfinding/database`), `TravelGuideResponseDto` (type, from `@pathfinding/types`).
- Produces: `toResponseDto(guide: GuideRow): TravelGuideResponseDto`, where `type GuideRow = typeof travelGuides.$inferSelect`.

- [ ] **Step 1: Write the failing test**

`packages/guide-shape/src/response.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { toResponseDto } from './response';

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    platform: 'mafengwo',
    externalId: 'mg7',
    title: '北京攻略',
    content: '正文',
    authorName: '作者',
    authorUrl: null,
    publishedAt: new Date('2023-08-12T00:00:00Z'),
    sourceUrl: 'https://example.com/7',
    coverImageUrl: 'https://img/cover.jpg',
    imageUrls: ['https://img/1.jpg'],
    destinations: [{ name: '北京' }],
    tags: ['city'],
    category: null,
    viewCount: 100,
    likeCount: 50,
    commentCount: 3,
    qualityScore: 0.8,
    completenessScore: null,
    completenessLevel: 'usable',
    enrichedData: {
      aiSummary: '一句话',
      aiDays: [{ day_number: 1, pois: [{ name: 'A', latitude: 39.9, longitude: 116.4 }] }],
    },
    geoData: null,
    dayItineraries: null,
    crawledAt: new Date('2023-08-13T00:00:00Z'),
    lastUpdatedAt: null,
    createdAt: new Date('2023-08-13T00:00:00Z'),
    updatedAt: new Date('2023-08-13T00:00:00Z'),
    ...overrides,
  } as never;
}

describe('toResponseDto', () => {
  it('maps a DB row to the iOS-compatible snake_case DTO', () => {
    const dto = toResponseDto(baseRow());

    expect(dto.id).toBe('7');
    expect(dto._id).toBe('7');
    expect(dto.source_platform).toBe('mafengwo');
    expect(dto.views_count).toBe(100);
    expect(dto.likes_count).toBe(50);
    expect(dto.comments_count).toBe(3);
    expect(dto.destinations).toEqual(['北京']);
    expect(dto.ai_summary).toBe('一句话');
    expect(dto.ai_days).toEqual([{ day_number: 1, pois: [{ name: 'A', latitude: 39.9, longitude: 116.4 }] }]);
  });

  it('never fabricates saves_count — always null (D13)', () => {
    expect(toResponseDto(baseRow()).saves_count).toBeNull();
  });

  it('falls back to dayItineraries for ai_days when enrichedData has none', () => {
    const dto = toResponseDto(baseRow({ enrichedData: {}, dayItineraries: [{ day: 2, pois: [] }] }));

    expect(dto.ai_days).toEqual([{ day_number: 2, pois: [] }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/guide-shape test response`
Expected: FAIL with "toResponseDto is not a function".

- [ ] **Step 3: Write the implementation**

`packages/guide-shape/src/response.ts` (moves `guides.ts:30-217` verbatim, retargeted to the shared `recordFromJson`/`arrayFromRecord`):
```ts
import type { travelGuides } from '@pathfinding/database';
import type { TravelGuideResponseDto } from '@pathfinding/types';
import { arrayFromRecord, recordFromJson } from './ai-days';

type GuideRow = typeof travelGuides.$inferSelect;

function stringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function stringArrayFromRecord(record: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (strings.length > 0) {
        return strings;
      }
    }
  }
  return null;
}

function dateString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function numberFromGuide(guide: GuideRow, key: keyof GuideRow, fallback = 0): number {
  const value = guide[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function destinationsFromGuide(value: GuideRow['destinations']): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((destination) => {
      if (typeof destination === 'string') {
        return destination;
      }
      if (destination && typeof destination === 'object' && typeof destination.name === 'string') {
        return destination.name;
      }
      return null;
    })
    .filter((destination): destination is string => Boolean(destination));
}

function geocodingMetricsFromRecord(record: Record<string, unknown>): TravelGuideResponseDto['geocoding_metrics'] {
  const value = record.geocodingMetrics ?? record.geocoding_metrics;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const metrics = value as Record<string, unknown>;
  const totalPois = metrics.total_pois;
  const averageConfidence = metrics.average_confidence;
  const lowConfidenceCount = metrics.low_confidence_count;
  if (
    typeof totalPois === 'number'
    && typeof averageConfidence === 'number'
    && typeof lowConfidenceCount === 'number'
  ) {
    return { total_pois: totalPois, average_confidence: averageConfidence, low_confidence_count: lowConfidenceCount };
  }
  return null;
}

function normalizeAiDays(value: unknown): TravelGuideResponseDto['ai_days'] {
  if (!Array.isArray(value)) {
    return null;
  }
  interface NormalizedAiDay {
    day_number: number;
    theme?: string;
    title?: string;
    pois: Array<Record<string, unknown>>;
  }
  const days = value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const dayNumber = record.day_number ?? record.dayNumber ?? record.day;
      if (typeof dayNumber !== 'number' || !Number.isFinite(dayNumber)) {
        return null;
      }
      return {
        day_number: dayNumber,
        ...(typeof record.theme === 'string' ? { theme: record.theme } : {}),
        ...(typeof record.title === 'string' ? { title: record.title } : {}),
        pois: Array.isArray(record.pois) ? record.pois as Array<Record<string, unknown>> : [],
      };
    })
    .filter((day): day is NormalizedAiDay => day !== null);
  return days.length > 0 ? days : null;
}

/**
 * Convert a DB guide row to the iOS-compatible response format. The iOS BlogPost
 * model expects specific snake_case field names that differ from the DB schema.
 */
export function toResponseDto(guide: GuideRow): TravelGuideResponseDto {
  const enrichedData = recordFromJson(guide.enrichedData);
  const id = String(guide.id);
  const aiDays = normalizeAiDays(
    arrayFromRecord(enrichedData, ['aiDays', 'ai_days'])
    ?? (Array.isArray(guide.dayItineraries) ? guide.dayItineraries : null),
  );

  return {
    id,
    _id: id,
    title: guide.title,
    summary: stringFromRecord(enrichedData, ['summary', 'aiSummary', 'ai_summary']),
    source_platform: guide.platform,
    source_external_id: guide.externalId ?? null,
    source_url: guide.sourceUrl ?? null,
    author_name: guide.authorName,
    author_id: stringFromRecord(enrichedData, ['authorId', 'author_id']),
    content: guide.content ?? '',
    content_html: stringFromRecord(enrichedData, ['contentHtml', 'content_html']),
    content_markdown: stringFromRecord(enrichedData, ['contentMarkdown', 'content_markdown']),
    cover_image_url: guide.coverImageUrl,
    image_urls: stringArray(guide.imageUrls),
    quality_score: numberFromGuide(guide, 'qualityScore'),
    views_count: numberFromGuide(guide, 'viewCount'),
    likes_count: numberFromGuide(guide, 'likeCount'),
    saves_count: null,
    comments_count: numberFromGuide(guide, 'commentCount'),
    destinations: destinationsFromGuide(guide.destinations),
    tags: stringArray(guide.tags),
    published_at: dateString(guide.publishedAt),
    crawled_at: dateString(guide.crawledAt),
    created_at: dateString(guide.createdAt),
    updated_at: dateString(guide.updatedAt),
    ai_summary: stringFromRecord(enrichedData, ['aiSummary', 'summary', 'ai_summary']),
    ai_tips: stringArrayFromRecord(enrichedData, ['aiTips', 'tips', 'ai_tips']),
    ai_best_time: stringFromRecord(enrichedData, ['aiBestTime', 'bestTime', 'ai_best_time']),
    ai_duration: stringFromRecord(enrichedData, ['aiDuration', 'duration', 'ai_duration']),
    ai_budget: stringFromRecord(enrichedData, ['aiBudget', 'budget', 'ai_budget']),
    ai_days: aiDays,
    ai_processed_at: null,
    ai_version: stringFromRecord(enrichedData, ['aiVersion', 'version', 'ai_version']),
    ai_model: stringFromRecord(enrichedData, ['aiModel', 'model', 'ai_model']),
    geocoding_metrics: geocodingMetricsFromRecord(enrichedData),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/guide-shape test response`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/guide-shape/src/response.ts packages/guide-shape/src/response.test.ts
git commit -m "feat(guide-shape): add toResponseDto read projection"
```

---

### Task 4: Rewire all three consumers to the shared module

**Files:**
- Modify: `packages/api/src/routes/guides.ts` (delete local `toClientGuide` + 11 blob helpers + `deriveDayItineraries` + `aiDayNumber`/`isRecord`; import from `@pathfinding/guide-shape`)
- Modify: `scripts/batch-ai-process.ts` (delete local `toDayItineraries`; import `aiDaysToDayItineraries`)
- Test: `packages/api/src/routes/guides.test.ts` (existing — re-point assertions if needed)

**Interfaces:**
- Consumes: `toResponseDto`, `aiDaysToDayItineraries`, `resolveAiDays`, `recordFromJson`, `isRecord`, `aiDayNumber` from `@pathfinding/guide-shape`.
- Produces: `guides.ts` read path emits the identical DTO; the poi-coordinates PATCH derives via the shared function. (Behaviour-preserving — the existing `guides.test.ts` is the guard.)

- [ ] **Step 1: Run the existing guides route tests to capture the green baseline**

Run: `pnpm --filter @pathfinding/api test guides`
Expected: PASS (record the passing set before refactoring).

- [ ] **Step 2: Replace `toClientGuide` and helpers in `guides.ts`**

At the top of `packages/api/src/routes/guides.ts`, add:
```ts
import { aiDayNumber, aiDaysToDayItineraries, isRecord, recordFromJson, resolveAiDays, toResponseDto } from '@pathfinding/guide-shape';
```

Delete the local definitions now provided by the shared module: `recordFromJson` (23-28), `stringFromRecord` (30-38), `stringArrayFromRecord` (40-50), `dateString` (52-60), `numberFromGuide` (62-65), `stringArray` (67-71), `destinationsFromGuide` (77-93), `arrayFromRecord` (95-103), `geocodingMetricsFromRecord` (105-129), `normalizeAiDays` (131-165), `toClientGuide` (171-217), `aiDayNumber` (513-517), `isRecord` (519-521), `deriveDayItineraries` (528-563).

Verified: in `guides.ts` these helpers are referenced ONLY inside the deleted `toClientGuide` — so `numberFromGuide`, `stringArray`, and `destinationsFromGuide` MUST all be deleted too (no surviving callers; leaving them trips `unused-vars`). Keep ONLY `parseGuideOrder` (used at the list handler, unrelated to guide-shape). Confirm with:

Run: `rg -n 'numberFromGuide|stringArray\(|parseGuideOrder|destinationsFromGuide' packages/api/src/routes/guides.ts`
Expected after deletion: only `parseGuideOrder` matches.

Also delete the now-orphaned type import at the top of `guides.ts`:
```ts
import type { DayItinerary } from '@pathfinding/database/schema';
```
It was used only by `deriveDayItineraries` and the inline poi-coordinates fallback (the latter moves to the writer in Task 11). Leaving it trips `unused-imports/no-unused-imports`.

- [ ] **Step 3: Replace `toClientGuide(...)` call sites with `toResponseDto(...)`**

Every `toClientGuide(x)` → `toResponseDto(x)` (call sites at the old `guides.ts:311`, `:343`, `:390`). The poi-coordinates PATCH aiDays branch keeps its logic but uses the shared derive:
```ts
        dayItineraries: aiDaysToDayItineraries(aiDays),
```
and the dual-key probe uses the shared reader:
```ts
  const enrichedData = recordFromJson(guide.enrichedData);
  const aiDaysKey = Array.isArray(enrichedData.aiDays)
    ? 'aiDays'
    : Array.isArray(enrichedData.ai_days)
      ? 'ai_days'
      : null;
```
(`aiDayNumber`/`isRecord` now imported.)

- [ ] **Step 4: Replace `toDayItineraries` in `scripts/batch-ai-process.ts`**

Add import:
```ts
import { aiDaysToDayItineraries } from '@pathfinding/guide-shape';
```
Delete the local `toDayItineraries` (334-352). Replace its call site (412):
```ts
        dayItineraries: geocodedDays ? aiDaysToDayItineraries(geocodedDays) : null,
```
Note: `geocodedDays` is `DayPlan[]` whose entries carry `dayNumber`/`theme`/`pois[].latitude/longitude/name/type` — structurally compatible with the untrusted-blob reader. This is NOT byte-identical to the old `toDayItineraries`: the unified derive DROPS any day whose `dayNumber` is non-finite, whereas the original emitted such a day with `day: undefined`. Because `DayPlan.dayNumber` is typed `number` this never fires in practice; the new behavior (dropping malformed days) is strictly safer. Accept and document — do not treat as a pure refactor.

- [ ] **Step 5: Run typecheck + lint + the guides route tests**

Run: `pnpm --filter @pathfinding/api typecheck && pnpm --filter @pathfinding/api lint && pnpm --filter @pathfinding/api test guides`
Expected: PASS. Lint must be run here (not just typecheck) to catch any now-unused import/var left behind by the deletions. If an assertion references a helper that moved, re-point the import — do not change expected values.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/guides.ts scripts/batch-ai-process.ts
git commit -m "refactor(api): consume guide-shape; delete duplicated derive/projection"
```

---

## Phase 2 — `GoCrawlerPort` (Zod anti-corruption layer)

### Task 5: `RawCrawlDetail` Zod schema + contract-parity test

**Files:**
- Create: `packages/api/src/services/go-crawler-port.ts`
- Test: `packages/api/src/services/go-crawler-port.test.ts`

**Interfaces:**
- Consumes: `zod`.
- Produces:
  - `RawCrawlDetailSchema` (Zod), `type RawCrawlDetail = z.infer<typeof RawCrawlDetailSchema>`
  - `RawCrawlDetailResponseSchema` (the `{success,data,error}` envelope), `type RawCrawlDetailResponse`
  - `decodeDetailResponse(json: unknown): { ok: true; data: RawCrawlDetail } | { ok: false; error: string }`

> **Resolved (do not re-investigate):** `HandleMafengwoDetail` (`apps/server/internal/handler/mafengwo.go:160-179`) emits the 18 detail keys FLAT, but `middleware.JSON` (`apps/server/internal/middleware/middleware.go:78-90`) wraps EVERY payload in `apiSuccess{ Success: true, Data: data }`. So the wire shape is `{ success: true, data: { ...18 keys } }` — exactly what `RawCrawlDetailResponseSchema` / `decodeDetailResponse` assume and what the current prod parser already uses. Keep the envelope schema. The 18-key contract-parity test pins the inner contract.

- [ ] **Step 1: Write the failing test**

`packages/api/src/services/go-crawler-port.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { decodeDetailResponse, RawCrawlDetailSchema } from './go-crawler-port.js';

const GO_DETAIL_KEYS = [
  'url', 'externalId', 'title', 'content', 'contentHtml', 'contentMarkdown',
  'contentTruncated', 'author', 'views', 'likes', 'viewsRaw', 'likesRaw',
  'coverImage', 'images', 'publishedAt', 'qualityScore', 'saved', 'saveError',
];

function goDetailPayload(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://example.com/1',
    externalId: 'mg1',
    title: '北京',
    content: '正文',
    contentHtml: '<p>h</p>',
    contentMarkdown: '# md',
    contentTruncated: false,
    author: '作者',
    views: 100,
    likes: 50,
    viewsRaw: '100',
    likesRaw: '50',
    coverImage: 'https://img/c.jpg',
    images: ['https://img/1.jpg'],
    publishedAt: '2023-08-12',
    qualityScore: 0.85,
    saved: true,
    saveError: '',
    ...overrides,
  };
}

describe('RawCrawlDetailSchema', () => {
  it('accepts a full Go /detail payload', () => {
    expect(RawCrawlDetailSchema.parse(goDetailPayload())).toMatchObject({ externalId: 'mg1', views: 100 });
  });

  it('accepts null counts (D4) and string legacy counts', () => {
    expect(RawCrawlDetailSchema.parse(goDetailPayload({ views: null, likes: '1.2万' }))).toMatchObject({
      views: null,
      likes: '1.2万',
    });
  });

  it('rejects a payload missing a required key (contract drift guard)', () => {
    const { externalId: _omit, ...broken } = goDetailPayload();
    expect(() => RawCrawlDetailSchema.parse(broken)).toThrow();
  });

  it('contract parity: schema keys equal the Go /detail key set', () => {
    expect(Object.keys(RawCrawlDetailSchema.shape).sort()).toEqual([...GO_DETAIL_KEYS].sort());
  });
});

describe('decodeDetailResponse', () => {
  it('returns ok with data for a valid response', () => {
    const result = decodeDetailResponse({ success: true, data: goDetailPayload() });
    expect(result).toMatchObject({ ok: true });
  });

  it('returns not-ok for an error envelope', () => {
    const result = decodeDetailResponse({ success: false, error: '解析失败' });
    expect(result).toEqual({ ok: false, error: '解析失败' });
  });

  it('returns not-ok when the payload fails validation', () => {
    const result = decodeDetailResponse({ success: true, data: { url: 'x' } });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/api test go-crawler-port`
Expected: FAIL with "Cannot find module './go-crawler-port.js'".

- [ ] **Step 3: Write the implementation**

`packages/api/src/services/go-crawler-port.ts`:
```ts
import { z } from 'zod';

/** D4: counts arrive as number|null from current Go, string from legacy responses. */
const countField = z.union([z.number(), z.string()]).nullable().optional();

/** POST /api/crawler/mafengwo/detail success payload (WS-B1 contract). */
export const RawCrawlDetailSchema = z.object({
  url: z.string(),
  externalId: z.string(),
  title: z.string(),
  content: z.string(),
  contentHtml: z.string().optional(),
  contentMarkdown: z.string().optional(),
  contentTruncated: z.boolean().optional(),
  author: z.string(),
  views: countField,
  likes: countField,
  viewsRaw: z.string().optional(),
  likesRaw: z.string().optional(),
  coverImage: z.string(),
  images: z.array(z.string()),
  publishedAt: z.string().optional(),
  qualityScore: z.number().optional(),
  saved: z.boolean().optional(),
  saveError: z.string().optional(),
});

export type RawCrawlDetail = z.infer<typeof RawCrawlDetailSchema>;

export const RawCrawlDetailResponseSchema = z.object({
  success: z.boolean(),
  data: RawCrawlDetailSchema.optional(),
  error: z.string().optional(),
});

export type RawCrawlDetailResponse = z.infer<typeof RawCrawlDetailResponseSchema>;

export type DecodeResult
  = | { ok: true; data: RawCrawlDetail }
    | { ok: false; error: string };

/** Anti-corruption decode: turns an untrusted Go response into a validated RawCrawlDetail. */
export function decodeDetailResponse(json: unknown): DecodeResult {
  const envelope = RawCrawlDetailResponseSchema.safeParse(json);
  if (!envelope.success) {
    return { ok: false, error: `Go /detail 响应结构非法：${envelope.error.message}` };
  }
  if (!envelope.data.success || !envelope.data.data) {
    return { ok: false, error: envelope.data.error || '解析游记详情失败' };
  }
  return { ok: true, data: envelope.data.data };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/api test go-crawler-port`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/go-crawler-port.ts packages/api/src/services/go-crawler-port.test.ts
git commit -m "feat(api): add Zod-validated RawCrawlDetail contract for Go /detail"
```

---

### Task 6: `GoCrawlerPort` interface + HTTP adapter

**Files:**
- Modify: `packages/api/src/services/go-crawler-port.ts`
- Test: `packages/api/src/services/go-crawler-port.test.ts`

**Interfaces:**
- Consumes: `decodeDetailResponse`, `RawCrawlDetail` (from Task 5).
- Produces:
  - `interface GoCrawlerPort { fetchDetail(url): Promise<DecodeResult> }` (just `fetchDetail` — the ingest path. `/list` discovery is NOT folded here: `discoverFromMafengwo` and `runDestinationFill` both need an `mddId` for D10 city-scoping, so a `city`-only `fetchList` cannot replace them. Deduping `/list` is deferred — see Self-Review.)
  - `class HttpGoCrawlerPort implements GoCrawlerPort` (ctor `{ goServerUrl: string; fetchImpl: typeof fetch }`)
  - `createGoCrawlerPort(overrides?: Partial<{ goServerUrl: string; fetchImpl: typeof fetch }>): GoCrawlerPort`

- [ ] **Step 1: Write the failing test (append to `go-crawler-port.test.ts`)**

```ts
import { HttpGoCrawlerPort } from './go-crawler-port.js';

describe('HttpGoCrawlerPort.fetchDetail', () => {
  it('POSTs to /detail and returns a decoded RawCrawlDetail', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: goDetailPayload() }),
    });
    const port = new HttpGoCrawlerPort({ goServerUrl: 'http://go:3001', fetchImpl: fetchImpl as never });

    const result = await port.fetchDetail('https://example.com/1');

    expect(result).toMatchObject({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://go:3001/api/crawler/mafengwo/detail',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns not-ok on a non-200 response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502, json: vi.fn() });
    const port = new HttpGoCrawlerPort({ goServerUrl: 'http://go:3001', fetchImpl: fetchImpl as never });

    expect(await port.fetchDetail('https://example.com/1')).toEqual({ ok: false, error: '获取游记详情失败：502' });
  });
});
```
(Add `import { vi } from 'vitest';` to the top import if not present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/api test go-crawler-port`
Expected: FAIL with "HttpGoCrawlerPort is not a constructor".

- [ ] **Step 3: Write the implementation (append to `go-crawler-port.ts`)**

```ts
export interface GoCrawlerPort {
  fetchDetail: (url: string) => Promise<DecodeResult>;
}

export interface GoCrawlerPortConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

export class HttpGoCrawlerPort implements GoCrawlerPort {
  constructor(private readonly cfg: GoCrawlerPortConfig) {}

  async fetchDetail(url: string): Promise<DecodeResult> {
    const response = await this.cfg.fetchImpl(
      `${this.cfg.goServerUrl}/api/crawler/mafengwo/detail`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) },
    );
    if (!response.ok) {
      return { ok: false, error: `获取游记详情失败：${response.status}` };
    }
    return decodeDetailResponse(await response.json());
  }
}

export function createGoCrawlerPort(overrides: Partial<GoCrawlerPortConfig> = {}): GoCrawlerPort {
  return new HttpGoCrawlerPort({
    goServerUrl: overrides.goServerUrl ?? process.env.GO_SERVER_URL ?? 'http://localhost:3001',
    fetchImpl: overrides.fetchImpl ?? globalThis.fetch,
  });
}
```

> `/list` discovery stays in `discoverNewGuides` / `backfill-executor` for now (both pass `mddId` for D10) — folding it onto the port is deferred to keep this task scoped to the ingest seam.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/api test go-crawler-port`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/go-crawler-port.ts packages/api/src/services/go-crawler-port.test.ts
git commit -m "feat(api): add GoCrawlerPort with injected HTTP adapter"
```

---

## Phase 3 — `normalizeGuide` + `guide-writer` (split, then fold all writers)

### Task 7: `CanonicalGuide` + pure `normalizeGuide`

**Files:**
- Create: `packages/api/src/services/guide-normalize.ts`
- Test: `packages/api/src/services/guide-normalize.test.ts`

**Interfaces:**
- Consumes: `cleanContent`, `validateGuideEnhanced`, `calculateQualityScoreUnified`, `calculateCompletenessLevel`, `parseChineseNumber`, `CompletenessLevel` from `@pathfinding/crawler-types`; `buildStructuredGuideContent` from `./guide-content.js`; `RawCrawlDetail` from `./go-crawler-port.js`; `GuideDestination` (type) from `@pathfinding/database`; `createHash` from `node:crypto`.
- Produces:
  - `interface ImportContext { city?: string; cityScoped?: boolean; jobId?: number }`
  - `interface StagingSupplement { destinationName?: string | null; tags?: unknown; commentsCount?: number | null; savesCount?: number | null; publishedAt?: Date | null }`
  - `interface CanonicalGuide { platform: string; externalId?: string; values: GuideWriteValues; destinationNames: string[]; views: number | null; likes: number | null; commentCount: number | null; cleanedContent: string; enrichedNew: Record<string, unknown> }`
  - `type GuideWriteValues = Partial<typeof travelGuides.$inferInsert>`
  - `interface RawCrawlAudit { jobId: number; rawData: Record<string, unknown>; contentHash: string }`
  - `type NormalizeResult = { status: 'accepted'; guide: CanonicalGuide; warnings: string[]; audit: RawCrawlAudit } | { status: 'rejected'; reason: string; warnings: string[]; audit: RawCrawlAudit }`
  - `function normalizeGuide(detail: RawCrawlDetail, requestUrl: string, context: ImportContext | undefined, staging: StagingSupplement | null, clock?: () => Date): NormalizeResult` — `requestUrl` is the URL we asked Go to crawl; it (NOT `detail.url`, which is Go's possibly-canonicalized response URL) becomes `rawData.requestUrl` and `values.sourceUrl`, preserving the original audit/dedup identity.

- [ ] **Step 1: Write the failing test**

`packages/api/src/services/guide-normalize.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { RawCrawlDetail } from './go-crawler-port.js';
import { normalizeGuide } from './guide-normalize.js';

const FIXED = new Date('2026-06-19T00:00:00Z');
const LONG = '第一天到达北京，入住酒店后去了天安门广场看升旗仪式，随后步行到王府井吃晚饭。'.repeat(8);

function detail(overrides: Partial<RawCrawlDetail> = {}): RawCrawlDetail {
  return {
    url: 'https://example.com/1',
    externalId: 'mg1',
    title: '北京超全攻略',
    content: LONG,
    author: '作者',
    views: 100,
    likes: 50,
    viewsRaw: '100',
    likesRaw: '50',
    coverImage: 'https://img/c.jpg',
    images: ['https://img/1.jpg'],
    publishedAt: '2023-08-12',
    ...overrides,
  } as RawCrawlDetail;
}

describe('normalizeGuide', () => {
  it('produces an accepted CanonicalGuide for a valid detail (golden, no IO)', () => {
    const result = normalizeGuide(detail(), 'https://example.com/1', { city: '北京', cityScoped: true, jobId: 5 }, null, () => FIXED);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') {
      return;
    }
    expect(result.guide.platform).toBe('mafengwo');
    expect(result.guide.externalId).toBe('mg1');
    expect(result.guide.values.viewCount).toBe(100);
    expect(result.guide.values.likeCount).toBe(50);
    expect(result.guide.destinationNames).toEqual(['北京']);
    expect(result.guide.values.crawledAt).toBe(FIXED);
    expect(result.audit.jobId).toBe(5);
    expect(result.audit.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns null counts + a warning when both parsed and raw fail (D4, never fake 0)', () => {
    const result = normalizeGuide(detail({ views: null, viewsRaw: '' }), 'https://example.com/1', undefined, null, () => FIXED);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') {
      return;
    }
    expect(result.guide.views).toBeNull();
    expect(result.warnings.some(w => w.includes('views'))).toBe(true);
  });

  it('rejects when enhanced validation fails, with audit for the rejected raw record (D6)', () => {
    const result = normalizeGuide(detail({ content: '太短' }), 'https://example.com/1', undefined, null, () => FIXED);

    expect(result.status).toBe('rejected');
    expect(result.audit.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('only attributes the request city when cityScoped is strictly true (D10)', () => {
    const notScoped = normalizeGuide(detail(), 'https://example.com/1', { city: '北京', cityScoped: false }, null, () => FIXED);
    expect(notScoped.status === 'accepted' && notScoped.guide.destinationNames).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/api test guide-normalize`
Expected: FAIL with "Cannot find module './guide-normalize.js'".

- [ ] **Step 3: Write the implementation**

`packages/api/src/services/guide-normalize.ts` — move all PURE slices from `guide-import.service.ts` (resolveCount 231-255, parsePublishedAt 257-281, resolveDestinationNames 283-296, asStringArray 298-303, sha256Hex 305-307, and the normalization body 457-610), injecting the clock:
```ts
import type { CompletenessLevel } from '@pathfinding/crawler-types';
import type { travelGuides, GuideDestination } from '@pathfinding/database';
import { createHash } from 'node:crypto';
import {
  calculateCompletenessLevel,
  calculateQualityScoreUnified,
  cleanContent,
  parseChineseNumber,
  validateGuideEnhanced,
} from '@pathfinding/crawler-types';
import { buildStructuredGuideContent } from './guide-content.js';
import type { RawCrawlDetail } from './go-crawler-port.js';

const UNTITLED = '未命名';
const NO_JOB_ID = 0;
const CHINESE_DATE_PATTERN = /(\d{4})[年.\-/](\d{1,2})[月.\-/](\d{1,2})/;

export type GuideWriteValues = Partial<typeof travelGuides.$inferInsert>;

export interface ImportContext {
  city?: string;
  cityScoped?: boolean;
  jobId?: number;
}

export interface StagingSupplement {
  destinationName?: string | null;
  tags?: unknown;
  // mafengwoGuides.commentsCount/savesCount are int notNull default 0 → number (matches $inferSelect).
  commentsCount?: number;
  savesCount?: number;
  publishedAt?: Date | null;
}

export interface RawCrawlAudit {
  jobId: number;
  rawData: Record<string, unknown>;
  contentHash: string;
}

export interface CanonicalGuide {
  platform: string;
  externalId?: string;
  values: GuideWriteValues;
  destinationNames: string[];
  views: number | null;
  likes: number | null;
  commentCount: number | null;
  cleanedContent: string;
  enrichedNew: Record<string, unknown>;
}

export type NormalizeResult
  = | { status: 'accepted'; guide: CanonicalGuide; warnings: string[]; audit: RawCrawlAudit }
    | { status: 'rejected'; reason: string; warnings: string[]; audit: RawCrawlAudit };

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function resolveCount(field: string, parsed: unknown, raw: string | undefined, warnings: string[]): number | null {
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const candidates = [typeof parsed === 'string' ? parsed : undefined, raw];
  for (const candidate of candidates) {
    if (candidate && candidate.trim() !== '') {
      const value = parseChineseNumber(candidate);
      if (value !== null) {
        return value;
      }
    }
  }
  warnings.push(
    `${field} 计数解析失败（parsed=${JSON.stringify(parsed ?? null)}, raw=${JSON.stringify(raw ?? null)}）：新建置 0，更新保留原值`,
  );
  return null;
}

function parsePublishedAt(raw: string | undefined, warnings: string[]): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const match = CHINESE_DATE_PATTERN.exec(trimmed);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  warnings.push(`publishedAt 解析失败：${trimmed}`);
  return null;
}

function resolveDestinationNames(context: ImportContext | undefined, stagingDestination: string | null | undefined): string[] {
  const names = new Set<string>();
  if (context?.cityScoped === true && context.city?.trim()) {
    names.add(context.city.trim());
  }
  if (stagingDestination?.trim()) {
    names.add(stagingDestination.trim());
  }
  return [...names];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Pure raw -> CanonicalGuide. `requestUrl` is the URL we asked Go to crawl (audit/dedup identity);
 *  inject `clock` for deterministic crawledAt/lastUpdatedAt. */
export function normalizeGuide(
  detail: RawCrawlDetail,
  requestUrl: string,
  context: ImportContext | undefined,
  staging: StagingSupplement | null,
  clock: () => Date = () => new Date(),
): NormalizeResult {
  const jobId = context?.jobId ?? NO_JOB_ID;
  const rawData: Record<string, unknown> = { platform: 'mafengwo', requestUrl, response: detail };
  const audit: RawCrawlAudit = { jobId, rawData, contentHash: sha256Hex(JSON.stringify(rawData)) };
  const warnings: string[] = [];

  if (detail.saveError) {
    warnings.push(`Go 暂存层保存失败：${detail.saveError}`);
  }

  const cleaning = cleanContent(detail.content ?? '');
  const cleanedContent = cleaning.content;
  const meaningfulRemovals = cleaning.removedTypes.filter(type => type !== 'whitespace');
  if (meaningfulRemovals.length > 0) {
    warnings.push(`清洗移除类目：${meaningfulRemovals.join(', ')}（${cleaning.originalLength}→${cleaning.cleanedLength} 字符）`);
  }

  const externalId = detail.externalId?.trim() || undefined;
  const destinationNames = resolveDestinationNames(context, staging?.destinationName);
  const tags = asStringArray(staging?.tags);
  const views = resolveCount('views', detail.views, detail.viewsRaw, warnings);
  const likes = resolveCount('likes', detail.likes, detail.likesRaw, warnings);
  const commentCount = staging?.commentsCount ?? null;
  const savesCount = staging?.savesCount ?? undefined;
  const publishedAt = staging?.publishedAt ?? parsePublishedAt(detail.publishedAt, warnings);

  const validation = validateGuideEnhanced({
    sourcePlatform: 'mafengwo',
    sourceExternalId: externalId,
    content: cleanedContent,
    destinations: destinationNames,
    title: detail.title,
    coverImageUrl: detail.coverImage,
    imageUrls: detail.images,
    authorName: detail.author,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
  });

  if (!validation.valid) {
    const reasons = validation.errors.map(issue => `${issue.field}: ${issue.message}`).join('; ');
    return { status: 'rejected', reason: `error 级校验拒绝：${reasons}`, warnings, audit };
  }

  for (const warning of validation.warnings) {
    warnings.push(`${warning.field}: ${warning.message}`);
  }

  const quality = calculateQualityScoreUnified({
    title: validation.normalizedData.title,
    content: cleanedContent,
    authorName: validation.normalizedData.authorName,
    images: validation.normalizedData.imageUrls,
    coverImage: validation.normalizedData.coverImageUrl,
    views: views ?? undefined,
    likes: likes ?? undefined,
    saves: savesCount,
    comments: commentCount ?? undefined,
    destinations: destinationNames,
    tags,
  });

  const contentTruncated = detail.contentTruncated === true || validation.normalizedData.contentTruncated === true;
  const completenessLevel: CompletenessLevel = calculateCompletenessLevel({
    title: validation.normalizedData.title,
    content: cleanedContent,
    coverImageUrl: validation.normalizedData.coverImageUrl,
    imageUrls: validation.normalizedData.imageUrls,
    authorName: validation.normalizedData.authorName,
    destinations: destinationNames,
    contentTruncated,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
    qualityScore: quality.score,
  });

  const enrichedNew: Record<string, unknown> = {
    ...buildStructuredGuideContent({
      title: detail.title,
      content: cleanedContent,
      contentHtml: detail.contentHtml,
      contentMarkdown: detail.contentMarkdown,
      imageUrls: validation.normalizedData.imageUrls,
    }),
    ingestWarnings: warnings,
  };

  const guide: CanonicalGuide = {
    platform: 'mafengwo',
    externalId,
    values: {
      title: validation.normalizedData.title ?? UNTITLED,
      content: cleanedContent,
      authorName: validation.normalizedData.authorName ?? null,
      sourceUrl: requestUrl,
      coverImageUrl: validation.normalizedData.coverImageUrl ?? null,
      imageUrls: validation.normalizedData.imageUrls ?? [],
      destinations: destinationNames.map(name => ({ name })) as GuideDestination[],
      tags,
      publishedAt,
      viewCount: views ?? 0,
      likeCount: likes ?? 0,
      commentCount: commentCount ?? 0,
      qualityScore: quality.score,
      completenessLevel,
      crawledAt: clock(),
      lastUpdatedAt: clock(),
    },
    destinationNames,
    views,
    likes,
    commentCount,
    cleanedContent,
    enrichedNew,
  };

  return { status: 'accepted', guide, warnings, audit };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/api test guide-normalize`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/guide-normalize.ts packages/api/src/services/guide-normalize.test.ts
git commit -m "feat(api): add pure normalizeGuide (raw -> CanonicalGuide)"
```

---

### Task 8: `guide-writer.ts` — the sole `travel_guides` writer

**Files:**
- Create: `packages/api/src/services/guide-writer.ts`
- Test: `packages/api/src/services/guide-writer.test.ts`

**Interfaces:**
- Consumes: `Database`, `travelGuides`, `guideDestinations`, `rawCrawlRecords` from `@pathfinding/database`; `and`, `eq` from `drizzle-orm`; `CanonicalGuide`, `NormalizeResult`, `GuideWriteValues`, `RawCrawlAudit` from `./guide-normalize.js`; `ParseStatus` from `@pathfinding/crawler-types`; `aiDayNumber`, `aiDaysToDayItineraries`, `isRecord`, `recordFromJson` from `@pathfinding/guide-shape`.
- Produces:
  - `type GuideRow = typeof travelGuides.$inferSelect`
  - `interface PersistResult { success: boolean; guideId?: number; action: 'inserted' | 'updated' | 'rejected'; message: string; warnings: string[] }`
  - `syncGuideDestinations(db, guideId, names): Promise<void>` (moved verbatim, kept exported for backfill)
  - `persistIngestedGuide(db, result: NormalizeResult): Promise<PersistResult>` (crawl path; owns findExisting + D7 + audit + D9)
  - `createUserGuide(db, input: UserGuideInsert): Promise<number>` (CRUD insert)
  - `updateUserGuide(db, id: number, patch: UserGuidePatch): Promise<void>` (CRUD update)
  - `applyPoiCoordinateFix(db, id, fix): Promise<'updated' | 'not-found'>` (coordinate edit; derives via guide-shape)
  - `applyGuideEnrichment(db, id, patch: GuideEnrichmentPatch): Promise<void>` (scripts: AI/content-html/cleanup)

- [ ] **Step 1: Write the failing test**

`packages/api/src/services/guide-writer.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  travelGuides: 'travel_guides',
  guideDestinations: 'guide_destinations',
  rawCrawlRecords: 'raw_crawl_records',
}));

import type { NormalizeResult } from './guide-normalize.js';
import { applyPoiCoordinateFix, createUserGuide, persistIngestedGuide, updateUserGuide } from './guide-writer.js';

interface CapturedWrite { table: unknown; values: Record<string, unknown> }

function createMockDb(state: { travelGuides?: Array<Record<string, unknown>>; guideDestinations?: Array<Record<string, unknown>> } = {}) {
  const inserts: CapturedWrite[] = [];
  const updates: CapturedWrite[] = [];
  function rowsFor(table: unknown) {
    if (table === 'travel_guides') return state.travelGuides ?? [];
    if (table === 'guide_destinations') return state.guideDestinations ?? [];
    return [];
  }
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const rows = rowsFor(table);
        const thenable = { limit: vi.fn().mockResolvedValue(rows), then: (r: (v: unknown) => unknown) => Promise.resolve(rows).then(r) };
        return { where: vi.fn(() => thenable), limit: vi.fn().mockResolvedValue(rows) };
      }),
    })),
    // values() returns a thenable array (awaited by persistIngestedGuide → insertResult[0].insertId)
    // that ALSO exposes $returningId() (used by createUserGuide → [{ id }]) so the one mock covers both writers.
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push({ table, values });
        return Object.assign(Promise.resolve([{ insertId: 999 }]), {
          $returningId: () => Promise.resolve([{ id: 999 }]),
        });
      }),
    })),
    update: vi.fn((table: unknown) => ({ set: vi.fn((values: Record<string, unknown>) => ({ where: vi.fn(async () => { updates.push({ table, values }); }) })) })),
  };
  return { db: db as never, inserts, updates };
}

function accepted(overrides: Record<string, unknown> = {}): NormalizeResult {
  return {
    status: 'accepted',
    warnings: [],
    audit: { jobId: 0, rawData: {}, contentHash: 'a'.repeat(64) },
    guide: {
      platform: 'mafengwo',
      externalId: 'mg1',
      values: { title: '北京', content: 'x'.repeat(600), viewCount: 1, likeCount: 1, commentCount: 0, crawledAt: new Date(), destinations: [{ name: '北京' }] },
      destinationNames: ['北京'],
      views: 1, likes: 1, commentCount: 0, cleanedContent: 'x'.repeat(600),
      enrichedNew: { contentHtml: '<p>x</p>' },
      ...overrides,
    },
  } as NormalizeResult;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('persistIngestedGuide', () => {
  it('inserts a new guide, mirrors destinations, and writes a success raw record', async () => {
    const mock = createMockDb({ travelGuides: [] });
    const result = await persistIngestedGuide(mock.db, accepted());

    expect(result.action).toBe('inserted');
    expect(result.guideId).toBe(999);
    expect(mock.inserts.some(w => w.table === 'travel_guides')).toBe(true);
    expect(mock.inserts.some(w => w.table === 'guide_destinations')).toBe(true);
    expect(mock.inserts.some(w => w.table === 'raw_crawl_records' && w.values.parseStatus === 'success')).toBe(true);
  });

  it('writes a rejected raw record and does not write travel_guides for a rejected result', async () => {
    const mock = createMockDb({ travelGuides: [] });
    const result = await persistIngestedGuide(mock.db, { status: 'rejected', reason: 'bad', warnings: [], audit: { jobId: 0, rawData: {}, contentHash: 'b'.repeat(64) } });

    expect(result.action).toBe('rejected');
    expect(mock.inserts.some(w => w.table === 'travel_guides')).toBe(false);
    expect(mock.inserts.some(w => w.table === 'raw_crawl_records' && w.values.parseStatus === 'rejected')).toBe(true);
  });

  it('on refresh keeps an existing count when the new count is null (D4)', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 1, platform: 'mafengwo', externalId: 'mg1', title: '北京', content: 'y'.repeat(600), viewCount: 42, enrichedData: {} }] });
    await persistIngestedGuide(mock.db, accepted({ views: null, values: { title: '北京', content: 'y'.repeat(500), crawledAt: new Date(), qualityScore: 0.5 } }));

    const update = mock.updates.find(w => w.table === 'travel_guides');
    expect(update?.values).not.toHaveProperty('viewCount');
  });
});

describe('createUserGuide / updateUserGuide', () => {
  it('createUserGuide inserts and returns the new id', async () => {
    const mock = createMockDb();
    const id = await createUserGuide(mock.db, { platform: 'manual', title: '我的攻略' });
    expect(id).toBe(999);
    expect(mock.inserts[0]?.table).toBe('travel_guides');
  });

  it('updateUserGuide writes only the provided fields', async () => {
    const mock = createMockDb();
    await updateUserGuide(mock.db, 3, { title: '改名' });
    expect(mock.updates[0]).toMatchObject({ table: 'travel_guides', values: { title: '改名' } });
  });
});

describe('applyPoiCoordinateFix', () => {
  it('mutates the aiDays POI, re-derives dayItineraries, and updates travel_guides', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 5, enrichedData: { aiDays: [{ day_number: 1, pois: [{ name: 'A', latitude: 0, longitude: 0 }] }] }, dayItineraries: [] }] });
    const outcome = await applyPoiCoordinateFix(mock.db, 5, { dayNumber: 1, poiIndex: 0, latitude: 39.9, longitude: 116.4 });

    expect(outcome).toBe('updated');
    const update = mock.updates.find(w => w.table === 'travel_guides');
    expect(update?.values).toHaveProperty('dayItineraries');
  });

  it('returns not-found when the day does not exist', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 5, enrichedData: { aiDays: [] }, dayItineraries: [] }] });
    expect(await applyPoiCoordinateFix(mock.db, 5, { dayNumber: 9, poiIndex: 0, latitude: 1, longitude: 1 })).toBe('not-found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pathfinding/api test guide-writer`
Expected: FAIL with "Cannot find module './guide-writer.js'".

- [ ] **Step 3: Write the implementation**

`packages/api/src/services/guide-writer.ts` — move the IMPURE writers from `guide-import.service.ts` (findExistingGuide 362-386, insertNewGuide 643-666, refreshExistingGuide 668-755, recordRawCrawl 309-328, syncGuideDestinations 330-357, mergeEnrichedData 388-403, isEmptyShell 405-407, CONTENT_DERIVED_KEYS 54-55), and add the CRUD/coordinate/enrichment operations. (Full module — pure D7 `computeRefreshUpdates` extracted; coordinate fix uses `aiDaysToDayItineraries`.)
```ts
import type { Database, GuideDestination } from '@pathfinding/database';
import type { ParseStatus } from '@pathfinding/crawler-types';
import { guideDestinations, rawCrawlRecords, travelGuides } from '@pathfinding/database';
import { aiDayNumber, aiDaysToDayItineraries, isRecord, recordFromJson } from '@pathfinding/guide-shape';
import { and, eq } from 'drizzle-orm';
import type { CanonicalGuide, GuideWriteValues, NormalizeResult, RawCrawlAudit } from './guide-normalize.js';

type GuideRow = typeof travelGuides.$inferSelect;
const UNTITLED = '未命名';
const CONTENT_DERIVED_KEYS = ['contentFormatVersion', 'contentHtml', 'contentMarkdown'];

export interface PersistResult {
  success: boolean;
  guideId?: number;
  action: 'inserted' | 'updated' | 'rejected';
  message: string;
  warnings: string[];
}

// ── D9 destination mirror (moved verbatim) ──────────────
export async function syncGuideDestinations(db: Database, guideId: number, destinationNames: string[]): Promise<void> {
  if (destinationNames.length === 0) {
    return;
  }
  const existingRows = await db
    .select({ destination: guideDestinations.destination })
    .from(guideDestinations)
    .where(eq(guideDestinations.guideId, guideId));
  const existingSet = new Set(existingRows.map(row => row.destination));
  const missing = destinationNames.filter(name => !existingSet.has(name));
  if (missing.length === 0) {
    return;
  }
  await db.insert(guideDestinations).values(missing.map(destination => ({ guideId, destination })));
}

// ── D6 audit ────────────────────────────────────────────
async function recordRawCrawl(db: Database, audit: RawCrawlAudit, parseStatus: ParseStatus, error: string | null, url: string): Promise<void> {
  await db.insert(rawCrawlRecords).values({
    jobId: audit.jobId,
    url,
    rawData: audit.rawData,
    contentHash: audit.contentHash,
    parseStatus,
    error,
  });
}

// ── D7 helpers (pure) ───────────────────────────────────
function mergeEnrichedData(existing: Record<string, unknown> | null, incoming: Record<string, unknown>, includeContentKeys: boolean): Record<string, unknown> {
  const next = includeContentKeys
    ? incoming
    : Object.fromEntries(Object.entries(incoming).filter(([key]) => !CONTENT_DERIVED_KEYS.includes(key)));
  return { ...(existing ?? {}), ...next };
}

function isEmptyShell(row: GuideRow): boolean {
  return (!row.content || row.content.trim() === '') && row.title === UNTITLED;
}

/** Pure (canonical, existing) -> sparse update map per D7. */
function computeRefreshUpdates(existing: GuideRow, guide: CanonicalGuide): GuideWriteValues {
  if (isEmptyShell(existing)) {
    return {
      ...guide.values,
      externalId: existing.externalId ?? guide.externalId ?? null,
      enrichedData: mergeEnrichedData(existing.enrichedData, guide.enrichedNew, true),
    };
  }
  const contentImproved = guide.cleanedContent.length > (existing.content?.length ?? 0);
  const updates: GuideWriteValues = {
    crawledAt: guide.values.crawledAt,
    lastUpdatedAt: guide.values.lastUpdatedAt,
    qualityScore: guide.values.qualityScore,
    completenessLevel: guide.values.completenessLevel,
    enrichedData: mergeEnrichedData(existing.enrichedData, guide.enrichedNew, contentImproved),
  };
  if (guide.views !== null) {
    updates.viewCount = guide.views;
  }
  if (guide.likes !== null) {
    updates.likeCount = guide.likes;
  }
  if (guide.commentCount !== null) {
    updates.commentCount = guide.commentCount;
  }
  if (contentImproved) {
    updates.content = guide.cleanedContent;
  }
  if (guide.values.coverImageUrl) {
    updates.coverImageUrl = guide.values.coverImageUrl;
  }
  if ((guide.values.imageUrls?.length ?? 0) > 0) {
    updates.imageUrls = guide.values.imageUrls;
  }
  if ((guide.values.tags?.length ?? 0) > 0) {
    updates.tags = guide.values.tags;
  }
  if (guide.values.publishedAt) {
    updates.publishedAt = guide.values.publishedAt;
  }
  if (guide.values.authorName) {
    updates.authorName = guide.values.authorName;
  }
  if (!existing.externalId && guide.externalId) {
    updates.externalId = guide.externalId;
  }
  const existingDestinations: GuideDestination[] = existing.destinations ?? [];
  const existingNames = new Set(existingDestinations.map(d => d.name));
  const newNames = guide.destinationNames.filter(name => !existingNames.has(name));
  if (newNames.length > 0) {
    updates.destinations = [...existingDestinations, ...newNames.map(name => ({ name }))];
  }
  return updates;
}

async function findExistingGuide(db: Database, platform: string, externalId: string | undefined, sourceUrl: string): Promise<GuideRow | null> {
  if (externalId) {
    const [byExternalId] = await db
      .select().from(travelGuides)
      .where(and(eq(travelGuides.platform, platform), eq(travelGuides.externalId, externalId)))
      .limit(1);
    if (byExternalId) {
      return byExternalId;
    }
  }
  const [byUrl] = await db.select().from(travelGuides).where(eq(travelGuides.sourceUrl, sourceUrl)).limit(1);
  return byUrl ?? null;
}

// ── Crawl writer (the D2 sole insert/refresh for crawl-origin) ──
export async function persistIngestedGuide(db: Database, result: NormalizeResult): Promise<PersistResult> {
  if (result.status === 'rejected') {
    await recordRawCrawl(db, result.audit, 'rejected', result.reason, String(result.audit.rawData.requestUrl ?? ''));
    return { success: false, action: 'rejected', message: `校验失败，拒绝入库：${result.reason}`, warnings: result.warnings };
  }
  const { guide, warnings, audit } = result;
  const url = guide.values.sourceUrl ?? String(audit.rawData.requestUrl ?? '');
  const existing = await findExistingGuide(db, guide.platform, guide.externalId, url);
  try {
    let outcome: PersistResult;
    if (existing) {
      await db.update(travelGuides).set(computeRefreshUpdates(existing, guide)).where(eq(travelGuides.id, existing.id));
      await syncGuideDestinations(db, existing.id, guide.destinationNames);
      outcome = { success: true, guideId: existing.id, action: 'updated', message: '游记已刷新', warnings };
    }
    else {
      const insertResult = await db.insert(travelGuides).values({
        platform: guide.platform,
        externalId: guide.externalId ?? null,
        ...guide.values,
        title: guide.values.title ?? UNTITLED,
        enrichedData: guide.enrichedNew,
      });
      const guideId = Number(insertResult[0].insertId);
      await syncGuideDestinations(db, guideId, guide.destinationNames);
      outcome = { success: true, guideId, action: 'inserted', message: '游记导入成功', warnings };
    }
    await recordRawCrawl(db, audit, 'success', null, url);
    return outcome;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRawCrawl(db, audit, 'failed', `入库失败：${message}`, url);
    throw error;
  }
}

// ── User CRUD writers ───────────────────────────────────
export type UserGuideInsert = typeof travelGuides.$inferInsert;
export type UserGuidePatch = Partial<typeof travelGuides.$inferInsert>;

export async function createUserGuide(db: Database, input: UserGuideInsert): Promise<number> {
  const [result] = await db.insert(travelGuides).values(input).$returningId();
  return result!.id;
}

export async function updateUserGuide(db: Database, id: number, patch: UserGuidePatch): Promise<void> {
  await db.update(travelGuides).set(patch).where(eq(travelGuides.id, id));
}

// ── Coordinate edit writer (derives via guide-shape) ────
export interface PoiCoordinateFix {
  dayNumber: number;
  poiIndex: number;
  latitude: number;
  longitude: number;
  verifiedBy?: string;
  verifiedAt?: number;
}

export async function applyPoiCoordinateFix(db: Database, id: number, fix: PoiCoordinateFix): Promise<'updated' | 'not-found'> {
  const [guide] = await db.select().from(travelGuides).where(eq(travelGuides.id, id)).limit(1);
  if (!guide) {
    return 'not-found';
  }
  const enrichedData = recordFromJson(guide.enrichedData);
  const aiDaysKey = Array.isArray(enrichedData.aiDays) ? 'aiDays' : Array.isArray(enrichedData.ai_days) ? 'ai_days' : null;

  if (aiDaysKey) {
    const aiDays = structuredClone(enrichedData[aiDaysKey] as unknown[]);
    const dayIndex = aiDays.findIndex(day => isRecord(day) && aiDayNumber(day) === fix.dayNumber);
    if (dayIndex === -1) {
      return 'not-found';
    }
    const day = aiDays[dayIndex] as Record<string, unknown>;
    const pois = Array.isArray(day.pois) ? [...day.pois] : [];
    const poi = pois[fix.poiIndex];
    if (!isRecord(poi)) {
      return 'not-found';
    }
    pois[fix.poiIndex] = {
      ...poi,
      latitude: fix.latitude,
      longitude: fix.longitude,
      geocodeConfidence: 1,
      geocodeSource: 'manual',
      isManuallyVerified: true,
      verifiedAt: fix.verifiedAt ?? 0,
      ...(fix.verifiedBy ? { verifiedBy: fix.verifiedBy } : {}),
    };
    aiDays[dayIndex] = { ...day, pois };
    await db.update(travelGuides).set({
      enrichedData: { ...enrichedData, [aiDaysKey]: aiDays },
      dayItineraries: aiDaysToDayItineraries(aiDays),
    }).where(eq(travelGuides.id, id));
    return 'updated';
  }

  const dayItineraries = Array.isArray(guide.dayItineraries) ? structuredClone(guide.dayItineraries) : [];
  const dayIndex = dayItineraries.findIndex(day => Number(day.day) === fix.dayNumber);
  if (dayIndex === -1) {
    return 'not-found';
  }
  const pois = Array.isArray(dayItineraries[dayIndex]?.pois) ? [...dayItineraries[dayIndex]!.pois] : [];
  if (!pois[fix.poiIndex]) {
    return 'not-found';
  }
  pois[fix.poiIndex] = { ...pois[fix.poiIndex], name: pois[fix.poiIndex]!.name, lat: fix.latitude, lng: fix.longitude };
  dayItineraries[dayIndex] = { ...dayItineraries[dayIndex], day: dayItineraries[dayIndex]!.day, pois };
  await db.update(travelGuides).set({ dayItineraries }).where(eq(travelGuides.id, id));
  return 'updated';
}

// ── Enrichment writer (scripts: AI / content-html / cleanup) ──
export interface GuideEnrichmentPatch {
  enrichedData?: Record<string, unknown>;
  dayItineraries?: GuideRow['dayItineraries'];
  content?: string;
  lastUpdatedAt?: Date;
}

export async function applyGuideEnrichment(db: Database, id: number, patch: GuideEnrichmentPatch): Promise<void> {
  await db.update(travelGuides).set(patch).where(eq(travelGuides.id, id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pathfinding/api test guide-writer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/guide-writer.ts packages/api/src/services/guide-writer.test.ts
git commit -m "feat(api): add guide-writer as the sole travel_guides writer"
```

---

### Task 9: Recompose `guide-import.service.ts` over the new seams

**Files:**
- Modify: `packages/api/src/services/guide-import.service.ts`
- Test: `packages/api/src/services/guide-import.service.test.ts` (rewrite the heaviest assertions)

**Interfaces:**
- Consumes: `createGoCrawlerPort`, `GoCrawlerPort` from `./go-crawler-port.js`; `normalizeGuide`, `ImportContext`, `StagingSupplement` from `./guide-normalize.js`; `persistIngestedGuide`, `syncGuideDestinations`, `PersistResult` from `./guide-writer.js`.
- Produces: unchanged public API — `discoverNewGuides`, `importGuide`, `batchImportGuides`, plus re-export `syncGuideDestinations` for backfill. `importGuide(platform, url, overrideConfig?, context?)` now: port.fetchDetail → staging lookup → normalizeGuide → persistIngestedGuide.

- [ ] **Step 1: Rewrite the affected tests first (red)**

In `guide-import.service.test.ts`, the existing fetch+db golden tests stay (they exercise the full composition end-to-end through the mocked `getDb` + injected `fetchImpl`). Add an assertion that a rejected validation writes a `raw_crawl_records` row with `parseStatus: 'rejected'` and NO `travel_guides` insert (this behaviour now lives in `guide-writer`, reached through `importGuide`). Drop any assertion that inspected the old private helpers (`insertNewGuide`/`refreshExistingGuide` names).

Run: `pnpm --filter @pathfinding/api test guide-import.service`
Expected: FAIL (composition not wired yet).

- [ ] **Step 2: Replace the body of `importMafengwoGuide` with the composition**

In `guide-import.service.ts`, delete the moved helpers (now in `guide-normalize.ts` / `guide-writer.ts`): `resolveCount`, `parsePublishedAt`, `CHINESE_DATE_PATTERN`, `resolveDestinationNames`, `asStringArray`, `sha256Hex`, `recordRawCrawl`, `RawCrawlInput`, `mergeEnrichedData`, `CONTENT_DERIVED_KEYS`, `isEmptyShell`, `findExistingGuide`, `insertNewGuide`, `refreshExistingGuide`, `PreparedGuide`, and the inline `MafengwoDetailData`/`MafengwoDetailResponse` (now `RawCrawlDetail`). Keep `discoverNewGuides`, `importGuide`, `batchImportGuides`, the staging read, and re-export `syncGuideDestinations`. New `importMafengwoGuide`:
```ts
async function importMafengwoGuide(
  url: string,
  port: GoCrawlerPort,
  context: ImportContext | undefined,
): Promise<ImportGuideResult> {
  const db = getDb();
  const fetched = await port.fetchDetail(url);
  if (!fetched.ok) {
    return { success: false, action: 'failed', message: fetched.error, warnings: [] };
  }

  const externalId = fetched.data.externalId?.trim() || undefined;
  let staging: StagingSupplement | null = null;
  if (externalId) {
    const [stagingRow] = await db.select().from(mafengwoGuides).where(eq(mafengwoGuides.guideId, externalId)).limit(1);
    staging = stagingRow
      ? {
          destinationName: stagingRow.destinationName,
          tags: stagingRow.tags,
          commentsCount: stagingRow.commentsCount,
          savesCount: stagingRow.savesCount,
          publishedAt: stagingRow.publishedAt,
        }
      : null;
  }

  const normalized = normalizeGuide(fetched.data, url, context, staging);
  const persisted = await persistIngestedGuide(db, normalized);
  return {
    success: persisted.success,
    guideId: persisted.guideId,
    action: persisted.action === 'rejected' ? 'rejected' : persisted.action,
    message: persisted.message,
    warnings: persisted.warnings,
  };
}
```
Update `importGuide`/`batchImportGuides` to build the port from `overrideConfig` via `createGoCrawlerPort(overrideConfig)` and pass it down (replacing the old `cfg` threading). Keep `ExecutorConfig`/`ImportContext` exports for back-compat — `ImportContext` now re-exported from `guide-normalize.ts`.

- [ ] **Step 3: Run the full api suite**

Run: `pnpm --filter @pathfinding/api test`
Expected: PASS. Fix any test still referencing removed private symbols by re-pointing to the public `importGuide` behaviour.

- [ ] **Step 4: Typecheck the workspace**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/guide-import.service.ts packages/api/src/services/guide-import.service.test.ts
git commit -m "refactor(api): recompose guide import over port/normalize/writer seams"
```

---

### Task 10: Fold user-CRUD writes (`guides.ts` POST + PATCH `/:id`)

**Files:**
- Modify: `packages/api/src/routes/guides.ts`
- Test: `packages/api/src/routes/guides.test.ts`

**Interfaces:**
- Consumes: `createUserGuide`, `updateUserGuide` from `../services/guide-writer.js`.
- Produces: POST `/` and PATCH `/:id` route through the writer; no direct `db.insert/update(travelGuides)` remains in these handlers.

- [ ] **Step 1: Update the route tests (red)**

In `guides.test.ts`, the POST/PATCH tests assert response shape (id on create, ok on update). They should remain behaviour-identical. Run them first to confirm the baseline, then refactor.

Run: `pnpm --filter @pathfinding/api test guides`
Expected: PASS (baseline).

- [ ] **Step 2: Replace the POST `/` insert (was `guides.ts:479`)**

```ts
app.post('/', authRequired(), zValidator('json', createGuideSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();
  const id = await createUserGuide(db, {
    platform: body.platform,
    title: body.title,
    content: body.content ?? null,
    authorName: body.authorName ?? null,
    sourceUrl: body.sourceUrl ?? null,
    destinations: body.destinations ?? null,
    tags: body.tags ?? null,
    category: body.category ?? null,
  });
  return jsonData(c, { id }, 201);
});
```

- [ ] **Step 3: Replace the PATCH `/:id` update (was `guides.ts:588`)**

```ts
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.category !== undefined) updates.category = body.category;
  if (body.destinations !== undefined) updates.destinations = body.destinations;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (Object.keys(updates).length === 0) {
    return c.json({ error: '没有需要更新的字段' }, 400);
  }
  await updateUserGuide(db, id, updates);
  return jsonOk(c);
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter @pathfinding/api test guides && pnpm --filter @pathfinding/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/guides.ts
git commit -m "refactor(api): route guide CRUD writes through guide-writer"
```

---

### Task 11: Fold coordinate-edit writes (`guides.ts` PATCH `/:id/poi-coordinates`)

**Files:**
- Modify: `packages/api/src/routes/guides.ts`
- Test: `packages/api/src/routes/guides.test.ts`

**Interfaces:**
- Consumes: `applyPoiCoordinateFix` from `../services/guide-writer.js`.
- Produces: the PATCH handler delegates both branches to the writer; no direct `db.update(travelGuides)` remains. Note `verifiedAt: Date.now()` moves into the route call (the writer takes an injected `verifiedAt`).

- [ ] **Step 1: Update the test (red)** — keep the existing poi-coordinates test; it asserts 200/404. Run baseline.

Run: `pnpm --filter @pathfinding/api test guides`
Expected: PASS (baseline).

- [ ] **Step 2: Replace the handler body (was `guides.ts:596-697`)**

```ts
app.patch('/:id/poi-coordinates', authRequired(), zValidator('json', updateGuidePoiCoordinatesSchema), async (c) => {
  const guideId = parsePositiveInt(c.req.param('id'));
  const body = c.req.valid('json');
  if (!guideId) {
    return c.json({ error: 'Invalid ID' }, 400);
  }
  const db = getDb();
  const outcome = await applyPoiCoordinateFix(db, guideId, {
    dayNumber: body.dayNumber,
    poiIndex: body.poiIndex,
    latitude: body.latitude,
    longitude: body.longitude,
    verifiedAt: Date.now(),
    ...(body.verifiedBy ? { verifiedBy: body.verifiedBy } : {}),
  });
  if (outcome === 'not-found') {
    return c.json({ error: '攻略或兴趣点不存在' }, 404);
  }
  return jsonOk(c);
});
```

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm --filter @pathfinding/api test guides && pnpm --filter @pathfinding/api typecheck`
Expected: PASS. (If the test distinguished 404 for "guide missing" vs "day missing", split the writer's `'not-found'` into `'guide-not-found' | 'day-not-found'` and map accordingly.)

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routes/guides.ts
git commit -m "refactor(api): route poi-coordinate edits through guide-writer"
```

---

### Task 12: Fold backfill-executor writes

**Files:**
- Modify: `packages/api/src/services/backfill-executor.service.ts`
- Test: `packages/api/src/services/backfill-executor.service.test.ts`

**Interfaces:**
- Consumes: `updateUserGuide` (for the sparse staging/refetch merges) and `syncGuideDestinations` from `../services/guide-writer.js` (the latter already re-exported via guide-import).
- Produces: `syncFromMafengwoGuide` and `fetchAndUpdateGuide` build their sparse `updates` map exactly as today (the field-merge logic is staging-specific, keep it) but perform the write via `updateUserGuide(db, guideId, updates)` instead of `db.update(travelGuides)`. Destination mirroring stays via `syncGuideDestinations`.

- [ ] **Step 1: Update tests (red)** — backfill-executor.service.test.ts mocks `batchImportGuides`; add/keep assertions that the writes go through `updateUserGuide`. Run baseline.

Run: `pnpm --filter @pathfinding/api test backfill-executor`
Expected: PASS (baseline).

- [ ] **Step 2: Replace the two write sites**

In `syncFromMafengwoGuide` (was `:140`):
```ts
  if (Object.keys(updates).length > 0) {
    await updateUserGuide(db, guideId, updates);
    return true;
  }
  return false;
```
In `fetchAndUpdateGuide` (was `:179`):
```ts
  if (Object.keys(updates).length > 0) {
    await updateUserGuide(db, guideId, updates);
    return true;
  }
  return false;
```
Add `import { syncGuideDestinations, updateUserGuide } from './guide-writer.js';` and drop the local `syncGuideDestinations` import from guide-import if it pointed elsewhere.

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm --filter @pathfinding/api test backfill-executor && pnpm --filter @pathfinding/api typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/backfill-executor.service.ts
git commit -m "refactor(api): route backfill writes through guide-writer"
```

---

### Task 13: Fold the hard violation — `scripts/crawl-mafengwo.ts`

**Files:**
- Modify: `scripts/crawl-mafengwo.ts`
- Test: none (scripts are not unit-tested); verify via typecheck + a dry-run guard.

**Interfaces:**
- Consumes: `createGoCrawlerPort` + `normalizeGuide` + `persistIngestedGuide` (or, minimally, `importGuide` from `guide-import.service.ts`).
- Produces: `saveToTiDB` no longer writes `travelGuides` directly; it routes through the validated ingest path so the script can no longer bypass validation/quality/raw-record.

- [ ] **Step 1: Replace `saveToTiDB` with a call into the ingest path**

The script currently builds `GuideDetail` and writes directly (was `:489`/`:498`, bypassing validation). Replace the whole `saveToTiDB` with a thin adapter that maps the script's `GuideDetail` to the Go-detail-shaped `RawCrawlDetail` and runs the canonical pipeline:
```ts
import { normalizeGuide } from '../packages/api/src/services/guide-normalize.js';
import { persistIngestedGuide } from '../packages/api/src/services/guide-writer.js';

async function saveToTiDB(db: ReturnType<typeof createDb>, externalId: string, sourceUrl: string, detail: GuideDetail): Promise<boolean> {
  try {
    const normalized = normalizeGuide(
      {
        url: sourceUrl,
        externalId,
        title: detail.title || externalId,
        content: detail.content,
        contentHtml: detail.contentHtml,
        author: detail.author ?? '',
        viewsRaw: detail.views,
        likesRaw: detail.likes,
        coverImage: detail.coverImage ?? '',
        images: collectGuideImages(detail),
      } as never,
      undefined,
      null,
    );
    const result = await persistIngestedGuide(db as never, normalized);
    return result.success;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  Save failed ${externalId}: ${message.slice(0, 80)}`);
    return false;
  }
}
```
Then delete the now-unused script-local `calculateQualityScore`, `cleanGuidePlainText`, `parseChineseNumber`, and `buildStructuredGuideContent` call (the canonical pipeline owns them).

**Do NOT remove the `travelGuides` import** — it is still used by four SELECT queries in this script (discovery/dedup at the old lines ~483, ~570, ~766, ~940). Only the `db.insert(travelGuides)` / `db.update(travelGuides)` write calls inside `saveToTiDB` are removed. Verify after editing:

Run: `rg -n 'travelGuides' scripts/crawl-mafengwo.ts`
Expected: the SELECT lines still match; no `insert(travelGuides)` / `update(travelGuides)` remain.

- [ ] **Step 2: Typecheck**

`scripts/` has no `project.json` and is NOT in the Nx `typecheck` graph, so `pnpm typecheck` does NOT cover it. Type-check the api packages (which the script now imports) and smoke-load the script under tsx:

Run: `pnpm --filter @pathfinding/api typecheck && npx tsx scripts/crawl-mafengwo.ts --help`
Expected: api typecheck PASS; the script loads (prints usage / exits) without an import or runtime resolution error. (`scripts/crawl-mafengwo.ts` already imports `../packages/api/src/services/*` under tsx, so `guide-normalize.js` / `guide-writer.js` resolve the same way.)

- [ ] **Step 3: Verify no direct travelGuides write remains in the script**

Run: `rg -n 'insert\(travelGuides\)|update\(travelGuides\)' scripts/crawl-mafengwo.ts`
Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add scripts/crawl-mafengwo.ts
git commit -m "refactor(scripts): route crawl-mafengwo through validated ingest (fix D2 hard violation)"
```

---

### Task 14: Fold the enrichment/cleanup scripts

**Files:**
- Modify: `scripts/batch-ai-process.ts`, `scripts/generate-content-html.ts`, `scripts/clean-historical-guides.ts`

**Interfaces:**
- Consumes: `applyGuideEnrichment` from `../packages/api/src/services/guide-writer.js`.
- Produces: all three scripts write via `applyGuideEnrichment` instead of `db.update(travelGuides)`.

- [ ] **Step 1: `scripts/batch-ai-process.ts` (was `:408`)**

```ts
    await applyGuideEnrichment(db as never, guide.id, {
      enrichedData,
      dayItineraries: geocodedDays ? aiDaysToDayItineraries(geocodedDays) : null,
      lastUpdatedAt: new Date(),
    });
```
(import `applyGuideEnrichment`; `aiDaysToDayItineraries` already imported in Task 4.)

- [ ] **Step 2: `scripts/generate-content-html.ts` (was `:140`)**

```ts
        await applyGuideEnrichment(db as never, guide.id, {
          enrichedData: { ...enrichedData, contentHtml },
        });
```

- [ ] **Step 3: `scripts/clean-historical-guides.ts` (was `:60`)**

```ts
        await applyGuideEnrichment(db as never, guide.id, { content: cleanResult.content });
```

- [ ] **Step 4: Typecheck + grep**

Run: `pnpm typecheck && rg -n 'update\(travelGuides\)|insert\(travelGuides\)' scripts/`
Expected: typecheck PASS; grep returns no matches.

- [ ] **Step 5: Commit**

```bash
git add scripts/batch-ai-process.ts scripts/generate-content-html.ts scripts/clean-historical-guides.ts
git commit -m "refactor(scripts): route guide enrichment writes through guide-writer"
```

---

### Task 15: Enforce D2 with a lint guard

**Files:**
- Modify: `eslint.config.mjs`
- Test: a deliberate violation must fail lint.

**Interfaces:**
- Consumes: nothing.
- Produces: an ESLint `no-restricted-syntax` rule banning `insert(travelGuides)` / `update(travelGuides)` everywhere except `packages/api/src/services/guide-writer.ts`.

- [ ] **Step 1: Add the rule to `eslint.config.mjs`**

`eslint.config.mjs` is `export default antfu({ ...options })`. `antfu()` returns a `FlatConfigComposer` (a thenable, not a plain array) — you CANNOT splice a config object into it or into the single options object. Pass the guard as antfu's SECOND argument (`antfu(options, ...userConfigs)`):

```js
export default antfu(
  {
    // ...existing options object, unchanged...
  },
  {
    files: ['packages/api/src/**/*.ts', 'scripts/**/*.ts'],
    ignores: ['packages/api/src/services/guide-writer.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name=/^(insert|update)$/][arguments.0.name='travelGuides']",
          message: 'travel_guides writes must go through guide-writer.ts (D2 single writer).',
        },
      ],
    },
  },
);
```

- [ ] **Step 2: Verify the guard fails on a violation**

Temporarily add `db.update(travelGuides)` to any file other than `guide-writer.ts`, then run:
Run: `pnpm lint`
Expected: FAIL with the D2 message. Remove the temporary line.

- [ ] **Step 3: Verify the clean tree passes**

Run: `pnpm lint`
Expected: PASS (only `guide-writer.ts` writes travelGuides).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): enforce guide-writer as the sole travel_guides writer (D2)"
```

---

### Task 16: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full quality gate**

Run: `pnpm check`
Expected: typecheck + lint + test all PASS.

- [ ] **Step 2: Confirm coverage threshold**

Run: `pnpm test:coverage`
Expected: ≥ 60% overall; `guide-shape`, `guide-normalize`, `guide-writer`, `go-crawler-port` each covered by their new tests.

- [ ] **Step 3: Final D2 audit**

Run: `rg -n 'insert\(travelGuides\)|update\(travelGuides\)' packages scripts | rg -v 'guide-writer.ts'`
Expected: no matches.

- [ ] **Step 4: Commit any coverage-config tweaks (if needed)**

```bash
git add -A
git commit -m "test: verify guide-ingest deepening end-to-end"
```

---

## Self-Review

**Spec coverage:** Q1 all-rows single writer → Tasks 8, 10–15 (every one of the 11 write sites folds into `guide-writer.ts`, lint-enforced). Q2 GoCrawlerPort + Zod → Tasks 5–6. Q3 converter-first → Phase 1 (Tasks 1–4) precedes the writer split. Q4 keep crawler-types primitives exported → `normalizeGuide` composes them (Task 7), none inlined. Invariant ownership: D2 by module boundary + lint (Task 15); D4/D5/D10 in `normalizeGuide` (`resolveCount`/score-order/`resolveDestinationNames`); D6/D7/D9 in `guide-writer`; D13 in `guide-shape`.

**Open risks for the implementer:**
1. **`raw_crawl_records.job_id` FK** (Tasks 7–8): admin/manual imports use `NO_JOB_ID = 0`. `job_id` is `notNull` and an FK; if TiDB enforces the constraint, inserting `0` (no matching `crawl_jobs` row) fails at runtime. Confirm the FK is unenforced (or seed a sentinel job) before relying on the manual-import path — faithful to the original, which has the same exposure.
2. **Script imports of `packages/api/src`**: scripts import `src` TS directly via tsx — already done for `guide-content` in `crawl-mafengwo.ts`, so `guide-normalize.js` / `guide-writer.js` resolve the same way. `scripts/` is outside the Nx typecheck graph, so verify scripts with `npx tsx <script> --help`, not `pnpm typecheck`.
3. **`createUserGuide` insert type**: `UserGuideInsert = $inferInsert` requires `platform`/`title`; the CRUD route already supplies both.
4. **404 granularity** (Task 11): if the existing test distinguishes guide-missing vs day-missing, split the writer return (`'guide-not-found' | 'day-not-found'`) as noted.
5. **Deferred — `/list` discovery dedup**: `discoverFromMafengwo` (guide-import) and `runDestinationFill` (backfill-executor) still each POST to `/api/crawler/mafengwo/list` with `mddId` (D10). The port intentionally exposes only `fetchDetail`; folding `/list` onto a `fetchList(city, { mddId })` is a separate follow-up, NOT in scope here.
