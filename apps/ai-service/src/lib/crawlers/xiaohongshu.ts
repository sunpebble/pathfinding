import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import {
  extractAuthor,
  extractHeadings,
  extractImageUrls,
  extractStaticText,
} from './accessibility-parser.js';
import { waitForContentStable } from './diagnostics/index.js';
import {
  disconnect,
  getNetworkRequest,
  listNetworkRequests,
  navigateTo,
  scrollToLoadContent,
  sleep,
  takeSnapshot,
} from './mcp-client.js';
import {
  checkSessionWithGuidance,
  initSessionForPlatform,
} from './session/index.js';

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

export async function crawlXiaohongshu(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;

  console.log(`[Xiaohongshu] Crawling guides for ${city}`);

  try {
    // Use persistent session for login state
    await initSessionForPlatform('xiaohongshu');
    console.log('[Xiaohongshu] Using persistent Chrome session');

    const exploreUrl = 'https://www.xiaohongshu.com/explore';
    console.log('[Xiaohongshu] Fetching explore page');

    const exploreGuides = await fetchNotesFromExplore(
      exploreUrl,
      city,
      maxGuides
    );
    console.log(
      `[Xiaohongshu] Found ${exploreGuides.length} notes from explore`
    );

    for (const guide of exploreGuides) {
      if (!results.some((r) => r.sourceExternalId === guide.sourceExternalId)) {
        results.push(guide);
      }
    }

    if (results.length === 0) {
      console.warn('[Xiaohongshu] No results found. Session may need refresh.');
      console.warn(
        '  Run: pnpm --filter ai-service exec tsx src/login-helper.ts xiaohongshu'
      );
    }
  } catch (error) {
    console.error('[Xiaohongshu] Error fetching explore page:', error);
  } finally {
    await disconnect();
    console.log('[Xiaohongshu] MCP client disconnected');
  }

  return results;
}

async function fetchNotesFromExplore(
  exploreUrl: string,
  city: string,
  maxNotes: number
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];

  try {
    await navigateTo(exploreUrl, { timeout: 30000 });
    await waitForContentStable();

    // Check session validity using session module
    const sessionCheck = await checkSessionWithGuidance('xiaohongshu');
    if (!sessionCheck.canCrawl) {
      console.warn(`[Xiaohongshu] ${sessionCheck.message}`);
      return notes; // Return empty, let caller handle
    }

    await scrollToLoadContent(3);
    await sleep(2000);

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
      for (const note of snapshotNotes) {
        if (!notes.some((n) => n.sourceExternalId === note.sourceExternalId)) {
          notes.push(note);
        }
      }
    }
  } catch (error) {
    console.error('[Xiaohongshu] Error fetching explore page:', error);
  }

  return notes;
}

async function extractNotesFromApi(): Promise<XiaohongshuNote[]> {
  const notes: XiaohongshuNote[] = [];

  try {
    const requests = await listNetworkRequests(['xhr', 'fetch']);
    console.log(`[Xiaohongshu] Found ${requests.length} network requests`);

    const feedRequests = requests.filter(
      (r) =>
        r.url.includes('/api/sns/web/v1/feed') ||
        r.url.includes('/api/sns/web/v1/search') ||
        r.url.includes('/api/sns/web/v1/homefeed')
    );
    console.log(
      `[Xiaohongshu] Found ${feedRequests.length} feed/search requests`
    );

    for (const req of feedRequests.slice(-5)) {
      try {
        console.log(
          `[Xiaohongshu] Fetching request ${req.reqid}: ${req.url.substring(0, 80)}...`
        );
        const detail = await getNetworkRequest(req.reqid);
        if (detail?.responseBody) {
          const data: FeedResponse = JSON.parse(detail.responseBody);
          if (data.data?.items) {
            console.log(
              `[Xiaohongshu] Found ${data.data.items.length} items in response`
            );
            for (const item of data.data.items) {
              if (item.note_card?.note_id) {
                notes.push(item.note_card);
              }
            }
          }
        }
      } catch (e) {
        console.log(`[Xiaohongshu] Failed to parse request ${req.reqid}:`, e);
      }
    }
  } catch (error) {
    console.error('[Xiaohongshu] Error extracting from API:', error);
  }

  return notes;
}

async function extractNotesFromSnapshot(
  city: string,
  maxNotes: number
): Promise<CrawlResult[]> {
  const notes: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    console.log(`[Xiaohongshu] Snapshot length: ${content.length} chars`);
    console.log(`[Xiaohongshu] Snapshot preview: ${content.substring(0, 500)}`);

    // Extract note IDs from snapshot
    const noteIdMatches = content.matchAll(/\/explore\/([a-f0-9]{24})/gi);
    const noteIds: string[] = [];
    for (const match of noteIdMatches) {
      if (!seenIds.has(match[1])) {
        seenIds.add(match[1]);
        noteIds.push(match[1]);
      }
    }

    console.log(
      `[Xiaohongshu] Found ${noteIds.length} unique note IDs in snapshot`
    );

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
    console.error('[Xiaohongshu] Error extracting from snapshot:', error);
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

  return {
    sourceExternalId: `xiaohongshu_${note.note_id}`,
    sourceUrl: `https://www.xiaohongshu.com/explore/${note.note_id}`,
    title: title.substring(0, 200),
    content: note.desc || title,
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
    qualityScore: calculateQualityScore(
      note.desc || '',
      imageUrls.length,
      likesCount
    ),
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
