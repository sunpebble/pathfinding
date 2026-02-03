## 2026-02-03 - Convex IDOR and Impersonation

**Vulnerability:** Found pervasive IDOR and impersonation vulnerabilities in Convex backend functions (`convex/itineraries.ts`). Functions relied on client-provided `userId` arguments instead of the authenticated user identity from `ctx.auth`.
**Learning:** In Convex, `mutation` and `query` arguments are fully controlled by the client. Never trust `args.userId` for ownership checks. Always derive the user's identity from `ctx.auth.getUserIdentity()`.
**Prevention:** Use a middleware or helper function that automatically fetches `ctx.auth` and validates it against any `userId` passed in args, or preferably, remove `userId` from args entirely and source it from auth context.
