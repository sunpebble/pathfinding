# Crawler Refactoring Specification

## Steel Browser + Stagehand Migration

**Date**: 2026-01-30
**Status**: EXPANSION_COMPLETE

---

## Executive Summary

使用 Steel Browser + Stagehand 重构现有的 6 个中国旅行平台爬虫，替换 Chrome DevTools MCP 架构。

## 1. Requirements Analysis

### 1.1 Functional Requirements (Must Preserve)

| Feature                           | Current Implementation           | Priority |
| --------------------------------- | -------------------------------- | -------- |
| **Accessibility Tree Parsing**    | `accessibility-parser.ts`        | HIGH     |
| **Network Request Interception**  | MCP `listNetworkRequests()`      | CRITICAL |
| **Persistent Session Management** | `session/manager.ts`             | CRITICAL |
| **Content Quality Filtering**     | `xiaohongshu.ts` quality scoring | HIGH     |
| **Video URL Capture**             | 30-second expiry tracking        | MEDIUM   |
| **Comment Fetching**              | API response parsing             | MEDIUM   |
| **Search/User Profile Modes**     | Xiaohongshu alternative modes    | MEDIUM   |

### 1.2 Platform Complexity

| Platform    | Complexity | Key Challenges                           |
| ----------- | ---------- | ---------------------------------------- |
| Xiaohongshu | **HIGH**   | API interception, login wall, video URLs |
| Mafengwo    | MEDIUM     | Session persistence, captcha             |
| Ctrip       | MEDIUM     | List + detail pattern                    |
| Qunar       | MEDIUM     | Similar to Ctrip                         |
| Tongcheng   | MEDIUM     | Similar to Ctrip                         |
| Qyer        | LOW        | Already Playwright-native                |

### 1.3 New Features from Target Stack

- **Steel Browser**: Cloud sessions, proxy rotation, anti-detection
- **Stagehand**: AI-powered `act()`, `extract()`, `observe()` methods

---

## 2. Technical Specification

### 2.1 Technology Stack

| Package                    | Version  | Purpose                |
| -------------------------- | -------- | ---------------------- |
| `steel-sdk`                | latest   | Browser infrastructure |
| `@browserbasehq/stagehand` | latest   | AI automation          |
| `playwright`               | ^1.58.0  | Low-level CDP access   |
| `zod`                      | existing | Extraction schemas     |

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Crawler Orchestration                         │
│                         (index.ts - unchanged)                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│    BrowserClient Interface   │   │     Legacy Playwright Path      │
│    (new abstraction layer)   │   │    (qyer.ts - minimal changes)  │
└────────────┬─────────────────┘   └───────────────────────────────────┘
             │
   ┌─────────┴─────────┐
   ▼                   ▼
┌──────────────┐  ┌──────────────┐
│ StagehandClient │  │  SteelClient  │
│ (AI actions)    │  │ (CDP/network) │
└──────────────┘  └──────────────┘
        │                 │
        └────────┬────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Steel Browser                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ Stealth     │  │ Sessions    │  │ CDP Access (network events) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 File Structure

**New Files:**

```
apps/ai-service/src/lib/crawlers/
├── clients/
│   ├── index.ts              # BrowserClient interface + factory
│   ├── steel-client.ts       # Steel CDP/network operations
│   ├── stagehand-client.ts   # Stagehand AI wrapper
│   └── types.ts              # Shared types
├── stagehand/
│   ├── extractors/
│   │   ├── xiaohongshu.ts    # XHS extraction schemas
│   │   ├── ctrip.ts          # Ctrip schemas
│   │   └── common.ts         # Shared patterns
│   └── actions/
│       ├── navigation.ts     # Reusable navigation
│       └── scroll.ts         # Scroll actions
```

**Modified Files:**

- `xiaohongshu.ts` - Replace MCP with BrowserClient
- `ctrip.ts`, `mafengwo.ts`, `qunar.ts`, `tongcheng.ts` - Same
- `session/manager.ts` - Adapt to Steel session API

**Keep Unchanged:**

- `accessibility-parser.ts` - Core parsing logic
- `qyer.ts` - Already Playwright-native
- `index.ts` - Orchestration

### 2.4 BrowserClient Interface

```typescript
export interface BrowserClient {
  // Lifecycle
  init(options?: SessionOptions): Promise<void>;
  close(): Promise<void>;

  // Navigation
  navigateTo(url: string, options?: { timeout?: number }): Promise<void>;

  // Content
  takeSnapshot(options?: { verbose?: boolean }): Promise<PageSnapshot>;
  getPageContent(): Promise<string>;

  // Network (for API interception)
  enableNetworkCapture(patterns?: string[]): Promise<void>;
  listNetworkRequests(types?: string[]): Promise<NetworkRequest[]>;
  getNetworkRequest(id: string): Promise<NetworkRequest | null>;

  // AI-powered actions (Stagehand)
  act(instruction: string): Promise<void>;
  extract<T>(instruction: string, schema: z.ZodSchema<T>): Promise<T>;

  // Low-level
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  scroll(direction: 'up' | 'down', amount?: number): Promise<void>;
}
```

### 2.5 Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...         # Stagehand AI
STEEL_API_KEY=steel_...              # Steel Cloud
STEEL_LOCAL=true                     # Dev mode
STEEL_SESSION_DIR=~/.pathfinding/steel-sessions
```

---

## 3. Migration Strategy

### Phase 1: Foundation (Week 1)

- Create `BrowserClient` interface
- Implement `SteelClient` with CDP network capture
- Implement `StagehandClient` wrapper
- Add feature flag: `USE_STEEL_BROWSER=true`

### Phase 2: Simple Platforms (Week 2)

- Migrate Ctrip (no login required)
- Migrate Qunar (similar to Ctrip)
- Migrate Tongcheng (similar pattern)

### Phase 3: Complex Platforms (Week 3-4)

- Migrate Mafengwo (session persistence)
- Migrate Xiaohongshu (network interception, video URLs)

### Phase 4: Cleanup (Week 5)

- Remove `mcp-client.ts`
- Remove `@modelcontextprotocol/sdk` dependency

### Rollback Plan

```typescript
const USE_STEEL = process.env.USE_STEEL_BROWSER === 'true';

export function createBrowserClient(): BrowserClient {
  if (USE_STEEL) {
    return new SteelBrowserClient();
  }
  return new MCPBrowserClient(); // Legacy path
}
```

---

## 4. Acceptance Criteria

| Criterion                  | Definition                         |
| -------------------------- | ---------------------------------- |
| All 6 platforms work       | Each returns valid `CrawlResult[]` |
| Content quality maintained | qualityScore 50-100 range          |
| Session persistence works  | Login state survives restarts      |
| Network capture works      | Xiaohongshu API captured           |
| Video URLs fresh           | Valid for 30+ seconds              |
| No regressions             | All tests pass                     |

---

**Signal**: EXPANSION_COMPLETE
