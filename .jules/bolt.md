## 2024-05-23 - [Optimization] Avoid Full Table Scans for Filtering
**Learning:** Convex queries using `.collect()` followed by `.filter()` perform full table scans (O(N)), which is a severe bottleneck. Always use indexes (O(log N)) or auxiliary tables with indexes for filtering.
**Action:** Replaced `travelGuides:getByDestination` (scan) with `guideDestinations` index lookup.
