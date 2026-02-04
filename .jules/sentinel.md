## 2025-02-20 - IDOR in Convex Mutations
**Vulnerability:** `wifiCredentials.ts` mutations accepted `userId` as an argument and did not verify it against the authenticated user, allowing any user to modify or view any other user's credentials.
**Learning:** Convex functions do not automatically enforce ownership; developers must explicitly check `ctx.auth.getUserIdentity()`.
**Prevention:** Always use `ctx.auth.getUserIdentity()` to derive the acting `userId` and validate ownership before performing actions.
