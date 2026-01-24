# Feature Landscape: Chinese Travel Platform Data Extraction

**Domain:** Travel platform content crawlers (旅行平台爬虫数据采集)
**Researched:** 2026-01-25
**Overall Confidence:** MEDIUM (based on codebase analysis + domain knowledge)

## Executive Summary

This document maps the data fields available from five Chinese travel platforms: Ctrip (携程), Mafengwo (马蜂窝), Xiaohongshu (小红书), Qunar (去哪儿), and Tongcheng (同程). Each platform has different content structures, anti-scraping measures, and data availability patterns.

**Key Finding:** The 6 core fields requested (正文内容、高清图片、视频、作者信息、发布时间、互动数据) have varying extraction difficulty across platforms. Xiaohongshu has the richest API data but strongest anti-bot measures. Traditional OTA platforms (Ctrip, Qunar) have more accessible HTML but less structured APIs.

---

## Table Stakes (Must Have for All Platforms)

Features users expect from any travel content crawler. Missing = product feels incomplete.

| Field                         | Why Expected                | Current Extraction                            | Difficulty | Notes                                       |
| ----------------------------- | --------------------------- | --------------------------------------------- | ---------- | ------------------------------------------- |
| **Title** (标题)              | Core identifier for content | All platforms                                 | Low        | Accessible via headings or page title       |
| **Body Text** (正文内容)      | Primary content value       | Ctrip/Qunar: Good, Mafengwo/Xiaohongshu: Poor | Medium     | Requires detail page fetch for full content |
| **Cover Image** (封面图)      | Visual preview              | All platforms                                 | Low        | Usually in list view                        |
| **Source URL**                | Deduplication, attribution  | All platforms                                 | Low        | Constructed from IDs                        |
| **External ID**               | Unique identifier           | All platforms                                 | Low        | Extracted from URL patterns                 |
| **Author Name** (作者名)      | Content attribution         | All platforms                                 | Medium     | Pattern matching on accessibility tree      |
| **Destination/City** (目的地) | Content categorization      | All platforms                                 | Low        | Input parameter, sometimes extractable      |

---

## Platform-Specific Data Availability

### Ctrip (携程) - Best Data Quality

**Platform Type:** OTA with UGC travel guides
**Anti-bot Level:** Low-Medium
**Current Status:** Most complete extraction

| Field           | Available | Extraction Method                        | Difficulty | Quality                  |
| --------------- | --------- | ---------------------------------------- | ---------- | ------------------------ |
| Title           | Yes       | `getBestTitle()` from accessibility tree | Low        | HIGH                     |
| Full Content    | Yes       | `getArticleContent()` - StaticText nodes | Medium     | HIGH                     |
| Images (多图)   | Yes       | URL regex matching                       | Low        | HIGH - up to 20 images   |
| Videos          | No        | Not available in travel guides           | N/A        | N/A                      |
| Author Name     | Yes       | Pattern matching                         | Medium     | MEDIUM                   |
| Author Avatar   | No        | Not extracted currently                  | Medium     | -                        |
| Publish Date    | No        | Not extracted currently                  | Medium     | Available in HTML        |
| Views Count     | Yes       | `extractStats()` pattern                 | Medium     | MEDIUM                   |
| Likes Count     | Yes       | `extractStats()` pattern                 | Medium     | MEDIUM                   |
| Comments Count  | No        | Not extracted currently                  | Medium     | Available but not parsed |
| Saves/Favorites | No        | Not typical for this platform            | N/A        | N/A                      |
| Tags            | Yes       | Keyword extraction from content          | Low        | Generated, not native    |

**Platform-Specific Fields:**

- Trip duration (行程天数) - extractable from title/content
- Budget info (人均费用) - sometimes in content
- Travel season (出行时间) - extractable

**Quirks:**

- URL pattern: `/travels/{CityId}/t3-p{page}.html` for lists
- Guide detail: `/travels/{CityId}/{guideId}.html`
- Content is well-structured in accessibility tree
- Minimal login requirements for public content

---

### Mafengwo (马蜂窝) - Poor Data Quality

**Platform Type:** Community travel guides + Q&A
**Anti-bot Level:** High (captcha, login walls)
**Current Status:** List-only extraction, no detail pages

| Field           | Available | Extraction Method               | Difficulty | Quality                   |
| --------------- | --------- | ------------------------------- | ---------- | ------------------------- |
| Title           | Yes       | Heading extraction from context | Medium     | LOW - often incomplete    |
| Full Content    | NO        | Requires detail page navigation | High       | POOR - only title snippet |
| Images          | Partial   | URL regex from list context     | Medium     | LOW - cover only          |
| Videos          | No        | Not extracted                   | High       | -                         |
| Author Name     | Yes       | Pattern matching                | Medium     | LOW                       |
| Author Avatar   | No        | Not extracted                   | Medium     | -                         |
| Publish Date    | No        | Not extracted                   | Medium     | Available in HTML         |
| Views Count     | Yes       | `extractStats()`                | Medium     | LOW                       |
| Likes Count     | Yes       | `extractStats()`                | Medium     | LOW                       |
| Comments Count  | No        | Not extracted                   | Medium     | -                         |
| Saves/Favorites | No        | Not typical                     | N/A        | -                         |
| Tags            | Yes       | Keyword extraction              | Low        | Generated                 |

**Platform-Specific Fields:**

- POI (景点) associations - available but not extracted
- Itinerary structure (行程安排) - in detail pages
- Cost breakdown (费用明细) - in detail pages

**Quirks:**

- Aggressive captcha/verification: `验证`, `captcha`, `verify` detection
- Requires login for full content: login helper exists
- URL pattern: `/i/{guideId}.html` for guides
- Destination pages: `/travel-scenic-spot/mafengwo/{cityId}.html`
- Content extraction from list page only provides minimal data

**Critical Issue:** Current implementation only extracts from destination listing page, not individual guide detail pages. This is why data quality is worst among all platforms.

---

### Xiaohongshu (小红书) - Richest API Data, Hardest to Extract

**Platform Type:** Social lifestyle platform (UGC notes)
**Anti-bot Level:** Very High (login walls, encrypted APIs, anti-fingerprinting)
**Current Status:** Dual extraction (API + snapshot fallback)

| Field               | Available | Extraction Method                           | Difficulty | Quality                          |
| ------------------- | --------- | ------------------------------------------- | ---------- | -------------------------------- |
| Title               | Yes       | `note.title` from API or heading extraction | Medium     | HIGH when API works              |
| Full Content (desc) | Yes       | `note.desc` from API                        | Medium     | HIGH when API works              |
| Images (多图)       | Yes       | `note.image_list` with width/height         | Medium     | HIGH - full resolution available |
| Videos              | Yes       | `note.video.media.stream` (H264/H265)       | High       | HIGH - master URLs available     |
| Video Thumbnail     | Yes       | `note.video.image.first_frame_fileid`       | Medium     | HIGH                             |
| Author Name         | Yes       | `note.user.nickname`                        | Medium     | HIGH                             |
| Author Avatar       | Yes       | `note.user.avatar`                          | Medium     | HIGH                             |
| Author ID           | Yes       | `note.user.user_id`                         | Medium     | HIGH                             |
| Publish Date        | No        | Not in current API response structure       | High       | Missing from extraction          |
| Likes Count         | Yes       | `note.interact_info.liked_count`            | Medium     | HIGH                             |
| Saves Count         | Yes       | `note.interact_info.collected_count`        | Medium     | HIGH - unique to XHS             |
| Comments Count      | Yes       | `note.interact_info.comment_count`          | Medium     | HIGH                             |
| Native Tags         | Yes       | `note.tag_list[].name`                      | Medium     | HIGH                             |
| Content Type        | Yes       | `note.type` (video vs normal)               | Low        | HIGH                             |

**Platform-Specific Fields:**

- Collected/Saves count (收藏数) - unique engagement metric
- Native hashtags from `tag_list`
- Image dimensions (width/height)
- Video stream quality options (H264 vs H265)

**Quirks:**

- API interception via network request monitoring (`/api/sns/web/v1/feed`, `/api/sns/web/v1/homefeed`)
- Count parsing handles Chinese numerals (万 = 10000, k = 1000)
- Requires login for explore page access
- Note ID format: 24-character hex string
- Dual extraction strategy: API first, snapshot fallback
- Most anti-bot measures of all platforms

**Critical Issue:** Login wall detection (`登录` + `验证`) blocks unauthenticated access. The login helper is essential.

---

### Qunar (去哪儿) - Good Data Quality

**Platform Type:** OTA with travel journals (游记)
**Anti-bot Level:** Low-Medium
**Current Status:** Full detail page extraction

| Field           | Available | Extraction Method        | Difficulty | Quality           |
| --------------- | --------- | ------------------------ | ---------- | ----------------- |
| Title           | Yes       | `getBestTitle()`         | Low        | HIGH              |
| Full Content    | Yes       | `getArticleContent()`    | Medium     | HIGH              |
| Images          | Yes       | URL regex                | Low        | HIGH - up to 20   |
| Videos          | No        | Not typical for platform | N/A        | N/A               |
| Author Name     | Yes       | Pattern matching         | Medium     | MEDIUM            |
| Author Avatar   | No        | Not extracted            | Medium     | -                 |
| Publish Date    | No        | Not extracted            | Medium     | Available in HTML |
| Views Count     | Yes       | `extractStats()`         | Medium     | MEDIUM            |
| Likes Count     | Yes       | `extractStats()`         | Medium     | MEDIUM            |
| Comments Count  | No        | Not extracted            | Medium     | -                 |
| Saves/Favorites | No        | Not typical              | N/A        | -                 |
| Tags            | Yes       | Keyword extraction       | Low        | Generated         |

**Platform-Specific Fields:**

- Similar to Ctrip (OTA pattern)
- City-specific URL slugs

**Quirks:**

- URL pattern: `/p-cs{cityId}/youji?page={page}` for lists
- Guide detail: `/youji/{guideId}`
- Content structure similar to Ctrip
- Minimum content threshold: 100 chars (vs Ctrip's 50)

---

### Tongcheng (同程) - List-Only Extraction

**Platform Type:** OTA with travel stories
**Anti-bot Level:** Low
**Current Status:** List page extraction only

| Field          | Available | Extraction Method               | Difficulty | Quality   |
| -------------- | --------- | ------------------------------- | ---------- | --------- |
| Title          | Yes       | Heading extraction from context | Medium     | MEDIUM    |
| Full Content   | NO        | Only title snippet              | High       | POOR      |
| Images         | Partial   | Cover only from list            | Medium     | LOW       |
| Videos         | No        | Not extracted                   | N/A        | -         |
| Author Name    | Yes       | Pattern matching                | Medium     | LOW       |
| Author Avatar  | No        | Not extracted                   | Medium     | -         |
| Publish Date   | No        | Not extracted                   | Medium     | -         |
| Views Count    | Yes       | `extractStats()`                | Medium     | LOW       |
| Likes Count    | Yes       | `extractStats()`                | Medium     | LOW       |
| Comments Count | No        | Not extracted                   | Medium     | -         |
| Tags           | Yes       | Keyword extraction              | Low        | Generated |

**Quirks:**

- URL pattern: `/travels/{guideId}.html`
- List URL: `https://www.ly.com/travels/`
- Similar extraction pattern to Mafengwo (list-only)
- Fixed quality score of 50 (no dynamic calculation)

**Critical Issue:** Same as Mafengwo - only list page extraction, no detail page navigation.

---

## Anti-Features (Things NOT to Build)

Features to explicitly NOT build due to technical, legal, or ethical concerns.

| Anti-Feature                           | Why Avoid                             | What to Do Instead                                    |
| -------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| **Session hijacking**                  | Illegal, violates computer fraud laws | Use official APIs where available, respect robots.txt |
| **Credential storage**                 | Security risk, ToS violation          | Use browser-based login helpers with user interaction |
| **High-frequency scraping**            | Gets IP banned, stresses servers      | Implement rate limiting (current: 0.5-2 req/sec)      |
| **Bypassing captcha programmatically** | ToS violation, arms race              | Detect captcha, prompt user for manual verification   |
| **Scraping private/DM content**        | Privacy violation                     | Only public content                                   |
| **Storing user passwords**             | Security liability                    | OAuth or manual browser login                         |
| **Real-time comment scraping**         | High API load, often blocked          | Batch processing with delays                          |
| **Extracting user contact info**       | Privacy laws (PIPL in China)          | Anonymize author data                                 |

---

## Field Extraction Difficulty Matrix

| Field           | Ctrip  | Mafengwo | Xiaohongshu | Qunar  | Tongcheng |
| --------------- | ------ | -------- | ----------- | ------ | --------- |
| Title           | Easy   | Medium   | Medium      | Easy   | Medium    |
| Full Content    | Easy   | **HARD** | Medium      | Easy   | **HARD**  |
| Multiple Images | Easy   | Hard     | Medium      | Easy   | Hard      |
| Videos          | N/A    | N/A      | Medium      | N/A    | N/A       |
| Author Name     | Medium | Medium   | Easy (API)  | Medium | Medium    |
| Publish Date    | Medium | Medium   | **HARD**    | Medium | Medium    |
| Views           | Medium | Medium   | N/A         | Medium | Medium    |
| Likes           | Medium | Medium   | Easy (API)  | Medium | Medium    |
| Saves           | N/A    | N/A      | Easy (API)  | N/A    | N/A       |
| Comments        | Medium | Medium   | Easy (API)  | Medium | Medium    |

**Legend:**

- Easy: Reliable extraction with current methods
- Medium: Works but may have gaps
- Hard: Requires additional implementation
- N/A: Not available on platform

---

## Current Data Quality Assessment

Based on codebase analysis:

| Platform    | Content Completeness   | Image Quality    | Interaction Data | Overall  |
| ----------- | ---------------------- | ---------------- | ---------------- | -------- |
| Ctrip       | HIGH (full text)       | HIGH (20 imgs)   | MEDIUM           | **BEST** |
| Qunar       | HIGH (full text)       | HIGH (20 imgs)   | MEDIUM           | GOOD     |
| Xiaohongshu | MEDIUM (API dependent) | HIGH (with dims) | HIGH             | MEDIUM   |
| Mafengwo    | **LOW** (title only)   | LOW (cover only) | LOW              | **POOR** |
| Tongcheng   | **LOW** (title only)   | LOW (cover only) | LOW              | **POOR** |

---

## Feature Dependencies

```
Authentication Layer
    └── Platform Login (required for Xiaohongshu, Mafengwo)
        └── Cookie/Session Management
            └── Content Access

Content Extraction
    ├── List Page Scraping (all platforms)
    │   └── Guide ID Extraction
    │       └── Detail Page Navigation (Ctrip, Qunar - working)
    │           └── Full Content Extraction
    │
    └── API Interception (Xiaohongshu only)
        └── Network Request Monitoring
            └── JSON Response Parsing
                └── Rich Data Extraction

Data Processing
    ├── Text Content
    │   └── Accessibility Tree Parsing
    │       └── StaticText/Heading Extraction
    │
    ├── Media URLs
    │   └── Regex Pattern Matching
    │       └── URL Validation/Deduplication
    │
    └── Stats/Metadata
        └── Pattern Matching
            └── Number Parsing (万/k conversion)
```

---

## Extraction Priority Recommendation

For fixing current data completeness issues:

### Priority 1: Fix List-Only Platforms (Mafengwo, Tongcheng)

- **Problem:** Only extracting from list pages, missing full content
- **Solution:** Add detail page navigation similar to Ctrip/Qunar
- **Impact:** Dramatic improvement in content quality

### Priority 2: Add Publish Date Extraction (All Platforms)

- **Problem:** Missing from all current implementations
- **Solution:** Add date pattern matching to accessibility parser
- **Patterns:** `发布于`, `发表于`, `YYYY-MM-DD`, `YYYY年MM月DD日`
- **Impact:** Essential for content freshness assessment

### Priority 3: Improve Xiaohongshu Reliability

- **Problem:** Depends on API interception which is fragile
- **Solution:** Improve snapshot fallback extraction
- **Impact:** More consistent data even when API changes

### Priority 4: Add Comments Count (All Platforms)

- **Problem:** Pattern exists but not consistently extracted
- **Solution:** Extend `extractStats()` patterns
- **Impact:** Complete interaction data set

---

## Sources

- Codebase analysis: `/apps/ai-service/src/lib/crawlers/*.ts`
- Accessibility parser: `/apps/ai-service/src/lib/crawlers/accessibility-parser.ts`
- Data model: `CrawlResult` interface in `/apps/ai-service/src/lib/crawlers/index.ts`
- Confidence: MEDIUM - based on code review, not live platform testing
