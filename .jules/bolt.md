## 2024-05-22 - Optimizing Convex Queries
**Learning:** Found critical performance anti-pattern in Convex: using `.filter()` on indexed fields (like email) causes full table scans (O(N)) instead of using the index.
**Action:** Always verify query plans for indexed fields. Use `.withIndex('index_name', q => ...)` instead of `.filter()` to ensure O(log N) or O(1) performance.
