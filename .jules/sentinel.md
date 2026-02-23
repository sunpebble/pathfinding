## 2025-02-18 - [Fixing IDOR in Convex Mutations]
**Vulnerability:** Public mutations accepting `userId` as an argument allowed any user to impersonate any other user by simply passing a different ID.
**Learning:** Convex `mutation`s are public by default. Relying on client-provided IDs for authorization is insecure. HTTP actions verifying JWTs manually must pass verified IDs to *internal* mutations, while public clients should use mutations that derive identity from `ctx.auth`.
**Prevention:**
1. Never accept `userId` in public mutations. Use `ctx.auth.getUserIdentity()`.
2. Use `internalMutation` for logic that needs to be called by trusted server-side code (like HTTP actions) with a specific user context.
3. Split mutations into `internal...` (logic + explicit args) and public wrappers (auth check + call internal).
