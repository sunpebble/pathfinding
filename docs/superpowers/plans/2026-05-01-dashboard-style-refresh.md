# Dashboard Style Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh all dashboard pages with the approved Explorer Polish visual direction.

**Architecture:** Add small shared dashboard presentational components and global design tokens, then apply them page-by-page without changing business logic. Keep existing API calls, query keys, and route structure intact.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript, lucide-react, existing dashboard UI primitives.

---

## File Structure

- Create: `apps/dashboard/src/components/ui/dashboard-primitives.tsx` — shared page header, cards, toolbar, table shell, loading, empty, icon tile, and metric card components.
- Modify: `apps/dashboard/src/app/globals.css` — add Explorer Polish dashboard variables and utility classes.
- Modify: `apps/dashboard/src/app/(dashboard)/layout.tsx` — apply polished shell background and responsive main spacing.
- Modify: `apps/dashboard/src/components/dashboard-shell.tsx` — keep legacy shell consistent with route layout.
- Modify: `apps/dashboard/src/components/sidebar.tsx` — improve dark stone navigation, active state, mobile panel, and brand block.
- Modify: `apps/dashboard/src/components/header.tsx` — improve header surface, status pill, refresh button accessibility, and mobile spacing.
- Modify: `apps/dashboard/src/app/(dashboard)/overview/page.tsx` — update stats and recent jobs to shared components.
- Modify: `apps/dashboard/src/app/(dashboard)/jobs/page.tsx` — update header actions, scheduler card, filters, and table shell.
- Modify: `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx` — update header, alerts, stats, and tables.
- Modify: `apps/dashboard/src/app/(dashboard)/pois/page.tsx` — update filters, cards, empty state, pagination.
- Modify: `apps/dashboard/src/app/(dashboard)/guides/page.tsx` — update filters, guide cards, loading/error/empty, pagination.
- Modify: `apps/dashboard/src/app/(dashboard)/datasets/page.tsx` — update header, filters, table, empty state, icon action.
- Modify: `apps/dashboard/src/app/(dashboard)/itineraries/page.tsx` — update header, search, cards, empty state, pagination.
- Modify: `apps/dashboard/src/app/(dashboard)/expenses/page.tsx` — update shared in-file section helpers, form shell, tabs, and empty states.
- Modify: `apps/dashboard/src/app/(dashboard)/chat/page.tsx` — align chat outer shell and suggestion cards with Explorer Polish.

## Task 1: Shared Dashboard Styling Foundation

**Files:**

- Modify: `apps/dashboard/src/app/globals.css`
- Create: `apps/dashboard/src/components/ui/dashboard-primitives.tsx`

- [ ] **Step 1: Add dashboard tokens and utilities**

Add Explorer Polish variables and reusable classes to `globals.css`:

```css
:root {
  --dashboard-bg: #f7f5f2;
  --dashboard-surface: rgba(255, 255, 255, 0.92);
  --dashboard-surface-strong: #ffffff;
  --dashboard-border: rgba(120, 113, 108, 0.18);
  --dashboard-muted: #78716c;
  --dashboard-heading: #1c1917;
  --dashboard-shadow: 0 18px 45px rgba(28, 25, 23, 0.08);
  --dashboard-shadow-sm: 0 10px 24px rgba(28, 25, 23, 0.06);
}

.dashboard-pattern {
  background:
    radial-gradient(circle at top left, rgba(5, 150, 105, 0.08), transparent 32rem),
    linear-gradient(135deg, rgba(255, 255, 255, 0.72), transparent 28rem),
    var(--dashboard-bg);
}

.dashboard-surface {
  background: var(--dashboard-surface);
  border: 1px solid var(--dashboard-border);
  box-shadow: var(--dashboard-shadow-sm);
}
```

- [ ] **Step 2: Create dashboard primitives**

Create `dashboard-primitives.tsx` exporting these components with `cn` support:

```tsx
export function DashboardPageHeader(props: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
})

export function DashboardCard(props: React.ComponentProps<'div'>)

export function DashboardToolbar(props: React.ComponentProps<'div'>)

export function DashboardTableShell(props: React.ComponentProps<'div'>)

export function DashboardEmptyState(props: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
})

export function DashboardLoadingState(props: { label?: string; className?: string })

export function MetricCard(props: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'stone';
  footer?: React.ReactNode;
  className?: string;
})
```

- [ ] **Step 3: Verify shared foundation**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds or reports only pre-existing unrelated errors.

## Task 2: Dashboard Chrome

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/layout.tsx`
- Modify: `apps/dashboard/src/components/dashboard-shell.tsx`
- Modify: `apps/dashboard/src/components/sidebar.tsx`
- Modify: `apps/dashboard/src/components/header.tsx`

- [ ] **Step 1: Update dashboard layout surfaces**

Use `dashboard-pattern` on the root shell and responsive padding on `main`:

```tsx
<div className="flex h-screen dashboard-pattern text-stone-900 dark:bg-stone-950">
  <Sidebar />
  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
    <Header />
    <main className="flex-1 overflow-y-auto px-4 py-5 pt-20 sm:px-6 lg:px-8 lg:pt-6">
      <div className="mx-auto w-full max-w-7xl">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </main>
  </div>
</div>
```

- [ ] **Step 2: Update sidebar visual states**

Keep existing navigation arrays. Change classes to a stone sidebar with emerald active state, rounded active pill, and better mobile backdrop.

- [ ] **Step 3: Update header**

Convert the service status to a pill, use emerald for connected state, and keep `aria-label` on refresh. If an icon-only button remains, wrap it in existing `Tooltip` components.

- [ ] **Step 4: Verify chrome**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds.

## Task 3: Data Management Pages

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/overview/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/jobs/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/jobs/backfill/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/datasets/page.tsx`

- [ ] **Step 1: Apply page headers and cards**

Replace repeated header markup with `DashboardPageHeader`, stat cards with `MetricCard`, and content panels with `DashboardCard` or `DashboardTableShell`.

- [ ] **Step 2: Align filters and tables**

Wrap filters in `DashboardToolbar`. Wrap tables in `DashboardTableShell` with `overflow-x-auto`, stone header rows, and emerald-compatible hover states.

- [ ] **Step 3: Preserve data behavior**

Do not change TanStack Query keys, API client calls, mutation handlers, confirmation behavior, pagination logic, or table columns.

- [ ] **Step 4: Verify data pages**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds.

## Task 4: Content And Travel Pages

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/pois/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/guides/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/itineraries/page.tsx`

- [ ] **Step 1: Apply shared headers and toolbar surfaces**

Use `DashboardPageHeader` and `DashboardToolbar` for page titles, counts, search inputs, and filters.

- [ ] **Step 2: Refresh cards and empty states**

Update POI, guide, and itinerary cards with `dashboard-surface`, softer borders, consistent image radii, emerald hover border, and `DashboardEmptyState` where no results exist.

- [ ] **Step 3: Preserve search and pagination behavior**

Do not change client-side filtering, pagination state, query parameters, or routing destinations.

- [ ] **Step 4: Verify content pages**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds.

## Task 5: Expenses And Chat Pages

**Files:**

- Modify: `apps/dashboard/src/app/(dashboard)/expenses/page.tsx`
- Modify: `apps/dashboard/src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Refresh expenses local helpers**

Update `Spinner`, `EmptyState`, and `SectionCard` to match `DashboardLoadingState`, `DashboardEmptyState`, and `DashboardCard` visual language while preserving their existing props.

- [ ] **Step 2: Refresh expenses shell**

Apply `DashboardPageHeader`, a card-like itinerary selector, softer tab styling, and consistent form controls. Do not rewrite mutation logic.

- [ ] **Step 3: Refresh chat surfaces**

Align chat header, message area background, input wrapper, and suggestion cards with Explorer Polish tokens while preserving `useChat` behavior.

- [ ] **Step 4: Verify expenses and chat**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds.

## Task 6: Final Verification

**Files:**

- No new files expected.

- [ ] **Step 1: Run dashboard typecheck**

Run: `pnpm --filter @pathfinding/dashboard typecheck`

Expected: TypeScript succeeds.

- [ ] **Step 2: Run dashboard tests**

Run: `pnpm --filter @pathfinding/dashboard test`

Expected: Vitest succeeds.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: ESLint succeeds or only reports pre-existing unrelated issues.

- [ ] **Step 4: Inspect diff**

Run: `git diff -- apps/dashboard docs/superpowers`

Expected: Diff contains styling/design-doc changes only and no API or business logic changes.

## Self-Review

- Spec coverage: The plan covers shared chrome, global styling, data pages, content pages, expenses, chat, accessibility, and verification.
- Placeholder scan: No placeholder tasks are intentionally left; all tasks name exact files and concrete verification commands.
- Type consistency: Shared component names are defined before use and match later task references.
- Commit policy: This plan intentionally omits commit steps because the user has not explicitly requested a commit in this session.
