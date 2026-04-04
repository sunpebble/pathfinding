# Pathfinding

Travel itinerary planning app. Nx monorepo: API (Hono + Drizzle + TiDB), Dashboard (Next.js + React 19 + Tailwind v4), iOS (SwiftUI), Go server.

## Commands

- `pnpm check` — full quality check (typecheck + lint + test)
- `pnpm test` — run all tests (Vitest)
- `pnpm test:coverage` — coverage report (minimum 60%)
- `pnpm lint` — ESLint + formatting
- `pnpm typecheck` — TypeScript type checking
- `pnpm dev` — dashboard dev server (port 3002)
- `pnpm dev:api` — API dev server (port 3000)
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:migrate` — run migrations
- `pnpm build` — build all packages and apps

## Security Red Lines

These rules are non-negotiable. Violations are always Critical severity.

- **JWT verification:** Always use the `jose` library via `verifyToken()` from `services/auth.service.ts`. NEVER manually base64-decode JWT payloads. Reference: `.jules/sentinel.md`
- **Ownership checks:** Always use strict equality (`===`) for userId comparisons. NEVER use `.includes()`, `.indexOf()`, or any substring matching for permission validation. Reference: `.jules/sentinel.md`
- **Input validation:** All user input entering API routes must pass through Zod schema validation. No raw `req.body` or `req.query` access without validation.
- **Content sanitization:** User-generated HTML content must be sanitized with `isomorphic-dompurify` before storage or rendering.

## Performance Rules

- **No N+1 queries:** Never call `db.query()`/`db.select()` inside a loop. Use batch queries or an in-memory `Map` cache for repeated lookups. Reference: `.jules/bolt.md`
- **Database-level filtering:** Use Drizzle's `.where()` with indexed columns. Never fetch all rows and filter with JS `.filter()` + `.slice()`. Reference: `.jules/bolt.md`
- **Auxiliary tables:** When filtering by substring on a large table, check if a lightweight auxiliary table exists (e.g., `guideDestinations` for `travelGuides`). Fetch IDs from the auxiliary table first, then batch-fetch the heavy records. Reference: `.jules/bolt.md`

## UX Conventions

- **Tooltips on icon buttons:** Every icon-only button must be wrapped in a `Tooltip` component (`TooltipTrigger` + `TooltipContent`). Reference: `.jules/palette.md`
- **Accessible interactions:** All interactive elements must have `aria-label` attributes.

## Testing Standards

- Test files go in `__tests__/<module>.test.ts` next to the source module
- Follow AAA pattern: Arrange, Act, Assert
- Use `vi.hoisted()` for module mocks to ensure correct load order
- Restore `process.env` in `afterEach` when testing env-dependent code
- Minimum coverage threshold: 60%
- New features must include corresponding unit tests

## Conventions

- Commit format: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`)
- Branch naming: `feat/xxx`, `fix/xxx`, `docs/xxx`, `refactor/xxx`, `test/xxx`, `chore/xxx`
- API middleware order: auth → rate-limit → handler
- Database column naming: snake_case in MySQL, camelCase in Drizzle schema definitions
