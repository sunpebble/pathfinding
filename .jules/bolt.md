## 2024-05-22 - Optimize Public Itinerary Listing

**Learning:** Found a query `listPublic` that was fetching all public itineraries and filtering by city in memory. The schema already had a compound index `by_visibility_city` which was not being used.
**Action:** Always check schema for existing compound indexes before optimizing queries. Using `withIndex` with the specific index avoids table scans.
