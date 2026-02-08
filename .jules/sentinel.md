# Sentinel's Journal

## 2025-05-20 - Insecure Direct Object Reference in WiFi Credentials

**Vulnerability:** IDOR in `wifiCredentials` module allowed any authenticated user to list, update, and delete any other user's WiFi credentials by manipulating the `userId` argument.
**Learning:** Convex `query` and `mutation` handlers do not automatically scope data to the authenticated user; arguments must be explicitly validated against `ctx.auth.getUserIdentity()`.
**Prevention:** Always verify `args.userId === identity.subject` or prefer using `identity.subject` directly instead of accepting `userId` as an argument for user-scoped resources.
