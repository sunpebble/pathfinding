## 2025-02-20 - [Optimizing User Profile Lookups]

**Learning:** `filter()` in Convex performs a full table scan. For fields that are indexed, always use `.withIndex()` to utilize the index for O(log N) performance instead of O(N) scan. This is critical for tables that grow linearly with user base like `profiles`.
**Action:** When querying by a field, check `schema.ts` for existing indexes. If an index exists, use `.withIndex()`. If not, and the table is expected to be large, consider adding an index.
