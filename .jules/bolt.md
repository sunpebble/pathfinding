## 2024-03-24 - [Optimize getByDestination to use auxiliary table]

**Learning:** Performing substring filtering on a large table (`travelGuides`) requires a full table scan, which is highly inefficient for memory and CPU. This codebase uses an auxiliary table (`guideDestinations`) that maps destinations to `guideId`s.
**Action:** When a query needs to filter by substring and no full-text search index is available, always check if an auxiliary lightweight table exists. Fetch the lightweight table first, perform the filtering and map to IDs, then fetch the heavy documents in a batch.
