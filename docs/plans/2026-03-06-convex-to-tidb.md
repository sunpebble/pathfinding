# Convex to TiDB Full Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all runtime Convex dependencies and make TiDB plus the self-hosted API the only backend used by dashboard, auth, crawler integrations, and scripts.

**Architecture:** Complete the missing TiDB-backed API surface first, then switch dashboard auth and data access to a typed fetch client built on React Query, then replace remaining crawler/script entry points, and finally delete Convex code and configuration. Do not keep a compatibility layer; use DTO normalization at the API client boundary and Git commit checkpoints for rollback.

**Tech Stack:** Next.js, React Query, Hono, Drizzle ORM, TiDB, Vitest, JWT auth

---

### Task 1: Add API test harness and collaborator route skeleton

**Files:**

- Modify: `packages/api/package.json`
- Modify: `packages/api/src/app.ts`
- Create: `packages/api/vitest.config.ts`
- Create: `packages/api/src/test/helpers.ts`
- Create: `packages/api/src/routes/auth.test.ts`
- Create: `packages/api/src/routes/itinerary-collaborators.test.ts`
- Create: `packages/api/src/routes/itineraries.test.ts`
- Create: `packages/api/src/routes/itinerary-collaborators.ts`

**Step 1: Write the failing tests**

Create route-level tests that assert:

```ts
it('returns 200 for GET /api/auth/me with valid bearer token', async () => {
  const app = createApp();
  const res = await app.request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
});

it('returns collaborator list for itinerary owner', async () => {
  const app = createApp();
  const res = await app.request('/api/itinerary-collaborators?itineraryId=1', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(res.status).toBe(200);
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/api exec vitest run packages/api/src/routes/auth.test.ts packages/api/src/routes/itinerary-collaborators.test.ts`

Expected: FAIL because test config, route mount, and collaborator route do not exist yet.

**Step 3: Add the minimal harness**

- Add a `test` script to `packages/api/package.json`.
- Add `packages/api/vitest.config.ts` with Node environment.
- Add `packages/api/src/test/helpers.ts` that builds auth tokens and test request helpers.
- Create `packages/api/src/routes/itinerary-collaborators.ts` with placeholder Hono routes for list/invite/update/remove.
- Mount the new route in `packages/api/src/app.ts` under `/api/itinerary-collaborators`.

Starter route shape:

```ts
const app = new Hono<{ Variables: AuthVariables }>();

app.get('/', authRequired(), async (c) => {
  return c.json({ data: [] });
});

export default app;
```

**Step 4: Run tests to verify the harness works**

Run: `pnpm --filter @pathfinding/api test`

Expected: Test runner starts, route tests now fail on assertions instead of missing infrastructure.

**Step 5: Commit**

```bash
git add packages/api/package.json packages/api/vitest.config.ts packages/api/src/app.ts packages/api/src/test/helpers.ts packages/api/src/routes/auth.test.ts packages/api/src/routes/itinerary-collaborators.test.ts packages/api/src/routes/itineraries.test.ts packages/api/src/routes/itinerary-collaborators.ts
git commit -m "test: add api migration harness"
```

### Task 2: Implement collaborator and missing itinerary mutation APIs

**Files:**

- Modify: `packages/api/src/routes/itineraries.ts`
- Modify: `packages/api/src/routes/itinerary-collaborators.ts`
- Modify: `packages/api/src/routes/itinerary-collaborators.test.ts`
- Modify: `packages/api/src/routes/itineraries.test.ts`
- Reference: `packages/database/src/schema/itineraries.ts`
- Reference: `packages/database/src/schema/auth.ts`

**Step 1: Write the failing tests**

Add failing cases for:

- invite collaborator by email or user id
- list collaborators with owner role included
- update collaborator role
- remove collaborator
- update itinerary item
- delete itinerary item
- reorder itinerary items
- delete itinerary day

Example:

```ts
it('updates an itinerary item note', async () => {
  const res = await app.request('/api/itineraries/1/days/2/items/3', {
    method: 'PATCH',
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ notes: 'Lunch stop' }),
  });
  expect(res.status).toBe(200);
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/api test`

Expected: FAIL with 404 or assertion failures for missing endpoints and incomplete behavior.

**Step 3: Write the minimal implementation**

- In `packages/api/src/routes/itinerary-collaborators.ts`, implement:
  - `GET /?itineraryId=`
  - `POST /invite`
  - `PATCH /:id`
  - `DELETE /:id`
- Resolve invite targets by numeric `userId` or matching `users.email`.
- Enforce owner-only collaborator management.
- In `packages/api/src/routes/itineraries.ts`, add:
  - `PATCH /:id/days/:dayId/items/:itemId`
  - `DELETE /:id/days/:dayId/items/:itemId`
  - `PATCH /:id/days/:dayId/items/reorder`
  - `DELETE /:id/days/:dayId`
- Return normalized DTOs with stable `id` fields and nested `days/items` arrays.

Minimal update pattern:

```ts
await db
  .update(itineraryItems)
  .set({ notes: body.notes, startTime: body.startTime, endTime: body.endTime })
  .where(eq(itineraryItems.id, itemId));
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/api test`

Expected: PASS for collaborator and itinerary mutation coverage.

**Step 5: Commit**

```bash
git add packages/api/src/routes/itineraries.ts packages/api/src/routes/itinerary-collaborators.ts packages/api/src/routes/itinerary-collaborators.test.ts packages/api/src/routes/itineraries.test.ts
git commit -m "feat: add tiDB itinerary collaboration api"
```

### Task 3: Create dashboard API client and auth provider

**Files:**

- Modify: `apps/dashboard/src/app/providers.tsx`
- Modify: `apps/dashboard/src/hooks/use-auth.ts`
- Modify: `apps/dashboard/next.config.ts`
- Create: `apps/dashboard/src/lib/api/client.ts`
- Create: `apps/dashboard/src/lib/api/auth.ts`
- Create: `apps/dashboard/src/lib/api/itineraries.ts`
- Create: `apps/dashboard/src/lib/api/pois.ts`
- Create: `apps/dashboard/src/lib/api/collaborators.ts`
- Create: `apps/dashboard/src/providers/auth-provider.tsx`
- Create: `apps/dashboard/src/types/api.ts`
- Delete: `apps/dashboard/src/providers/convex-provider.tsx`

**Step 1: Write the failing tests**

Create tests that assert:

- auth provider loads `me` with a stored token
- `useAuth()` exposes `user`, `isAuthenticated`, `signIn`, and `signOut`
- API client adds `Authorization` header when token exists

Example:

```tsx
it('loads current user from stored token', async () => {
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByText('user@example.com')).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/dashboard test -- auth-provider`

Expected: FAIL because provider and API client files do not exist.

**Step 3: Write the minimal implementation**

- Replace `ConvexClientProvider` usage in `apps/dashboard/src/app/providers.tsx` with `AuthProvider` plus `QueryClientProvider`.
- Implement `apps/dashboard/src/providers/auth-provider.tsx` that:
  - stores JWT in browser storage
  - fetches `/api/auth/me`
  - exposes `signIn`, `signUp`, `signOut`, and `refreshUser`
- Implement a shared fetch client in `apps/dashboard/src/lib/api/client.ts`.
- Rewrite `apps/dashboard/src/hooks/use-auth.ts` to read from the new auth context.
- Update `apps/dashboard/next.config.ts` to proxy a stable backend prefix instead of Convex URLs.

Auth context shape:

```ts
type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: PASS for new auth-provider coverage, existing failures remain limited to old Convex consumers.

**Step 5: Commit**

```bash
git add apps/dashboard/src/app/providers.tsx apps/dashboard/src/hooks/use-auth.ts apps/dashboard/next.config.ts apps/dashboard/src/lib/api/client.ts apps/dashboard/src/lib/api/auth.ts apps/dashboard/src/lib/api/itineraries.ts apps/dashboard/src/lib/api/pois.ts apps/dashboard/src/lib/api/collaborators.ts apps/dashboard/src/providers/auth-provider.tsx apps/dashboard/src/types/api.ts
git commit -m "feat: add dashboard api and auth foundation"
```

### Task 4: Replace dashboard sign-in, sign-up, and user menu

**Files:**

- Modify: `apps/dashboard/src/app/auth/signin/page.tsx`
- Modify: `apps/dashboard/src/app/auth/signup/page.tsx`
- Modify: `apps/dashboard/src/components/auth-button.tsx`
- Create: `apps/dashboard/src/app/auth/signin/page.test.tsx`
- Create: `apps/dashboard/src/app/auth/signup/page.test.tsx`
- Create: `apps/dashboard/src/components/auth-button.test.tsx`
- Modify: `apps/dashboard/src/test/setup.ts`

**Step 1: Write the failing tests**

Add tests for:

- email sign-in success and error state
- email sign-up validation and success state
- sign-out clears auth and redirects
- auth button shows Sign In when unauthenticated and user menu when authenticated

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/dashboard test -- auth-button`

Expected: FAIL because components still import Convex auth hooks.

**Step 3: Write the minimal implementation**

- Replace `useAuthActions()` calls with the new auth context methods.
- Remove Google/Apple buttons unless backend OAuth is added in the same change.
- Replace current user lookup via Convex with `useAuth().user`.
- Update `apps/dashboard/src/test/setup.ts` to mock the new auth provider and API helpers instead of Convex.

Minimal sign-in flow:

```ts
await signIn({ email, password });
router.push('/');
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: PASS for auth page and auth-button coverage.

**Step 5: Commit**

```bash
git add apps/dashboard/src/app/auth/signin/page.tsx apps/dashboard/src/app/auth/signup/page.tsx apps/dashboard/src/components/auth-button.tsx apps/dashboard/src/app/auth/signin/page.test.tsx apps/dashboard/src/app/auth/signup/page.test.tsx apps/dashboard/src/components/auth-button.test.tsx apps/dashboard/src/test/setup.ts
git commit -m "feat: migrate dashboard auth from convex"
```

### Task 5: Replace itinerary list and detail pages with React Query

**Files:**

- Modify: `apps/dashboard/src/app/itineraries/page.tsx`
- Modify: `apps/dashboard/src/app/itineraries/[id]/page.tsx`
- Modify: `apps/dashboard/src/lib/api/itineraries.ts`
- Create: `apps/dashboard/src/app/itineraries/page.test.tsx`
- Create: `apps/dashboard/src/app/itineraries/[id]/page.test.tsx`
- Reference: `packages/api/src/routes/itineraries.ts`

**Step 1: Write the failing tests**

Add tests that verify:

- list page fetches itineraries through the API client
- detail page renders days and items from API DTOs
- unauthenticated access redirects when required

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/dashboard test -- itineraries`

Expected: FAIL because pages still use `@pathfinding/convex-client` and `convex/react`.

**Step 3: Write the minimal implementation**

- Replace Convex hooks with `useQuery` from React Query.
- Normalize DTOs into page-friendly types with `id`, `createdAt`, `days`, and `items` fields.
- Remove `toConvexId` usage and any `_id` or `_creationTime` assumptions.

Query shape:

```ts
const itineraryQuery = useQuery({
  queryKey: ['itinerary', itineraryId],
  queryFn: () => getItinerary(itineraryId),
});
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: PASS for itinerary page coverage.

**Step 5: Commit**

```bash
git add apps/dashboard/src/app/itineraries/page.tsx apps/dashboard/src/app/itineraries/[id]/page.tsx apps/dashboard/src/lib/api/itineraries.ts apps/dashboard/src/app/itineraries/page.test.tsx apps/dashboard/src/app/itineraries/[id]/page.test.tsx
git commit -m "feat: migrate itinerary pages to tiDB api"
```

### Task 6: Replace itinerary editor, POI editor, invite dialog, and collaborator panel

**Files:**

- Modify: `apps/dashboard/src/components/itinerary-editor.tsx`
- Modify: `apps/dashboard/src/components/poi-editor.tsx`
- Modify: `apps/dashboard/src/components/invite-dialog.tsx`
- Modify: `apps/dashboard/src/components/collaborator-panel.tsx`
- Modify: `apps/dashboard/src/lib/api/itineraries.ts`
- Modify: `apps/dashboard/src/lib/api/pois.ts`
- Modify: `apps/dashboard/src/lib/api/collaborators.ts`
- Create: `apps/dashboard/src/components/itinerary-editor.test.tsx`
- Create: `apps/dashboard/src/components/invite-dialog.test.tsx`
- Create: `apps/dashboard/src/components/collaborator-panel.test.tsx`

**Step 1: Write the failing tests**

Cover:

- add POI to day
- update item fields
- reorder items
- remove item
- invite collaborator
- change collaborator role
- remove collaborator

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/dashboard test -- itinerary-editor`

Expected: FAIL because components still depend on Convex mutations and IDs.

**Step 3: Write the minimal implementation**

- Swap each Convex mutation for React Query mutations backed by the new API clients.
- Convert all IDs to plain strings/numbers accepted by the TiDB API.
- Use `queryClient.invalidateQueries()` after successful mutations.
- Update UI state so optimistic assumptions do not require realtime subscriptions.

Mutation shape:

```ts
const updateItemMutation = useMutation({
  mutationFn: updateItineraryItem,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] }),
});
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: PASS for editor and collaborator UI coverage.

**Step 5: Commit**

```bash
git add apps/dashboard/src/components/itinerary-editor.tsx apps/dashboard/src/components/poi-editor.tsx apps/dashboard/src/components/invite-dialog.tsx apps/dashboard/src/components/collaborator-panel.tsx apps/dashboard/src/lib/api/itineraries.ts apps/dashboard/src/lib/api/pois.ts apps/dashboard/src/lib/api/collaborators.ts apps/dashboard/src/components/itinerary-editor.test.tsx apps/dashboard/src/components/invite-dialog.test.tsx apps/dashboard/src/components/collaborator-panel.test.tsx
git commit -m "feat: migrate itinerary editing and collaboration"
```

### Task 7: Replace crawler proxy routes and remaining scripts

**Files:**

- Modify: `apps/dashboard/src/app/api/crawler/guides/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/guides/[id]/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts`
- Modify: `apps/dashboard/src/app/api/crawler/crawl-jobs/[...slug]/route.ts`
- Modify: `apps/dashboard/src/lib/api.ts`
- Modify: `scripts/clean-historical-guides.ts`
- Modify: `scripts/generate-content-html.ts`
- Modify: `apps/motia/src/api/health.step.ts`
- Modify: `apps/motia/README.md`
- Create: `apps/dashboard/src/app/api/crawler/route-handlers.test.ts`

**Step 1: Write the failing tests**

Add tests that assert crawler routes proxy to the self-hosted API without reading `CONVEX_URL` and return normalized JSON responses.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pathfinding/dashboard test -- crawler`

Expected: FAIL because route handlers still instantiate `ConvexHttpClient`.

**Step 3: Write the minimal implementation**

- Replace Convex proxy handlers with `fetch()` calls to the backend service.
- Update `apps/dashboard/src/lib/api.ts` to use the same shared client conventions if retained.
- Rewrite the two root scripts to use TiDB/API access instead of `ConvexHttpClient`.
- Update Motia health checks and docs to reflect API/TiDB readiness instead of Convex readiness.

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: PASS for crawler route coverage and no runtime `CONVEX_URL` dependency in those paths.

**Step 5: Commit**

```bash
git add apps/dashboard/src/app/api/crawler/guides/route.ts apps/dashboard/src/app/api/crawler/guides/[id]/route.ts apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts apps/dashboard/src/app/api/crawler/crawl-jobs/[...slug]/route.ts apps/dashboard/src/lib/api.ts scripts/clean-historical-guides.ts scripts/generate-content-html.ts apps/motia/src/api/health.step.ts apps/motia/README.md apps/dashboard/src/app/api/crawler/route-handlers.test.ts
git commit -m "refactor: remove convex crawler integrations"
```

### Task 8: Remove Convex packages, mocks, configs, and dead code

**Files:**

- Modify: `apps/dashboard/package.json`
- Modify: `package.json`
- Modify: `apps/dashboard/src/test/setup.ts`
- Modify: `apps/dashboard/src/types/convex.ts`
- Delete: `packages/convex-client/package.json`
- Delete: `packages/convex-client/src/index.ts`
- Delete: `packages/convex-client/src/validators/businessHours.ts`
- Delete: `packages/convex-client/src/validators/completenessLevel.ts`
- Delete: `packages/convex-client/src/validators/crawlJobs.ts`
- Delete: `packages/convex-client/src/validators/dataQualityReports.ts`
- Delete: `packages/convex-client/src/validators/editOperations.ts`
- Delete: `packages/convex-client/src/validators/index.ts`
- Delete: `packages/convex-client/src/validators/notifications.ts`
- Delete: `packages/convex-client/src/validators/rawCrawlRecords.ts`
- Delete: `packages/convex-client/src/validators/trainingDatasets.ts`
- Delete: `packages/convex-client/src/validators/travelStats.ts`
- Delete: `convex/crawlJobs.ts`
- Delete: `convex/dataQualityReports.ts`
- Delete: `convex/flights.ts`
- Delete: `convex/hotelBookings.ts`
- Delete: `convex/http.ts`
- Delete: `convex/itineraryItems.ts`
- Delete: `convex/itineraryTemplates.ts`
- Delete: `convex/luggage.ts`
- Delete: `convex/mafengwo.ts`
- Delete: `convex/packingLists.ts`
- Delete: `convex/rawCrawlRecords.ts`
- Delete: `convex/travelGuides.ts`
- Delete: `convex/travelNotes.ts`
- Delete: `convex/travelPartners.ts`
- Delete: `convex/wifiReviews.ts`

**Step 1: Write the failing verification checks**

Add a final grep-based verification checklist to ensure no runtime Convex usage remains:

```bash
rg "convex/react|@convex-dev/auth/react|@pathfinding/convex-client|CONVEX_URL|NEXT_PUBLIC_CONVEX_URL|ConvexHttpClient" apps packages scripts
```

Expected before cleanup: matches found.

**Step 2: Run the verification to confirm cleanup is still needed**

Run: `rg "convex/react|@convex-dev/auth/react|@pathfinding/convex-client|CONVEX_URL|NEXT_PUBLIC_CONVEX_URL|ConvexHttpClient" apps packages scripts`

Expected: FAILing verification with remaining matches.

**Step 3: Write the minimal implementation**

- Remove Convex dependencies from package manifests.
- Remove dead types and mocks.
- Delete `packages/convex-client` and `convex/` once no imports remain.
- Update any remaining docs/config references.

**Step 4: Run full verification**

Run these commands in order:

1. `rg "convex/react|@convex-dev/auth/react|@pathfinding/convex-client|CONVEX_URL|NEXT_PUBLIC_CONVEX_URL|ConvexHttpClient" apps packages scripts`
2. `pnpm --filter @pathfinding/api test`
3. `pnpm --filter @pathfinding/dashboard test`
4. `pnpm typecheck`
5. `pnpm build`

Expected:

- `rg` returns no runtime matches
- tests pass
- typecheck passes
- build passes without Convex environment variables

**Step 5: Commit**

```bash
git add apps/dashboard/package.json package.json apps/dashboard/src/test/setup.ts apps/dashboard/src/types/convex.ts
git add -A packages/convex-client convex
git commit -m "refactor: remove convex runtime from pathfinding"
```
