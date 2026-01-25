# Phase 2: Infrastructure - Research

**Researched:** 2026-01-25
**Domain:** Browser automation infrastructure (smart waits, session management, cookie persistence)
**Confidence:** HIGH

## Summary

Phase 2 focuses on building shared infrastructure for reliable crawling: smart wait strategies to replace fixed `sleep()` delays, login session management for platforms requiring authentication, and session persistence across crawler runs. This research informs how to implement INFRA-01, INFRA-02, and INFRA-03.

The existing codebase already has foundational infrastructure in place. The `waitForContentStable()` function exists in `diagnostics/capture.ts` and needs to be exported and integrated into all crawlers. The `mcp-client.ts` already supports persistent Chrome profiles via the `persistent` option on `initMCP()`. The `login-helper.ts` script provides a working pattern for manual login with session save. The primary work is integration, refinement, and adding session validation.

**Primary recommendation:** Export existing `waitForContentStable()` for crawler use, add `validateSession()` function to check login status before crawling, and ensure all crawlers use the appropriate session type based on their login requirements.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                   | Version          | Purpose                                    | Why Standard                                                        |
| ------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| @modelcontextprotocol/sdk | current          | MCP client for Chrome DevTools             | Already in use, provides browser automation via chrome-devtools-mcp |
| chrome-devtools-mcp       | latest (via npx) | Chrome automation with persistent profiles | Already in use, supports `--userDataDir` for session persistence    |

### Supporting

| Library       | Version  | Purpose                         | When to Use                     |
| ------------- | -------- | ------------------------------- | ------------------------------- |
| node:fs       | built-in | File system for session storage | Checking if session files exist |
| node:os       | built-in | Home directory for user data    | Default session storage path    |
| node:path     | built-in | Path manipulation               | Constructing session file paths |
| node:readline | built-in | CLI interaction                 | Login helper script             |

### Existing Utilities

| Utility                  | Location                 | Purpose                                  | Status                                   |
| ------------------------ | ------------------------ | ---------------------------------------- | ---------------------------------------- |
| `waitForContentStable()` | `diagnostics/capture.ts` | Smart content stability detection        | EXISTS - needs export                    |
| `initMCP()`              | `mcp-client.ts`          | Initialize with persistent/isolated mode | EXISTS - working                         |
| `takeSnapshot()`         | `mcp-client.ts`          | Capture page accessibility tree          | EXISTS - working                         |
| `DEFAULT_USER_DATA_DIR`  | `mcp-client.ts`          | Session storage path                     | EXISTS - `~/.pathfinding/chrome-profile` |
| `isLoggedIn()`           | `login-helper.ts`        | Basic login detection                    | EXISTS - platform-specific               |

**No new dependencies required.** All infrastructure can be built with existing tools.

## Architecture Patterns

### Recommended Project Structure

```
src/lib/crawlers/
├── diagnostics/           # Diagnosis utilities (from Phase 1)
│   ├── capture.ts         # waitForContentStable (export for crawlers)
│   ├── report.ts          # categorizeFailure, detectAntiBotIndicators
│   └── index.ts           # Public exports
├── session/               # NEW: Session management (INFRA-02, INFRA-03)
│   ├── manager.ts         # SessionManager class
│   ├── validators.ts      # Platform-specific login validators
│   └── index.ts           # Public exports
├── mcp-client.ts          # Chrome DevTools MCP wrapper
├── accessibility-parser.ts # Snapshot content extraction
├── index.ts               # Crawler registry
└── [platform].ts          # Platform crawlers
```

### Pattern 1: Smart Wait Strategy

**What:** Replace fixed `sleep()` with intelligent content stability detection
**When to use:** After every navigation and scroll action
**Example:**

```typescript
// Source: diagnostics/capture.ts (existing implementation)
export async function waitForContentStable(
  maxWait: number = 10000,
  stabilityWindow: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  let lastSnapshotLength = 0;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    const snapshot = await takeSnapshot();
    const currentLength = snapshot.content.length;

    // Content is stable if two consecutive snapshots have same length
    // and content has reasonable size (> 1000 chars)
    if (currentLength === lastSnapshotLength && currentLength > 1000) {
      stableCount++;
      if (stableCount >= 2) {
        return true;
      }
    } else {
      stableCount = 0;
    }

    lastSnapshotLength = currentLength;
    await sleep(stabilityWindow);
  }

  return false;
}
```

### Pattern 2: Session Manager

**What:** Centralized session management for login-required platforms
**When to use:** For Mafengwo and Xiaohongshu crawlers
**Example:**

```typescript
// Source: Pattern derived from existing login-helper.ts and mcp-client.ts

export interface SessionConfig {
  platform: string;
  requiresLogin: boolean;
  loginUrl: string;
  validationPatterns: {
    loggedIn: RegExp;
    loggedOut: RegExp;
  };
}

const PLATFORM_SESSIONS: Record<string, SessionConfig> = {
  xiaohongshu: {
    platform: 'xiaohongshu',
    requiresLogin: true,
    loginUrl: 'https://www.xiaohongshu.com/explore',
    validationPatterns: {
      loggedIn: /退出|logout|已登录|个人中心/i,
      loggedOut: /登录|sign.?in|扫码登录|请先登录/i,
    },
  },
  mafengwo: {
    platform: 'mafengwo',
    requiresLogin: false, // Recommended but not required
    loginUrl: 'https://www.mafengwo.cn/',
    validationPatterns: {
      loggedIn: /退出|我的主页|个人中心/i,
      loggedOut: /登录|请先登录/i,
    },
  },
};

export async function validateSession(platform: string): Promise<{
  isValid: boolean;
  needsLogin: boolean;
  message: string;
}> {
  const config = PLATFORM_SESSIONS[platform];
  if (!config) {
    return { isValid: true, needsLogin: false, message: 'No session required' };
  }

  try {
    const snapshot = await takeSnapshot();
    const content = snapshot.content;

    const hasLoggedInIndicator =
      config.validationPatterns.loggedIn.test(content);
    const hasLoggedOutIndicator =
      config.validationPatterns.loggedOut.test(content);

    if (hasLoggedInIndicator && !hasLoggedOutIndicator) {
      return { isValid: true, needsLogin: false, message: 'Session valid' };
    }

    if (config.requiresLogin) {
      return { isValid: false, needsLogin: true, message: 'Login required' };
    }

    return {
      isValid: true,
      needsLogin: false,
      message: 'Login recommended but not required',
    };
  } catch (error) {
    return {
      isValid: false,
      needsLogin: true,
      message: `Validation failed: ${error}`,
    };
  }
}
```

### Pattern 3: Session-Aware Crawler Initialization

**What:** Crawlers check session validity before crawling
**When to use:** At the start of each crawler that benefits from login
**Example:**

```typescript
// Source: Pattern for crawler initialization

export async function crawlXiaohongshu(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];

  try {
    // Use persistent session for login-required platform
    await initMCP({ persistent: true });
    console.log('[Xiaohongshu] Using persistent Chrome session');

    // Navigate to platform
    await navigateTo('https://www.xiaohongshu.com/explore');
    await waitForContentStable();

    // Validate session before crawling
    const session = await validateSession('xiaohongshu');
    if (!session.isValid) {
      console.warn('[Xiaohongshu] Session invalid:', session.message);
      console.warn(
        '  Run: pnpm --filter ai-service exec tsx src/login-helper.ts xiaohongshu'
      );
      // Continue with limited functionality or return early
    }

    // Proceed with crawling...
  } finally {
    await disconnect();
  }

  return results;
}
```

### Anti-Patterns to Avoid

- **Fixed sleep() after navigation:** Use `waitForContentStable()` instead. Fixed delays are either too short (miss content) or too long (waste time).
- **Separate login before each crawl:** Use persistent browser profile. Login once, reuse session.
- **Ignoring session validation:** Always check session status before crawling login-required platforms.
- **Creating new browser profile per run:** Destroys saved sessions. Use `persistent: true` for platforms needing login.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                     | Don't Build                    | Use Instead                               | Why                                                   |
| --------------------------- | ------------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| Wait for content to load    | Custom polling loop            | `waitForContentStable()` from diagnostics | Already implemented, tested, handles edge cases       |
| Browser session persistence | Manual cookie save/restore     | `initMCP({ persistent: true })`           | chrome-devtools-mcp handles userDataDir automatically |
| Chrome profile management   | Custom profile directory logic | `DEFAULT_USER_DATA_DIR` constant          | Already defined, creates directory if needed          |
| Login detection             | Simple text search             | `detectAntiBotIndicators()`               | Handles captcha, login wall, blocked states           |
| Failure categorization      | Ad-hoc error handling          | `categorizeFailure()`                     | Distinguishes acquisition vs parsing issues           |

**Key insight:** Phase 1 already created most infrastructure needed. Phase 2 is about exporting, integrating, and adding session validation layer.

## Common Pitfalls

### Pitfall 1: Not Exporting waitForContentStable()

**What goes wrong:** Function exists in diagnostics but crawlers can't use it
**Why it happens:** diagnostics/index.ts only exports some functions, waitForContentStable is buried in capture.ts
**How to avoid:** Add explicit export in diagnostics/index.ts
**Warning signs:** Crawlers still using `sleep()` after Phase 2

### Pitfall 2: Session Type Mismatch

**What goes wrong:** Crawler uses isolated session when persistent needed, or vice versa
**Why it happens:** Default is isolated (`persistent: false`), easy to forget
**How to avoid:** Create clear mapping of which platforms need persistent sessions
**Warning signs:** Login state not preserved between runs

### Pitfall 3: Not Validating Session Before Crawl

**What goes wrong:** Crawler proceeds without valid session, gets partial data or blocked
**Why it happens:** Session validation adds complexity, easy to skip
**How to avoid:** Make session validation part of crawler initialization pattern
**Warning signs:** Inconsistent results between runs, especially for Xiaohongshu

### Pitfall 4: Hardcoded Wait Times in waitForContentStable()

**What goes wrong:** Some pages need longer/shorter stability windows
**Why it happens:** Default values work for most cases, edge cases overlooked
**How to avoid:** Allow per-platform configuration of maxWait and stabilityWindow
**Warning signs:** Specific platforms consistently timing out or snapshotting too early

### Pitfall 5: Not Handling Captcha/Login Wall After Navigation

**What goes wrong:** Content stability is reached, but page shows captcha not content
**Why it happens:** Captcha pages are "stable" - just not what we want
**How to avoid:** Check for anti-bot indicators after stability, before parsing
**Warning signs:** Snapshot contains "验证" or "登录" instead of expected content

## Code Examples

Verified patterns from existing codebase:

### Export waitForContentStable from diagnostics

```typescript
// Source: diagnostics/index.ts - ADD this export
export {
  type DiagnosticCapture,
  captureForDiagnosis,
  waitForContentStable, // ADD THIS LINE
} from './capture.js';
```

### Session Manager Interface

```typescript
// Source: New file - session/manager.ts
import { takeSnapshot } from '../mcp-client.js';
import { detectAntiBotIndicators } from '../diagnostics/index.js';

export interface SessionStatus {
  isValid: boolean;
  needsLogin: boolean;
  hasAntiBot: boolean;
  message: string;
}

export interface PlatformSessionConfig {
  platform: string;
  requiresLogin: boolean;
  loginUrl: string;
  sessionIndicators: {
    loggedIn: RegExp[];
    loggedOut: RegExp[];
  };
}

export const PLATFORM_CONFIGS: Record<string, PlatformSessionConfig> = {
  xiaohongshu: {
    platform: 'xiaohongshu',
    requiresLogin: true,
    loginUrl: 'https://www.xiaohongshu.com/explore',
    sessionIndicators: {
      loggedIn: [/退出/i, /个人中心/i, /我的/i],
      loggedOut: [/登录/i, /扫码/i, /请先登录/i],
    },
  },
  mafengwo: {
    platform: 'mafengwo',
    requiresLogin: false,
    loginUrl: 'https://www.mafengwo.cn/',
    sessionIndicators: {
      loggedIn: [/退出/i, /我的主页/i],
      loggedOut: [/登录/i],
    },
  },
  ctrip: {
    platform: 'ctrip',
    requiresLogin: false,
    loginUrl: '',
    sessionIndicators: { loggedIn: [], loggedOut: [] },
  },
  qunar: {
    platform: 'qunar',
    requiresLogin: false,
    loginUrl: '',
    sessionIndicators: { loggedIn: [], loggedOut: [] },
  },
  tongcheng: {
    platform: 'tongcheng',
    requiresLogin: false,
    loginUrl: '',
    sessionIndicators: { loggedIn: [], loggedOut: [] },
  },
};

export async function checkSession(platform: string): Promise<SessionStatus> {
  const config = PLATFORM_CONFIGS[platform];

  if (!config || !config.requiresLogin) {
    return {
      isValid: true,
      needsLogin: false,
      hasAntiBot: false,
      message: 'No login required for this platform',
    };
  }

  try {
    const snapshot = await takeSnapshot();
    const content = snapshot.content;

    // Check for anti-bot indicators first
    const antiBot = detectAntiBotIndicators(content);
    if (antiBot.captcha || antiBot.blocked) {
      return {
        isValid: false,
        needsLogin: false,
        hasAntiBot: true,
        message: antiBot.captcha ? 'Captcha detected' : 'Access blocked',
      };
    }

    // Check login indicators
    const hasLoggedIn = config.sessionIndicators.loggedIn.some((p) =>
      p.test(content)
    );
    const hasLoggedOut = config.sessionIndicators.loggedOut.some((p) =>
      p.test(content)
    );

    if (hasLoggedIn && !hasLoggedOut) {
      return {
        isValid: true,
        needsLogin: false,
        hasAntiBot: false,
        message: 'Session valid - logged in',
      };
    }

    if (antiBot.loginWall || hasLoggedOut) {
      return {
        isValid: false,
        needsLogin: true,
        hasAntiBot: false,
        message: 'Login required - please run login-helper',
      };
    }

    // Unclear state - treat as needing login if platform requires it
    return {
      isValid: !config.requiresLogin,
      needsLogin: config.requiresLogin,
      hasAntiBot: false,
      message: config.requiresLogin
        ? 'Session state unclear - login recommended'
        : 'Session state unclear - proceeding without login',
    };
  } catch (error) {
    return {
      isValid: false,
      needsLogin: true,
      hasAntiBot: false,
      message: `Session check failed: ${error}`,
    };
  }
}

export function needsPersistentSession(platform: string): boolean {
  const config = PLATFORM_CONFIGS[platform];
  return config?.requiresLogin ?? false;
}
```

### Updated Crawler Pattern with Smart Wait

```typescript
// Source: Pattern for all crawlers post-Phase-2

import { initMCP, navigateTo, disconnect, takeSnapshot } from './mcp-client.js';
import { waitForContentStable } from './diagnostics/index.js';
import { checkSession, needsPersistentSession } from './session/index.js';

export async function crawlPlatform(
  platform: string,
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];

  try {
    // 1. Initialize with appropriate session type
    const usePersistent = needsPersistentSession(platform);
    await initMCP({ persistent: usePersistent });
    console.log(
      `[${platform}] Using ${usePersistent ? 'persistent' : 'isolated'} Chrome session`
    );

    // 2. Navigate to platform
    await navigateTo(getPlatformUrl(platform, city));

    // 3. Wait for content stability (replaces fixed sleep)
    const stable = await waitForContentStable();
    if (!stable) {
      console.warn(`[${platform}] Content did not stabilize within timeout`);
    }

    // 4. Validate session (for login-required platforms)
    const session = await checkSession(platform);
    if (!session.isValid) {
      console.warn(`[${platform}] ${session.message}`);
      if (session.needsLogin) {
        console.warn(
          `  Run: pnpm --filter ai-service exec tsx src/login-helper.ts ${platform}`
        );
      }
      // Decide: return early or proceed with limited data
    }

    // 5. Proceed with crawling...
    // ...
  } finally {
    await disconnect();
  }

  return results;
}
```

## State of the Art

| Old Approach             | Current Approach               | When Changed      | Impact                            |
| ------------------------ | ------------------------------ | ----------------- | --------------------------------- |
| Fixed `sleep(2000)`      | `waitForContentStable()`       | Phase 1 (created) | More reliable content capture     |
| Isolated sessions always | Persistent for login platforms | Already supported | Session reuse possible            |
| No session validation    | `checkSession()` before crawl  | Phase 2 (to add)  | Early warning when login needed   |
| Ad-hoc anti-bot checks   | `detectAntiBotIndicators()`    | Phase 1 (created) | Consistent failure categorization |

**Deprecated/outdated:**

- `sleep()` for content loading: Still exists, should be replaced with `waitForContentStable()`
- Manual cookie handling: Not needed, chrome-devtools-mcp handles via userDataDir

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal stabilityWindow for each platform**
   - What we know: Default 500ms works for most cases
   - What's unclear: Some platforms may need different values
   - Recommendation: Start with default, add per-platform config if issues arise

2. **Session expiration handling**
   - What we know: Sessions expire (cookies have TTL)
   - What's unclear: How long sessions last for each platform
   - Recommendation: Add session refresh mechanism in v2 (not Phase 2 scope)

3. **Concurrent crawling with persistent session**
   - What we know: chrome-devtools-mcp uses single Chrome instance
   - What's unclear: Behavior when multiple crawlers try to use same profile
   - Recommendation: Don't run multiple persistent-session crawlers simultaneously

## Sources

### Primary (HIGH confidence)

- **Codebase analysis** - `mcp-client.ts`, `diagnostics/capture.ts`, `login-helper.ts`
- **Phase 1 diagnosis** - `DIAGNOSIS-SUMMARY.md`, platform diagnosis reports
- **Playwright official docs** - Authentication and session management patterns

### Secondary (MEDIUM confidence)

- **chrome-devtools-mcp** - userDataDir and persistent session support (inferred from codebase usage)

### Tertiary (LOW confidence)

- None - all findings based on codebase analysis and official documentation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based on existing codebase, no new dependencies
- Architecture: HIGH - Pattern extends existing infrastructure
- Pitfalls: HIGH - Derived from Phase 1 diagnosis and codebase analysis

**Research date:** 2026-01-25
**Valid until:** 90 days (stable infrastructure patterns)

---

## Implementation Checklist for Planner

Based on this research, Phase 2 should implement:

### INFRA-01: Smart Wait Strategies

- [ ] Export `waitForContentStable()` from `diagnostics/index.ts`
- [ ] Update each crawler to import from diagnostics
- [ ] Replace all `sleep()` calls after navigation with `waitForContentStable()`
- [ ] Keep `sleep()` for rate limiting between requests

### INFRA-02: Login Session Management

- [ ] Create `session/manager.ts` with `checkSession()` function
- [ ] Create `session/validators.ts` with platform-specific validation patterns
- [ ] Create `session/index.ts` with public exports
- [ ] Update `login-helper.ts` to use session manager

### INFRA-03: Session Persistence

- [ ] Already works via `initMCP({ persistent: true })`
- [ ] Add `needsPersistentSession(platform)` helper function
- [ ] Update Mafengwo crawler to use persistent session
- [ ] Update Xiaohongshu crawler to use persistent session
- [ ] Verify session validity before crawling
