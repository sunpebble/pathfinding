# Bolt's Journal

## 2024-05-21 - Optimization of Full-Table Scans via Auxiliary Tables
**Learning:** When performing substring searches or filtering on non-indexed conditions (like `array.some(item => item.includes(query))`), scanning the main table is disastrous if documents are large (e.g., contain HTML content).
**Action:** Always check for or create a lightweight auxiliary table (containing only the ID and the filterable field) to scan instead. Fetch full documents by ID only *after* filtering. This reduced memory pressure significantly for `getByDestination`.
