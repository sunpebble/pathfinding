## 2025-02-23 - [Insecure Direct Object Reference in Follow System]

**Vulnerability:** The `follow` and `unfollow` mutations trusted `args.followerId` without verification, allowing any user to force any other user to follow them by spoofing the ID. The HTTP API `/api/follows` also lacked authentication checks.
**Learning:** Publicly exposed mutations must always verify `ctx.auth.getUserIdentity()` and enforce that the operating user matches the target resource owner. Relying on client-provided IDs for sensitive actions is a major risk. Additionally, HTTP actions do not automatically authenticate mutations they call; explicit verification is required.
**Prevention:**

1. Always derive the acting user's identity from `ctx.auth` in public mutations.
2. For HTTP APIs, manually verify JWT tokens (e.g., using `getUserIdFromAuth`) and validate that the token owner matches the request parameters before performing actions.
3. Use `internalMutation` for logic called by trusted server-side code (like HTTP actions) and wrap it with a secure public mutation for client access.
4. Extract shared business logic into helper functions to avoid circular dependencies when both internal and public mutations need the same logic.
