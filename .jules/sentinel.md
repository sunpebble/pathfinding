## 2025-02-14 - Unauthenticated Crawl Job Mutations

**Vulnerability:** The `create`, `start`, `cancel`, and `remove` mutations in `convex/crawlJobs.ts` were publicly exposed without any authentication checks. Additionally, the Next.js API routes (`apps/dashboard/src/app/api/crawler/crawl-jobs/...`) used a global, unauthenticated `ConvexHttpClient` instance, making it impossible to pass user credentials safely and exposing the API to unauthenticated access.
**Learning:** Convex `mutation` and `query` functions are public endpoints by default unless explicitly protected. Proxying these through Next.js API routes can obscure this fact. Global client instances in serverless environments (like Next.js API routes) are dangerous for stateful operations like authentication.
**Prevention:**

1. Always include `await ctx.auth.getUserIdentity()` checks at the start of any public-facing Convex mutation or query.
2. Use `internalMutation` for operations that should only be called by other internal functions or actions.
3. When proxying requests in Next.js, always instantiate `ConvexHttpClient` within the request handler and explicitly forward the `Authorization` header using `client.setAuth()`.
