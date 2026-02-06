## 2024-05-23 - Unused Indexes
**Learning:** Found that `by_visibility_city` index existed in `schema.ts` but was not used in `listPublic` query, causing the app to fetch all public items and filter in memory.
**Action:** Always check `schema.ts` for existing compound indexes that match filter requirements before resorting to `.filter()` in application code.
