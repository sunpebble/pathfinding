import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchImportGuides, discoverNewGuides, importGuide } from './guide-import.service.js';

interface MockDbState {
  travelGuides?: Array<Record<string, unknown>>;
  mafengwoGuides?: Array<Record<string, unknown>>;
  mafengwoDestinations?: Array<Record<string, unknown>>;
  guideDestinations?: Array<Record<string, unknown>>;
}

interface CapturedWrite {
  table: unknown;
  values: Record<string, unknown>;
}

/**
 * Table-aware mock: select() resolves rows from `state` keyed by the mocked
 * table name string; insert()/update() capture writes for assertions.
 */
function createMockDb(state: MockDbState = {}) {
  const inserts: CapturedWrite[] = [];
  const updates: CapturedWrite[] = [];

  function rowsFor(table: unknown): Array<Record<string, unknown>> {
    if (table === 'travel_guides')
      return state.travelGuides ?? [];
    if (table === 'mafengwo_guides')
      return state.mafengwoGuides ?? [];
    if (table === 'mafengwo_destinations')
      return state.mafengwoDestinations ?? [];
    if (table === 'guide_destinations')
      return state.guideDestinations ?? [];
    return [];
  }

  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const rows = rowsFor(table);
        const thenable = {
          limit: vi.fn().mockResolvedValue(rows),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve(rows).then(resolve),
        };
        return {
          where: vi.fn(() => thenable),
          limit: vi.fn().mockResolvedValue(rows),
        };
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        return [{ insertId: 999 }];
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          updates.push({ table, values });
        }),
      })),
    })),
  };

  return { db, inserts, updates };
}

function insertsFor(inserts: CapturedWrite[], table: string): CapturedWrite[] {
  return inserts.filter(w => w.table === table);
}

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  travelGuides: 'travel_guides',
  guideDestinations: 'guide_destinations',
  mafengwoGuides: 'mafengwo_guides',
  mafengwoDestinations: 'mafengwo_destinations',
  rawCrawlRecords: 'raw_crawl_records',
}));

async function setupMockDb(state: MockDbState = {}) {
  const mock = createMockDb(state);
  const { getDb } = await import('@pathfinding/database');
  vi.mocked(getDb).mockReturnValue(
    mock.db as unknown as ReturnType<typeof import('@pathfinding/database').getDb>,
  );
  return mock;
}

const LONG_CONTENT = '第一天到达北京，入住酒店后去了天安门广场看升旗仪式，随后步行到王府井吃晚饭。'.repeat(8);

function detailFetchMock(dataOverrides: Record<string, unknown> = {}, envelope: Record<string, unknown> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      success: true,
      data: {
        url: 'https://example.com/1',
        externalId: 'mg123',
        title: 'Beijing Guide 北京超全攻略',
        content: LONG_CONTENT,
        contentHtml: '<p>第一段</p>',
        author: 'Author',
        views: 100,
        likes: 50,
        viewsRaw: '100',
        likesRaw: '50',
        coverImage: 'https://img.example.com/cover.jpg',
        images: ['https://img.example.com/1.jpg'],
        publishedAt: '2023-08-12',
        qualityScore: 0.85,
        saved: true,
        saveError: '',
        ...dataOverrides,
      },
      ...envelope,
    }),
  });
}

const STAGING_ROW = {
  guideId: 'mg123',
  destinationName: '北京',
  tags: ['美食', '徒步'],
  publishedAt: new Date('2023-08-12T00:00:00Z'),
  commentsCount: 7,
  savesCount: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('guide-import.service', () => {
  describe('discoverNewGuides', () => {
    it('should discover new guides from mafengwo', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Beijing', urls: ['https://example.com/1', 'https://example.com/2'], total: 2 },
        }),
      });
      await setupMockDb();

      const result = await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      expect(result.platform).toBe('mafengwo');
      expect(result.city).toBe('Beijing');
      expect(result.newGuides.length).toBe(2);
      expect(result.totalFound).toBe(2);
    });

    it('should filter out existing guides', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Beijing', urls: ['https://example.com/1', 'https://example.com/2'], total: 2 },
        }),
      });
      await setupMockDb({ travelGuides: [{ sourceUrl: 'https://example.com/1' }] });

      const result = await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      expect(result.newGuides.length).toBe(1);
      expect(result.newGuides[0]?.url).toBe('https://example.com/2');
      expect(result.existingCount).toBe(1);
    });

    it('should treat responses without the cityScoped flag as not city-scoped', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Beijing', urls: [], total: 0 },
        }),
      });
      await setupMockDb();

      const result = await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      expect(result.cityScoped).toBe(false);
    });

    it('should propagate cityScoped=true from the crawler response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Beijing', urls: [], total: 0, cityScoped: true },
        }),
      });
      await setupMockDb();

      const result = await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      expect(result.cityScoped).toBe(true);
    });

    it('should pass mddId to the crawler when the destination is known (D10)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Beijing', urls: [], total: 0, cityScoped: true },
        }),
      });
      await setupMockDb({ mafengwoDestinations: [{ name: 'Beijing', mddId: '10065' }] });

      await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(body.mddId).toBe('10065');
      expect(body.city).toBe('Beijing');
    });

    it('should omit mddId when the destination is unknown', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Nowhere', urls: [], total: 0 },
        }),
      });
      await setupMockDb();

      await discoverNewGuides('mafengwo', 'Nowhere', { fetchImpl: mockFetch });

      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(body.mddId).toBeUndefined();
      expect(body.city).toBe('Nowhere');
    });

    it('should throw for unsupported platform', async () => {
      await expect(discoverNewGuides('unknown', 'Beijing')).rejects.toThrow('不支持的平台');
    });
  });

  describe('importGuide — D5 validation gate', () => {
    it('should reject and record raw_crawl_records when destinations are missing', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb(); // 无暂存行、无 city 上下文 → destinations 为空

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(false);
      expect(result.action).toBe('rejected');
      expect(result.message).toContain('destinations');

      const rawWrites = insertsFor(inserts, 'raw_crawl_records');
      expect(rawWrites.length).toBe(1);
      expect(rawWrites[0]?.values.parseStatus).toBe('rejected');
      expect(rawWrites[0]?.values.error).toContain('destinations');
      expect(insertsFor(inserts, 'travel_guides').length).toBe(0);
    });

    it('should import with warnings recorded in enrichedData.ingestWarnings', async () => {
      const mockFetch = detailFetchMock({ content: '短内容但仍然有效。', author: '' });
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(true);
      expect(result.action).toBe('inserted');

      const guideWrites = insertsFor(inserts, 'travel_guides');
      expect(guideWrites.length).toBe(1);
      const enriched = guideWrites[0]?.values.enrichedData as Record<string, unknown>;
      const warnings = enriched.ingestWarnings as string[];
      expect(warnings.some(w => w.includes('Content length'))).toBe(true);
      expect(warnings.some(w => w.includes('Author is missing'))).toBe(true);
    });
  });

  describe('importGuide — D6 raw record', () => {
    it('should record raw_crawl_records with sha256 contentHash on success', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(true);
      const rawWrites = insertsFor(inserts, 'raw_crawl_records');
      expect(rawWrites.length).toBe(1);
      expect(rawWrites[0]?.values.parseStatus).toBe('success');
      expect(rawWrites[0]?.values.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rawWrites[0]?.values.jobId).toBe(0);
      expect(rawWrites[0]?.values.url).toBe('https://example.com/1');
      const rawData = rawWrites[0]?.values.rawData as Record<string, unknown>;
      expect(rawData.platform).toBe('mafengwo');
      expect((rawData.response as Record<string, unknown>).viewsRaw).toBe('100');
    });

    it('should associate the raw record with the provided jobId', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch }, { jobId: 42 });

      expect(insertsFor(inserts, 'raw_crawl_records')[0]?.values.jobId).toBe(42);
    });

    it('should not write anything when the crawler fetch fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const { inserts } = await setupMockDb();

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(false);
      expect(result.action).toBe('failed');
      expect(inserts.length).toBe(0);
    });
  });

  describe('importGuide — D4 count parsing', () => {
    it('should use Go-parsed numbers directly', async () => {
      const mockFetch = detailFetchMock({ views: 12000, likes: 340 });
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.viewCount).toBe(12000);
      expect(values?.likeCount).toBe(340);
    });

    it('should fall back to parseChineseNumber on the raw string', async () => {
      const mockFetch = detailFetchMock({ views: undefined, viewsRaw: '1.2万', likes: undefined, likesRaw: '3,456' });
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.viewCount).toBe(12000);
      expect(values?.likeCount).toBe(3456);
    });

    it('should insert 0 and record a warning when both parses fail', async () => {
      const mockFetch = detailFetchMock({ views: undefined, viewsRaw: '看过的人很多' });
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.viewCount).toBe(0);
      expect(result.warnings.some(w => w.includes('views 计数解析失败'))).toBe(true);
      const enriched = values?.enrichedData as Record<string, unknown>;
      expect((enriched.ingestWarnings as string[]).some(w => w.includes('views'))).toBe(true);
    });
  });

  describe('importGuide — destinations & D9 auxiliary table', () => {
    it('should persist staging destination and mirror it into guide_destinations', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.destinations).toEqual([{ name: '北京' }]);
      expect(values?.tags).toEqual(['美食', '徒步']);
      expect(values?.publishedAt).toBeInstanceOf(Date);

      const destWrites = insertsFor(inserts, 'guide_destinations');
      expect(destWrites.length).toBe(1);
      expect(destWrites[0]?.values).toEqual([{ guideId: 999, destination: '北京' }]);
    });

    it('should attribute the request city only when cityScoped is true', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide(
        'mafengwo',
        'https://example.com/1',
        { fetchImpl: mockFetch },
        { city: '上海', cityScoped: true },
      );

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.destinations).toEqual([{ name: '上海' }, { name: '北京' }]);
    });

    it('should NOT attribute the request city without the cityScoped flag', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide(
        'mafengwo',
        'https://example.com/1',
        { fetchImpl: mockFetch },
        { city: '上海' },
      );

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.destinations).toEqual([{ name: '北京' }]);
    });
  });

  describe('importGuide — quality & completeness (D5)', () => {
    it('should persist the TS unified quality score, not the Go reference score', async () => {
      const mockFetch = detailFetchMock({ qualityScore: 0.99 });
      const { inserts } = await setupMockDb({ mafengwoGuides: [STAGING_ROW] });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.qualityScore).not.toBe(0.99);
      expect(values?.qualityScore).toBeGreaterThan(0);
      expect(values?.qualityScore).toBeLessThanOrEqual(1);
      expect(['complete', 'usable', 'incomplete']).toContain(values?.completenessLevel);
    });

    it('should record a warning when publishedAt cannot be parsed', async () => {
      const mockFetch = detailFetchMock({ publishedAt: '昨天' });
      const { inserts } = await setupMockDb({
        mafengwoGuides: [{ ...STAGING_ROW, publishedAt: null }],
      });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const values = insertsFor(inserts, 'travel_guides')[0]?.values;
      expect(values?.publishedAt).toBeNull();
      expect(result.warnings.some(w => w.includes('publishedAt 解析失败'))).toBe(true);
    });
  });

  describe('importGuide — D7 refresh policy', () => {
    const EXISTING = {
      id: 7,
      platform: 'mafengwo',
      externalId: 'mg123',
      title: '旧标题',
      content: LONG_CONTENT.repeat(2), // 现有内容比新内容长
      sourceUrl: 'https://example.com/1',
      coverImageUrl: 'https://img.example.com/old-cover.jpg',
      imageUrls: ['https://img.example.com/old.jpg'],
      destinations: [{ name: '北京' }],
      tags: ['旧标签'],
      publishedAt: null,
      viewCount: 1,
      likeCount: 1,
      commentCount: 1,
      enrichedData: { aiDays: [{ day: 1 }], manualFix: true, contentMarkdown: '旧 markdown' },
    };

    it('should refresh counts/qualityScore/crawledAt but keep longer existing content', async () => {
      const mockFetch = detailFetchMock();
      const { inserts, updates } = await setupMockDb({
        travelGuides: [EXISTING],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [{ destination: '北京' }],
      });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.guideId).toBe(7);
      expect(insertsFor(inserts, 'travel_guides').length).toBe(0);

      expect(updates.length).toBe(1);
      const set = updates[0]!.values;
      expect(set.viewCount).toBe(100);
      expect(set.likeCount).toBe(50);
      expect(set.commentCount).toBe(7);
      expect(set.crawledAt).toBeInstanceOf(Date);
      expect(typeof set.qualityScore).toBe('number');
      expect(set.content).toBeUndefined();
    });

    it('should merge enrichedData by key, preserving AI output and manual fixes', async () => {
      const mockFetch = detailFetchMock();
      const { updates } = await setupMockDb({
        travelGuides: [EXISTING],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [{ destination: '北京' }],
      });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const enriched = updates[0]!.values.enrichedData as Record<string, unknown>;
      expect(enriched.aiDays).toEqual([{ day: 1 }]);
      expect(enriched.manualFix).toBe(true);
      // 内容未变优 → content 衍生 key 不刷新
      expect(enriched.contentMarkdown).toBe('旧 markdown');
      expect(Array.isArray(enriched.ingestWarnings)).toBe(true);
    });

    it('should cover content and content-derived keys when the new content is longer', async () => {
      const longerContent = LONG_CONTENT.repeat(4);
      const mockFetch = detailFetchMock({ content: longerContent });
      const { updates } = await setupMockDb({
        travelGuides: [EXISTING],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [{ destination: '北京' }],
      });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const set = updates[0]!.values;
      expect(typeof set.content).toBe('string');
      expect((set.content as string).length).toBeGreaterThan(EXISTING.content.length);
      const enriched = set.enrichedData as Record<string, unknown>;
      expect(enriched.contentMarkdown).not.toBe('旧 markdown');
      expect(enriched.aiDays).toEqual([{ day: 1 }]);
    });

    it('should not overwrite images with empty values nor counts with failed parses', async () => {
      const mockFetch = detailFetchMock({
        coverImage: '',
        images: [],
        views: undefined,
        viewsRaw: '不可解析',
      });
      const { updates } = await setupMockDb({
        travelGuides: [EXISTING],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [{ destination: '北京' }],
      });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const set = updates[0]!.values;
      expect(set.coverImageUrl).toBeUndefined();
      expect(set.imageUrls).toBeUndefined();
      expect(set.viewCount).toBeUndefined(); // 解析失败 → 保留原值
      expect(set.likeCount).toBe(50);
      expect(result.warnings.some(w => w.includes('views 计数解析失败'))).toBe(true);
    });

    it('should fully refresh empty-shell rows (no content + untitled)', async () => {
      const mockFetch = detailFetchMock();
      const { updates } = await setupMockDb({
        travelGuides: [{
          ...EXISTING,
          content: '',
          title: '未命名',
          enrichedData: { aiDays: [{ day: 1 }] },
        }],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [{ destination: '北京' }],
      });

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.action).toBe('updated');
      const set = updates[0]!.values;
      expect(set.title).toBe('Beijing Guide 北京超全攻略');
      expect(typeof set.content).toBe('string');
      expect((set.content as string).length).toBeGreaterThan(0);
      expect(set.sourceUrl).toBe('https://example.com/1');
      // 整行刷新仍按 key 合并 enrichedData，AI 产物不丢
      const enriched = set.enrichedData as Record<string, unknown>;
      expect(enriched.aiDays).toEqual([{ day: 1 }]);
    });

    it('should add missing guide_destinations rows on update', async () => {
      const mockFetch = detailFetchMock();
      const { inserts } = await setupMockDb({
        travelGuides: [{ ...EXISTING, destinations: [] }],
        mafengwoGuides: [STAGING_ROW],
        guideDestinations: [], // 辅助表缺行
      });

      await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      const destWrites = insertsFor(inserts, 'guide_destinations');
      expect(destWrites.length).toBe(1);
      expect(destWrites[0]?.values).toEqual([{ guideId: 7, destination: '北京' }]);
    });
  });

  describe('importGuide — unsupported platform', () => {
    it('should fail for unsupported platform', async () => {
      const result = await importGuide('unknown', 'https://example.com/1');

      expect(result.success).toBe(false);
      expect(result.action).toBe('failed');
      expect(result.message).toContain('不支持的平台');
    });
  });

  describe('batchImportGuides', () => {
    it('should count actions separately', async () => {
      const okPayload = {
        url: 'https://example.com/1',
        externalId: 'mg123',
        title: 'Test Guide',
        content: LONG_CONTENT,
        author: 'Author',
        views: 100,
        likes: 50,
        coverImage: '',
        images: [],
        publishedAt: '',
        qualityScore: 0.8,
      };
      // 第一条有 staging destination → inserted；第二条换 externalId 无 staging → rejected
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true, data: okPayload }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            data: { ...okPayload, url: 'https://example.com/2', externalId: 'mg999' },
          }),
        });

      const mock = createMockDb();
      // 每次 import 恰好查询一次暂存表：第一条命中、第二条为空
      let stagingQueryCount = 0;
      mock.db.select = vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          let rows: Array<Record<string, unknown>> = [];
          if (table === 'mafengwo_guides') {
            stagingQueryCount++;
            rows = stagingQueryCount === 1 ? [STAGING_ROW] : [];
          }
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(rows),
              then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
            })),
            limit: vi.fn().mockResolvedValue(rows),
          };
        }),
      })) as never;
      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(
        mock.db as unknown as ReturnType<typeof import('@pathfinding/database').getDb>,
      );

      const result = await batchImportGuides(
        'mafengwo',
        ['https://example.com/1', 'https://example.com/2'],
        { fetchImpl: mockFetch },
      );

      expect(result.results.length).toBe(2);
      expect(result.imported).toBe(1);
      expect(result.rejected).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should count thrown errors as failed', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('network down'));
      await setupMockDb();

      const result = await batchImportGuides('mafengwo', ['https://example.com/1'], { fetchImpl: mockFetch });

      expect(result.failed).toBe(1);
      expect(result.results[0]?.message).toBe('network down');
    });
  });
});
