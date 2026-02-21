## 2025-05-22 - JWT Signature Verification Bypass
**Vulnerability:** Found a custom function `getUserIdFromAuth` in `convex/http.ts` that manually decoded JWT tokens from the `Authorization` header using `atob` and `JSON.parse` without verifying the signature. This allowed any user to impersonate others by forging a JWT with a different `sub` claim.
**Learning:** Manual JWT parsing is almost always insecure unless the signature is separately verified. In Convex, `ctx.auth.getUserIdentity()` handles parsing and verification securely.
**Prevention:** Never use `atob` or `JSON.parse` on JWTs for authentication. Always use the framework-provided authentication methods (`ctx.auth.getUserIdentity()`). Added this pattern to Sentinel's scan list.
