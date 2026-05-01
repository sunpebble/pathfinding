import { getDb, travelGuides } from '@pathfinding/database';
import { eq } from 'drizzle-orm';
import { buildStructuredGuideContent } from './guide-content.js';

export interface ExecutorConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

const defaultConfig: ExecutorConfig = {
  goServerUrl: process.env.GO_SERVER_URL || 'http://localhost:3001',
  fetchImpl: globalThis.fetch,
};

interface GuideUrlItem {
  url: string;
  title?: string;
}

interface PlatformDiscoveryResult {
  platform: string;
  city: string;
  totalFound: number;
  newGuides: GuideUrlItem[];
  existingCount: number;
}

interface MafengwoListResponse {
  success: boolean;
  data?: {
    city: string;
    urls: string[];
    total: number;
  };
  error?: string;
}

interface MafengwoDetailResponse {
  success: boolean;
  data?: {
    url: string;
    externalId: string;
    title: string;
    content: string;
    author: string;
    views: string;
    likes: string;
    coverImage: string;
    images: string[];
    contentHtml?: string;
    contentMarkdown?: string;
    qualityScore: number;
  };
  error?: string;
}

async function discoverFromMafengwo(
  city: string,
  cfg: ExecutorConfig,
): Promise<PlatformDiscoveryResult> {
  const response = await cfg.fetchImpl(
    `${cfg.goServerUrl}/api/crawler/mafengwo/list`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, scrollCount: 5 }),
    },
  );

  if (!response.ok) {
    throw new Error(`马蜂窝列表爬取失败：${response.status}`);
  }

  const result = (await response.json()) as MafengwoListResponse;

  if (!result.success || !result.data) {
    throw new Error(result.error || '马蜂窝列表爬取未返回数据');
  }

  const db = getDb();
  const existingUrls = await db
    .select({ sourceUrl: travelGuides.sourceUrl })
    .from(travelGuides)
    .where(eq(travelGuides.platform, 'mafengwo'));

  const existingUrlSet = new Set(
    existingUrls.map(u => u.sourceUrl).filter(Boolean),
  );

  const newGuides: GuideUrlItem[] = [];
  for (const url of result.data.urls) {
    if (!existingUrlSet.has(url)) {
      newGuides.push({ url });
    }
  }

  return {
    platform: 'mafengwo',
    city,
    totalFound: result.data.total,
    newGuides,
    existingCount: result.data.total - newGuides.length,
  };
}

export async function discoverNewGuides(
  platform: string,
  city: string,
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<PlatformDiscoveryResult> {
  const cfg = { ...defaultConfig, ...overrideConfig };

  switch (platform) {
    case 'mafengwo':
      return discoverFromMafengwo(city, cfg);
    default:
      throw new Error(`不支持的平台：${platform}`);
  }
}

export async function importGuide(
  platform: string,
  url: string,
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<{ success: boolean; guideId?: number; message: string }> {
  const cfg = { ...defaultConfig, ...overrideConfig };
  const db = getDb();

  // Check if already exists
  const existing = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.sourceUrl, url))
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    return { success: false, guideId: existing[0].id, message: '游记已存在' };
  }

  if (platform === 'mafengwo') {
    const response = await cfg.fetchImpl(
      `${cfg.goServerUrl}/api/crawler/mafengwo/detail`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      },
    );

    if (!response.ok) {
      return { success: false, message: `获取游记详情失败：${response.status}` };
    }

    const result = (await response.json()) as MafengwoDetailResponse;

    if (!result.success || !result.data) {
      return { success: false, message: result.error || '解析游记详情失败' };
    }

    const data = result.data;
    const enrichedData = buildStructuredGuideContent({
      title: data.title,
      content: data.content,
      contentHtml: data.contentHtml,
      contentMarkdown: data.contentMarkdown,
      imageUrls: data.images,
    });

    const insertResult = await db.insert(travelGuides).values({
      platform: 'mafengwo',
      externalId: data.externalId,
      title: data.title || '未命名',
      content: data.content,
      enrichedData,
      authorName: data.author,
      sourceUrl: url,
      coverImageUrl: data.coverImage,
      imageUrls: data.images || [],
      viewCount: Number.parseInt(data.views, 10) || 0,
      likeCount: Number.parseInt(data.likes, 10) || 0,
      qualityScore: data.qualityScore,
      crawledAt: new Date(),
    });

    const guideId = Number(insertResult[0].insertId);

    return { success: true, guideId, message: '游记导入成功' };
  }

  return { success: false, message: `不支持的平台：${platform}` };
}

export async function batchImportGuides(
  platform: string,
  urls: string[],
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<{ imported: number; failed: number; skipped: number; results: Array<{ url: string; success: boolean; message: string; guideId?: number }> }> {
  const results: Array<{ url: string; success: boolean; message: string; guideId?: number }> = [];
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  for (const url of urls) {
    try {
      const result = await importGuide(platform, url, overrideConfig);
      results.push({ url, ...result });

      if (result.success) {
        imported++;
      }
      else if (result.message.includes('已存在')) {
        skipped++;
      }
      else {
        failed++;
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ url, success: false, message });
      failed++;
    }
  }

  return { imported, failed, skipped, results };
}
