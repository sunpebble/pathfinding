## 2024-05-23 - Convex Index Usage

**Learning:** Found unoptimized queries using `.filter()` on indexed fields in `convex/users.ts`. This causes full table scans (O(n)) instead of index lookups (O(log n)).
**Action:** Always check `schema.ts` for available indexes and use `.withIndex()` whenever possible for queries.
