# Implementation Plan: Steel Browser + Stagehand Migration

**Date**: 2026-01-30
**Status**: PLANNING_COMPLETE

---

## Task Summary

| Phase                      | Tasks        | Effort  | Parallel         |
| -------------------------- | ------------ | ------- | ---------------- |
| Phase 1: Foundation        | T1-T6        | 6 tasks | T1∥T2, T3∥T4∥T5  |
| Phase 2: Simple Platforms  | T7-T10       | 4 tasks | T7∥T8∥T9∥T10     |
| Phase 3: Complex Platforms | T11-T15      | 5 tasks | T11∥T12, T14∥T15 |
| Phase 4: Integration       | T16-T19      | 4 tasks | T16∥T17          |
| **Total**                  | **19 tasks** |         |                  |

---

## Phase 1: Foundation

### T1: Create BrowserClient Interface

- **Depends on**: None
- **Files**:
  - CREATE: `clients/types.ts`
  - CREATE: `clients/index.ts`
- **Acceptance**:
  - [ ] `BrowserClient` interface with all methods
  - [ ] `PageSnapshot`, `NetworkRequest`, `SessionOptions` types
  - [ ] `createBrowserClient()` factory with feature flag
  - [ ] TypeScript compiles
- **Parallel with**: T2

### T2: Install Dependencies

- **Depends on**: None
- **Files**:
  - MODIFY: `package.json`
- **Acceptance**:
  - [ ] `steel-sdk` added
  - [ ] `@browserbasehq/stagehand` added
  - [ ] `pnpm install` succeeds
- **Parallel with**: T1

### T3: Implement SteelClient

- **Depends on**: T1, T2
- **Files**:
  - CREATE: `clients/steel-client.ts`
- **Acceptance**:
  - [ ] Implements `BrowserClient` interface
  - [ ] CDP network capture works
  - [ ] Session persistence works
  - [ ] Local mode functional
- **Parallel with**: T4, T5

### T4: Implement StagehandClient

- **Depends on**: T1, T2
- **Files**:
  - CREATE: `clients/stagehand-client.ts`
- **Acceptance**:
  - [ ] Wraps `act()`, `extract()`, `observe()`
  - [ ] Integrates with Steel browser
  - [ ] API key configuration works
- **Parallel with**: T3, T5

### T5: Create MCPBrowserClient Adapter

- **Depends on**: T1
- **Files**:
  - CREATE: `clients/mcp-adapter.ts`
- **Acceptance**:
  - [ ] Wraps existing `mcp-client.ts`
  - [ ] Implements `BrowserClient` interface
  - [ ] Enables rollback via feature flag
- **Parallel with**: T3, T4

### T6: Update Session Manager for Steel

- **Depends on**: T3
- **Files**:
  - MODIFY: `session/manager.ts`
- **Acceptance**:
  - [ ] Steel session context support
  - [ ] Preserve MCP logic for rollback
  - [ ] `initSessionForPlatform()` works with Steel

---

## Phase 2: Simple Platforms

### T7: Migrate Ctrip Crawler

- **Depends on**: T5, T6
- **Files**:
  - MODIFY: `ctrip.ts`
- **Acceptance**:
  - [ ] Replace MCP with `BrowserClient`
  - [ ] `crawlCtrip('北京')` returns valid results
  - [ ] Works with both Steel and MCP
- **Parallel with**: T8, T9, T10

### T8: Migrate Qunar Crawler

- **Depends on**: T5, T6
- **Files**:
  - MODIFY: `qunar.ts`
- **Acceptance**:
  - [ ] Replace MCP with `BrowserClient`
  - [ ] `crawlQunar('北京')` returns valid results
- **Parallel with**: T7, T9, T10

### T9: Migrate Tongcheng Crawler

- **Depends on**: T5, T6
- **Files**:
  - MODIFY: `tongcheng.ts`
- **Acceptance**:
  - [ ] Replace MCP with `BrowserClient`
  - [ ] `crawlTongcheng('北京')` returns valid results
- **Parallel with**: T7, T8, T10

### T10: Create Stagehand Extraction Schemas

- **Depends on**: T4
- **Files**:
  - CREATE: `stagehand/extractors/common.ts`
- **Acceptance**:
  - [ ] Zod schemas for common fields
  - [ ] Reusable across platforms
- **Parallel with**: T7, T8, T9

---

## Phase 3: Complex Platforms

### T11: Migrate Mafengwo Crawler

- **Depends on**: T6
- **Files**:
  - MODIFY: `mafengwo.ts`
- **Acceptance**:
  - [ ] Replace MCP with `BrowserClient`
  - [ ] Session persistence works
  - [ ] Captcha detection functional
- **Parallel with**: T12

### T12: Create Xiaohongshu Extraction Schemas

- **Depends on**: T10
- **Files**:
  - CREATE: `stagehand/extractors/xiaohongshu.ts`
- **Acceptance**:
  - [ ] Note structure schemas
  - [ ] Video/comment/user schemas
- **Parallel with**: T11

### T13: Migrate Xiaohongshu Core

- **Depends on**: T11, T12
- **Files**:
  - MODIFY: `xiaohongshu.ts`
- **Acceptance**:
  - [ ] Replace MCP with `BrowserClient`
  - [ ] Network capture for API
  - [ ] Session validation works
  - [ ] Quality scoring unchanged

### T14: Xiaohongshu Video URL Capture

- **Depends on**: T13
- **Files**:
  - MODIFY: `xiaohongshu.ts`
- **Acceptance**:
  - [ ] Video CDN URLs captured
  - [ ] `videoUrlCapturedAt` timestamp set
  - [ ] URLs valid 30+ seconds
- **Parallel with**: T15

### T15: Xiaohongshu Search & User Profile

- **Depends on**: T13
- **Files**:
  - MODIFY: `xiaohongshu.ts`
- **Acceptance**:
  - [ ] Search mode works
  - [ ] User profile mode works
  - [ ] Comments functional
- **Parallel with**: T14

---

## Phase 4: Integration & Cleanup

### T16: Create Integration Tests

- **Depends on**: T7-T15
- **Files**:
  - CREATE: `__tests__/integration.test.ts`
- **Acceptance**:
  - [ ] All platforms tested
  - [ ] Quality metrics verified
  - [ ] Session tests pass
- **Parallel with**: T17

### T17: Update Environment Configuration

- **Depends on**: T3, T4
- **Files**:
  - MODIFY: `.env.example`
  - MODIFY: `README.md`
- **Acceptance**:
  - [ ] Document all new env vars
  - [ ] Migration guide added
- **Parallel with**: T16

### T18: Remove Legacy MCP Code

- **Depends on**: T16
- **Files**:
  - DELETE: `mcp-client.ts`
  - DELETE: `clients/mcp-adapter.ts`
  - MODIFY: `package.json` (remove MCP SDK)
- **Acceptance**:
  - [ ] MCP code removed
  - [ ] All tests pass
  - [ ] No dead references

### T19: Update Index Exports

- **Depends on**: T18
- **Files**:
  - MODIFY: `index.ts`
- **Acceptance**:
  - [ ] Export `BrowserClient`
  - [ ] Export factory function
  - [ ] Clean compile

---

## Dependency Graph

```
T1 ─┬─> T3 ─┬─> T6 ─┬─> T7 ─┐
    │       │       ├─> T8 ─┼─> T16 ─> T18 ─> T19
    │       │       └─> T9 ─┘
    │       │
T2 ─┤       └─> T11 ─┐
    │               │
    └─> T4 ─> T10 ──┼─> T12 ─> T13 ─┬─> T14 ─┐
                    │               └─> T15 ─┼─> T16
                    │                        │
    T5 ────────────>┘                        │
                                             │
                              T17 ───────────┘
```

---

## Execution Order (Parallel Waves)

**Wave 1**: T1, T2 (parallel)
**Wave 2**: T3, T4, T5 (parallel, after Wave 1)
**Wave 3**: T6, T10 (parallel, after T3/T4)
**Wave 4**: T7, T8, T9, T11, T12 (parallel, after Wave 3)
**Wave 5**: T13 (after T11, T12)
**Wave 6**: T14, T15, T17 (parallel, after T13)
**Wave 7**: T16 (after all platforms)
**Wave 8**: T18 (after T16)
**Wave 9**: T19 (after T18)

---

**Signal**: PLANNING_COMPLETE
