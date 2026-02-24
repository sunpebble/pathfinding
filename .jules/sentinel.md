## 2025-02-23 - [Critical] JWT Signature Verification Bypass in HTTP Actions

**Vulnerability:** The helper function `getUserIdFromAuth` in `convex/http.ts` was manually decoding JWTs from the `Authorization` header using `atob` and `JSON.parse` to extract the `sub` claim, without verifying the token signature. This allowed any attacker to impersonate any user by crafting a fake JWT.
**Learning:** Framework-provided authentication contexts (like `ctx.auth` in Convex) often handle verification implicitly. Manually parsing tokens is almost always a security risk unless you are explicitly validating the signature against a public key.
**Prevention:** Always use the platform's provided authentication helpers (e.g., `ctx.auth.getUserIdentity()`). Never manually parse security tokens for authentication purposes.
