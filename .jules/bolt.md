## 2025-02-23 - Convex Many-to-Many Optimization

**Learning:** Convex's `.collect()` performs a full table scan if no specific index is used, even if followed by `.filter()`. For finding entities linked to a user (like conversations), do not scan the main table and filter by `participantIds.includes(userId)`. Instead, use an auxiliary table that is indexed by `userId` (e.g., `messageReadStatus` or a dedicated junction table) to get the IDs first, then batch fetch the documents using `Promise.all(ids.map(id => ctx.db.get(id)))`. This converts O(Total Records) to O(User's Records).
**Action:** Always check if a query without an index is scanning a potentially large table. Use auxiliary tables or denormalized indexes to narrow down the search space before fetching documents.
