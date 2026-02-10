## 2024-05-22 - Polymorphic Interactive Badges

**Learning:** Found `GeocodingConfidenceBadge` implemented as a `div` with `onClick`, making it inaccessible to keyboard users and screen readers.
**Action:** When encountering "badge" or "tag" components that can be interactive, implement them as polymorphic components (rendering as `button` when interactive) to ensure native accessibility (focus, keyboard support, roles).
