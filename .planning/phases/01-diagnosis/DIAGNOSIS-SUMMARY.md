# Phase 1: Diagnosis Summary

**Phase:** 01-diagnosis
**Completed:** 2026-01-25
**Status:** ✅ Complete

## 1. Executive Summary

Phase 1 diagnosed all 5 crawler platforms to identify root causes of incomplete data extraction.

### Key Findings

- **2 platforms (Ctrip, Qunar)** have **parsing issues** — they navigate to detail pages but extraction is incomplete
- **2 platforms (Mafengwo, Tongcheng)** have **architecture issues** — they only extract from list pages, returning placeholder content
- **1 platform (Xiaohongshu)** has **bimodal behavior** — excellent when API works, placeholder when it fails (needs login)

### Readiness Assessment

✅ Root causes clearly identified for all platforms
✅ Fix approaches defined and validated against working patterns (Ctrip/Qunar)
✅ Infrastructure needs identified (smart wait, login session management)
✅ Ready to proceed to Phase 2 (Infrastructure)

## 2. Platform Summary Table

| Platform | Failure Category | Root Cause | Login Required | Fix Complexity |
|----------|------------------|------------|----------------|----------------|
| Ctrip | `parsing:partial` | Fixed sleep(), incomplete extraction | No | Low |
| Qunar | `parsing:partial` | Fixed sleep(), incomplete extraction | No | Low |
| Mafengwo | `parsing:no_content` | List-only extraction, no detail navigation | Recommended | Medium |
| Tongcheng | `parsing:no_content` | List-only extraction, no detail navigation | No | Medium |
| Xiaohongshu | Bimodal | API blocked without login; fallback uses placeholder | Yes (for full data) | High |

### Issue Distribution

```
Parsing Issues:     2 platforms (Ctrip, Qunar)
Architecture Issues: 2 platforms (Mafengwo, Tongcheng)
Complex/Bimodal:    1 platform (Xiaohongshu)
```

## 3. Common Infrastructure Needs

### Smart Wait Strategies

All 5 platforms use fixed `sleep()` delays:
```typescript
await sleep(2000);  // or 3000
await scrollToLoadContent(3);
await sleep(1000);
```

**Needed:** Replace with `waitForContentStable()` from new diagnostics module.

### Login Session Management

| Platform | Login Needed | Session Persistence |
|----------|--------------|---------------------|
| Ctrip | No | N/A |
| Qunar | No | N/A |
| Mafengwo | Recommended | Persistent browser context |
| Tongcheng | No | N/A |
| Xiaohongshu | Yes | Persistent browser context + cookies |

**Needed:** Implement login session validation and persistence in Phase 2.

### Shared Utilities Created

| Utility | Location | Purpose |
|---------|----------|---------|
| `waitForContentStable()` | `diagnostics/capture.ts` | Smart content loading detection |
| `categorizeFailure()` | `diagnostics/report.ts` | Distinguish acquisition vs parsing |
| `detectAntiBotIndicators()` | `diagnostics/report.ts` | Detect captcha, login wall, blocked |
| `generateDiagnosticReport()` | `diagnostics/report.ts` | Create diagnostic reports |

## 4. Platform-Specific Action Plans

### Ctrip (携程)

**Current State:** Navigates to detail pages, uses accessibility tree parsing

**Root Cause:**
- Fixed sleep() may snapshot too early
- Image extraction misses high-resolution variants
- Missing fields: authorAvatar, publishDate, savesCount

**Recommended Fixes:**
1. Replace `sleep()` with `waitForContentStable()`
2. Improve image extraction for high-res URLs
3. Add missing field extractors (publishDate, authorAvatar)
4. Add diagnostic logging

**Expected Effort:** Low — mostly enhancement of existing parsing

---

### Qunar (去哪儿)

**Current State:** Same architecture as Ctrip

**Root Cause:** Same issues as Ctrip

**Recommended Fixes:**
1. Replace `sleep()` with `waitForContentStable()`
2. Improve image extraction
3. Add missing field extractors
4. Consider expanding city ID mapping

**Expected Effort:** Low — same fixes as Ctrip

---

### Mafengwo (马蜂窝)

**Current State:** Only extracts from list page, returns placeholder content

**Root Cause:**
```typescript
// Current: Only extracts 300 chars around URL
const context = content.substring(contextStart, contextEnd);
content: `${title} - ${city}旅游攻略`  // PLACEHOLDER
```

**Recommended Fixes:**
1. **Add detail page navigation** (PRIMARY FIX)
   - Extract URLs from list page
   - Navigate to each detail page
   - Parse full content from detail snapshot
2. Implement captcha handling/detection
3. Add login session support for reliable access
4. Replace `sleep()` with `waitForContentStable()`

**Expected Effort:** Medium — requires restructuring to add Phase 2 navigation

---

### Tongcheng (同程)

**Current State:** Same list-only architecture as Mafengwo

**Root Cause:** Same as Mafengwo — no detail page navigation

**Recommended Fixes:**
1. **Add detail page navigation** (PRIMARY FIX)
2. Replace `sleep()` with `waitForContentStable()`
3. Calculate quality score based on actual content

**Expected Effort:** Medium — same restructuring as Mafengwo, but simpler (no login needed)

---

### Xiaohongshu (小红书)

**Current State:** Sophisticated dual-strategy implementation
- Primary: API interception (excellent data when it works)
- Fallback: Snapshot extraction (placeholder content)

**Root Cause:**
- API often blocked without login
- Fallback uses same 300-char context as Mafengwo/Tongcheng
- Video URLs expire in ~30 seconds

**Recommended Fixes:**
1. **Enable persistent login session** (PRIMARY FIX)
   ```typescript
   await initMCP({ persistent: true });
   ```
2. Add detail page navigation for fallback mode
3. Implement CDN URL refresh/immediate download for videos
4. Replace `sleep()` with `waitForContentStable()`

**Expected Effort:** High — requires login flow, video handling, multiple fallback strategies

## 5. Anti-Bot and Login Requirements

| Platform | Anti-Bot Level | Login Wall | Captcha Risk | Rate Limiting | Notes |
|----------|---------------|------------|--------------|---------------|-------|
| Ctrip | Low | No | Rare | Moderate | Most accessible platform |
| Qunar | Low | No | Rare | Moderate | Similar to Ctrip |
| Mafengwo | Medium | Optional | Moderate | Moderate | Captcha on heavy use |
| Tongcheng | Low | No | Rare | Low | Easiest to crawl |
| Xiaohongshu | HIGH | Yes | High | Strict | Strongest protection |

### Detection Patterns Implemented

```typescript
// In diagnostics/report.ts
detectAntiBotIndicators(content) {
  return {
    captcha: /验证|captcha|verify|滑动验证/i.test(content),
    loginWall: /登录|sign.?in|login|扫码|请先登录/i.test(content)
               && !/退出|logout|已登录/i.test(content),
    blocked: /blocked|forbidden|access.?denied|访问被拒绝|请求过于频繁/i.test(content),
    empty: content.length < 500,
  };
}
```

## 6. Phase 2 Recommendations

### Infrastructure to Build

1. **Smart Wait Module** (INFRA-01)
   - Export `waitForContentStable()` from diagnostics for use in crawlers
   - Replace all fixed `sleep()` calls

2. **Login Session Manager** (INFRA-02)
   - Validate existing sessions before crawling
   - Support manual login with cookie persistence
   - Platforms: Mafengwo, Xiaohongshu

3. **Session Persistence** (INFRA-03)
   - Store and load browser contexts
   - Implement session refresh mechanism

### Suggested Phase Order

Based on diagnosis findings, the planned order remains appropriate:

| Phase | Platform | Rationale |
|-------|----------|-----------|
| 3 | Ctrip | Already mostly working, serves as reference |
| 4 | Qunar | Same fixes as Ctrip, parallel effort |
| 5 | Mafengwo | Needs detail navigation + login |
| 6 | Tongcheng | Needs detail navigation (simpler, no login) |
| 7 | Xiaohongshu | Most complex, benefits from all prior work |
| 8 | Verification | Final validation of all platforms |

### Scope Adjustments

No major scope adjustments needed. Diagnosis confirmed the research hypothesis:
- Ctrip/Qunar: Enhancement (parsing improvements)
- Mafengwo/Tongcheng: Restructuring (add detail navigation)
- Xiaohongshu: Complex (login + API + video + fallback)

## 7. Verification Checklist

- [x] Each platform has documented failure category
- [x] Each platform has root cause identified (acquisition vs parsing)
- [x] Each platform has action plan with numbered fixes
- [x] Infrastructure needs documented (smart wait, login management)
- [x] Login requirements documented per platform
- [x] Anti-bot mechanisms documented
- [x] Phase 1 success criteria met:
  - [x] Root cause documented for each platform
  - [x] Anti-bot mechanisms documented per platform
  - [x] Clear action plan for each platform

## Phase 1 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Diagnostic infrastructure | `crawlers/diagnostics/` | ✅ Created |
| Ctrip diagnosis | `diagnostics/ctrip-diagnosis.md` | ✅ Complete |
| Qunar diagnosis | `diagnostics/qunar-diagnosis.md` | ✅ Complete |
| Mafengwo diagnosis | `diagnostics/mafengwo-diagnosis.md` | ✅ Complete |
| Tongcheng diagnosis | `diagnostics/tongcheng-diagnosis.md` | ✅ Complete |
| Xiaohongshu diagnosis | `diagnostics/xiaohongshu-diagnosis.md` | ✅ Complete |
| Consolidated summary | `DIAGNOSIS-SUMMARY.md` | ✅ This document |

---

_Phase 1 completed: 2026-01-25_
_Ready for Phase 2: Infrastructure_
