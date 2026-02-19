## 2025-02-19 - Manual JWT Decoding Vulnerability
**Vulnerability:** Found `getUserIdFromAuth` function in `convex/http.ts` that manually decoded JWTs using `atob` and `JSON.parse` without verifying the signature. This allowed authentication bypass by forging tokens with arbitrary `sub` claims.
**Learning:** Developers might attempt to manually parse JWTs to extract user ID in HTTP actions instead of using the provided `ctx.auth.getUserIdentity()`.
**Prevention:** Enforce usage of `ctx.auth.getUserIdentity()` for authentication in Convex HTTP actions. Audit codebase for `atob` or `JSON.parse` on headers.
