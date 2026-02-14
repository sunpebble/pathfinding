## 2025-02-17 - Loading State Handling in Convex Queries
**Learning:** Convex `useQuery` returns `undefined` during the initial loading phase. If not handled explicitly, this can be misinterpreted as an empty result set (e.g., `[]`), leading to a flash of "No results found" before data appears.
**Action:** Always check for `queryResult === undefined` to render a loading state (spinner/skeleton) before checking for empty data length.

## 2025-02-17 - ESLint Indentation Rules
**Learning:** The project uses `@antfu/eslint-config` which enforces strict indentation and multiline ternary formatting that might conflict with standard Prettier settings or editor defaults.
**Action:** Run `pnpm eslint --fix <file>` immediately after making changes to ensure compliance without manually fighting the linter.
