## 2024-05-22 - Messaging Query Optimization
**Learning:** Full table scans on `conversations` were used to list a user's conversations, which is O(N) where N is total conversations. The optimized approach queries `messageReadStatus` (indexed by user) to get IDs, then fetches conversations in parallel. This is O(K) where K is user's conversations.
**Action:** When filtering a large table by a many-to-many relationship (like User<->Conversation), always use the link table (or auxiliary index table) to get IDs first, then fetch documents.

**Learning:** `listConversations` enriched data by querying `messageReadStatus` inside a loop, causing N+1 queries. Since we already fetched `messageReadStatus` to get the conversation IDs, we can reuse this data in memory.
**Action:** When fetching a list of items based on an auxiliary table, pass the auxiliary data to the enrichment phase to avoid re-querying it.

**Learning:** Testing `convex/` backend functions with `vitest` requires mocking `convex/_generated/server` and `convex/values`. The `ctx.db` object must be mocked to spy on `query`, `withIndex`, `order`, `collect`, and `get`.
**Action:** Use the pattern in `convex/messaging.test.ts` for unit testing backend logic without a running Convex instance.
