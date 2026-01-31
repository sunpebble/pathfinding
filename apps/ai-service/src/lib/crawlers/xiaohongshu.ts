import type { BrowserClient } from './clients/index.js';
import type {
  ContentBlock,
  CrawlComment,
  CrawlOptions,
  CrawlResult,
} from './index.js';
import { createLogger } from '../logger.js';
import {
  extractAuthor,
  extractHeadings,
  extractImageUrls,
  extractStaticText,
} from './accessibility-parser.js';
import { createBrowserClient } from './clients/index.js';
import { checkSessionWithGuidance } from './session/index.js';

const log = createLogger('xiaohongshu');

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to scroll and load content
async function scrollToLoadContent(
  client: BrowserClient,
  scrollCount: number = 3
): Promise<void> {
  for (let i = 0; i < scrollCount; i++) {
    await client.scroll('down');
    await sleep(500);
  }
}

/**
 * Wait for page content to stabilize (stop changing)
 * Local version using BrowserClient instead of MCP
 *
 * @param client - Browser client instance
 * @param maxWait Maximum time to wait in ms (default: 10000)
 * @param stabilityWindow Time between checks in ms (default: 500)
 * @returns true if content stabilized, false if timed out
 */
async function waitForContentStable(
  client: BrowserClient,
  maxWait: number = 10000,
  stabilityWindow: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  let lastSnapshotLength = 0;
  let stableCount = 0;

  while (Date.now() - startTime < maxWait) {
    const snapshot = await client.takeSnapshot();
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

interface XiaohongshuNote {
  note_id: string;
  title?: string;
  desc?: string;
  type?: string;
  user?: {
    user_id?: string;
    nickname?: string;
    avatar?: string;
  };
  interact_info?: {
    liked_count?: string;
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

interface FeedResponse {
  data?: {
    items?: Array<{
      note_card?: XiaohongshuNote;
    }>;
  };
}

interface XiaohongshuComment {
  id: string;
  content: string;
  user_info?: {
    user_id?: string;
    nickname?: string;
    image?: string;
  };
  like_count?: string;
  sub_comment_count?: string;
  create_time?: number;
  target_comment?: {
    id?: string;
  };
}

interface CommentResponse {
  data?: {
    comments?: XiaohongshuComment[];
    cursor?: string;
    has_more?: boolean;
  };
}

interface UserPostedResponse {
  data?: {
    notes?: XiaohongshuNote[];
    cursor?: string;
    has_more?: boolean;
  };
}

export async function crawlXiaohongshu(
  city: string,
  options: CrawlOptions = {},
  client?: BrowserClient
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;

  log.info({ city }, 'Crawling guides for city');

  // Create client if not provided
  const shouldCloseClient = !client;
  if (!client) {
    client = createBrowserClient();
  }

  try {
    // Initialize with persistent session for login state
    await client.init({ persistent: true });
    log.info('Using persistent Chrome session');

    // Enable network capture for API interception
    await client.enableNetworkCapture(['xhr', 'fetch']);

    // Route to appropriate crawler based on options
    if (options.userId) {
      // User profile mode: crawl all notes from a specific user
      log.info({ userId: options.userId }, 'Crawling user profile');
      const userNotes = await fetchNotesFromUserProfile(
        options.userId,
        city,
        maxGuides,
        options,
        client
      );
      results.push(...userNotes);
    } else if (options.searchQuery) {
      // Search mode: search for notes by keyword
      log.info({ query: options.searchQuery }, 'Searching for notes');
      const searchNotes = await fetchNotesFromSearch(
        options.searchQuery,
        city,
        maxGuides,
        options,
        client
      );
      results.push(...searchNotes);
    } else {
      // Default: explore page
      const exploreUrl = 'https://www.xiaohongshu.com/explore';
      log.info('Fetching explore page');

      const exploreGuides = await fetchNotesFromExplore(
        exploreUrl,
        city,
        maxGuides,
        options,
        client
      );
      log.info({ count: exploreGuides.length }, 'Found notes from explore');

      for (const guide of exploreGuides) {
        if (
          !results.some((r) => r.sourceExternalId === guide.sourceExternalId)
        ) {
          results.push(guide);
        }
      }
    }

    if (results.length === 0) {
      log.warn('No results found. Session may need refresh');
      log.warn(
        'Run: pnpm --filter ai-service exec tsx src/login-helper.ts xiaohongshu'
      );
    }
  } catch (error) {
    log.error({ error }, 'Error fetching explore page');
  } finally {
    if (shouldCloseClient) {
      await client.close();
      log.info('Browser client closed');
    }
  }

  return results;
}

/**
 * Attempts to refresh the session when it expires mid-crawl.
 * Returns true if refresh was successful, false otherwise.
 */
export async function handleSessionRefresh(
  client: BrowserClient
): Promise<boolean> {
  try {
    log.warn('Session expired, attempting refresh');
    // Re-initialize with persistent session
    await client.init({ persistent: true });
    await client.enableNetworkCapture(['xhr', 'fetch']);
    log.info('Session refresh successful');
    return true;
  } catch (error) {
    log.error({ error }, 'Session refresh failed');
    return false;
  }
}

/**
 * Fetches fresh video URLs from a note's detail page.
 * Video CDN URLs expire in ~30 seconds, so we need to navigate to detail page
 * to capture fresh URLs for video notes.
 *
 * @param noteId - The Xiaohongshu note ID
 * @param city - City name for result conversion
 * @param client - Browser client instance
 * @returns CrawlResult with fresh video URLs, or null if failed
 */
async function fetchNoteDetail(
  noteId: string,
  city: string,
  client: BrowserClient
): Promise<CrawlResult | null> {
  const detailUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

  try {
    log.info({ noteId }, 'Fetching detail page for note');
    await client.navigateTo(detailUrl, { timeout: 30000 });
    await waitForContentStable(client);

    // Add rate limiting between detail page navigations
    await sleep(1500); // 1.5 second delay per RESEARCH.md recommendation

    // Try API interception on detail page for fresh video URLs
    const apiNotes = await extractNotesFromApi(client);
    const note = apiNotes.find((n) => n.note_id === noteId);

    if (note) {
      const result = convertNoteToResult(note, city);
      if (result) {
        // Add video URL capture timestamp for expiry awareness
        // Video CDN URLs expire in ~30 seconds. videoUrlCapturedAt helps consumers know URL freshness.
        if (result.videoUrls && result.videoUrls.length > 0) {
          result.videoUrlCapturedAt = Date.now();
        }
        return result;
      }
    }

    // Fallback: the note may have been loaded in a different API response
    // Return null and let caller handle
    log.info({ noteId }, 'Note not found in detail page API response');
    return null;
  } catch (error) {
    log.error({ error, noteId }, 'Error fetching note detail');
    return null;
  }
}

async function fetchNotesFromExplore(
  exploreUrl: string,
  city: string,
  maxNotes: number,
  options: CrawlOptions = {},
  client: BrowserClient
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];

  // Statistics tracking for content quality
  const stats = {
    fullContent: 0,
    placeholders: 0,
    videoDetailFetches: 0,
    detailPageFetches: 0,
    commentsFetched: 0,
    sessionRefreshAttempted: false,
  };

  try {
    await client.navigateTo(exploreUrl, { timeout: 30000 });
    await waitForContentStable(client);

    // Check session validity using session module
    const sessionCheck = await checkSessionWithGuidance(client, 'xiaohongshu');
    if (!sessionCheck.canCrawl) {
      log.warn({ message: sessionCheck.message }, 'Session check failed');
      return notes; // Return empty, let caller handle
    }

    await scrollToLoadContent(client, 3);
    await sleep(2000);

    // Try to extract from API responses first (most reliable)
    const apiNotes = await extractNotesFromApi(client);
    if (apiNotes.length > 0) {
      log.info({ count: apiNotes.length }, 'Extracted notes from explore API');

      for (const note of apiNotes.slice(0, maxNotes)) {
        // convertNoteToResult now handles quality filtering internally
        const result = convertNoteToResult(note, city);
        if (!result) continue; // Skip filtered notes

        // Track placeholder vs full content for session expiry detection
        const hasNeedsRecrawlTag = result.tags?.includes('needs-recrawl');
        if (hasNeedsRecrawlTag) {
          stats.placeholders++;

          // Detect sudden session expiry: we had good content, now only placeholders
          if (
            stats.fullContent > 0 &&
            stats.placeholders >= 3 &&
            !stats.sessionRefreshAttempted
          ) {
            log.warn(
              {
                fullContent: stats.fullContent,
                placeholders: stats.placeholders,
              },
              'Detected session expiry pattern'
            );
            stats.sessionRefreshAttempted = true;
            const refreshed = await handleSessionRefresh(client);
            if (refreshed) {
              // Navigate back and try again with refreshed session
              await client.navigateTo(exploreUrl, { timeout: 30000 });
              await waitForContentStable(client);
            }
          }
        } else {
          stats.fullContent++;
        }

        // For video notes, fetch detail page for fresh video URLs
        // Video CDN URLs expire in ~30 seconds, so we need fresh URLs from detail page
        // Also fetch detail if fetchDetailContent is enabled for full content
        const shouldFetchDetail =
          note.type === 'video' || options.fetchDetailContent;

        if (shouldFetchDetail) {
          const detailResult = await fetchNoteDetail(
            note.note_id,
            city,
            client
          );
          if (detailResult) {
            // Merge full content from detail page
            if (
              options.fetchDetailContent &&
              detailResult.content.length > result.content.length
            ) {
              result.content = detailResult.content;
              result.contentBlocks = detailResult.contentBlocks;
              stats.detailPageFetches++;
            }
            // Merge fresh video URLs
            if (detailResult.videoUrls && detailResult.videoUrls.length > 0) {
              result.videoUrls = detailResult.videoUrls;
              result.videoUrlCapturedAt = detailResult.videoUrlCapturedAt;
              stats.videoDetailFetches++;
            }
          }
          // Add rate limiting between fetchNoteDetail calls
          await sleep(1500);
        }

        // Fetch comments if enabled
        if (options.fetchComments) {
          const comments = await fetchNoteComments(
            note.note_id,
            options.maxCommentsPerPost || 20,
            client
          );
          if (comments.length > 0) {
            result.comments = comments;
            stats.commentsFetched += comments.length;
          }
          await sleep(1000);
        }

        notes.push(result);
      }
    }

    // Fall back to snapshot extraction if API didn't work
    if (notes.length < maxNotes) {
      const snapshotNotes = await extractNotesFromSnapshot(
        city,
        maxNotes - notes.length,
        client
      );
      for (const note of snapshotNotes) {
        if (!notes.some((n) => n.sourceExternalId === note.sourceExternalId)) {
          // Check placeholder for snapshot-extracted notes too
          const isPlaceholder = detectPlaceholderContent(
            note.content,
            note.title || ''
          );
          if (isPlaceholder) {
            stats.placeholders++;
            note.qualityScore = 20;
            // Add needs-recrawl tag for placeholder notes
            if (!note.tags) note.tags = [];
            if (!note.tags.includes('needs-recrawl')) {
              note.tags.push('needs-recrawl');
            }
          } else {
            stats.fullContent++;
          }

          // Only include notes with acceptable content length
          const qualityCheck = isContentQualityAcceptable(note.content);
          if (qualityCheck.acceptable) {
            notes.push(note);
          }
        }
      }
    }
  } catch (error) {
    log.error({ error }, 'Error fetching explore page');
  }

  // Log extraction statistics
  log.info(
    {
      fullContent: stats.fullContent,
      placeholders: stats.placeholders,
      videoDetailFetches: stats.videoDetailFetches,
      detailPageFetches: stats.detailPageFetches,
      commentsFetched: stats.commentsFetched,
    },
    'Extraction stats'
  );
  if (stats.sessionRefreshAttempted) {
    log.info('Session refresh was attempted during extraction');
  }

  return notes;
}

async function extractNotesFromApi(
  client: BrowserClient
): Promise<XiaohongshuNote[]> {
  const notes: XiaohongshuNote[] = [];

  try {
    const requests = await client.listNetworkRequests(['xhr', 'fetch']);
    log.debug({ count: requests.length }, 'Found network requests');

    const feedRequests = requests.filter(
      (r) =>
        r.url.includes('/api/sns/web/v1/feed') ||
        r.url.includes('/api/sns/web/v1/search') ||
        r.url.includes('/api/sns/web/v1/homefeed')
    );
    log.debug({ count: feedRequests.length }, 'Found feed/search requests');

    for (const req of feedRequests.slice(-5)) {
      try {
        log.debug(
          { requestId: req.id, url: req.url.substring(0, 80) },
          'Fetching request'
        );
        const detail = await client.getNetworkRequest(req.id);
        if (detail?.responseBody) {
          const data: FeedResponse = JSON.parse(detail.responseBody);
          if (data.data?.items) {
            log.debug({ count: data.data.items.length }, 'Found items in response');
            for (const item of data.data.items) {
              if (item.note_card?.note_id) {
                notes.push(item.note_card);
              }
            }
          }
        }
      } catch (e) {
        log.debug({ requestId: req.id, error: e }, 'Failed to parse request');
      }
    }
  } catch (error) {
    log.error({ error }, 'Error extracting from API');
  }

  return notes;
}

async function extractNotesFromSnapshot(
  city: string,
  maxNotes: number,
  client: BrowserClient
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    const snapshot = await client.takeSnapshot({ verbose: true });
    const content = snapshot.content;

    log.debug({ snapshotLength: content.length }, 'Snapshot captured');
    log.debug({ preview: content.substring(0, 500) }, 'Snapshot preview');

    // Extract note IDs from snapshot
    const noteIdMatches = content.matchAll(/\/explore\/([a-f0-9]{24})/gi);
    const noteIds: string[] = [];
    for (const match of noteIdMatches) {
      if (!seenIds.has(match[1])) {
        seenIds.add(match[1]);
        noteIds.push(match[1]);
      }
    }

    log.info({ count: noteIds.length }, 'Found unique note IDs in snapshot');

    // Use accessibility parser for better title extraction
    const headings = extractHeadings(content);
    const staticTexts = extractStaticText(content);
    const imageUrls = extractImageUrls(content);

    for (let i = 0; i < noteIds.slice(0, maxNotes).length; i++) {
      const noteId = noteIds[i];

      // Try to find context around this note ID
      const notePattern = new RegExp(
        `([^\\n]{0,300})\\/explore\\/${noteId}([^\\n]{0,300})`,
        'i'
      );
      const contextMatch = content.match(notePattern);

      let title = '';
      let authorName = '小红书用户';

      if (contextMatch) {
        const beforeText = contextMatch[1];
        const afterText = contextMatch[2];
        const localContext = beforeText + afterText;

        // Use accessibility parser to extract title from context
        const localHeadings = extractHeadings(localContext);
        if (localHeadings.length > 0) {
          title = localHeadings[0];
        }

        // Try to extract from StaticText if no heading found
        if (!title) {
          const localTexts = extractStaticText(localContext);
          const meaningfulText = localTexts.find(
            (t) =>
              t.length >= 5 &&
              t.length <= 100 &&
              /[\u4E00-\u9FFF]/.test(t) &&
              !t.includes('http')
          );
          if (meaningfulText) {
            title = meaningfulText;
          }
        }

        // Try to get author
        const localAuthor = extractAuthor(localContext);
        if (localAuthor) {
          authorName = localAuthor;
        }
      }

      // Fallback: use global headings/texts if local extraction failed
      if (!title && headings[i]) {
        title = headings[i];
      }
      if (!title && staticTexts[i]) {
        title = staticTexts[i].substring(0, 100);
      }
      if (!title) {
        title = `${city}旅游笔记`;
      }

      // Get cover image if available
      const coverImageUrl = imageUrls[i];

      const contentBlocks: ContentBlock[] = [
        { type: 'text', content: `${title} - ${city}旅游攻略` },
      ];
      if (coverImageUrl) {
        contentBlocks.push({ type: 'image', url: coverImageUrl });
      }

      notes.push({
        sourceExternalId: `xiaohongshu_${noteId}`,
        sourceUrl: `https://www.xiaohongshu.com/explore/${noteId}`,
        title: title.substring(0, 200),
        content: `${title} - ${city}旅游攻略`,
        contentBlocks,
        contentType: 'normal',
        authorName,
        coverImageUrl,
        imageUrls: coverImageUrl ? [coverImageUrl] : [],
        destinations: [city],
        tags: extractTags(title, ''),
        qualityScore: 50,
      });
    }
  } catch (error) {
    log.error({ error }, 'Error extracting from snapshot');
  }

  return notes;
}

function convertNoteToResult(
  note: XiaohongshuNote,
  city: string
): CrawlResult | null {
  if (!note.note_id) return null;

  const title = note.title || note.desc?.substring(0, 50) || '';
  if (!title || title.length < 2) return null;

  const content = note.desc || title;

  // Early quality check - skip notes that don't meet minimum quality threshold
  const qualityCheck = isContentQualityAcceptable(content);
  if (!qualityCheck.acceptable) {
    log.warn(
      { noteId: note.note_id, reason: qualityCheck.reason },
      'Skipping note'
    );
    return null;
  }

  // Check for placeholder content
  const isPlaceholder = detectPlaceholderContent(content, title);

  const contentBlocks: ContentBlock[] = [];
  const imageUrls: string[] = [];
  const videoUrls: string[] = [];

  if (note.desc) {
    contentBlocks.push({ type: 'text', content: note.desc });
  }

  if (note.image_list) {
    for (const img of note.image_list) {
      const url = img.url_default || img.url;
      if (url) {
        imageUrls.push(url);
        contentBlocks.push({
          type: 'image',
          url,
          width: img.width,
          height: img.height,
        });
      }
    }
  }

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

  const likesCount = parseCount(note.interact_info?.liked_count);
  const savesCount = parseCount(note.interact_info?.collected_count);
  const commentsCount = parseCount(note.interact_info?.comment_count);

  const tags =
    (note.tag_list?.map((t) => t.name).filter(Boolean) as string[]) || [];
  tags.push(...extractTags(title, note.desc || ''));
  const uniqueTags = [...new Set(tags)].slice(0, 10);

  // Calculate quality score with placeholder detection
  const { score, needsRecrawl } = calculateXhsQualityScore(
    content,
    imageUrls.length,
    likesCount,
    isPlaceholder
  );

  // Add 'needs-recrawl' tag if flagged for re-crawling
  if (needsRecrawl) {
    uniqueTags.push('needs-recrawl');
  }

  return {
    sourceExternalId: `xiaohongshu_${note.note_id}`,
    sourceUrl: `https://www.xiaohongshu.com/explore/${note.note_id}`,
    title: title.substring(0, 200),
    content,
    contentBlocks,
    contentType: note.type === 'video' ? 'video' : 'normal',
    authorName: note.user?.nickname || '小红书用户',
    authorAvatar: note.user?.avatar,
    coverImageUrl: imageUrls[0],
    imageUrls,
    videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
    destinations: [city],
    tags: uniqueTags,
    likesCount,
    savesCount,
    commentsCount,
    qualityScore: score,
  };
}

function parseCount(value?: string): number {
  if (!value) return 0;
  const num = Number.parseFloat(value);
  if (value.includes('万') || value.toLowerCase().includes('w')) {
    return Math.floor(num * 10000);
  }
  if (value.toLowerCase().includes('k')) {
    return Math.floor(num * 1000);
  }
  return Math.floor(num) || 0;
}

function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃|探店|必吃/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈|打卡住/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去|网红/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁|攻略/, tag: '交通' },
    { pattern: /购物|商场|特产|伴手礼/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝|遛娃/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月|约会|小众/, tag: '情侣游' },
    { pattern: /自驾|租车|自由行|路线/, tag: '自驾游' },
    { pattern: /摄影|拍照|出片|氛围感|穿搭/, tag: '摄影' },
    { pattern: /徒步|登山|户外|露营|野餐/, tag: '户外' },
    { pattern: /省钱|预算|穷游|平价|白嫖/, tag: '省钱攻略' },
    { pattern: /周末|一日游|两天|短途/, tag: '短途游' },
    { pattern: /古镇|古城|历史|文化/, tag: '文化' },
    { pattern: /海滩|海边|海岛|潜水/, tag: '海滩' },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

/**
 * Detects if content appears to be a login-wall placeholder.
 * Returns true if content is generic placeholder that needs re-crawl with valid session.
 *
 * Detection criteria (from RESEARCH.md):
 * - Content length < 300 characters AND
 * - Contains generic phrases like "旅游笔记", "旅游攻略", or title matches "${city}旅游笔记" pattern
 */
export function detectPlaceholderContent(
  content: string,
  title: string
): boolean {
  // Short content is suspicious
  if (content.length >= 300) {
    return false;
  }

  // Check for generic placeholder phrases
  const genericPhrases = ['旅游笔记', '旅游攻略', '旅游指南', '旅行攻略'];
  const hasGenericPhrase = genericPhrases.some(
    (phrase) => content.includes(phrase) || title.includes(phrase)
  );

  // Check if title matches "${city}旅游笔记" pattern (very generic)
  const cityNotePattern = /^.{2,10}(?:旅游笔记|旅游攻略|旅行攻略)$/;
  const hasCityNotePattern = cityNotePattern.test(title);

  if (hasGenericPhrase || hasCityNotePattern) {
    log.debug(
      { title: title.substring(0, 30), contentLength: content.length },
      'Detected placeholder content'
    );
    return true;
  }

  return false;
}

/**
 * Checks if content meets minimum quality threshold.
 * Per CONTEXT.md: minimum 100+ characters for a note to be worth extracting.
 */
export function isContentQualityAcceptable(content: string): {
  acceptable: boolean;
  reason?: string;
} {
  if (content.length < 100) {
    return {
      acceptable: false,
      reason: `Content too short (${content.length} chars, minimum 100)`,
    };
  }
  return { acceptable: true };
}

/**
 * Enhanced quality scoring with placeholder detection and re-crawl flagging.
 * Returns both score and whether the note needs re-crawling.
 */
export function calculateXhsQualityScore(
  content: string,
  imageCount: number,
  likesCount: number,
  isPlaceholder?: boolean
): { score: number; needsRecrawl: boolean } {
  let score = 50;

  // If placeholder content, cap score at 20 (low score for re-crawl prioritization)
  if (isPlaceholder) {
    return { score: 20, needsRecrawl: true };
  }

  if (content.length > 500) score += 10;
  if (content.length > 1000) score += 10;
  if (content.length > 2000) score += 5;

  score += Math.min(imageCount * 2, 15);

  if (likesCount > 100) score += 5;
  if (likesCount > 1000) score += 5;
  if (likesCount > 10000) score += 5;

  return { score: Math.min(score, 100), needsRecrawl: false };
}

/**
 * Fetch comments for a specific note.
 * Navigates to note detail page and intercepts comment API responses.
 *
 * @param noteId - The Xiaohongshu note ID
 * @param maxComments - Maximum number of comments to fetch
 * @param client - Browser client instance
 * @returns Array of CrawlComment objects
 */
async function fetchNoteComments(
  noteId: string,
  maxComments: number = 20,
  client: BrowserClient
): Promise<CrawlComment[]> {
  const comments: CrawlComment[] = [];

  try {
    log.info({ noteId }, 'Fetching comments for note');

    // Look for comment API requests in network log
    const requests = await client.listNetworkRequests(['xhr', 'fetch']);
    const commentRequests = requests.filter(
      (r) =>
        r.url.includes('/api/sns/web/v1/comment/') ||
        r.url.includes('/api/sns/web/v2/comment/')
    );

    for (const req of commentRequests.slice(-3)) {
      try {
        const detail = await client.getNetworkRequest(req.id);
        if (detail?.responseBody) {
          const data: CommentResponse = JSON.parse(detail.responseBody);
          if (data.data?.comments) {
            for (const comment of data.data.comments) {
              if (comments.length >= maxComments) break;

              comments.push({
                commentId: comment.id,
                content: comment.content,
                authorName: comment.user_info?.nickname,
                authorAvatar: comment.user_info?.image,
                authorId: comment.user_info?.user_id,
                likesCount: parseCount(comment.like_count),
                replyCount: parseCount(comment.sub_comment_count),
                publishedAt: comment.create_time
                  ? new Date(comment.create_time * 1000).toISOString()
                  : undefined,
                parentCommentId: comment.target_comment?.id,
              });
            }
          }
        }
      } catch (e) {
        log.debug({ error: e }, 'Failed to parse comment request');
      }
    }

    log.info({ noteId, count: comments.length }, 'Extracted comments for note');
  } catch (error) {
    log.error({ error, noteId }, 'Error fetching comments');
  }

  return comments;
}

/**
 * Search for notes by keyword.
 * Navigates to search page and extracts results from API.
 *
 * @param query - Search keyword
 * @param city - City name for result tagging
 * @param maxNotes - Maximum number of notes to return
 * @param options - Crawl options
 * @param client - Browser client instance
 * @returns Array of CrawlResult objects
 */
async function fetchNotesFromSearch(
  query: string,
  city: string,
  maxNotes: number,
  options: CrawlOptions = {},
  client: BrowserClient
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];

  try {
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}&type=1`;
    log.info({ query }, 'Navigating to search');

    await client.navigateTo(searchUrl, { timeout: 30000 });
    await waitForContentStable(client);

    // Check session validity
    const sessionCheck = await checkSessionWithGuidance(client, 'xiaohongshu');
    if (!sessionCheck.canCrawl) {
      log.warn({ message: sessionCheck.message }, 'Session check failed');
      return notes;
    }

    // Scroll to load more results
    await scrollToLoadContent(client, 3);
    await sleep(2000);

    // Extract from API (search endpoint should be captured)
    const apiNotes = await extractNotesFromApi(client);
    log.info({ count: apiNotes.length }, 'Found notes from search API');

    for (const note of apiNotes.slice(0, maxNotes)) {
      const result = convertNoteToResult(note, city);
      if (!result) continue;

      // Fetch detail content if enabled
      if (options.fetchDetailContent) {
        const detailResult = await fetchNoteDetail(note.note_id, city, client);
        if (
          detailResult &&
          detailResult.content.length > result.content.length
        ) {
          result.content = detailResult.content;
          result.contentBlocks = detailResult.contentBlocks;
        }
        await sleep(1500);
      }

      // Fetch comments if enabled
      if (options.fetchComments) {
        const comments = await fetchNoteComments(
          note.note_id,
          options.maxCommentsPerPost || 20,
          client
        );
        if (comments.length > 0) {
          result.comments = comments;
        }
        await sleep(1000);
      }

      notes.push(result);
    }
  } catch (error) {
    log.error({ error }, 'Error fetching search results');
  }

  return notes;
}

/**
 * Fetch all notes from a user's profile page.
 *
 * @param userId - The Xiaohongshu user ID
 * @param city - City name for result tagging
 * @param maxNotes - Maximum number of notes to return
 * @param options - Crawl options
 * @param client - Browser client instance
 * @returns Array of CrawlResult objects
 */
async function fetchNotesFromUserProfile(
  userId: string,
  city: string,
  maxNotes: number,
  options: CrawlOptions = {},
  client: BrowserClient
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];

  try {
    const profileUrl = `https://www.xiaohongshu.com/user/profile/${userId}`;
    log.info({ userId }, 'Navigating to user profile');

    await client.navigateTo(profileUrl, { timeout: 30000 });
    await waitForContentStable(client);

    // Check session validity
    const sessionCheck = await checkSessionWithGuidance(client, 'xiaohongshu');
    if (!sessionCheck.canCrawl) {
      log.warn({ message: sessionCheck.message }, 'Session check failed');
      return notes;
    }

    // Scroll to load more notes
    await scrollToLoadContent(client, 5);
    await sleep(2000);

    // Try to extract from user posted API
    const requests = await client.listNetworkRequests(['xhr', 'fetch']);
    const userRequests = requests.filter(
      (r) =>
        r.url.includes('/api/sns/web/v1/user_posted') ||
        r.url.includes('/api/sns/web/v1/user/posted') ||
        r.url.includes(`/user/profile/${userId}`)
    );

    log.info(
      { count: userRequests.length },
      'Found user profile API requests'
    );

    for (const req of userRequests.slice(-5)) {
      try {
        const detail = await client.getNetworkRequest(req.id);
        if (detail?.responseBody) {
          const data: UserPostedResponse = JSON.parse(detail.responseBody);
          if (data.data?.notes) {
            log.info(
              { count: data.data.notes.length },
              'Found notes from user API'
            );
            for (const note of data.data.notes) {
              if (notes.length >= maxNotes) break;
              if (!note.note_id) continue;

              const result = convertNoteToResult(note, city);
              if (!result) continue;

              // Set author ID for user profile notes
              result.authorId = userId;

              // Fetch detail content if enabled
              if (options.fetchDetailContent) {
                const detailResult = await fetchNoteDetail(
                  note.note_id,
                  city,
                  client
                );
                if (
                  detailResult &&
                  detailResult.content.length > result.content.length
                ) {
                  result.content = detailResult.content;
                  result.contentBlocks = detailResult.contentBlocks;
                }
                await sleep(1500);
              }

              // Fetch comments if enabled
              if (options.fetchComments) {
                const comments = await fetchNoteComments(
                  note.note_id,
                  options.maxCommentsPerPost || 20,
                  client
                );
                if (comments.length > 0) {
                  result.comments = comments;
                }
                await sleep(1000);
              }

              notes.push(result);
            }
          }
        }
      } catch (e) {
        log.warn({ error: e }, 'Failed to parse user API request');
      }
    }

    // Fallback: extract note IDs from page if API didn't work
    if (notes.length === 0) {
      log.info('Falling back to snapshot extraction for user profile');
      const snapshotNotes = await extractNotesFromSnapshot(
        city,
        maxNotes,
        client
      );
      notes.push(...snapshotNotes);
    }
  } catch (error) {
    log.error({ error }, 'Error fetching user profile');
  }

  log.info({ count: notes.length, userId }, 'Extracted notes from user');
  return notes;
}
