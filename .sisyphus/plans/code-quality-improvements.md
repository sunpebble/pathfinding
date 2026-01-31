# Code Quality Improvements - Pathfinding Travel App

## TL;DR

> **Quick Summary**: Comprehensive code quality overhaul across 5 domains: eliminate `v.any()` in Convex schema (with backwards-compatible validators), improve React/Next.js patterns, enhance ESLint with stricter rules (remove Prettier), expand test coverage, and enforce TypeScript best practices.
>
> **Deliverables**:
>
> - Type-safe Convex schema with zero `v.any()` usage (backwards-compatible)
> - React components following Vercel best practices
> - Enhanced ESLint config with antfu's built-in formatting (Prettier removed)
> - 80%+ test coverage on packages, 70%+ on dashboard components
> - TypeScript strict mode compliance across all packages
>
> **Estimated Effort**: Large (40-60 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 10

---

## Context

### Original Request

Full implementation of code quality improvements across TypeScript/Type Safety, React/Next.js Patterns, Convex Best Practices, ESLint/Linting Rules, and Testing Coverage.

### User Decisions (Confirmed)

1. **Production data EXISTS** in `v.any()` fields → validators must be backwards-compatible
2. **Remove Prettier** → use antfu's built-in formatting
3. **Coverage targets**: 80% packages, 70% components → ACCEPTED
4. **Priority**: Type Safety (Convex schema) is MOST critical

### Research Findings

**Convex Schema Issues Found (11 occurrences of `v.any()`):**
| Line | Field | Table | Migration Risk |
|------|-------|-------|----------------|
| 584 | `changes` | editOperations | HIGH - complex nested data |
| 683 | `config` | crawlJobs | MEDIUM - JSON config objects |
| 688 | `statistics` | crawlJobs | LOW - metrics data |
| 703 | `rawData` | rawCrawlRecords | HIGH - arbitrary crawl data |
| 724 | `businessHours` | normalizedPois | LOW - reuse existing pattern |
| 874 | `generationParams` | trainingDatasets | MEDIUM - config objects |
| 877 | `statistics` | trainingDatasets | LOW - metrics data |
| 879 | `storagePaths` | trainingDatasets | LOW - path mappings |
| 893 | `metrics` | dataQualityReports | MEDIUM - quality metrics |
| 894 | `issues` | dataQualityReports | MEDIUM - issue arrays |
| 1155/1249 | `data` | notifications/scheduled | MEDIUM - notification payloads |

**Current ESLint Setup:**

- Uses `@antfu/eslint-config` with React + TypeScript
- Formatters disabled (using Prettier separately) → **WILL REMOVE PRETTIER**
- Missing stricter type-aware rules

**Testing Status:**

- Only 2 test files exist: `geoUtils.test.ts`, `dateUtils.test.ts`
- Vitest configured in `packages/utils` and `apps/dashboard`
- No coverage thresholds configured
- No Convex function tests, no React component tests

---

## Work Objectives

### Core Objective

Achieve production-grade code quality with type-safe Convex schema, comprehensive testing, and enforced linting standards while maintaining backwards compatibility with existing production data.

### Concrete Deliverables

- `packages/convex/src/validators/` - Typed validator library
- `convex/schema.ts` - Zero `v.any()` with backwards-compatible validators
- `eslint.config.mjs` - Enhanced with strict type rules, antfu formatting enabled
- `packages/*/vitest.config.ts` - Coverage thresholds configured
- `apps/dashboard/src/**/*.test.tsx` - Component tests
- `packages/**/*.test.ts` - Package unit tests

### Definition of Done

- [ ] `grep -c "v.any()" convex/schema.ts` returns `0`
- [ ] `pnpm typecheck` exits with code 0
- [ ] `pnpm lint` exits with code 0
- [ ] `pnpm test:coverage` shows ≥80% for packages, ≥70% for dashboard
- [ ] `pnpm build` exits with code 0
- [ ] Prettier removed from dependencies

### Must Have

- Backwards-compatible validators (no breaking changes to existing data)
- Type safety for all Convex schema fields
- ESLint strict type checking enabled
- Test coverage thresholds enforced

### Must NOT Have (Guardrails)

- Breaking changes to existing production data
- `v.optional(v.any())` as a workaround for type safety
- Prettier dependency (use antfu's formatting)
- Changes to business logic
- Flaky async tests

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Vitest in utils and dashboard)
- **User wants tests**: YES (coverage thresholds specified)
- **Framework**: Vitest

### TDD Approach

For new validators and utilities, follow RED-GREEN-REFACTOR:

1. Write failing test for validator behavior
2. Implement minimum validator to pass
3. Refactor while keeping green

### Coverage Thresholds

| Package              | Target |
| -------------------- | ------ |
| `packages/types`     | 80%    |
| `packages/utils`     | 80%    |
| `packages/constants` | 80%    |
| `packages/convex`    | 80%    |
| `apps/dashboard`     | 70%    |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - No dependencies):
├── Task 1: Create Convex typed validators library
├── Task 2: Enhance ESLint configuration (remove Prettier)
├── Task 4: Set up testing infrastructure
└── Task 6: Audit React/Next.js patterns

Wave 2 (After Wave 1):
├── Task 3: Fix Convex schema v.any() with backwards-compatible validators
├── Task 7: Apply ESLint fixes and React improvements
└── Task 8: Write unit tests for packages

Wave 3 (After Wave 2):
├── Task 5: Improve Convex function patterns
└── Task 9: Add React component tests

Wave 4 (After Wave 3):
└── Task 10: Final verification & documentation

Critical Path: Task 1 → Task 3 → Task 5 → Task 10
Estimated Parallel Speedup: ~55% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 3      | 2, 4, 6              |
| 2    | None       | 7      | 1, 4, 6              |
| 3    | 1          | 5      | 7, 8                 |
| 4    | None       | 8      | 1, 2, 6              |
| 5    | 3          | 10     | 9                    |
| 6    | None       | 7      | 1, 2, 4              |
| 7    | 2, 6       | 9      | 3, 8                 |
| 8    | 4          | 9      | 3, 7                 |
| 9    | 7, 8       | 10     | 5                    |
| 10   | 5, 9       | None   | None (final)         |

### Agent Dispatch Summary

| Wave | Tasks      | Agents                                                                 |
| ---- | ---------- | ---------------------------------------------------------------------- |
| 1    | 1, 2, 4, 6 | 4 parallel agents (executor-high, executor-low, executor-low, explore) |
| 2    | 3, 7, 8    | 3 parallel agents (executor-high, designer, executor)                  |
| 3    | 5, 9       | 2 parallel agents (executor-high, designer)                            |
| 4    | 10         | 1 agent (executor-low)                                                 |

---

## TODOs

### Task 1: Create Convex Typed Validators Library

**What to do**:

- Create `packages/convex/src/validators/` directory structure
- Define reusable typed validators for common patterns:
  - `editChangesValidator` - discriminated union based on operationType (create/update/delete/reorder)
  - `crawlConfigValidator` - geographic scope, categories, platform settings
  - `statisticsValidator` - generic metrics object with known fields
  - `notificationDataValidator` - deep link payloads per notification type
  - `rawDataValidator` - flexible but typed crawl data structure
- **CRITICAL**: All validators must use `v.union()` to accept both legacy and new formats
- Export all validators from `packages/convex/src/validators/index.ts`

**Must NOT do**:

- Don't modify schema.ts yet (that's Task 3)
- Don't create validators that reject existing production data
- Don't use overly strict validators that break backwards compatibility

**Backwards Compatibility Pattern**:

```typescript
// Example: Support both old any-shaped data and new typed format
export const editChangesValidator = v.union(
  // New typed format (preferred)
  v.object({
    type: v.literal('typed'),
    field: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
  }),
  // Legacy format (for existing data) - more permissive
  v.object({
    _legacyFormat: v.optional(v.literal(true)),
    // Allow additional unknown fields via v.any() wrapped in object
  })
);
```

**Recommended Agent Profile**:

- **Category**: `ultrabrain`
  - Reason: Complex type design requiring deep TypeScript expertise and understanding of backwards compatibility patterns
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: Core skill for creating type-safe validators with union types

**Skills Evaluated but Omitted**:

- `frontend-ui-ux`: Not relevant - backend type work
- `data-scientist`: Not data analysis work

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 4, 6)
- **Blocks**: Task 3
- **Blocked By**: None

**References**:

**Pattern References** (existing code to follow):

- `convex/schema.ts:271-296` - Existing `businessHours` validator pattern (well-typed object structure)
- `convex/schema.ts:54-61` - Existing `activityType` union pattern for discriminated unions
- `convex/schema.ts:648-655` - Existing `transportMode` union for simple literal unions

**API/Type References** (contracts to implement against):

- `convex/schema.ts:569-607` - `editOperations` table showing `changes` field context
- `convex/schema.ts:676-695` - `crawlJobs` table showing `config` and `statistics` field context
- `convex/schema.ts:1127-1169` - `notifications` table showing `data` field context

**Documentation References**:

- Convex validators docs: https://docs.convex.dev/database/types
- Convex union types: https://docs.convex.dev/database/types#unions

**WHY Each Reference Matters**:

- `businessHours` pattern shows how to create deeply nested optional object validators
- `activityType` shows discriminated union pattern for type-safe switching
- `editOperations` context needed to understand what shapes `changes` can take
- `notifications` context needed to understand notification payload variations

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify validators compile
cd packages/convex && pnpm tsc --noEmit
# Assert: Exit code 0, no type errors

# Verify validator exports exist
ls packages/convex/src/validators/index.ts
# Assert: File exists

# Verify no v.any() in validators
grep -c "v.any()" packages/convex/src/validators/*.ts || echo "0"
# Assert: Output is "0"
```

**Commit**: YES

- Message: `feat(convex): add typed validators library with backwards compatibility`
- Files: `packages/convex/src/validators/*.ts`
- Pre-commit: `cd packages/convex && pnpm tsc --noEmit`

---

### Task 2: Enhance ESLint Configuration & Remove Prettier

**What to do**:

- Enable antfu config's built-in formatting (remove `formatters: false`, `stylistic: false`)
- Remove Prettier from dependencies and configuration files
- Delete `.prettierrc`, `.prettierignore` if they exist
- Remove `format` and `format:check` scripts from package.json
- Update lint-staged to use ESLint for formatting
- Add stricter TypeScript rules:
  - Enable `@typescript-eslint/no-explicit-any` as error
  - Enable `@typescript-eslint/no-unsafe-assignment`
  - Enable `@typescript-eslint/no-unsafe-member-access`
  - Enable `@typescript-eslint/no-unsafe-call`
  - Enable `@typescript-eslint/no-unsafe-return`
- Add React-specific rules:
  - Enable `react/jsx-no-leaked-render`
  - Enable `react/no-unstable-nested-components`

**Must NOT do**:

- Don't run lint --fix yet (that's Task 7)
- Don't break existing CI pipeline
- Don't enable rules that cause 100s of errors initially (gradual adoption)

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Configuration file changes, well-documented patterns
- **Skills**: [`antfu`]
  - `antfu`: Knows @antfu/eslint-config best practices and formatting options

**Skills Evaluated but Omitted**:

- `typescript-programmer`: ESLint config isn't TypeScript coding
- `frontend-ui-ux`: Not UI work

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 4, 6)
- **Blocks**: Task 7
- **Blocked By**: None

**References**:

**Pattern References**:

- `/eslint.config.mjs:1-55` - Current root ESLint config to modify

**API/Type References**:

- `/package.json:69-80` - Current ESLint and Prettier dependencies
- `/package.json:40,44-45` - Format scripts to remove

**Documentation References**:

- @antfu/eslint-config docs: https://github.com/antfu/eslint-config
- @antfu/eslint-config formatting: https://github.com/antfu/eslint-config#formatters

**WHY Each Reference Matters**:

- `eslint.config.mjs` is the file to modify - understand current structure
- `package.json` shows what dependencies to remove and scripts to update
- antfu docs show correct configuration patterns

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify ESLint config is valid
npx eslint --print-config eslint.config.mjs > /dev/null 2>&1 && echo "valid" || echo "invalid"
# Assert: Output is "valid"

# Verify Prettier removed from package.json
grep -c '"prettier"' package.json || echo "0"
# Assert: Output is "0"

# Verify format scripts removed
grep -c '"format"' package.json || echo "0"
# Assert: Output is "0" or only contains format-related in other contexts
```

**Commit**: YES

- Message: `chore(lint): enhance ESLint with strict type rules, remove Prettier`
- Files: `eslint.config.mjs`, `package.json`, `.prettierrc` (deleted), `.prettierignore` (deleted)
- Pre-commit: `npx eslint --print-config eslint.config.mjs > /dev/null`

---

### Task 3: Fix Convex Schema v.any() with Backwards-Compatible Validators

**What to do**:

- Replace all 11 `v.any()` occurrences with typed validators from Task 1
- **CRITICAL MIGRATION STRATEGY**: Each validator MUST support existing data shapes
- Use `v.union()` pattern to accept both legacy and new formats:

| Field                          | Migration Approach                                                       |
| ------------------------------ | ------------------------------------------------------------------------ |
| `editOperations.changes`       | Union of typed change objects by operationType + legacy fallback         |
| `crawlJobs.config`             | Typed config object + `v.record(v.string(), v.any())` for unknown fields |
| `crawlJobs.statistics`         | Typed stats with optional fields for extensibility                       |
| `rawCrawlRecords.rawData`      | `v.union(v.string(), v.object({...known fields...}))`                    |
| `normalizedPois.businessHours` | Reuse existing `businessHours` pattern from `pois` table                 |
| `trainingDatasets.*`           | Typed objects with optional unknown field escape hatch                   |
| `dataQualityReports.*`         | Typed metrics and issues arrays                                          |
| `notifications.data`           | Discriminated union by notification type                                 |
| `scheduledNotifications.data`  | Same as notifications                                                    |

**Must NOT do**:

- Don't break existing data (validators must be backwards compatible)
- Don't use `v.optional(v.any())` as a workaround
- Don't remove fields that existing data uses
- Don't make required fields that were previously optional

**Migration Safety Pattern**:

```typescript
// For high-risk fields with unpredictable legacy data:
const safeValidator = v.union(
  typedValidator, // New typed format
  v.record(v.string(), v.any()) // Legacy fallback (last resort)
);
```

**Recommended Agent Profile**:

- **Category**: `ultrabrain`
  - Reason: Complex schema refactoring with production data migration considerations
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: Deep TypeScript for complex union types and migration patterns

**Skills Evaluated but Omitted**:

- `data-scientist`: Not data analysis
- `frontend-ui-ux`: Backend schema work

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2 (sequential dependency on Wave 1)
- **Blocks**: Task 5
- **Blocked By**: Task 1

**References**:

**Pattern References**:

- `packages/convex/src/validators/` - Validators created in Task 1
- `convex/schema.ts:271-296` - Existing businessHours pattern to reuse

**API/Type References**:

- `convex/schema.ts:584` - `changes: v.any()` in editOperations
- `convex/schema.ts:683` - `config: v.any()` in crawlJobs
- `convex/schema.ts:688` - `statistics: v.any()` in crawlJobs
- `convex/schema.ts:703` - `rawData: v.any()` in rawCrawlRecords
- `convex/schema.ts:724` - `businessHours: v.any()` in normalizedPois
- `convex/schema.ts:874,877,879` - Multiple `v.any()` in trainingDatasets
- `convex/schema.ts:893,894` - `metrics/issues: v.any()` in dataQualityReports
- `convex/schema.ts:1155` - `data: v.any()` in notifications
- `convex/schema.ts:1249` - `data: v.any()` in scheduledNotifications

**Documentation References**:

- Convex schema migration: https://docs.convex.dev/database/schemas
- Convex validators: https://docs.convex.dev/database/types

**WHY Each Reference Matters**:

- Each line number shows exact location of `v.any()` to replace
- Validators from Task 1 provide the replacement types
- businessHours pattern shows how to handle complex nested optional structures

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify no v.any() remains
grep -c "v.any()" convex/schema.ts
# Assert: Output is "0"

# Verify schema compiles
cd packages/convex && pnpm tsc --noEmit
# Assert: Exit code 0

# Verify Convex schema is valid
cd packages/convex && npx convex dev --once --typecheck
# Assert: Exit code 0, no schema errors
```

**Commit**: YES

- Message: `fix(convex): replace v.any() with backwards-compatible typed validators`
- Files: `convex/schema.ts`
- Pre-commit: `grep -c "v.any()" convex/schema.ts | grep -q "^0$"`

---

### Task 4: Set Up Testing Infrastructure

**What to do**:

- Add coverage thresholds to all vitest configs:
  - `packages/*`: 80% branches, 80% functions, 80% lines, 80% statements
  - `apps/dashboard`: 70% for all metrics
- Create `packages/convex/vitest.config.ts` for Convex function testing
- Add shared test utilities:
  - `packages/convex/src/__tests__/setup.ts` - Convex test setup
  - `apps/dashboard/src/__tests__/setup.ts` - React test setup with providers
- Configure test reporters for CI (json, html)
- Add `@testing-library/react` and `@testing-library/jest-dom` to dashboard
- Update root `package.json` test scripts:
  - `test:coverage` - run with coverage
  - `test:ci` - CI-optimized run

**Must NOT do**:

- Don't write actual tests yet (that's Tasks 8, 9)
- Don't add unnecessary testing libraries
- Don't configure complex mocking that isn't needed

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Configuration and setup work, well-documented patterns
- **Skills**: [`vitest`]
  - `vitest`: Vitest configuration expertise

**Skills Evaluated but Omitted**:

- `typescript-programmer`: Config files, not coding
- `frontend-ui-ux`: Not UI work

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 6)
- **Blocks**: Task 8
- **Blocked By**: None

**References**:

**Pattern References**:

- `packages/utils/vitest.config.ts` - Existing utils vitest config pattern
- `apps/dashboard/vitest.config.ts` - Existing dashboard vitest config pattern
- `packages/utils/src/geoUtils.test.ts` - Existing test file pattern

**API/Type References**:

- `/package.json:42-43` - Existing test scripts to extend

**Documentation References**:

- Vitest coverage: https://vitest.dev/guide/coverage
- Testing Library setup: https://testing-library.com/docs/react-testing-library/setup

**WHY Each Reference Matters**:

- Existing vitest configs show project conventions to follow
- Existing test files show naming and structure patterns
- Package.json shows where to add new scripts

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify vitest runs successfully
pnpm test
# Assert: Exit code 0, test runner initializes

# Verify coverage is configured in utils
grep -q "coverage" packages/utils/vitest.config.ts && echo "found" || echo "missing"
# Assert: Output is "found"

# Verify convex vitest config exists
test -f packages/convex/vitest.config.ts && echo "exists" || echo "missing"
# Assert: Output is "exists"

# Verify testing-library installed in dashboard
grep -q "@testing-library/react" apps/dashboard/package.json && echo "found" || echo "missing"
# Assert: Output is "found"
```

**Commit**: YES

- Message: `chore(test): configure test infrastructure with coverage thresholds`
- Files: `packages/*/vitest.config.ts`, `apps/dashboard/vitest.config.ts`, `apps/dashboard/package.json`, `package.json`
- Pre-commit: `pnpm test`

---

### Task 5: Improve Convex Function Patterns

**What to do**:

- Add proper input validation using the new typed validators
- Implement consistent error handling pattern:
  ```typescript
  // Standard error pattern
  if (!resource) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Resource not found' });
  }
  ```
- Add authentication checks where missing (use `ctx.auth.getUserIdentity()`)
- Use `ctx.db.get()` with explicit null checks consistently
- Add JSDoc comments for all public query/mutation functions
- Extract shared logic into `packages/convex/src/lib/` helper functions:
  - `requireAuth(ctx)` - throws if not authenticated
  - `requireOwnership(ctx, resource)` - checks ownership
  - `paginateQuery(query, opts)` - standard pagination

**Must NOT do**:

- Don't change business logic
- Don't modify HTTP action routes
- Don't add new features

**Recommended Agent Profile**:

- **Category**: `ultrabrain`
  - Reason: Requires deep understanding of Convex patterns and consistent refactoring
- **Skills**: [`typescript-programmer`]
  - `typescript-programmer`: TypeScript best practices for backend code

**Skills Evaluated but Omitted**:

- `frontend-ui-ux`: Backend work
- `data-scientist`: Not analytics

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (after schema is fixed)
- **Blocks**: Task 10
- **Blocked By**: Task 3

**References**:

**Pattern References**:

- `packages/convex/` - All Convex function files to improve
- `convex/schema.ts` - Updated schema with typed validators

**API/Type References**:

- `packages/convex/src/validators/` - Validators to use for input validation

**Documentation References**:

- Convex best practices: https://docs.convex.dev/production/best-practices
- Convex error handling: https://docs.convex.dev/functions/error-handling
- Convex authentication: https://docs.convex.dev/auth

**WHY Each Reference Matters**:

- Function files are what we're improving
- Validators from earlier tasks provide type-safe input validation
- Convex docs provide official patterns to follow

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify TypeScript compiles
cd packages/convex && pnpm tsc --noEmit
# Assert: Exit code 0

# Verify Convex functions are valid
cd packages/convex && npx convex dev --once --typecheck
# Assert: No errors

# Verify helper functions exist
test -f packages/convex/src/lib/auth.ts && echo "exists" || echo "missing"
# Assert: Output is "exists"
```

**Commit**: YES

- Message: `refactor(convex): improve function patterns with consistent error handling`
- Files: `packages/convex/**/*.ts`
- Pre-commit: `cd packages/convex && pnpm tsc --noEmit`

---

### Task 6: Audit React/Next.js Patterns

**What to do**:

- Create audit report at `.sisyphus/audit/react-patterns.md`
- Document findings in these categories:

**1. Data Fetching Patterns**:

- Find all `useQuery`, `useMutation` from Convex
- Check for proper loading/error state handling
- Identify any `fetch()` calls that should use Convex

**2. Component Anti-Patterns**:

- Barrel imports (`import { X, Y, Z } from '@/components'`) - list files
- Inline function definitions in JSX props
- Missing `key` props in lists
- Components defined inside other components

**3. Performance Issues**:

- Missing `useMemo`/`useCallback` for expensive operations
- Unnecessary re-renders from unstable references
- Large components that should be split

**4. Best Practice Gaps**:

- Missing Suspense boundaries for data loading
- Missing Error boundaries
- Direct DOM manipulation

**Must NOT do**:

- Don't fix issues yet (that's Task 7)
- Don't modify any files
- Don't run any write operations

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Read-only audit task, analysis only
- **Skills**: [`vercel-react-best-practices`]
  - `vercel-react-best-practices`: React optimization patterns knowledge

**Skills Evaluated but Omitted**:

- `frontend-ui-ux`: Audit, not design
- `typescript-programmer`: Pattern audit, not coding

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
- **Blocks**: Task 7
- **Blocked By**: None

**References**:

**Pattern References**:

- `apps/dashboard/src/` - Dashboard app source to audit
- `apps/dashboard/src/components/` - React components
- `apps/dashboard/src/app/` - Next.js app router pages

**Documentation References**:

- React best practices: https://react.dev/learn
- Next.js best practices: https://nextjs.org/docs/app/building-your-application

**WHY Each Reference Matters**:

- These are the directories to scan for patterns
- Official docs provide the standards to compare against

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Audit report created
test -f .sisyphus/audit/react-patterns.md && echo "exists" || echo "missing"
# Assert: Output is "exists"

# Report has content
wc -l < .sisyphus/audit/react-patterns.md
# Assert: Output is > 50 lines
```

**Commit**: NO (documentation/audit only, not committed)

---

### Task 7: Apply ESLint Fixes and React Improvements

**What to do**:

- Run `pnpm lint` (which runs `eslint --fix`) across the codebase
- Fix remaining lint errors manually, prioritizing:
  1. `@typescript-eslint/no-explicit-any` errors
  2. `@typescript-eslint/no-unsafe-*` errors
  3. React-specific errors
- Apply fixes from Task 6 audit:
  - Refactor barrel imports to direct imports
  - Extract inline functions to `useCallback` where needed
  - Add missing `key` props
  - Split large components
- Add Suspense boundaries around Convex queries
- Add Error boundaries for critical sections

**Must NOT do**:

- Don't change business logic
- Don't break existing functionality
- Don't fix issues that require extensive refactoring (document for later)

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
  - Reason: Frontend component refactoring requiring UI understanding
- **Skills**: [`vercel-react-best-practices`, `antfu`]
  - `vercel-react-best-practices`: React optimization patterns
  - `antfu`: ESLint fix patterns and formatting

**Skills Evaluated but Omitted**:

- `typescript-programmer`: Covered by React skill
- `data-scientist`: Not relevant

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 3, 8)
- **Blocks**: Task 9
- **Blocked By**: Task 2, Task 6

**References**:

**Pattern References**:

- `.sisyphus/audit/react-patterns.md` - Audit findings from Task 6
- `eslint.config.mjs` - Updated ESLint config from Task 2

**API/Type References**:

- `apps/dashboard/src/` - Dashboard source to fix

**Documentation References**:

- React Suspense: https://react.dev/reference/react/Suspense
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

**WHY Each Reference Matters**:

- Audit report tells us exactly what to fix
- ESLint config defines the rules we're enforcing
- React docs provide correct implementation patterns

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify lint passes
pnpm lint
# Assert: Exit code 0, no errors

# Verify build passes
pnpm build
# Assert: Exit code 0

# Verify typecheck passes
pnpm typecheck
# Assert: Exit code 0
```

**Commit**: YES

- Message: `fix(dashboard): apply ESLint fixes and React best practices`
- Files: `apps/dashboard/src/**/*.tsx`, `apps/dashboard/src/**/*.ts`
- Pre-commit: `pnpm lint && pnpm build`

---

### Task 8: Write Unit Tests for Packages

**What to do**:

- Add tests for `packages/types` - type guard functions, validators
- Add tests for `packages/utils` - remaining untested functions
- Add tests for `packages/constants` - export verification
- Add tests for `packages/convex/src/validators/` - validator behavior
- Add tests for `packages/convex/src/lib/` - helper functions
- Target: 80% coverage on all packages

**Test Categories**:

- **Validators**: Test accept/reject behavior, edge cases, backwards compatibility
- **Utilities**: Test pure functions with various inputs
- **Helpers**: Test error throwing, auth checks

**Must NOT do**:

- Don't test generated code (`_generated/`)
- Don't test third-party library internals
- Don't write integration tests (that's Task 9)

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Standard unit testing work
- **Skills**: [`vitest`, `typescript-programmer`]
  - `vitest`: Test writing patterns
  - `typescript-programmer`: TypeScript testing patterns

**Skills Evaluated but Omitted**:

- `frontend-ui-ux`: Not UI tests
- `data-scientist`: Not data analysis

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Task 3, 7)
- **Blocks**: Task 9
- **Blocked By**: Task 4

**References**:

**Pattern References**:

- `packages/utils/src/geoUtils.test.ts` - Existing test patterns
- `packages/utils/src/dateUtils.test.ts` - Existing test patterns

**API/Type References**:

- `packages/types/src/` - Types to test
- `packages/utils/src/` - Utils to test
- `packages/convex/src/validators/` - Validators to test

**Documentation References**:

- Vitest testing: https://vitest.dev/guide/
- Vitest mocking: https://vitest.dev/guide/mocking

**WHY Each Reference Matters**:

- Existing tests show project conventions
- Source files show what needs testing
- Vitest docs provide testing patterns

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify tests pass
pnpm test
# Assert: Exit code 0

# Verify coverage meets threshold
pnpm test:coverage 2>&1 | grep -E "(All files|packages)" | head -5
# Assert: Coverage >= 80% for packages
```

**Commit**: YES

- Message: `test(packages): add unit tests for shared packages`
- Files: `packages/**/*.test.ts`
- Pre-commit: `pnpm test`

---

### Task 9: Add React Component Tests

**What to do**:

- Add tests for critical dashboard components:
  - Layout components (header, sidebar, navigation)
  - Form components (validation, submission)
  - Data display components (tables, lists, cards)
- Test Convex integration with provider mocks:
  ```typescript
  import { ConvexProvider } from 'convex/react';
  import { mockConvexClient } from '../__tests__/mocks';
  ```
- Test user interaction flows (click, type, submit)
- Add snapshot tests for stable UI components
- Target: 70% coverage on dashboard components

**Must NOT do**:

- Don't test styling/CSS details
- Don't create flaky async tests
- Don't test implementation details

**Recommended Agent Profile**:

- **Category**: `visual-engineering`
  - Reason: Frontend testing with UI understanding
- **Skills**: [`vitest`, `vercel-react-best-practices`]
  - `vitest`: Test framework expertise
  - `vercel-react-best-practices`: React testing patterns

**Skills Evaluated but Omitted**:

- `typescript-programmer`: Covered by vitest skill
- `frontend-ui-ux`: Testing, not designing

**Parallelization**:

- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Task 5)
- **Blocks**: Task 10
- **Blocked By**: Task 7, Task 8

**References**:

**Pattern References**:

- `apps/dashboard/src/__tests__/setup.ts` - Test setup from Task 4
- `packages/utils/src/*.test.ts` - Test patterns from Task 8

**API/Type References**:

- `apps/dashboard/src/components/` - Components to test
- `apps/dashboard/vitest.config.ts` - Test config

**Documentation References**:

- Testing Library React: https://testing-library.com/docs/react-testing-library/intro
- Testing Library queries: https://testing-library.com/docs/queries/about

**WHY Each Reference Matters**:

- Test setup provides mocks and utilities
- Components are what we're testing
- Testing Library docs provide correct query patterns

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Verify component tests pass
cd apps/dashboard && pnpm test
# Assert: Exit code 0

# Verify coverage
cd apps/dashboard && pnpm test:coverage 2>&1 | grep "All files"
# Assert: Coverage >= 70%
```

**Commit**: YES

- Message: `test(dashboard): add React component tests`
- Files: `apps/dashboard/src/**/*.test.tsx`
- Pre-commit: `cd apps/dashboard && pnpm test`

---

### Task 10: Final Verification & Documentation

**What to do**:

- Run full CI pipeline locally and capture evidence:
  ```bash
  pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm build
  ```
- Verify all success criteria are met (see checklist below)
- Update `README.md`:
  - Add "Code Quality" section
  - Document new test commands
  - Document coverage thresholds
- Create `CONTRIBUTING.md`:
  - Code style guidelines (antfu ESLint config)
  - Testing requirements (coverage thresholds)
  - Commit message format (commitlint)
  - PR checklist

**Must NOT do**:

- Don't skip any verification steps
- Don't claim success without evidence
- Don't merge if any check fails

**Recommended Agent Profile**:

- **Category**: `quick`
  - Reason: Verification and documentation
- **Skills**: [`verification-before-completion`]
  - `verification-before-completion`: Ensures proper verification before claiming done

**Skills Evaluated but Omitted**:

- `typescript-programmer`: Documentation task
- `frontend-ui-ux`: Not UI work

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (final, after all other tasks)
- **Blocks**: None (terminal task)
- **Blocked By**: Task 5, Task 9

**References**:

**Pattern References**:

- `/README.md` - Existing README to update
- `/package.json` - Scripts to document

**Documentation References**:

- All completed task outputs

**WHY Each Reference Matters**:

- README shows current documentation structure
- Package.json shows available scripts
- Previous tasks provide content to document

**Acceptance Criteria**:

**Automated Verification:**

```bash
# Full verification pipeline
pnpm check
# Assert: Exit code 0 (runs typecheck + lint + test)

# Build verification
pnpm build
# Assert: Exit code 0

# Final v.any() check
grep -c "v.any()" convex/schema.ts
# Assert: Output is "0"

# Documentation exists
test -f CONTRIBUTING.md && echo "exists" || echo "missing"
# Assert: Output is "exists"
```

**Commit**: YES

- Message: `docs: add code quality documentation and contributing guidelines`
- Files: `README.md`, `CONTRIBUTING.md`
- Pre-commit: `pnpm check && pnpm build`

---

## Commit Strategy

| After Task | Message                                                                      | Files                                 | Verification              |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------- | ------------------------- |
| 1          | `feat(convex): add typed validators library with backwards compatibility`    | `packages/convex/src/validators/*.ts` | `pnpm tsc --noEmit`       |
| 2          | `chore(lint): enhance ESLint with strict type rules, remove Prettier`        | `eslint.config.mjs`, `package.json`   | `eslint --print-config`   |
| 3          | `fix(convex): replace v.any() with backwards-compatible typed validators`    | `convex/schema.ts`                    | `grep v.any()` returns 0  |
| 4          | `chore(test): configure test infrastructure with coverage thresholds`        | `**/vitest.config.ts`                 | `pnpm test`               |
| 5          | `refactor(convex): improve function patterns with consistent error handling` | `packages/convex/**/*.ts`             | `convex dev --once`       |
| 7          | `fix(dashboard): apply ESLint fixes and React best practices`                | `apps/dashboard/**/*.tsx`             | `pnpm lint && pnpm build` |
| 8          | `test(packages): add unit tests for shared packages`                         | `packages/**/*.test.ts`               | `pnpm test:coverage`      |
| 9          | `test(dashboard): add React component tests`                                 | `apps/dashboard/**/*.test.tsx`        | `pnpm test`               |
| 10         | `docs: add code quality documentation and contributing guidelines`           | `README.md`, `CONTRIBUTING.md`        | `pnpm check`              |

---

## Success Criteria

### Verification Commands

```bash
# TypeScript strict compliance
pnpm typecheck
# Expected: Exit 0, no errors

# ESLint passes with strict rules
pnpm lint
# Expected: Exit 0, no errors

# All tests pass with coverage
pnpm test:coverage
# Expected: Exit 0, packages >=80%, dashboard >=70%

# Build succeeds
pnpm build
# Expected: Exit 0

# No v.any() in schema
grep -c "v.any()" convex/schema.ts
# Expected: 0

# Prettier removed
grep -c '"prettier"' package.json
# Expected: 0
```

### Final Checklist

- [ ] Zero `v.any()` usage in Convex schema
- [ ] All validators backwards-compatible with existing data
- [ ] Prettier removed, using antfu's formatting
- [ ] All TypeScript strict mode errors resolved
- [ ] ESLint passes with stricter rules
- [ ] Test coverage >= 80% on packages
- [ ] Test coverage >= 70% on dashboard components
- [ ] Build passes for all apps
- [ ] Documentation updated (README, CONTRIBUTING)
