# Architecture Optimization Design

**Date:** 2026-05-11
**Author:** Codex
**Status:** Approved

## Overview

Optimize the Pathfinding monorepo architecture across three related boundaries:

1. Dashboard-to-API proxy routes
2. Travel guide structured-content response contracts
3. Workspace package and build ownership

The current system works, but several responsibilities are duplicated across
Dashboard proxy handlers, Hono API routes, crawler scripts, and client-specific
DTOs. The goal is to make those boundaries explicit without rewriting the
product surface or changing storage behavior.

## Goals

- Make Dashboard API proxy handlers thin and consistent.
- Move business filtering, sorting, pagination, and validation toward
  `packages/api` instead of duplicating it in Next.js route handlers.
- Define a shared travel-guide response contract so Dashboard, API, crawler
  imports, and iOS agree on structured content fields.
- Clarify package ownership for crawler/script dependencies and Nx targets.
- Keep the first implementation phase focused on TypeScript code and tests.

## Non-Goals

- No database schema migration in the first phase.
- No redesign of Dashboard pages.
- No rewrite of the Go crawler service.
- No broad SwiftUI/iOS refactor.
- No replacement of the existing Hono API or Next.js app router.

## Current Problems

### Dashboard Proxy Boundary

Dashboard route handlers under `apps/dashboard/src/app/api/crawler/*` repeat:

- Bearer-token checks
- backend URL construction
- JSON request forwarding
- error parsing and status mapping
- response normalization
- pagination metadata construction

Some proxy routes also perform business logic such as quality filtering,
sorting, and slicing results after fetching from `packages/api`. That makes the
Dashboard proxy more than a transport layer and risks drift from the API.

### Guide Content Contract

Travel guide rich content is represented in several places:

- `packages/api/src/routes/guides.ts` maps DB rows into API responses.
- `apps/dashboard/src/lib/api/backend.ts` normalizes snake_case and camelCase
  response fields.
- `apps/dashboard/src/lib/api/crawler.ts` defines local Dashboard DTOs.
- `packages/crawler-types/src/travel-guide.ts` defines crawler-facing guide
  shapes.
- `apps/ios/Pathfinding/Pathfinding/Models/BlogPost.swift` decodes
  `content_html` and `content_markdown`.

The field names are compatible today, but the canonical contract is implicit.
Future content work can regress if one layer preserves structured content while
another silently falls back to plain text.

### Package Ownership

Root dependencies include crawler/script-specific packages such as `cheerio`
and `playwright`. The root package also documents that some dependencies likely
belong in narrower packages. This makes ownership unclear and increases the
effective dependency surface of unrelated apps and libraries.

## Chosen Approach

Use an incremental architecture consolidation. Each phase creates a stable
boundary, migrates current callers, and adds focused tests before moving to the
next phase.

This is preferred over a large cross-language rewrite because the repo already
has working Dashboard, Hono API, Go, scripts, and iOS clients. The useful
architecture change is to make contracts and responsibility boundaries explicit,
not to replace the stack.

## Phase 1: Dashboard Proxy Boundary

### Design

Add a small server-only helper module for Dashboard crawler proxy routes at:

`apps/dashboard/src/lib/api/proxy.ts`

The helper should own:

- extracting and requiring a bearer token when an endpoint is protected
- forwarding the `Authorization` header to `packages/api`
- forwarding JSON request bodies
- parsing empty and JSON responses
- mapping backend error payloads into `NextResponse.json(...)`
- applying consistent default error messages

Proxy route handlers should become declarations of:

- backend path
- HTTP method
- whether auth is required
- request body mapping if the external Dashboard shape differs from API shape
- response normalizer if required

### API Responsibility Shift

Move or expose the following behavior in `packages/api` where practical:

- guide `min_quality`
- guide sorting by `quality_score`
- guide pagination `limit` and `offset`

Dashboard can keep UI query naming compatibility, such as accepting
`platforms`, but it should translate to API parameters and let the API execute
data filtering.

### Route Targets

Initial migration targets:

- `apps/dashboard/src/app/api/crawler/guides/route.ts`
- `apps/dashboard/src/app/api/crawler/guides/[id]/route.ts`
- `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts`
- `apps/dashboard/src/app/api/crawler/crawl-jobs/[...slug]/route.ts`
- `apps/dashboard/src/app/api/crawler/backfill-*.ts` routes
- `apps/dashboard/src/app/api/crawler/discover-guides/route.ts`
- `apps/dashboard/src/app/api/crawler/import-guides/route.ts`

## Phase 2: Guide Response Contract

### Design

Add shared TypeScript DTOs for client-facing guide responses in
`@pathfinding/types`. That package is the canonical home because the response is
consumed by API and Dashboard, while `@pathfinding/crawler-types` should remain
focused on crawler extraction and normalization shapes.

The first pass should define:

```typescript
export interface TravelGuideContentDto {
  content?: string | null;
  content_html?: string | null;
  content_markdown?: string | null;
}

export interface TravelGuideResponseDto extends TravelGuideContentDto {
  id: string;
  title: string;
  source_platform: string;
  source_url?: string | null;
  author_name?: string | null;
  cover_image_url?: string | null;
  image_urls?: string[];
  quality_score: number;
  views_count: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  destinations?: string[];
  tags?: string[];
  created_at?: string | null;
  updated_at?: string | null;
  ai_summary?: string | null;
  ai_tips?: string[] | null;
  ai_best_time?: string | null;
  ai_duration?: string | null;
  ai_budget?: string | null;
  ai_days?: unknown[] | null;
}
```

Implementation may add optional compatibility fields if existing callers require
them, but the required response fields above remain stable. API responses use
snake_case externally and adapt from camelCase DB or enriched-data internals.

### Migration

- Make `packages/api/src/routes/guides.ts` return the shared response type.
- Make Dashboard guide DTOs import or extend the shared response type.
- Keep Dashboard runtime normalization for legacy responses only where tests
  prove it is still needed.
- Keep iOS decoding stable by preserving existing snake_case JSON keys.

## Phase 3: Workspace Ownership

### Design

Clean package ownership without disrupting runtime behavior:

- Keep framework-agnostic DTOs and utility contracts in shared packages.
- Keep Dashboard-only transport helpers inside `apps/dashboard`.
- Keep Hono API business logic inside `packages/api`.
- Move script-only runtime dependencies out of root when a narrower package or
  script package exists.

If there is no dedicated crawler script package yet, create a small
`packages/crawler-runtime` only if it materially improves ownership. Otherwise,
use package manager filtering and root scripts conservatively until a package
boundary is justified.

### Nx Targets

Ensure new or changed packages have:

- `typecheck`
- `test` when they contain testable logic
- `build` when consumed as built artifacts

Root `pnpm typecheck` and `pnpm test` should continue to exercise the migrated
TypeScript boundaries through Nx.

## Error Handling

Proxy helpers should preserve meaningful backend errors instead of collapsing
all failures into `Internal server error`.

Rules:

- 401 from missing Dashboard token remains `Unauthorized`.
- 400 validation errors from API remain 400.
- 404 resource misses remain 404.
- 5xx backend failures become a consistent Dashboard proxy error.
- Development mock fallback remains available only where the existing route
  already supports mock data and never in production.

## Testing Strategy

### Dashboard

- Extend `apps/dashboard/src/app/api/crawler/route-handlers.test.ts`.
- Add focused tests for the new proxy helper.
- Assert auth forwarding, missing auth behavior, backend error status mapping,
  and guide/crawl-job response normalization.

### API

- Extend `packages/api/src/routes/guides.test.ts`.
- Verify API-side guide filtering, sorting, and pagination.
- Verify `content_html` and `content_markdown` survive the response mapping.

### Shared Types

- Add type-level or unit tests only if runtime conversion helpers are introduced.
- Prefer compile-time usage from API and Dashboard over artificial tests for
  pure interfaces.

### Final Verification

Run the narrowest useful checks first:

- `pnpm --dir apps/dashboard test`
- `pnpm --filter @pathfinding/api test`
- `pnpm typecheck`

Then run broader checks when the local environment allows:

- `pnpm test`
- `pnpm lint`

## Rollout Plan

1. Introduce Dashboard proxy helper with tests.
2. Migrate one low-risk route, then migrate the rest of `/api/crawler/*`.
3. Move guide filtering and sorting into `packages/api`.
4. Introduce shared guide response DTOs and update API/Dashboard imports.
5. Review root dependency ownership and adjust package manifests only where the
   move is low-risk and supported by tests.
6. Run final verification and document any remaining follow-up work.

## Risks

- Some Dashboard tests may encode old proxy behavior and need updates to assert
  the new boundary instead of implementation details.
- Moving filtering to `packages/api` can change pagination semantics if the old
  Dashboard route fetched a limited page and filtered afterward. The API should
  define the correct semantics: filter first, then paginate.
- Shared DTO migration can expose existing field inconsistencies. Preserve JSON
  compatibility for Dashboard and iOS while tightening TypeScript types.

## Success Criteria

- Dashboard crawler proxy routes are mostly declarative and share one transport
  helper.
- API owns guide filtering, sorting, and pagination behavior.
- Guide structured-content fields have a shared TypeScript contract.
- Existing Dashboard guide pages and iOS guide decoding remain compatible.
- Root dependencies and Nx targets better reflect package ownership.
- Focused Dashboard and API tests pass, with broader repo checks attempted and
  reported.
