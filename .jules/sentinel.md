# Sentinel Journal

## 2025-02-23 - Convex HTTP Action Rate Limiting

**Vulnerability:** HTTP Actions in Convex (`http.ts`) are exposed to the public internet and lack built-in rate limiting middleware, making them vulnerable to brute-force attacks (e.g., password guessing).
**Learning:** Convex HTTP actions run in a stateless environment where `ctx.db` is not directly accessible. To implement stateful rate limiting, one must invoke a mutation (e.g., `ctx.runMutation`) that interacts with a `rateLimits` table.
**Prevention:** Always implement a dedicated `rateLimit` mutation and call it at the beginning of sensitive HTTP actions (like authentication). Use client IP (from `x-forwarded-for`) or user identifier as the key.
