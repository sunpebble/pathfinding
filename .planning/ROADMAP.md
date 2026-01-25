# Roadmap: Crawler Data Quality Fix

**Created:** 2026-01-25
**Depth:** Comprehensive
**Phases:** 8
**Coverage:** 41/41 v1 requirements mapped

## Overview

Fix the crawler system for Pathfinding travel app to extract complete travel guide data from five Chinese platforms (Ctrip, Qunar, Mafengwo, Tongcheng, Xiaohongshu). The work progresses from diagnosis through platform-specific fixes to final verification, ensuring all 6 core fields (content, images, videos, author info, publish time, engagement metrics) are reliably extracted.

---

## Phase 1: Diagnosis

**Goal:** Understand why each platform's crawler returns incomplete data

**Dependencies:** None

**Requirements:** DIAG-01, DIAG-02, DIAG-03

**Success Criteria:**

1. Root cause documented for each platform (acquisition vs parsing stage)
2. Anti-bot mechanisms and login requirements documented per platform
3. Raw HTML/API responses verified for content completeness
4. Clear action plan for each platform based on diagnosis

---

## Phase 2: Infrastructure

**Goal:** Build shared foundation for reliable crawling across all platforms

**Dependencies:** Phase 1 (diagnosis informs infrastructure needs)

**Requirements:** INFRA-01, INFRA-02, INFRA-03

**Success Criteria:**

1. Smart wait strategies replace all fixed sleep() delays
2. User can manually log in and save cookies for reuse
3. Saved sessions persist across crawler runs
4. Session validity can be verified before crawl starts

---

## Phase 3: Ctrip

**Goal:** Ctrip crawler extracts all 6 core fields completely

**Dependencies:** Phase 2 (infrastructure ready)

**Requirements:** CTRIP-01, CTRIP-02, CTRIP-03, CTRIP-04, CTRIP-05, CTRIP-06

**Success Criteria:**

1. Full article text extracted (not truncated)
2. High-resolution image URLs extracted (original, not thumbnails)
3. Author name and avatar URL captured
4. Publish date extracted in parseable format
5. Engagement metrics (likes, saves, comments) captured

---

## Phase 4: Qunar

**Goal:** Qunar crawler extracts all 6 core fields completely

**Dependencies:** Phase 2 (infrastructure ready)

**Requirements:** QUNAR-01, QUNAR-02, QUNAR-03, QUNAR-04, QUNAR-05, QUNAR-06

**Success Criteria:**

1. Full article text extracted (not truncated)
2. High-resolution image URLs extracted
3. Author name captured (avatar if available)
4. Publish date extracted in parseable format
5. Engagement metrics captured

---

## Phase 5: Mafengwo

**Goal:** Mafengwo crawler navigates to detail pages and extracts all 6 core fields

**Dependencies:** Phase 2 (infrastructure ready)

**Requirements:** MFW-01, MFW-02, MFW-03, MFW-04, MFW-05, MFW-06, MFW-07, MFW-08

**Success Criteria:**

1. Crawler navigates from list page to detail page (not list-only)
2. Full article text extracted from detail page
3. High-resolution image URLs extracted
4. Author name and avatar captured
5. Publish date and engagement metrics captured
6. Captcha/login walls detected and handled gracefully

---

## Phase 6: Tongcheng

**Goal:** Tongcheng crawler navigates to detail pages and extracts all 6 core fields

**Dependencies:** Phase 2 (infrastructure ready)

**Requirements:** TC-01, TC-02, TC-03, TC-04, TC-05, TC-06, TC-07

**Success Criteria:**

1. Crawler navigates from list page to detail page
2. Full article text extracted from detail page
3. High-resolution image URLs extracted
4. Author name captured (avatar if available)
5. Publish date and engagement metrics captured

---

## Phase 7: Xiaohongshu

**Goal:** Xiaohongshu crawler extracts all 6 core fields including video with login support

**Dependencies:** Phase 2 (infrastructure ready)

**Requirements:** XHS-01, XHS-02, XHS-03, XHS-04, XHS-05, XHS-06, XHS-07, XHS-08

**Success Criteria:**

1. Full note text extracted
2. High-resolution image URLs with dimensions extracted
3. Video URLs (H264/H265) extracted when present
4. Author name and avatar captured
5. Publish date and engagement metrics captured
6. Login flow works (manual login + cookie save)
7. Crawler functions with saved login session

---

## Phase 8: Verification

**Goal:** All platforms verified working with complete data extraction

**Dependencies:** Phases 3-7 (all platform fixes complete)

**Requirements:** VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04

**Success Criteria:**

1. Each platform successfully crawls 10+ complete records
2. All 6 core fields have values (video only for Xiaohongshu)
3. Image URLs are accessible and return high-resolution images
4. Login sessions persist across multiple crawler runs

---

## Progress

| Phase | Name           | Requirements                 | Status  |
| ----- | -------------- | ---------------------------- | ------- |
| 1     | Diagnosis      | DIAG-01, DIAG-02, DIAG-03    | Pending |
| 2     | Infrastructure | INFRA-01, INFRA-02, INFRA-03 | Pending |
| 3     | Ctrip          | CTRIP-01 to CTRIP-06         | Pending |
| 4     | Qunar          | QUNAR-01 to QUNAR-06         | Pending |
| 5     | Mafengwo       | MFW-01 to MFW-08             | Pending |
| 6     | Tongcheng      | TC-01 to TC-07               | Pending |
| 7     | Xiaohongshu    | XHS-01 to XHS-08             | Pending |
| 8     | Verification   | VERIFY-01 to VERIFY-04       | Pending |

---

_Last updated: 2026-01-25_
