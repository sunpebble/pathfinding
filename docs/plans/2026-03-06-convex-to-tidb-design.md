# Convex to TiDB Full Migration Design

## Goal

Completely remove Convex from runtime usage across the project and make TiDB plus the self-hosted API the only production data path for frontend, auth, crawler integrations, and scripts.

## Current State

- `packages/database` and much of `packages/api` already use TiDB via Drizzle.
- `apps/dashboard` still depends on Convex for auth state, data reads, and mutations in itinerary and collaboration flows.
- Some dashboard route handlers and scripts still proxy to or call Convex directly.
- The repository is in a mixed state where TiDB is the emerging source of truth, but Convex remains required for important runtime paths.

## Chosen Approach

Use a big-bang replacement at the product boundary, but execute it with a strict internal order:

1. Fill missing TiDB-backed API capabilities.
2. Replace dashboard auth and data access in one coordinated switch.
3. Replace crawler proxies and scripts.
4. Remove all Convex runtime code, dependencies, env vars, and tests.

This avoids keeping a long-lived compatibility layer while still reducing implementation chaos.

## Target End State

- No runtime dependency on Convex in frontend, backend, scripts, or crawler integrations.
- `@pathfinding/database` + `packages/api` become the only application data backend.
- `apps/dashboard` uses React Query and typed fetch clients exclusively.
- Authentication uses the existing JWT-based API instead of Convex Auth.
- Repository no longer requires `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`.
- Convex-specific packages, generated client usage, and runtime folders are removed.

## Scope

### In Scope

- Dashboard auth pages, auth state, and user menu.
- Dashboard itinerary, POI, invite, and collaborator flows.
- Dashboard crawler API route handlers that still proxy to Convex.
- Scripts that still use `ConvexHttpClient`.
- Motia health/config references that still assume Convex.
- Final cleanup of Convex packages, environment variables, docs, and tests.

### Out of Scope

- Building a new long-term compatibility layer that mimics Convex.
- Introducing a brand-new session architecture unrelated to the existing JWT API.
- Preserving Google/Apple auth unless real server-side support exists during migration.

## Architecture

### Backend

- Keep TiDB as the only database backend, accessed through `@pathfinding/database`.
- Expand `packages/api` to fully cover dashboard runtime needs, especially itinerary collaboration and invitation flows.
- Keep JWT auth as the single auth mechanism.
- Standardize API response DTOs so frontend code no longer depends on Convex-shaped documents.

### Frontend

- Use React Query as the single client-side data fetching and mutation layer.
- Replace Convex providers with a single app provider stack based on `QueryClientProvider` and a custom `AuthProvider`.
- Centralize HTTP calls in typed API client modules under dashboard app utilities.
- Remove all Convex-specific types and document assumptions such as `_id`, `_creationTime`, and `Id<Table>`.

### Auth

- Sign-in and sign-up call the existing API auth endpoints.
- JWT token is stored and managed by dashboard auth state.
- Authenticated requests send `Authorization: Bearer <token>`.
- User bootstrap uses `/api/auth/me`.
- Sign-out becomes token clearing plus optional server-side signout notification.
- Social login UI is removed or disabled unless the backend support is implemented in the same migration.

## Module Breakdown

### 1. API Capability Completion

The first blocking task is filling backend gaps so the dashboard can stop using Convex immediately afterward.

Required additions include:

- itinerary collaborator list endpoint
- invite collaborator endpoint
- update collaborator role endpoint
- remove collaborator endpoint
- any missing itinerary item or day mutation needed by the editor
- any missing crawler endpoints still only available through Convex-backed handlers

### 2. Dashboard Auth Cutover

- Replace Convex auth hooks with a custom auth context.
- Update sign-in and sign-up pages to call self-hosted auth APIs.
- Update auth button and user bootstrap to use `/api/auth/me`.
- Remove `ConvexClientProvider` from the provider tree.

### 3. Dashboard Data Cutover

- Replace `useQuery(api.*)` and `useMutation(api.*)` with React Query usage.
- Replace Convex-shaped client models with API/TiDB DTOs.
- Update itinerary list and detail pages.
- Update itinerary editor and POI editor.
- Update invite dialog and collaborator panel.

### 4. Crawler and Script Cutover

- Replace dashboard route handlers under `apps/dashboard/src/app/api/crawler/**` with direct API-backed implementations.
- Replace script usage of `ConvexHttpClient` with TiDB-backed or API-backed code paths.
- Update Motia health checks and configuration docs to reflect TiDB/API dependencies.

### 5. Convex Removal

- Remove dashboard Convex provider and all imports from `convex/react` and `@convex-dev/auth/react`.
- Remove `@pathfinding/convex-client` runtime usage and package if no longer needed.
- Remove `convex/` runtime folder if no remaining supported use cases depend on it.
- Remove `CONVEX_URL` and `NEXT_PUBLIC_CONVEX_URL` from configs and docs.
- Remove Convex dependencies from package manifests.
- Rewrite tests and mocks to stop mocking Convex.

## Data Contract Rules

- Frontend must stop consuming Convex document fields directly.
- API DTOs should use one stable response shape per resource.
- Mapping from backend field names to frontend models should happen in the API client layer, not in page components.
- TiDB becomes the only source of truth after the migration; no dual-read or dual-write behavior remains.

## Error Handling

- Centralize fetch error normalization in the dashboard API client.
- Handle `401` by clearing auth state and redirecting to sign-in.
- Handle `403` as permission failures in-place.
- Keep field-level and mutation-level errors visible to users.
- Ensure scripts and crawler code log whether failure came from auth, API, DB, or validation.

## Testing Strategy

### Backend

- Add or update route tests for auth, itineraries, collaborators, and crawler endpoints.
- Verify JWT auth behavior for required and optional auth flows.

### Frontend

- Update provider and auth tests.
- Cover sign-in, sign-up, auth button, itinerary list/detail, itinerary editing, invite flow, and collaborator management.
- Replace all Convex mocks with API/auth mocks.

### End-to-End Verification

- Run the app without any Convex environment variables.
- Verify login, itinerary list/detail, editing, collaborator actions, crawler management, typecheck, tests, and build.

## Risk Management

- This is a big-bang feature cutover, but implementation should still be committed in logical slices.
- Do not keep runtime compatibility code just to reduce temporary breakage.
- Use Git commit boundaries as rollback points instead of keeping both stacks active.
- Do final verification in an environment where Convex variables are absent to ensure no hidden dependency remains.

## Success Criteria

- Dashboard runs and authenticates without Convex.
- Core flows work using TiDB-backed APIs only.
- Scripts and crawler integrations no longer call Convex.
- Repository search shows no runtime Convex dependency outside historical documentation if retained.
- Typecheck, tests, and build pass without Convex environment variables.
