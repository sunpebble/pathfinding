# Draft: Code Quality Fixes

## Requirements (confirmed)

- Fix ALL 4 ESLint errors (MUST FIX)
- Fix ALL 9 TypeScript errors (MUST FIX)
- Fix 79 ESLint warnings (SHOULD FIX)

## Technical Decisions

### Logger Package

- Located at `packages/logger/src/index.ts`
- Exports: `logger` (pino instance), `createLogger(context: string)`, `Logger` type
- Usage: `import { createLogger } from '@pathfinding/logger'` then `const logger = createLogger('context')`

### Convex Import Issue

- Dashboard imports `@pathfinding/convex/api` and `@pathfinding/convex/dataModel`
- Package at `packages/convex/src/index.ts` re-exports from `../../../convex/_generated/`
- The imports in dashboard API routes use incorrect paths - should use `@pathfinding/convex` directly

### ESLint Errors (4 total)

1. `apps/ai-service/src/routes/transport.ts:84,86` - `new Array()` → `Array.from({length: x})`
2. `apps/ai-service/src/routes/transport.ts:166` - `error` unused in catch block
3. `apps/ai-service/src/routes/transport.ts:384` - `distanceKm` assigned but never used

### TypeScript Errors (9 total)

1. `convex/dataQualityReports.ts:122` - `cleanupOld` needs explicit return type
2. `convex/notifications.ts:735` - `sendPendingReminders` needs explicit return type
3. `convex/notifications.ts:791` - `cleanupOldNotifications` needs explicit return type
4. `convex/phoneAuth.ts:336` - `cleanupExpiredOtps` needs explicit return type
5. `convex/phoneAuth.ts:359` - `cleanupExpiredRateLimits` needs explicit return type
   6-9. `apps/dashboard/src/app/api/crawler/...` - Cannot find module imports

### Console.log Warnings (62 total)

- `apps/ai-service/src/login-helper.ts` (28 occurrences) - CLI tool, intentional console output
- `apps/ai-service/src/verify-mafengwo.ts` (34 occurrences) - CLI tool, intentional console output
- `convex/dataQualityReports.ts` (1 occurrence) - Replace with proper logging
- `convex/http.ts` (5 occurrences) - Replace with proper logging
- `convex/notifications.ts` (1 occurrence) - Replace with proper logging

### React Warnings (10 total)

- 5x `react/no-array-index-key` - Need stable keys
- 4x `react-hooks-extra/no-direct-set-state-in-use-effect` - State updates in useEffect
- 1x `react-dom/no-dangerously-set-innerhtml` - Intentional for HTML content

## Research Findings

- Logger package uses pino with pino-pretty for dev
- Convex functions already have return types in handler, but TS2742 requires explicit annotation on the export
- CLI tools (login-helper.ts, verify-mafengwo.ts) use console.log intentionally for user output

## Open Questions

- None - all requirements clear

## Scope Boundaries

- INCLUDE: All ESLint errors, TypeScript errors, and warnings listed
- EXCLUDE: Other code quality improvements not listed
- NOTE: CLI tools may need eslint-disable comments for intentional console.log usage
