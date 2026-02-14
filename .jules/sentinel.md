## 2024-05-23 - Convex Input Validation
**Vulnerability:** Missing input validation on `updateProfile` mutation allowed arbitrarily large strings for `displayName` and `bio`.
**Learning:** Convex mutations do not automatically validate string lengths; explicit checks are required.
**Prevention:** Always validate input lengths in mutation handlers, especially for user-generated content.
