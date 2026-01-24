# Coding Conventions

**Analysis Date:** 2026-01-25

## Naming Patterns

**Files:**

- kebab-case for directories, e.g., `apps/ai-service/src/lib/crawlers/`
- kebab-case for utility files, e.g., `apps/dashboard/src/lib/utils.ts`
- PascalCase for React component files, e.g., `apps/dashboard/src/app/page.tsx`, `apps/dashboard/src/components/ui/button.tsx`
- camelCase or kebab-case for API route files, e.g., `apps/ai-service/src/routes/agent.js`, `apps/ai-service/src/routes/ai.js`

**Functions:**

- camelCase for regular functions, e.g., `formatDateTime`, `shortId`, `crawlCtrip`, `fetchListPage`, `fetchGuideDetail`.
- PascalCase for React components, e.g., `OverviewPage`, `Button`, `StatusIcon`, `StatusBadge`.

**Variables:**

- camelCase for local variables.
- UPPER_SNAKE_CASE for global constants, e.g., `CITY_IDS` in `apps/ai-service/src/lib/crawlers/ctrip.ts`.

**Types:**

- PascalCase for interfaces and types, e.g., `CrawlOptions`, `CrawlResult`, `ContentBlock` in `apps/ai-service/src/lib/crawlers/ctrip.ts`.
- PascalCase for component `Props` types, e.g., `React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; }` in `apps/dashboard/src/components/ui/button.tsx`.

## Code Style

**Formatting:**

- Prettier is used for formatting. A `.prettierrc` file exists at the project root.
- Tailwind CSS is used for styling in the dashboard, often applied via `className` prop and combined with `clsx` and `tailwind-merge` utility functions (e.g., `cn` in `apps/dashboard/src/lib/utils.ts`).

**Linting:**

- ESLint is used, indicated by `next lint` script in `apps/dashboard/package.json`. Configuration files like `eslint.config.mjs` were found in `.auto-claude/worktrees/tasks/`, suggesting a project-wide ESLint setup.

## Import Organization

**Order:**

- General practice observed is to group imports by type:
  1. Third-party libraries (e.g., `react`, `lucide-react`, `hono`)
  2. Internal project modules (e.g., `@/hooks`, `@/lib/api`)
  3. Relative imports (e.g., `./index.js`, `./mcp-client.js`)
- `import 'dotenv/config';` is placed early in the main entry file `apps/ai-service/src/index.ts` to ensure environment variables are loaded first.

**Path Aliases:**

- Aliases are used for internal project modules, e.g., `@/hooks/use-health-status`, `@/lib/api`, `@/lib/utils` in `apps/dashboard/src/app/page.tsx`.

## Error Handling

**Patterns:**

- `try...catch` blocks are used for handling asynchronous operations and potential errors, especially in external API calls or crawler logic, e.g., `apps/ai-service/src/lib/crawlers/ctrip.ts`.
- Specific error logging using `console.error` within `catch` blocks is common.
- Hono applications return JSON error objects with `error` and `message` properties and appropriate HTTP status codes, e.g., `app.notFound` in `apps/ai-service/src/index.ts`.

## Logging

**Framework:**

- `console.log` and `console.error` are commonly used throughout both `ai-service` and `dashboard`.
- The `ai-service` uses `hono/logger` middleware for request logging, configured globally in `apps/ai-service/src/index.ts`.

**Patterns:**

- Informative messages with context are logged, often including the module name in brackets, e.g., `[Ctrip] Crawling guides for...` in `apps/ai-service/src/lib/crawlers/ctrip.ts`.
- Debugging information for snapshots and content length is logged during crawling operations.

## Comments

**When to Comment:**

- JSDoc/TSDoc style comments are used for documenting functions, especially utility functions, describing their purpose, parameters, and return values, e.g., `apps/dashboard/src/lib/utils.ts`.
- Block comments are used for file headers and logical sections, e.g., `apps/ai-service/src/index.ts`.
- Inline comments are used to explain complex logic or specific parts of the code.

**JSDoc/TSDoc:**

- Used for public utility functions and potentially complex logic.
  Example from `apps/dashboard/src/lib/utils.ts`:

```typescript
/**
 * Format a date string to a localized date time string
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString();
}
```

## Function Design

**Size:**

- Functions are generally concise, focusing on a single responsibility. Larger functions are broken down into smaller, more manageable helper functions, e.g., `crawlCtrip` delegates to `fetchListPage` and `fetchGuideDetail` in `apps/ai-service/src/lib/crawlers/ctrip.ts`.

**Parameters:**

- Parameters are typed explicitly using TypeScript.
- Optional parameters are defined, e.g., `options?: CrawlOptions` in `crawlCtrip`.

**Return Values:**

- Return types are explicitly defined in TypeScript.
- Functions often return objects or `Promise`s.

## Module Design

**Exports:**

- Named exports are common, e.g., `export { Button, buttonVariants }` in `apps/dashboard/src/components/ui/button.tsx`.
- Default exports are used for main entry points or pages, e.g., `export default app` in `apps/ai-service/src/index.ts` and `export default function OverviewPage()` in `apps/dashboard/src/app/page.tsx`.

**Barrel Files:**

- Not explicitly observed in the provided samples, but common for grouping exports from a directory.

---

_Convention analysis: 2026-01-25_
