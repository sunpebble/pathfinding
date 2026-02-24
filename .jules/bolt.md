## 2024-05-23 - Convex Query Optimization

**Learning:** When strict database indexing (e.g., exact match) cannot support a requirement (e.g., substring match), optimizing to scan a lightweight auxiliary table (containing only the filterable field and ID) is a superior alternative to scanning the main heavy table. This reduces memory usage and I/O significantly, even if it remains O(N) in terms of record count.
**Action:** Look for "full table scans" `ctx.db.query('Table').collect()` in Convex functions. If filtering is done in-memory on a large table, check if an auxiliary table exists or can be used to perform the filtering on lightweight data first.
