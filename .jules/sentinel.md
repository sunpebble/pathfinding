## 2024-05-23 - [Manual JWT Decoding]
**Vulnerability:** Manual decoding of JWT tokens using `atob` and `JSON.parse` without signature verification in `convex/http.ts`.
**Learning:** Developers might attempt to extract user ID from JWTs manually if they are unfamiliar with the platform's authentication helpers, leading to critical impersonation vulnerabilities.
**Prevention:** Always use `ctx.auth.getUserIdentity()` or equivalent platform-provided methods to retrieve authenticated user information. Never trust the payload of an unverified token.
