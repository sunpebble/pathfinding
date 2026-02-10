## 2024-05-23 - [Critical Auth Bypass in HTTP Actions]
**Vulnerability:** Found `getUserIdFromAuth` helper manually decoding JWT tokens without signature verification in `convex/http.ts`. This allowed forging user identities by crafting a JWT with an arbitrary `sub`.
**Learning:** Convex HTTP actions do not automatically verify authentication unless `ctx.auth` is used. Manual token parsing is extremely dangerous.
**Prevention:** Always use `ctx.auth.getUserIdentity()` in `httpAction` handlers. Never rely on `request.headers.get('Authorization')` manual parsing.
