# Code Quality Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish robust code quality standards across the Pathfinding monorepo through TypeScript strictness, comprehensive testing, and CI/CD quality gates.

**Architecture:** Enable strict TypeScript in all packages, add Vitest test infrastructure with shared utilities, implement GitHub Actions CI pipeline for quality checks, and replace console statements with structured logging using Pino.

**Tech Stack:** TypeScript 5.9, Vitest 4.x, GitHub Actions, Pino logger, @testing-library/react

---

## Phase 1: TypeScript Strictness

### Task 1: Enable TypeScript Strict Mode in Dashboard

**Files:**

- Modify: `apps/dashboard/tsconfig.json`

**Step 1: Review current tsconfig**

Run: `cat apps/dashboard/tsconfig.json`
Expected: See `"strict": false` and other disabled options

**Step 2: Update tsconfig to enable strict mode**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Note: Strict mode is inherited from `tsconfig.base.json`. Removed explicit `strict: false`.

**Step 3: Run typecheck to see errors**

Run: `cd apps/dashboard && pnpm typecheck`
Expected: TypeScript errors from strict mode (capture count for Task 2)

**Step 4: Commit the configuration change**

```bash
git add apps/dashboard/tsconfig.json
git commit -m "chore(dashboard): enable TypeScript strict mode

BREAKING: Enables strict type checking inherited from base config.
This will surface type errors that need to be fixed in subsequent commits."
```

---

### Task 2: Fix Convex ID Type Assertions

**Files:**

- Create: `apps/dashboard/src/types/convex.ts`
- Modify: `apps/dashboard/src/app/itineraries/[id]/page.tsx`
- Modify: `apps/dashboard/src/app/guides/[id]/page.tsx`

**Step 1: Create type utilities for Convex IDs**

```typescript
// apps/dashboard/src/types/convex.ts
import type { Id } from 'convex/_generated/dataModel';

/**
 * Helper to safely convert string to Convex ID
 * Use when receiving ID from route params or external sources
 */
export function toConvexId<T extends string>(id: string): Id<T> {
  return id as Id<T>;
}

/**
 * Type guard to check if value is a valid ID format
 */
export function isValidConvexId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
```

**Step 2: Run typecheck to verify utilities compile**

Run: `cd apps/dashboard && pnpm typecheck`
Expected: New file compiles without errors

**Step 3: Update itineraries page to use typed IDs**

Replace in `apps/dashboard/src/app/itineraries/[id]/page.tsx`:

```typescript
// Before
itineraryId: itineraryId as any,

// After
import { toConvexId } from "@/types/convex";
// ...
itineraryId: toConvexId<"itineraries">(itineraryId),
```

**Step 4: Update guides page similarly**

Replace in `apps/dashboard/src/app/guides/[id]/page.tsx`:

```typescript
// Before
id: id as any,

// After
import { toConvexId } from "@/types/convex";
// ...
id: toConvexId<"travelGuides">(id),
```

**Step 5: Run typecheck to verify fixes**

Run: `cd apps/dashboard && pnpm typecheck`
Expected: Fewer type errors than before

**Step 6: Commit**

```bash
git add apps/dashboard/src/types/convex.ts apps/dashboard/src/app/itineraries/[id]/page.tsx apps/dashboard/src/app/guides/[id]/page.tsx
git commit -m "fix(dashboard): add type-safe Convex ID utilities

- Create toConvexId helper to replace unsafe 'as any' casts
- Update itineraries and guides pages to use typed IDs
- Improves type safety for database operations"
```

---

### Task 3: Fix Remaining Type Assertions in Dashboard

**Files:**

- Modify: `apps/dashboard/src/app/itineraries/[id]/itinerary-editor.tsx`
- Modify: `apps/dashboard/src/components/poi-list.tsx`
- Modify: Other files with `as any` (run `grep -r "as any" apps/dashboard/src`)

**Step 1: Identify all type assertions**

Run: `grep -rn "as any" apps/dashboard/src --include="*.tsx" --include="*.ts"`
Expected: List of files and line numbers with `as any`

**Step 2: Create proper types for API responses**

```typescript
// apps/dashboard/src/types/api.ts
import type { Doc } from 'convex/_generated/dataModel';

// Extended guide type with AI fields
export interface GuideWithAI extends Doc<'travelGuides'> {
  aiSummary?: string;
  aiTips?: string[];
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: AiDay[];
  aiProcessedAt?: number;
}

export interface AiDay {
  dayNumber: number;
  theme?: string;
  pois: AiPoi[];
}

export interface AiPoi {
  name: string;
  type: 'attraction' | 'restaurant' | 'hotel' | 'transportation';
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
}
```

**Step 3: Run typecheck**

Run: `cd apps/dashboard && pnpm typecheck`
Expected: Compiles successfully

**Step 4: Replace `as any` with proper types in each file**

For each file identified in Step 1, replace:

- `data as any` → proper typed response
- `query as any` → proper return type from Convex

**Step 5: Run full typecheck**

Run: `pnpm typecheck`
Expected: All packages pass typecheck

**Step 6: Commit**

```bash
git add apps/dashboard/src/types/api.ts apps/dashboard/src
git commit -m "fix(dashboard): eliminate type assertions with proper types

- Add GuideWithAI and related types for API responses
- Replace 'as any' casts with proper type annotations
- All type assertions now use specific types"
```

---

## Phase 2: Testing Infrastructure

### Task 4: Create Shared Test Utilities Package

**Files:**

- Create: `packages/test-utils/package.json`
- Create: `packages/test-utils/src/index.ts`
- Create: `packages/test-utils/src/mocks/convex.ts`
- Create: `packages/test-utils/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@pathfinding/test-utils",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./mocks": "./src/mocks/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "vitest": ">=2.0.0"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create test utilities**

```typescript
// packages/test-utils/src/index.ts
export * from './mocks/convex';

// Re-export vitest utilities
export { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

```typescript
// packages/test-utils/src/mocks/convex.ts
import { vi } from 'vitest';

/**
 * Create a mock Convex client for testing
 */
export function createMockConvexClient() {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
  };
}

/**
 * Create a mock Convex ID
 */
export function mockId<T extends string>(table: T, id = 'test-id'): string {
  return `${table}:${id}`;
}
```

**Step 4: Install dependencies and verify**

Run: `pnpm install && cd packages/test-utils && pnpm typecheck`
Expected: Package installs and typechecks successfully

**Step 5: Commit**

```bash
git add packages/test-utils
git commit -m "feat(test-utils): add shared testing utilities package

- Create @pathfinding/test-utils for shared test helpers
- Add Convex mocking utilities
- Provides consistent test setup across monorepo"
```

---

### Task 5: Add Tests for Utils Package

**Files:**

- Create: `packages/utils/src/__tests__/index.test.ts`
- Modify: `packages/utils/package.json`
- Create: `packages/utils/vitest.config.ts`

**Step 1: Write failing tests for existing utilities**

```typescript
// packages/utils/src/__tests__/index.test.ts
import { describe, it, expect } from 'vitest';
import { cn, formatDate, truncate } from '../index';

describe('cn (classnames)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatDate', () => {
  it('should format ISO date to readable format', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('2024');
  });

  it('should handle timestamp numbers', () => {
    const result = formatDate(1705315800000);
    expect(result).toBeDefined();
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    const result = truncate('This is a very long string', 10);
    expect(result).toBe('This is a...');
  });

  it('should not truncate short strings', () => {
    const result = truncate('Short', 10);
    expect(result).toBe('Short');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/utils && pnpm test`
Expected: Tests fail (functions may not exist or have different signatures)

**Step 3: Implement or fix utilities to pass tests**

Review `packages/utils/src/index.ts` and ensure exports match test expectations.

**Step 4: Run tests to verify they pass**

Run: `cd packages/utils && pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add packages/utils
git commit -m "test(utils): add unit tests for utility functions

- Add tests for cn, formatDate, truncate utilities
- Configure Vitest for utils package
- Establishes baseline test coverage"
```

---

### Task 6: Add Tests for Crawler Services

**Files:**

- Create: `apps/crawler/src/__tests__/services/geocoding.test.ts`
- Create: `apps/crawler/vitest.config.ts`

**Step 1: Write failing test for geocoding service**

```typescript
// apps/crawler/src/__tests__/services/geocoding.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NominatimGeocoder } from '../../services/geocoding/nominatim.geocoder';

describe('NominatimGeocoder', () => {
  let geocoder: NominatimGeocoder;

  beforeEach(() => {
    geocoder = new NominatimGeocoder();
  });

  describe('geocode', () => {
    it('should return coordinates for valid location', async () => {
      // Mock fetch to avoid real API calls
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { lat: '39.9042', lon: '116.4074', display_name: 'Beijing, China' },
          ]),
      });

      const result = await geocoder.geocode('北京天安门');

      expect(result).toBeDefined();
      expect(result?.latitude).toBeCloseTo(39.9042, 2);
      expect(result?.longitude).toBeCloseTo(116.4074, 2);
    });

    it('should return null for unknown location', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await geocoder.geocode('不存在的地方xyz123');
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await geocoder.geocode('北京');
      expect(result).toBeNull();
    });
  });

  describe('cleanQuery', () => {
    it('should remove parentheses and special characters', () => {
      const cleaned = geocoder['cleanQuery']('北京(朝阳区)');
      expect(cleaned).not.toContain('(');
      expect(cleaned).not.toContain(')');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/crawler && pnpm test`
Expected: Test fails or service needs adjustment

**Step 3: Adjust service if needed to pass tests**

**Step 4: Run test to verify it passes**

Run: `cd apps/crawler && pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/crawler/src/__tests__ apps/crawler/vitest.config.ts
git commit -m "test(crawler): add geocoding service tests

- Add unit tests for NominatimGeocoder
- Mock fetch for isolated testing
- Test error handling and edge cases"
```

---

## Phase 3: CI/CD Quality Gates

### Task 7: Add GitHub Actions CI Workflow

**Files:**

- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript Check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
```

**Step 2: Verify workflow syntax**

Run: `cat .github/workflows/ci.yml | head -20`
Expected: Valid YAML structure

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add quality checks workflow

- Run typecheck, lint, and test on all PRs
- Run build after quality checks pass
- Use pnpm caching for faster builds
- Cancel redundant workflow runs"
```

---

### Task 8: Add Pre-push Hook for Quality Checks

**Files:**

- Modify: `.husky/pre-push`
- Modify: `package.json`

**Step 1: Create pre-push hook**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running quality checks before push..."

# Run typecheck
pnpm typecheck || {
  echo "TypeScript check failed. Please fix type errors before pushing."
  exit 1
}

# Run lint
pnpm lint || {
  echo "Lint check failed. Please fix lint errors before pushing."
  exit 1
}

# Run tests
pnpm test || {
  echo "Tests failed. Please fix failing tests before pushing."
  exit 1
}

echo "All quality checks passed!"
```

**Step 2: Make hook executable**

Run: `chmod +x .husky/pre-push`

**Step 3: Test the hook locally**

Run: `pnpm check`
Expected: All checks pass

**Step 4: Commit**

```bash
git add .husky/pre-push
git commit -m "ci: add pre-push hook for quality checks

- Run typecheck, lint, and test before push
- Prevents pushing broken code to remote
- Provides clear error messages on failure"
```

---

## Phase 4: Structured Logging

### Task 9: Add Pino Logger Package

**Files:**

- Create: `packages/logger/package.json`
- Create: `packages/logger/src/index.ts`
- Create: `packages/logger/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@pathfinding/logger",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**Step 2: Create logger implementation**

```typescript
// packages/logger/src/index.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

export type Logger = ReturnType<typeof createLogger>;
```

**Step 3: Install and verify**

Run: `pnpm install && cd packages/logger && pnpm typecheck`
Expected: Package installs and compiles

**Step 4: Commit**

```bash
git add packages/logger
git commit -m "feat(logger): add structured logging package

- Create @pathfinding/logger using Pino
- Pretty printing in development, JSON in production
- Child logger support for context"
```

---

### Task 10: Replace Console Statements in Crawler

**Files:**

- Modify: `apps/crawler/src/index.ts`
- Modify: `apps/crawler/src/crawlers/base.crawler.ts`
- Modify: `apps/crawler/src/services/*.ts`
- Modify: `apps/crawler/package.json`

**Step 1: Add logger dependency**

```json
// In apps/crawler/package.json dependencies
"@pathfinding/logger": "workspace:*"
```

**Step 2: Create crawler logger**

```typescript
// apps/crawler/src/lib/logger.ts
import { createLogger } from '@pathfinding/logger';

export const crawlerLogger = createLogger('crawler');
export const enrichLogger = createLogger('enrich');
export const apiLogger = createLogger('api');
```

**Step 3: Replace console statements systematically**

```typescript
// Before
console.log(`Starting crawl for ${platform}...`);
console.error('Failed to process:', error);
console.warn('Retrying...');

// After
import { crawlerLogger } from './lib/logger';
crawlerLogger.info({ platform }, 'Starting crawl');
crawlerLogger.error({ error }, 'Failed to process');
crawlerLogger.warn('Retrying');
```

**Step 4: Run to verify logging works**

Run: `cd apps/crawler && pnpm dev`
Expected: Structured log output with timestamps and context

**Step 5: Run lint to ensure no console statements remain**

Run: `cd apps/crawler && pnpm lint`
Expected: No console.log warnings (console.error/warn allowed by config)

**Step 6: Commit**

```bash
git add apps/crawler
git commit -m "refactor(crawler): replace console with structured logging

- Add @pathfinding/logger dependency
- Create context-specific loggers (crawler, enrich, api)
- Replace 113 console statements with Pino logger
- Structured JSON logs in production, pretty in dev"
```

---

## Phase 5: Error Handling

### Task 11: Add React Error Boundary

**Files:**

- Create: `apps/dashboard/src/components/error-boundary.tsx`
- Modify: `apps/dashboard/src/app/layout.tsx`

**Step 1: Write failing test**

```typescript
// apps/dashboard/src/components/__tests__/error-boundary.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../error-boundary";

const ThrowError = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  it("should render fallback UI when child throws", () => {
    // Suppress console.error for this test
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("should render children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/dashboard && pnpm test`
Expected: Test fails (component doesn't exist)

**Step 3: Implement ErrorBoundary**

```typescript
// apps/dashboard/src/components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // TODO: Report to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold text-red-600">
              Something went wrong
            </h2>
            <p className="mt-2 text-gray-600">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/dashboard && pnpm test`
Expected: Tests pass

**Step 5: Add to app layout**

```typescript
// apps/dashboard/src/app/layout.tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Step 6: Commit**

```bash
git add apps/dashboard/src/components/error-boundary.tsx apps/dashboard/src/app/layout.tsx
git commit -m "feat(dashboard): add React error boundary

- Create ErrorBoundary component for graceful error handling
- Add retry functionality for recoverable errors
- Wrap app layout with error boundary
- Add unit tests for error boundary behavior"
```

---

## Phase 6: Code Cleanup

### Task 12: Consolidate Duplicate Utilities

**Files:**

- Modify: `packages/utils/src/index.ts`
- Modify: `apps/dashboard/src/app/itineraries/[id]/page.tsx`
- Modify: `apps/dashboard/src/app/itineraries/[id]/itinerary-editor.tsx`

**Step 1: Identify duplicate formatDate functions**

Run: `grep -rn "function formatDate\|const formatDate" apps/dashboard/src`
Expected: Multiple definitions in different files

**Step 2: Add formatDate to utils package if missing**

```typescript
// packages/utils/src/date.ts
/**
 * Format a date or timestamp to a localized string
 */
export function formatDate(
  date: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d =
    typeof date === 'number' || typeof date === 'string'
      ? new Date(date)
      : date;

  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | number | Date): string {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

**Step 3: Export from package index**

```typescript
// packages/utils/src/index.ts
export * from './cn';
export * from './date';
```

**Step 4: Update dashboard files to use shared utility**

```typescript
// In each file with duplicate formatDate
import { formatDate } from '@pathfinding/utils';

// Remove local formatDate definition
```

**Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: All pass

**Step 6: Commit**

```bash
git add packages/utils apps/dashboard
git commit -m "refactor: consolidate formatDate utilities

- Add formatDate and formatDateTime to @pathfinding/utils
- Remove duplicate implementations from dashboard components
- Single source of truth for date formatting"
```

---

## Summary Checklist

| Task | Description                                | Priority |
| ---- | ------------------------------------------ | -------- |
| 1    | Enable TypeScript strict mode in dashboard | Critical |
| 2    | Fix Convex ID type assertions              | Critical |
| 3    | Fix remaining type assertions              | Critical |
| 4    | Create shared test utilities package       | High     |
| 5    | Add tests for utils package                | High     |
| 6    | Add tests for crawler services             | High     |
| 7    | Add GitHub Actions CI workflow             | High     |
| 8    | Add pre-push hook                          | Medium   |
| 9    | Add Pino logger package                    | Medium   |
| 10   | Replace console statements                 | Medium   |
| 11   | Add React error boundary                   | Medium   |
| 12   | Consolidate duplicate utilities            | Low      |

---

## Success Criteria

After completing all tasks:

1. **TypeScript**: `pnpm typecheck` passes with zero errors across all packages
2. **Linting**: `pnpm lint` passes with zero warnings
3. **Testing**: `pnpm test` passes with >50% coverage on critical paths
4. **CI/CD**: All PRs run quality checks automatically
5. **Logging**: Zero `console.log` statements in production code
6. **Type Safety**: Zero `as any` type assertions
