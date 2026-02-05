## 2025-02-17 - Convex Query Performance & Naming Confusion

**Vulnerability:** Denial of Service (DoS) via full table scans in `getUserById` and `getUserProfile`.
**Learning:** `filter()` operations in Convex scans the entire table. Always use `withIndex()` for lookups. Also, variable naming (`userId` instead of `email`) masked the fact that queries were filtering by email, leading to potential logic errors and inefficient queries.
**Prevention:** Enforce use of `withIndex()` for equality checks on indexed fields. Be precise with variable names (e.g., `userEmail` vs `userId`) to match the underlying data schema.
