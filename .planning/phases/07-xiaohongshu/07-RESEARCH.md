# Phase 7: Xiaohongshu - Research

**Researched:** 2026-01-25
**Domain:** Xiaohongshu (小红书) crawler enhancement for full content extraction including video
**Confidence:** HIGH

## Summary

Phase 7 focuses on enhancing the Xiaohongshu crawler to extract all 6 core fields including video content with persistent login support. Unlike other platforms, Xiaohongshu is "bimodal" — the current crawler already implements a **dual-strategy approach** (API interception + fallback snapshot extraction) but needs enhancement for reliable operation.

The existing `xiaohongshu.ts` crawler (477 lines) already has:

1. **Persistent session integration** via `initSessionForPlatform('xiaohongshu')`
2. **API interception** via `extractNotesFromApi()` which captures `/api/sns/web/v1/feed`, `/search`, `/homefeed` responses
3. **Fallback snapshot extraction** via `extractNotesFromSnapshot()`
4. **Video extraction structure** via `note.video?.media?.stream?.h264/h265`
5. **Session validation** via `checkSessionWithGuidance('xiaohongshu')`

Key enhancements required:

1. **Detail Page Navigation**: The current crawler only extracts from explore/feed pages. For video notes with expiring CDN URLs, we need to navigate to individual note detail pages (`/explore/{noteId}`) for fresh URLs.
2. **Content Quality Filtering**: Per CONTEXT.md, filter notes with <100 chars, flag placeholder content with low quality score.
3. **Session Auto-Refresh**: Detect and handle session expiration mid-crawl by refreshing from saved cookies.
4. **Placeholder Detection**: Identify login-wall placeholder content and flag for re-crawl.
5. **Video URL Handling**: CDN URLs expire in ~30 seconds for video; implement URL capture at extraction time with awareness of expiry.

**Primary recommendation:** Enhance the existing dual-strategy crawler by adding detail page navigation for video notes, implementing content quality filtering (100+ char minimum), and adding placeholder detection with quality scoring. The core API interception pattern is already working; focus on robustness and quality.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                   | Version          | Purpose                                   | Why Standard                                     |
| ------------------------- | ---------------- | ----------------------------------------- | ------------------------------------------------ |
| @modelcontextprotocol/sdk | current          | MCP client for Chrome DevTools            | Already in use, provides browser automation      |
| chrome-devtools-mcp       | latest (via npx) | Chrome automation with accessibility tree | Already in use, provides reliable page snapshots |

### Supporting

| Library                 | Version  | Purpose                            | When to Use         |
| ----------------------- | -------- | ---------------------------------- | ------------------- |
| accessibility-parser.ts | internal | Parse accessibility tree snapshots | Fallback extraction |
| diagnostics/capture.ts  | internal | Smart wait and content stability   | Already integrated  |
| session/manager.ts      | internal | Persistent session management      | Already integrated  |

### Existing Utilities to Reuse

| Utility                      | Location                  | Purpose                        | Status                                  |
| ---------------------------- | ------------------------- | ------------------------------ | --------------------------------------- |
| `getBestTitle()`             | `accessibility-parser.ts` | Extract title from headings    | EXISTS - use for fallback               |
| `getArticleContent()`        | `accessibility-parser.ts` | Extract body text              | EXISTS - use for fallback               |
| `extractImageUrls()`         | `accessibility-parser.ts` | Extract image URLs             | EXISTS - already used in fallback       |
| `extractHeadings()`          | `accessibility-parser.ts` | Extract heading elements       | EXISTS - already used in fallback       |
| `extractStaticText()`        | `accessibility-parser.ts` | Extract text content           | EXISTS - already used in fallback       |
| `extractAuthor()`            | `accessibility-parser.ts` | Extract author name            | EXISTS - already used in fallback       |
| `parseChineseNumber()`       | `accessibility-parser.ts` | Parse "2.7千", "11.5万"        | EXISTS - already used in `parseCount()` |
| `waitForContentStable()`     | `diagnostics/capture.ts`  | Smart content loading          | EXISTS - already integrated             |
| `initSessionForPlatform()`   | `session/manager.ts`      | Initialize persistent session  | EXISTS - already integrated             |
| `checkSessionWithGuidance()` | `session/manager.ts`      | Validate session with guidance | EXISTS - already integrated             |

### New Utilities to Create

| Utility                      | Location         | Purpose                             | Why New                                        |
| ---------------------------- | ---------------- | ----------------------------------- | ---------------------------------------------- |
| `detectPlaceholderContent()` | `xiaohongshu.ts` | Detect login-wall placeholder       | XHS shows placeholder for unauthorized content |
| `calculateXhsQualityScore()` | `xiaohongshu.ts` | Enhanced quality scoring with flags | Need to flag placeholders for re-crawl         |

**Installation:** No new dependencies required. All improvements are enhancements to existing patterns.

## Architecture Patterns

### Current Architecture (Already Good Foundation)

```
CURRENT (WORKING):
  Explore Page → Session Check → Scroll → API Interception → Parse API Response → Return
                                        ↘ Fallback: Snapshot Extraction → Return

ENHANCEMENT (FOR ROBUSTNESS):
  Explore Page → Session Check → Scroll → API Interception → Parse API Response → Filter Quality → Return
  ↓ (for video notes with expiring URLs)
  Note Detail Page → Fresh API Capture → Immediate URL Extraction → Return
```

### Recommended Project Structure

```
src/lib/crawlers/
├── xiaohongshu.ts              # Platform crawler (ENHANCE)
│   ├── crawlXiaohongshu()      # Entry point (exists - add quality filtering)
│   ├── fetchNotesFromExplore() # Explore page extraction (exists - enhance)
│   ├── extractNotesFromApi()   # API interception (exists - good)
│   ├── extractNotesFromSnapshot() # Fallback (exists - enhance quality)
│   ├── fetchNoteDetail()       # NEW: Detail page for video notes
│   ├── detectPlaceholderContent() # NEW: Placeholder detection
│   └── convertNoteToResult()   # Convert API note to CrawlResult (exists - add quality flags)
├── accessibility-parser.ts     # Content extraction (no XHS-specific additions needed)
├── diagnostics/                # Already complete from Phase 1-2
├── session/                    # Already complete from Phase 2
│   └── validators.ts           # Contains validateXiaohongshuSession() (exists)
├── mcp-client.ts               # Browser automation (no changes)
└── index.ts                    # Crawler registry (no changes)
```

### Pattern 1: Dual-Strategy Extraction (Already Implemented)

**What:** Try API interception first, fallback to snapshot extraction
**When to use:** This is already the PRIMARY pattern in xiaohongshu.ts
**Existing Code:**

```typescript
// Source: Current xiaohongshu.ts lines 136-158
// Try to extract from API responses first (most reliable)
const apiNotes = await extractNotesFromApi();
if (apiNotes.length > 0) {
  console.log(
    `[Xiaohongshu] Extracted ${apiNotes.length} notes from explore API`
  );
  for (const note of apiNotes.slice(0, maxNotes)) {
    const result = convertNoteToResult(note, city);
    if (result) notes.push(result);
  }
}

// Fall back to snapshot extraction if API didn't work
if (notes.length < maxNotes) {
  const snapshotNotes = await extractNotesFromSnapshot(
    city,
    maxNotes - notes.length
  );
  // ...
}
```

### Pattern 2: API Response Interception (Already Implemented)

**What:** Capture XHR/fetch responses from Xiaohongshu's internal APIs
**When to use:** For reliable data extraction when logged in
**Existing Code:**

```typescript
// Source: Current xiaohongshu.ts lines 166-210
async function extractNotesFromApi(): Promise<XiaohongshuNote[]> {
  const requests = await listNetworkRequests(['xhr', 'fetch']);

  const feedRequests = requests.filter(
    (r) =>
      r.url.includes('/api/sns/web/v1/feed') ||
      r.url.includes('/api/sns/web/v1/search') ||
      r.url.includes('/api/sns/web/v1/homefeed')
  );

  for (const req of feedRequests.slice(-5)) {
    const detail = await getNetworkRequest(req.reqid);
    if (detail?.responseBody) {
      const data = JSON.parse(detail.responseBody);
      // Extract note_card from items
    }
  }
}
```

### Pattern 3: Video URL Extraction (Already Implemented)

**What:** Extract H264/H265 video stream URLs from API responses
**When to use:** For video notes (note.type === 'video')
**Existing Code:**

```typescript
// Source: Current xiaohongshu.ts lines 367-380
if (note.type === 'video' && note.video?.media?.stream) {
  const streams = note.video.media.stream;
  const videoStream = streams.h264?.[0] || streams.h265?.[0];
  if (videoStream?.master_url) {
    videoUrls.push(videoStream.master_url);
    contentBlocks.push({
      type: 'video',
      url: videoStream.master_url,
      thumbnailUrl: note.video.image?.first_frame_fileid
        ? `https://sns-img-qc.xhscdn.com/${note.video.image.first_frame_fileid}`
        : undefined,
    });
  }
}
```

### Pattern 4: Content Quality Filtering (NEW - from CONTEXT.md)

**What:** Filter notes by content quality, flag placeholder content
**When to use:** Apply to all extracted notes before returning
**Example:**

```typescript
// Source: New pattern from CONTEXT.md decisions
function filterByQuality(result: CrawlResult): CrawlResult | null {
  const textLength = result.content?.length || 0;

  // Minimum 100+ characters
  if (textLength < 100) {
    console.log(
      `[Xiaohongshu] Skipping note with insufficient content: ${textLength} chars`
    );
    return null;
  }

  // Detect placeholder content (login wall)
  if (isPlaceholderContent(result.content)) {
    // Store with low quality score and flag for re-crawl
    return {
      ...result,
      qualityScore: 20, // Low score
      tags: [...(result.tags || []), 'needs-recrawl'],
    };
  }

  return result;
}

function isPlaceholderContent(content: string): boolean {
  // Placeholder indicators from Phase 1 diagnosis
  return (
    content.length < 300 &&
    (content.includes('旅游笔记') || content.includes('旅游攻略'))
  );
}
```

### Pattern 5: Detail Page Navigation for Fresh URLs (NEW)

**What:** Navigate to note detail page for fresh video URLs
**When to use:** For video notes where CDN URLs may have expired
**Example:**

```typescript
// Source: New pattern based on CONTEXT.md and diagnosis
async function fetchNoteDetail(
  noteId: string,
  city: string
): Promise<CrawlResult | null> {
  const detailUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

  try {
    await navigateTo(detailUrl, { timeout: 30000 });
    await waitForContentStable();

    // Try API interception on detail page for fresh video URLs
    const apiNotes = await extractNotesFromApi();
    const note = apiNotes.find((n) => n.note_id === noteId);

    if (note) {
      return convertNoteToResult(note, city);
    }

    // Fallback to snapshot
    return extractFromDetailSnapshot(noteId, city);
  } catch (error) {
    console.error(`[Xiaohongshu] Error fetching note detail: ${noteId}`, error);
    return null;
  }
}
```

### Anti-Patterns to Avoid

- **Downloading video immediately**: Don't download videos in crawler; URLs expire in ~30 seconds but that's for the consumer to handle. Just capture the URL.
- **Long sleeps between notes**: Use `waitForContentStable()` instead of `sleep(3000)`. The existing code already does this correctly.
- **Ignoring placeholder content**: Per CONTEXT.md, store placeholders with low quality score, don't skip entirely.
- **Pre-crawl session validation**: Per CONTEXT.md, detect validity on first note, not before crawl starts.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                | Don't Build            | Use Instead                                     | Why                                       |
| ---------------------- | ---------------------- | ----------------------------------------------- | ----------------------------------------- |
| Session management     | Custom cookie handling | `session/` module                               | Already handles persistent Chrome profile |
| Content stability      | Fixed delays           | `waitForContentStable()`                        | Smart detection, already integrated       |
| API interception       | Manual parsing         | `listNetworkRequests()` + `getNetworkRequest()` | Chrome DevTools MCP handles this          |
| Chinese number parsing | Custom regex           | `parseChineseNumber()`                          | Already handles 千, 万, k, w units        |
| Session validation     | Custom checks          | `checkSessionWithGuidance()`                    | Returns structured guidance               |

**Key insight:** The Xiaohongshu crawler already uses the infrastructure correctly. The enhancements are about robustness (quality filtering, placeholder detection) not adding new capabilities.

## Common Pitfalls

### Pitfall 1: CDN URL Expiry for Videos

**What goes wrong:** Video URLs expire in ~30 seconds; if stored and consumed later, they 404
**Why it happens:** XHS uses short-lived signed CDN URLs for video streams
**How to avoid:**

- Document in CrawlResult that video URLs are ephemeral
- Consider adding `videoUrlCapturedAt` timestamp to track freshness
- For re-crawl scenarios, navigate to detail page for fresh URLs
  **Warning signs:** HTTP 403/404 when accessing stored video URLs

### Pitfall 2: Placeholder Content from Login Wall

**What goes wrong:** Without login, XHS returns placeholder/teaser content (300-char context)
**Why it happens:** XHS restricts full content to logged-in users
**How to avoid:**

- Per CONTEXT.md: store with low quality score, flag for re-crawl
- Detect via short content + generic titles like "旅游笔记"
- Log statistics at end: X notes with full content, Y placeholders
  **Warning signs:** Content < 300 chars, generic titles, no images extracted

### Pitfall 3: API Interception Returns Empty

**What goes wrong:** `extractNotesFromApi()` returns empty array even when logged in
**Why it happens:** API requests may not have completed before we check, or responses not captured
**How to avoid:**

- Current code already scrolls and waits before checking
- Ensure `scrollToLoadContent(3)` triggers API calls
- Fallback to snapshot extraction is already implemented
  **Warning signs:** `Found 0 feed/search requests` in logs

### Pitfall 4: Rate Limiting and Anti-Bot Detection

**What goes wrong:** High captcha rate, blocked requests, repeated placeholder content
**Why it happens:** Too aggressive crawling triggers anti-bot
**How to avoid:**

- Current code uses persistent session (good)
- Add 1-2 second delay between detail page navigations
- Per CONTEXT.md: report statistics at end, no threshold-based stopping
  **Warning signs:** Captcha detected in `validateXiaohongshuSession()`, high placeholder rate

### Pitfall 5: Session Expiry Mid-Crawl

**What goes wrong:** Session becomes invalid partway through crawl
**Why it happens:** XHS sessions expire or get invalidated
**How to avoid:**

- Per CONTEXT.md: auto-refresh session from saved cookies
- Detect via first note returning placeholder when previously had full content
- Re-initialize session with `initSessionForPlatform('xiaohongshu')`
  **Warning signs:** Sudden shift from full content to placeholder content

## Code Examples

Verified patterns from the existing codebase:

### XiaohongshuNote API Interface (Already Defined)

```typescript
// Source: xiaohongshu.ts lines 23-56
interface XiaohongshuNote {
  note_id: string;
  title?: string;
  desc?: string;
  type?: string; // 'video' for video notes
  user?: {
    user_id?: string;
    nickname?: string;
    avatar?: string;
  };
  interact_info?: {
    liked_count?: string; // May include units like "2.7万"
    collected_count?: string;
    comment_count?: string;
  };
  image_list?: Array<{
    url_default?: string;
    url?: string;
    width?: number;
    height?: number;
  }>;
  video?: {
    media?: {
      stream?: {
        h264?: Array<{ master_url?: string }>;
        h265?: Array<{ master_url?: string }>;
      };
    };
    image?: {
      first_frame_fileid?: string;
    };
  };
  tag_list?: Array<{ name?: string }>;
}
```

### Session Check with Guidance (Already Integrated)

```typescript
// Source: xiaohongshu.ts lines 126-130
const sessionCheck = await checkSessionWithGuidance('xiaohongshu');
if (!sessionCheck.canCrawl) {
  console.warn(`[Xiaohongshu] ${sessionCheck.message}`);
  return notes; // Return empty, let caller handle
}
```

### Quality Score Calculation (Already Implemented)

```typescript
// Source: xiaohongshu.ts lines 458-476
function calculateQualityScore(
  content: string,
  imageCount: number,
  likesCount: number
): number {
  let score = 50;

  if (content.length > 500) score += 10;
  if (content.length > 1000) score += 10;
  if (content.length > 2000) score += 5;

  score += Math.min(imageCount * 2, 15);

  if (likesCount > 100) score += 5;
  if (likesCount > 1000) score += 5;
  if (likesCount > 10000) score += 5;

  return Math.min(score, 100);
}
```

## State of the Art

| Old Approach             | Current Approach               | When Changed           | Impact             |
| ------------------------ | ------------------------------ | ---------------------- | ------------------ |
| Fixed `sleep()` delays   | `waitForContentStable()`       | Phase 1 diagnosis      | Already integrated |
| No session management    | Persistent Chrome profile      | Phase 2                | Already integrated |
| Single extraction method | Dual-strategy (API + fallback) | Initial implementation | Already in place   |

**Deprecated/outdated:** None - the current implementation uses modern patterns.

## Open Questions

Things that couldn't be fully resolved:

1. **Video URL Expiry Handling**
   - What we know: CDN URLs expire in ~30 seconds; this is documented in Phase 1 diagnosis
   - What's unclear: Should we add a `capturedAt` timestamp to the result? How do consumers handle expired URLs?
   - Recommendation: Document expiry behavior; consider adding optional timestamp field

2. **H264 vs H265 Preference**
   - What we know: Both streams available, H264 has broader compatibility
   - What's unclear: Which to prefer? What if only one is available?
   - Recommendation: Per CONTEXT.md, this is Claude's discretion. Prefer H264 for compatibility, fall back to H265

3. **Rate Limiting Between Requests**
   - What we know: XHS has strict rate limiting per diagnosis
   - What's unclear: Optimal delay between detail page navigations
   - Recommendation: Per CONTEXT.md, this is Claude's discretion. Start with 1-2 second delay

## Sources

### Primary (HIGH confidence)

- `xiaohongshu.ts` (477 lines) - Existing implementation reviewed
- `session/manager.ts` - Session management infrastructure
- `session/validators.ts` - Xiaohongshu-specific validation
- `diagnostics/capture.ts` - `waitForContentStable()` implementation
- `mcp-client.ts` - Chrome DevTools MCP integration
- `07-CONTEXT.md` - User decisions for this phase

### Secondary (MEDIUM confidence)

- Chrome DevTools MCP tool reference (official docs) - Network interception tools
- Phase 1 diagnosis findings (referenced in context) - CDN expiry, anti-bot level

### Tertiary (LOW confidence)

- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Already in use, verified in codebase
- Architecture: HIGH - Existing patterns well-documented, enhancements are incremental
- Pitfalls: HIGH - Based on Phase 1 diagnosis and code review

**Research date:** 2026-01-25
**Valid until:** 30 days (stable infrastructure, platform-specific patterns)
