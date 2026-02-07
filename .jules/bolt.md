## 2024-05-22 - [Misleading Variable Names Causing Full Table Scans]

**Learning:** In `convex/users.ts`, `getUserById` takes a `userId` argument but queries the `profiles` table by `email`. This naming mismatch likely contributed to the use of `.filter()` (full table scan) instead of the existing `.withIndex('by_email')`.
**Action:** When optimizing Convex queries, inspect the _logic_ of the filter (e.g., `q.eq(q.field('email'), ...)`) to identify the correct index, regardless of variable names.
