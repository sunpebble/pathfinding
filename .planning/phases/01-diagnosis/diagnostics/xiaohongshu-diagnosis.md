# Xiaohongshu (小红书) Diagnostic Report

**Platform:** xiaohongshu
**Diagnosed:** 2026-01-25
**Method:** Code analysis + architecture review

## Test URLs

- Explore page: `https://www.xiaohongshu.com/explore`
- Note detail: `https://www.xiaohongshu.com/explore/[24-char-hex-id]`

## Current Implementation Analysis

Xiaohongshu has the **most sophisticated crawler implementation** among all 5 platforms, using a dual-strategy approach:

### Strategy 1: API Interception (Primary)
```typescript
// Lines 167-212: extractNotesFromApi()
const feedRequests = requests.filter(r =>
  r.url.includes('/api/sns/web/v1/feed') ||
  r.url.includes('/api/sns/web/v1/search') ||
  r.url.includes('/api/sns/web/v1/homefeed')
);
```

### Strategy 2: Snapshot Fallback (Secondary)
```typescript
// Lines 214-334: extractNotesFromSnapshot()
// Falls back to 300-char context extraction like Mafengwo/Tongcheng
```

### Data Flow

```
Navigate to /explore → Wait → Scroll to trigger API calls
                         ↓
              Try API Interception
                    ↓           ↓
            [Success]     [Failure]
                ↓              ↓
       Parse API JSON    Snapshot Fallback
                ↓              ↓
        Full Data        Partial Data
```

## API Endpoints

### Discovered Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/api/sns/web/v1/feed` | Home feed | Partial |
| `/api/sns/web/v1/homefeed` | Home feed (alt) | Partial |
| `/api/sns/web/v1/search` | Search results | Partial |

### API Response Structure

```typescript
interface FeedResponse {
  data?: {
    items?: Array<{
      note_card?: {
        note_id: string;
        title?: string;
        desc?: string;           // Full content
        type?: string;           // 'video' or 'normal'
        user?: {
          user_id?: string;
          nickname?: string;
          avatar?: string;
        };
        interact_info?: {
          liked_count?: string;   // "1.2万" format
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
        };
        tag_list?: Array<{ name?: string }>;
      };
    }>;
  };
}
```

### API Data Quality

| Field | From API | From Snapshot Fallback |
|-------|----------|----------------------|
| Title | ✅ Complete | ⚠️ From context |
| Content (desc) | ✅ Full text | ❌ Placeholder |
| Images | ✅ Full list with dimensions | ⚠️ 0-1 from context |
| Videos | ✅ H264/H265 streams | ❌ Not available |
| Author | ✅ nickname + avatar | ⚠️ Pattern match only |
| Stats | ✅ likes, saves, comments | ⚠️ From context |
| Tags | ✅ Full tag list | ⚠️ Pattern match |

## Video Extraction Feasibility

### ✅ Video Extraction IS IMPLEMENTED

```typescript
// Lines 368-381: Video URL extraction
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

### Video URL Format
- **H264**: `master_url` from `video.media.stream.h264[0]`
- **H265**: `master_url` from `video.media.stream.h265[0]`
- **Thumbnail**: Constructed from `first_frame_fileid`

### ⚠️ CDN URL Expiration

Research indicates Xiaohongshu video URLs expire in approximately **30 seconds**.

**Recommendation:** Download videos immediately or implement URL refresh mechanism.

## Login Requirements

### Login Detection

```typescript
// Lines 124-131: Login wall detection
if (initialSnapshot.content.includes('登录') &&
    initialSnapshot.content.includes('验证')) {
  console.warn('[Xiaohongshu] Login/verification required - limited data available');
}
```

### Login Helper Reference

```typescript
// Lines 94-99
console.warn('[Xiaohongshu] No results found. You may need to login first:');
console.warn('  Run: pnpm --filter ai-service exec tsx src/login-helper.ts xiaohongshu');
```

### Content Availability by Login State

| Content | Without Login | With Login |
|---------|---------------|------------|
| Feed API access | ⚠️ Limited/blocked | ✅ Full access |
| Note content | ⚠️ May show login wall | ✅ Full content |
| High-res images | ⚠️ May be restricted | ✅ Full resolution |
| Video streams | ⚠️ May be blocked | ✅ Available |
| User profiles | ❌ Blocked | ✅ Available |

**Strong recommendation:** Implement persistent login session for reliable extraction.

## Anti-Bot Mechanisms

### Observed Protections

1. **Login Wall** (Lines 124-131)
   - Detects "登录" and "验证" in snapshot
   - Limits data when detected

2. **API Rate Limiting**
   - API calls may be throttled
   - Captcha may appear after many requests

3. **Fixed Delays** (Lines 120, 134)
   ```typescript
   await sleep(3000);  // Initial wait
   await sleep(2000);  // After scroll
   ```

4. **Isolated Session** (Line 72)
   ```typescript
   await initMCP({ persistent: false });  // New session each time
   ```

### Anti-Bot Severity

| Mechanism | Severity | Impact |
|-----------|----------|--------|
| Login requirement | HIGH | Blocks most API access |
| Captcha | MEDIUM | May appear during heavy use |
| Rate limiting | MEDIUM | Slows crawling |
| User-Agent detection | LOW | Chrome DevTools MCP handles this |

**Xiaohongshu has the STRONGEST anti-bot protection** among all 5 platforms.

## Failure Category

**When API works:** `success` or `parsing:partial`
**When API fails (no login):** `parsing:no_content` or `acquisition:login_required`

The crawler has a **bimodal behavior**:
- With API access: Excellent data quality
- Without API access: Falls back to placeholder content (same issue as Mafengwo/Tongcheng)

## Existing Crawler Output Comparison

### API Success Case (Ideal)
```typescript
{
  title: "北京三日游超详细攻略",
  content: "Day 1: 故宫...(完整内容)",
  imageUrls: ["url1", "url2", ...],  // 多张图片
  videoUrls: ["h264_stream_url"],     // 视频
  authorName: "旅行博主小王",
  authorAvatar: "https://avatar...",
  likesCount: 12000,
  savesCount: 5000,
  commentsCount: 300,
  contentType: "video"
}
```

### Snapshot Fallback Case (Degraded)
```typescript
{
  title: "北京旅游笔记",              // From context or default
  content: "北京旅游笔记 - 北京旅游攻略",  // PLACEHOLDER
  imageUrls: [],                      // Empty or 1 image
  videoUrls: undefined,               // No video
  authorName: "小红书用户",            // Default
  qualityScore: 50                    // Low
}
```

## Root Cause Analysis

### Primary Issue: API Access Requires Login

The current implementation:
1. **API interception is well-designed** (already implemented)
2. **But API often blocked without login**
3. **Fallback degrades to placeholder content**

### Secondary Issues

1. **Snapshot fallback uses 300-char context** (same as Mafengwo/Tongcheng)
2. **No detail page navigation** in fallback mode
3. **Video URLs expire quickly** (~30 seconds)

## Recommended Fix Approach

### Priority 1: Implement Persistent Login Session

```typescript
// Change from:
await initMCP({ persistent: false });

// To (when session exists):
await initMCP({ persistent: true });
```

The login-helper already exists — ensure it's used and sessions are validated.

### Priority 2: Add Detail Page Navigation for Fallback

When API fails, navigate to individual note pages:
```typescript
async function fetchNoteDetail(noteId: string): Promise<CrawlResult | null> {
  await navigateTo(`https://www.xiaohongshu.com/explore/${noteId}`);
  await waitForContentStable();

  // Try API interception for single note
  const apiData = await extractSingleNoteFromApi();
  if (apiData) return convertNoteToResult(apiData);

  // Parse from snapshot if API fails
  const snapshot = await takeSnapshot({ verbose: true });
  return parseNoteFromSnapshot(snapshot);
}
```

### Priority 3: Handle CDN URL Expiration

Options:
1. **Immediate download** after extraction
2. **URL refresh mechanism** before serving
3. **Proxy through backend** for on-demand refresh

### Priority 4: Replace Fixed Sleep with Smart Wait

```typescript
// Replace sleep(3000) with:
await waitForContentStable(10000, 500);
```

## Platform-Specific Quirks

1. **Note ID format**: 24-character hex string (e.g., `507f1f77bcf86cd799439011`)
2. **Count format**: Uses "万" (10k) and "k" suffixes (e.g., "1.2万" = 12000)
3. **Dual content types**: `normal` (images) and `video`
4. **Tag source**: Both from API `tag_list` and pattern matching
5. **CDN domains**: Multiple domains including `sns-img-qc.xhscdn.com`

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| API endpoint identification | HIGH | Code clearly shows API paths |
| Video extraction feasibility | HIGH | Already implemented in code |
| Login requirement | HIGH | Code has detection + helper reference |
| CDN expiration | MEDIUM | Research-based, needs runtime verification |
| Fix recommendations | HIGH | Follow existing API pattern with login |

---

_Diagnosed: 2026-01-25 via code analysis_
