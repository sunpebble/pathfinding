# Sentinel's Journal

This journal documents critical security learnings and fixes.

## 2024-05-24 - [CRITICAL] Insecure Manual JWT Decoding
**Vulnerability:** The function `getUserIdFromAuth` in `convex/http.ts` manually decoded JWT tokens from the `Authorization` header using `atob` and `JSON.parse` without verifying the signature or expiration. This allowed attackers to forge tokens with arbitrary `sub` claims and impersonate any user.
**Learning:** Never implement manual JWT decoding for authentication. Platform-provided auth methods (like `ctx.auth.getUserIdentity()` in Convex) handle signature verification, expiration checks, and issuer validation securely.
**Prevention:** Always use the platform's authentication context (`ctx.auth`) to retrieve user identity. Avoid manual header parsing for security-critical operations.
