# Codebase Concerns

**Analysis Date:** 2026-01-25

## Tech Debt

**Error Reporting in ErrorBoundary:**

- Issue: The `ErrorBoundary` component has a placeholder for reporting errors, indicating that actual error tracking is not yet implemented.
- Files: `apps/dashboard/src/components/error-boundary.tsx`
- Impact: Critical errors in the UI might go unnoticed in production environments, making debugging and proactive issue resolution difficult.
- Fix approach: Integrate with a proper error tracking service like Sentry or similar.

**Incomplete Delete Functionality:**

- Issue: There is a placeholder comment indicating that delete functionality for itineraries is not fully implemented, specifically lacking a proper modal confirmation.
- Files: `apps/dashboard/src/app/itineraries/[id]/page.tsx`
- Impact: Users might accidentally delete data without confirmation, leading to data loss or a poor user experience.
- Fix approach: Implement a confirmation modal before proceeding with delete operations.

## Known Bugs

Not explicitly detected.

## Security Considerations

Not explicitly detected.

## Performance Bottlenecks

Not explicitly detected beyond large generated type definition files, which are not usually a performance concern for runtime.

## Fragile Areas

**Extensive `return null` or `return []` without clear context:**

- Files:
  - `apps/ai-service/src/lib/crawlers/accessibility-parser.ts`
  - `apps/ai-service/src/lib/crawlers/xiaohongshu.ts`
  - `apps/ai-service/src/lib/crawlers/ctrip.ts`
  - `apps/ai-service/src/lib/crawlers/mcp-client.ts`
  - `apps/ai-service/src/lib/crawlers/index.ts`
  - `apps/ai-service/src/lib/crawlers/qunar.ts`
  - `apps/ai-service/src/routes/weather.ts`
  - `apps/ai-service/src/services/enrichment-poller.ts`
  - `apps/dashboard/src/app/chat/page.tsx`
  - `apps/dashboard/src/app/auth/signup/page.tsx`
  - `apps/dashboard/src/app/auth/signin/page.tsx`
  - `apps/dashboard/src/components/ai-elements/prompt-input.tsx`
  - `apps/dashboard/src/components/ai-elements/message.tsx`
  - `apps/dashboard/src/components/invite-dialog.tsx`
  - `apps/dashboard/src/components/itinerary-editor.tsx`
  - `apps/dashboard/src/components/poi-editor.tsx`
  - `packages/crawler-types/src/categories.ts`
- Why fragile: Numerous functions return `null` or empty arrays/objects (`[]`, `{}`) without clear indication of the reason or explicit error handling, which could lead to unexpected behavior or difficult-to-debug issues if callers don't handle these specific `null`/empty returns correctly. This pattern suggests a lack of consistent error handling or data validation.
- Safe modification: Ensure that `null` or empty returns are explicitly documented, or consider throwing specific errors/exceptions where appropriate to clearly indicate failure conditions. Callers should always expect and handle these cases.
- Test coverage: Ensure unit tests explicitly cover scenarios where these functions return `null` or empty values.

## Scaling Limits

Not explicitly detected.

## Dependencies at Risk

Not explicitly detected from the provided information.

## Missing Critical Features

Not explicitly detected.

## Test Coverage Gaps

Not explicitly detected, but the prevalence of `return null` patterns suggests potential gaps in testing how consuming functions handle these empty returns.

---

_Concerns audit: 2026-01-25_
