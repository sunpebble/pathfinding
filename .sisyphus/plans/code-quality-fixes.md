# Code Quality Fixes - ESLint & TypeScript Errors

## TL;DR

> **Quick Summary**: Fix all code quality issues in the TypeScript monorepo - 4 ESLint errors, 9 TypeScript errors, and 79 ESLint warnings across multiple files.
>
> **Deliverables**:
>
> - Zero ESLint errors (currently 4)
> - Zero TypeScript errors (currently 9)
> - Zero ESLint warnings (currently 79)
>
> **Estimated Effort**: Medium (2-3 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (ESLint errors) → Task 6 (Verification)

---

## Context

### Original Request

Fix all code quality issues in the TypeScript monorepo:

- 4 ESLint errors (MUST FIX)
- 9 TypeScript errors (MUST FIX)
- 79 ESLint warnings (SHOULD FIX)

### Interview Summary

**Key Discussions**:

- Logger package at `packages/logger` exports `createLogger(context)` for proper logging
- CLI tools (login-helper.ts, verify-mafengwo.ts) intentionally use console for user output
- Convex import paths need correction to use `@pathfinding/convex` directly
- React array index keys need stable unique identifiers

**Research Findings**:

- `packages/logger` uses pino with pino-pretty for development
- Convex package re-exports from `convex/_generated/api.js` and `convex/_generated/dataModel.js`
- TS2742 errors occur because TypeScript can't infer return types through `internalMutation` wrapper

---

## Work Objectives

### Core Objective

Eliminate all ESLint errors, TypeScript errors, and ESLint warnings to achieve a clean codebase.

### Concrete Deliverables

- `apps/ai-service/src/routes/transport.ts` - Fixed ESLint errors
- `convex/*.ts` - Fixed TypeScript errors and console warnings
- `apps/dashboard/src/app/api/crawler/**/*.ts` - Fixed import errors
- `apps/ai-service/src/*.ts` - Fixed console warnings (CLI tools)
- `apps/dashboard/src/**/*.tsx` - Fixed React warnings

### Definition of Done

- [ ] `pnpm lint` returns 0 errors and 0 warnings
- [ ] `pnpm typecheck` returns 0 errors
- [ ] All changes are minimal and targeted

### Must Have

- Fix all 4 ESLint errors
- Fix all 9 TypeScript errors
- Fix all 79 ESLint warnings

### Must NOT Have (Guardrails)

- No functional changes to business logic
- No refactoring beyond what's needed for the fix
- No new dependencies added
- No changes to files not listed in the issues
- No removal of intentional console output in CLI tools (use eslint-disable instead)

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (pnpm lint, pnpm typecheck)
- **User wants tests**: Automated verification only
- **Framework**: ESLint + TypeScript compiler

### Automated Verification

Each task includes verification via:

```bash
# For ESLint
pnpm lint 2>&1 | grep -E "(error|warning)" | wc -l

# For TypeScript
pnpm typecheck 2>&1 | grep "error TS" | wc -l
```

---

## Task Dependency Graph

| Task   | Depends On       | Reason                                                  |
| ------ | ---------------- | ------------------------------------------------------- |
| Task 1 | None             | ESLint errors in transport.ts - independent             |
| Task 2 | None             | TypeScript errors in Convex files - independent         |
| Task 3 | None             | TypeScript errors in Dashboard API routes - independent |
| Task 4 | None             | Console warnings in CLI tools - independent             |
| Task 5 | None             | Console warnings in Convex files - independent          |
| Task 6 | None             | React warnings in Dashboard components - independent    |
| Task 7 | 1, 2, 3, 4, 5, 6 | Final verification - depends on all fixes               |

---

## Parallel Execution Graph

```
Wave 1 (Start immediately - ALL independent):
├── Task 1: Fix ESLint errors in transport.ts (no dependencies)
├── Task 2: Fix TypeScript errors in Convex files (no dependencies)
├── Task 3: Fix TypeScript errors in Dashboard API routes (no dependencies)
├── Task 4: Fix console warnings in CLI tools (no dependencies)
├── Task 5: Fix console warnings in Convex files (no dependencies)
└── Task 6: Fix React warnings in Dashboard components (no dependencies)

Wave 2 (After Wave 1 completes):
└── Task 7: Final verification (depends: 1, 2, 3, 4, 5, 6)

Critical Path: Any Task in Wave 1 → Task 7
Parallel Speedup: ~80% faster than sequential (6 tasks in parallel)
```

---

## TODOs

- [ ] 1. Fix ESLint Errors in transport.ts

  **What to do**:
  - Line 84,86: Replace `new Array(n)` with `Array.from({ length: n })`
  - Line 166: Remove or use the `error` variable in catch block (prefix with `_` if intentionally unused)
  - Line 384: Remove unused `distanceKm` variable or use it in the response

  **Must NOT do**:
  - Change any business logic
  - Modify other parts of the file

  **Recommended Agent Profile**:
  - **Category**: `quick` - Simple, targeted fixes in a single file
    - Reason: These are straightforward syntax changes with clear patterns
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript syntax expertise for Array.from pattern

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Not UI-related
  - `git-master`: Will be used at commit time, not during fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `apps/ai-service/src/routes/transport.ts:84-86` - Current `new Array()` usage to fix
  - `apps/ai-service/src/routes/transport.ts:166` - Unused error variable in catch
  - `apps/ai-service/src/routes/transport.ts:384` - Unused distanceKm variable

  **Documentation References**:
  - ESLint rule: `unicorn/no-new-array` - Use `Array.from({length: n})` instead
  - ESLint rule: `unused-imports/no-unused-vars` - Prefix with `_` for intentionally unused

  **WHY Each Reference Matters**:
  - Line 84-86: Shows the exact pattern to replace with `Array.from({ length: n }, () => Array.from({ length: n }, () => 0))`
  - Line 166: Shows catch block where `error` is declared but not used
  - Line 384: Shows variable assignment that's never read

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm lint apps/ai-service/src/routes/transport.ts 2>&1 | grep -c "error"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 errors for transport.ts

  **Commit**: YES
  - Message: `fix(ai-service): resolve ESLint errors in transport.ts`
  - Files: `apps/ai-service/src/routes/transport.ts`
  - Pre-commit: `pnpm lint apps/ai-service/src/routes/transport.ts`

---

- [ ] 2. Fix TypeScript Errors in Convex Files (TS2742)

  **What to do**:
  - `convex/dataQualityReports.ts:122` - Add explicit return type to `cleanupOld` export
  - `convex/notifications.ts:735` - Add explicit return type to `sendPendingReminders` export
  - `convex/notifications.ts:791` - Add explicit return type to `cleanupOldNotifications` export
  - `convex/phoneAuth.ts:336` - Add explicit return type to `cleanupExpiredOtps` export
  - `convex/phoneAuth.ts:359` - Add explicit return type to `cleanupExpiredRateLimits` export

  **Pattern**: For each `internalMutation`, add return type annotation:

  ```typescript
  // Before
  export const cleanupOld = internalMutation({
    handler: async (ctx): Promise<{ deletedCount: number }> => { ... }
  });

  // After - add type to the export
  export const cleanupOld: ReturnType<typeof internalMutation<{ deletedCount: number }>> = internalMutation({
    handler: async (ctx): Promise<{ deletedCount: number }> => { ... }
  });
  ```

  **Must NOT do**:
  - Change function logic
  - Modify return values
  - Add unnecessary type imports

  **Recommended Agent Profile**:
  - **Category**: `quick` - Targeted type annotation additions
    - Reason: Adding explicit types is mechanical and well-defined
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: TypeScript type annotation expertise

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Backend Convex code, not UI
  - `data-scientist`: Not data processing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `convex/dataQualityReports.ts:122-140` - `cleanupOld` function with handler return type
  - `convex/notifications.ts:735-784` - `sendPendingReminders` function
  - `convex/notifications.ts:791-815` - `cleanupOldNotifications` function
  - `convex/phoneAuth.ts:336-353` - `cleanupExpiredOtps` function
  - `convex/phoneAuth.ts:359-375` - `cleanupExpiredRateLimits` function

  **API/Type References**:
  - Convex `internalMutation` type from `convex/server`

  **WHY Each Reference Matters**:
  - Each file shows the handler's return type which must be reflected in the export annotation
  - The pattern is consistent: `Promise<{ someField: type }>` in handler

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm typecheck 2>&1 | grep -E "convex/(dataQualityReports|notifications|phoneAuth)\.ts" | grep -c "error TS2742"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 TS2742 errors in Convex files

  **Commit**: YES
  - Message: `fix(convex): add explicit return types to internalMutation exports`
  - Files: `convex/dataQualityReports.ts`, `convex/notifications.ts`, `convex/phoneAuth.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 3. Fix TypeScript Errors in Dashboard API Routes (TS2307)

  **What to do**:
  - Fix imports in `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts`
  - Fix imports in `apps/dashboard/src/app/api/crawler/crawl-jobs/[...slug]/route.ts`
  - Fix imports in `apps/dashboard/src/app/api/crawler/guides/route.ts`
  - Fix imports in `apps/dashboard/src/app/api/crawler/crawl-jobs/scheduler/status/route.ts`

  **Pattern**: Change incorrect imports:

  ```typescript
  // Before (incorrect)
  import { api } from '@pathfinding/convex/api';
  import type { Id } from '@pathfinding/convex/dataModel';

  // After (correct)
  import { api, type Id } from '@pathfinding/convex';
  ```

  **Must NOT do**:
  - Change API logic
  - Modify response formats
  - Add new functionality

  **Recommended Agent Profile**:
  - **Category**: `quick` - Simple import path corrections
    - Reason: Mechanical find-and-replace of import statements
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Module import patterns

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: API routes, not UI components
  - `git-master`: Will be used at commit time

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `apps/dashboard/src/app/api/crawler/crawl-jobs/route.ts:1-7` - Current import pattern
  - `packages/convex/src/index.ts` - Correct exports: `api`, `Id`, `Doc`, `TableNames`

  **API/Type References**:
  - `packages/convex/src/index.ts:11-19` - Available exports from @pathfinding/convex

  **WHY Each Reference Matters**:
  - Shows the correct import path is `@pathfinding/convex` not `@pathfinding/convex/api`
  - Shows all available type exports that can be imported

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm typecheck 2>&1 | grep -E "apps/dashboard/src/app/api/crawler" | grep -c "error TS2307"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 TS2307 errors in crawler API routes

  **Commit**: YES
  - Message: `fix(dashboard): correct Convex import paths in API routes`
  - Files: `apps/dashboard/src/app/api/crawler/**/*.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 4. Fix Console Warnings in CLI Tools

  **What to do**:
  - `apps/ai-service/src/login-helper.ts` (28 occurrences) - Add eslint-disable comment at file top
  - `apps/ai-service/src/verify-mafengwo.ts` (34 occurrences) - Add eslint-disable comment at file top

  **Pattern**: Add at the top of each CLI file:

  ```typescript
  /* eslint-disable no-console */
  // This is a CLI tool that intentionally uses console for user output
  ```

  **Rationale**: These are CLI tools designed for terminal output. Using a logger would be inappropriate for user-facing CLI messages.

  **Must NOT do**:
  - Replace console.log with logger (inappropriate for CLI tools)
  - Remove any console output
  - Change the tool's behavior

  **Recommended Agent Profile**:
  - **Category**: `quick` - Adding eslint-disable comments
    - Reason: Single-line addition at file top
  - **Skills**: [] (no special skills needed)

  **Skills Evaluated but Omitted**:
  - `typescript-programmer`: Not needed for comment addition
  - All others: Not applicable

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `apps/ai-service/src/login-helper.ts:1-15` - File header where comment should be added
  - `apps/ai-service/src/verify-mafengwo.ts:1-5` - File header where comment should be added

  **WHY Each Reference Matters**:
  - Shows the file structure and where to place the eslint-disable comment
  - Confirms these are CLI tools with intentional console usage

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm lint apps/ai-service/src/login-helper.ts apps/ai-service/src/verify-mafengwo.ts 2>&1 | grep -c "no-console"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 no-console warnings in CLI files

  **Commit**: YES
  - Message: `fix(ai-service): disable no-console rule for CLI tools`
  - Files: `apps/ai-service/src/login-helper.ts`, `apps/ai-service/src/verify-mafengwo.ts`
  - Pre-commit: `pnpm lint apps/ai-service/src/login-helper.ts apps/ai-service/src/verify-mafengwo.ts`

---

- [ ] 5. Fix Console Warnings in Convex Files

  **What to do**:
  - `convex/dataQualityReports.ts:139` - Remove or replace `console.log` with proper logging
  - `convex/http.ts:264,314,488,498,507,512` - Remove debug console.log statements
  - `convex/notifications.ts:779,813` - Remove or replace console statements

  **Pattern**:
  - For debug logs: Remove entirely (they were for development)
  - For error logs: Keep `console.error` but add eslint-disable-next-line if needed
  - For info logs: Remove or convert to structured return values

  **Must NOT do**:
  - Add logger dependency to Convex (Convex has its own logging)
  - Change error handling behavior
  - Remove error information from responses

  **Recommended Agent Profile**:
  - **Category**: `quick` - Removing debug statements
    - Reason: Simple deletion of console.log lines
  - **Skills**: [`typescript-programmer`]
    - `typescript-programmer`: Understanding code context for safe removal

  **Skills Evaluated but Omitted**:
  - `frontend-ui-ux`: Backend code
  - `data-scientist`: Not data processing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `convex/dataQualityReports.ts:139` - `console.log` for cleanup count
  - `convex/http.ts:264` - Debug log for comment creation
  - `convex/http.ts:314` - Error log (keep with eslint-disable)
  - `convex/http.ts:488-512` - Debug logs for like API
  - `convex/notifications.ts:779` - Error log (keep with eslint-disable)
  - `convex/notifications.ts:813` - Info log for cleanup count

  **WHY Each Reference Matters**:
  - Shows which logs are debug (remove) vs error handling (keep with disable)
  - Context helps determine if removal is safe

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm lint convex/dataQualityReports.ts convex/http.ts convex/notifications.ts 2>&1 | grep -c "no-console"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 no-console warnings in Convex files

  **Commit**: YES
  - Message: `fix(convex): remove debug console statements`
  - Files: `convex/dataQualityReports.ts`, `convex/http.ts`, `convex/notifications.ts`
  - Pre-commit: `pnpm lint convex/`

---

- [ ] 6. Fix React Warnings in Dashboard Components

  **What to do**:

  **6a. Fix `react/no-array-index-key` warnings (5 occurrences)**:
  - `apps/dashboard/src/app/chat/page.tsx:210,217` - Use `message.id` + part index as key
  - `apps/dashboard/src/app/guides/[id]/page.tsx:301,374` - Use unique identifiers from data
  - `apps/dashboard/src/app/pois/page.tsx:285` - Use source platform + index as key

  **Pattern**:

  ```tsx
  // Before
  {
    items.map((item, index) => <div key={index}>...</div>);
  }

  // After - use stable identifier
  {
    items.map((item, index) => <div key={`${item.id}-${index}`}>...</div>);
  }
  // Or if item has unique id:
  {
    items.map((item) => <div key={item.id}>...</div>);
  }
  ```

  **6b. Fix `react-hooks-extra/no-direct-set-state-in-use-effect` warnings (4 occurrences)**:
  - `apps/dashboard/src/components/poi-editor.tsx:49,50,51,60` - Refactor useEffect state updates

  **Pattern**:

  ```tsx
  // Before - direct setState in useEffect
  useEffect(() => {
    setLatitude(poi.latitude.toString());
    setLongitude(poi.longitude.toString());
    setError('');
  }, [poi.latitude, poi.longitude]);

  // After - use functional update or combine into single state
  useEffect(() => {
    // Option 1: Batch updates (React 18+ auto-batches)
    // Option 2: Use a single state object
    // Option 3: Add eslint-disable if intentional
  }, [poi.latitude, poi.longitude]);
  ```

  **6c. `react-dom/no-dangerously-set-innerhtml` warning (1 occurrence)**:
  - `apps/dashboard/src/app/guides/[id]/page.tsx:280` - Add eslint-disable comment (intentional for HTML content)

  **Must NOT do**:
  - Change component behavior
  - Remove necessary state updates
  - Break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` - React component fixes
    - Reason: React-specific patterns and hooks understanding
  - **Skills**: [`frontend-ui-ux`, `typescript-programmer`]
    - `frontend-ui-ux`: React best practices and patterns
    - `typescript-programmer`: TypeScript/TSX syntax

  **Skills Evaluated but Omitted**:
  - `git-master`: Will be used at commit time
  - `data-scientist`: Not data processing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Task 7 (verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `apps/dashboard/src/app/chat/page.tsx:203-238` - Message rendering with parts array
  - `apps/dashboard/src/app/guides/[id]/page.tsx:299-317` - Image URL mapping
  - `apps/dashboard/src/app/guides/[id]/page.tsx:367-390` - POI mapping in days
  - `apps/dashboard/src/app/pois/page.tsx:283-290` - Source platform mapping
  - `apps/dashboard/src/components/poi-editor.tsx:46-62` - useEffect with state updates

  **WHY Each Reference Matters**:
  - Shows the data structure to determine appropriate unique keys
  - Shows the useEffect pattern that needs refactoring
  - Context for understanding if changes are safe

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm lint apps/dashboard/src/app/chat/page.tsx apps/dashboard/src/app/guides/[id]/page.tsx apps/dashboard/src/app/pois/page.tsx apps/dashboard/src/components/poi-editor.tsx 2>&1 | grep -cE "(no-array-index-key|no-direct-set-state-in-use-effect|no-dangerously-set-innerhtml)"
  # Assert: Output is "0"
  ```

  **Evidence to Capture:**
  - [ ] Terminal output showing 0 React-related warnings

  **Commit**: YES
  - Message: `fix(dashboard): resolve React ESLint warnings`
  - Files: `apps/dashboard/src/app/chat/page.tsx`, `apps/dashboard/src/app/guides/[id]/page.tsx`, `apps/dashboard/src/app/pois/page.tsx`, `apps/dashboard/src/components/poi-editor.tsx`
  - Pre-commit: `pnpm lint apps/dashboard/src/`

---

- [ ] 7. Final Verification

  **What to do**:
  - Run full lint check across entire codebase
  - Run full typecheck across entire codebase
  - Verify zero errors and zero warnings

  **Must NOT do**:
  - Make any code changes
  - Skip any verification step

  **Recommended Agent Profile**:
  - **Category**: `quick` - Running verification commands
    - Reason: Simple command execution and output validation
  - **Skills**: [] (no special skills needed)

  **Skills Evaluated but Omitted**:
  - All skills: Not needed for verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**:

  **Documentation References**:
  - `package.json` - lint and typecheck scripts

  **WHY Each Reference Matters**:
  - Confirms the correct commands to run for verification

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  pnpm lint 2>&1 | tail -5
  # Assert: Shows "0 errors" and "0 warnings" or clean exit

  pnpm typecheck 2>&1 | tail -5
  # Assert: Shows no errors or clean exit
  ```

  **Evidence to Capture:**
  - [ ] Full lint output showing 0 errors, 0 warnings
  - [ ] Full typecheck output showing 0 errors

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message                                                              | Files                                                                            | Verification                                        |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1          | `fix(ai-service): resolve ESLint errors in transport.ts`             | `apps/ai-service/src/routes/transport.ts`                                        | `pnpm lint apps/ai-service/src/routes/transport.ts` |
| 2          | `fix(convex): add explicit return types to internalMutation exports` | `convex/dataQualityReports.ts`, `convex/notifications.ts`, `convex/phoneAuth.ts` | `pnpm typecheck`                                    |
| 3          | `fix(dashboard): correct Convex import paths in API routes`          | `apps/dashboard/src/app/api/crawler/**/*.ts`                                     | `pnpm typecheck`                                    |
| 4          | `fix(ai-service): disable no-console rule for CLI tools`             | `apps/ai-service/src/login-helper.ts`, `apps/ai-service/src/verify-mafengwo.ts`  | `pnpm lint apps/ai-service/src/`                    |
| 5          | `fix(convex): remove debug console statements`                       | `convex/dataQualityReports.ts`, `convex/http.ts`, `convex/notifications.ts`      | `pnpm lint convex/`                                 |
| 6          | `fix(dashboard): resolve React ESLint warnings`                      | `apps/dashboard/src/**/*.tsx`                                                    | `pnpm lint apps/dashboard/src/`                     |

---

## Success Criteria

### Verification Commands

```bash
# Full lint check
pnpm lint
# Expected: 0 errors, 0 warnings

# Full typecheck
pnpm typecheck
# Expected: 0 errors
```

### Final Checklist

- [ ] All 4 ESLint errors fixed
- [ ] All 9 TypeScript errors fixed
- [ ] All 79 ESLint warnings fixed
- [ ] No functional changes to business logic
- [ ] All commits follow conventional commit format
- [ ] `pnpm lint` passes with 0 errors and 0 warnings
- [ ] `pnpm typecheck` passes with 0 errors
