import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAllPendingBackfillJobs, executeBackfillJob } from './backfill-executor.service.js';
import { MAFENGWO_CRAWLER_DISABLED_MESSAGE } from './guide-import.service.js';

function createMockDb(overrides?: {
  jobs?: Array<Record<string, unknown>>;
  guides?: Array<Record<string, unknown>>;
  mafengwoGuides?: Array<Record<string, unknown>>;
  mafengwoDests?: Array<Record<string, unknown>>;
  guideDestinations?: Array<Record<string, unknown>>;
}) {
  const jobs = overrides?.jobs ?? [
    { id: 1, jobType: 'field_backfill', config: { targetGuideIds: [101] }, status: 'pending', platform: 'multi' },
  ];
  const guides = overrides?.guides ?? [
    { id: 101, platform: 'mafengwo', externalId: 'mg123', sourceUrl: 'https://example.com/1', content: '', coverImageUrl: null, imageUrls: null, destinations: null, tags: null, authorName: null, title: 'Guide 101' },
  ];
  const mafengwoGuideData = overrides?.mafengwoGuides ?? [
    { guideId: 'mg123', content: 'Mafengwo content', coverImageUrl: 'https://img.example.com/cover.jpg', imageUrls: ['https://img.example.com/1.jpg'], destinationName: 'Beijing', tags: ['tag1', 'tag2'], authorName: 'Author A' },
  ];
  const mafengwoDestData = overrides?.mafengwoDests ?? [
    { name: 'Paris', mddId: '10573' },
  ];
  const guideDestData = overrides?.guideDestinations ?? [];
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const updateSets: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  return {
    inserts,
    updateSets,
    select: vi.fn().mockReturnThis(),
    from: vi.fn((table: unknown) => {
      if (table === 'crawl_jobs') {
        const crawlJobsChain = {
          where: vi.fn((condition: unknown) => {
            if (condition && typeof condition === 'object' && 'status' in condition) {
              return {
                orderBy: vi.fn().mockResolvedValue(jobs.filter((j: Record<string, unknown>) => j.status === 'pending')),
                limit: vi.fn().mockResolvedValue(jobs.filter((j: Record<string, unknown>) => j.status === 'pending')),
              };
            }
            return {
              limit: vi.fn().mockImplementation(async () => {
                if (condition && typeof condition === 'object' && 'id' in condition) {
                  const id = (condition as { id: number }).id;
                  const found = jobs.filter((j: Record<string, unknown>) => j.id === id);
                  return found.length > 0 ? found : [];
                }
                return jobs.slice(0, 1);
              }),
              orderBy: vi.fn().mockResolvedValue(jobs),
            };
          }),
          orderBy: vi.fn().mockResolvedValue(jobs),
          limit: vi.fn().mockResolvedValue(jobs.slice(0, 1)),
        };
        return crawlJobsChain;
      }
      if (table === 'travel_guides') {
        return {
          where: vi.fn((condition: unknown) => {
            const matched
              = condition && typeof condition === 'object' && 'id' in condition
                ? guides.filter((g: Record<string, unknown>) => g.id === (condition as { id: number }).id)
                : guides;
            return {
              limit: vi.fn().mockResolvedValue(matched),
              then: (resolve: (v: unknown) => unknown) =>
                Promise.resolve(matched).then(resolve),
            };
          }),
          limit: vi.fn().mockResolvedValue(guides),
        };
      }
      if (table === 'mafengwo_guides') {
        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(mafengwoGuideData.slice(0, 1)),
          })),
          limit: vi.fn().mockResolvedValue(mafengwoGuideData.slice(0, 1)),
        };
      }
      if (table === 'mafengwo_destinations') {
        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(mafengwoDestData.slice(0, 1)),
          })),
          limit: vi.fn().mockResolvedValue(mafengwoDestData.slice(0, 1)),
        };
      }
      if (table === 'guide_destinations') {
        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(guideDestData),
            then: (resolve: (v: unknown) => unknown) =>
              Promise.resolve(guideDestData).then(resolve),
          })),
          limit: vi.fn().mockResolvedValue(guideDestData),
        };
      }
      return {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      };
    }),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => {
        updateSets.push({ table, values });
        return {
          where: vi.fn().mockResolvedValue(undefined),
        };
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        inserts.push({ table, values });
        return [{ insertId: 1 }];
      }),
    })),
  };
}

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  crawlJobs: 'crawl_jobs',
  travelGuides: 'travel_guides',
  mafengwoGuides: 'mafengwo_guides',
  mafengwoDestinations: 'mafengwo_destinations',
  guideDestinations: 'guide_destinations',
  rawCrawlRecords: 'raw_crawl_records',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('backfill-executor.service', () => {
  describe('executeBackfillJob', () => {
    it('should throw if job not found', async () => {
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({ jobs: [] });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      await expect(executeBackfillJob(999)).rejects.toThrow('任务不存在');
    });

    it('should throw if job is not pending', async () => {
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 1, jobType: 'field_backfill', config: { targetGuideIds: [101] }, status: 'running', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      await expect(executeBackfillJob(1)).rejects.toThrow('任务状态为 running，需要为 pending');
    });

    it('should execute field_backfill job', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { url: 'https://example.com/1', title: 'Title', content: 'Fetched content' },
        }),
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb();
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await executeBackfillJob(1, { fetchImpl: mockFetch });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should sync counts/publishedAt from staging and mirror guide_destinations', async () => {
      const stagingPublishedAt = new Date('2023-08-12T00:00:00Z');
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{
          id: 101,
          platform: 'mafengwo',
          externalId: 'mg123',
          sourceUrl: 'https://example.com/1',
          content: '',
          coverImageUrl: null,
          imageUrls: null,
          destinations: null,
          tags: null,
          authorName: null,
          title: 'Guide 101',
          publishedAt: null,
          viewCount: 100,
          likeCount: 5,
          commentCount: 0,
        }],
        mafengwoGuides: [{
          guideId: 'mg123',
          title: 'Staging Title',
          content: 'Mafengwo content',
          coverImageUrl: 'https://img.example.com/cover.jpg',
          imageUrls: ['https://img.example.com/1.jpg'],
          destinationName: 'Beijing',
          tags: ['tag1'],
          authorName: 'Author A',
          publishedAt: stagingPublishedAt,
          viewsCount: 500,
          likesCount: 50,
          commentsCount: 9,
        }],
        guideDestinations: [],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await executeBackfillJob(1, { fetchImpl: vi.fn() });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);

      const guideUpdates = mockDb.updateSets.filter(u => u.table === 'travel_guides');
      expect(guideUpdates.length).toBe(1);
      const set = guideUpdates[0]!.values;
      expect(set.viewCount).toBe(500);
      expect(set.likeCount).toBe(50);
      expect(set.commentCount).toBe(9);
      expect(set.publishedAt).toBe(stagingPublishedAt);
      expect(set.content).toBe('Mafengwo content');
      expect(set.destinations).toEqual([{ name: 'Beijing' }]);

      const destInserts = mockDb.inserts.filter(i => i.table === 'guide_destinations');
      expect(destInserts.length).toBe(1);
      expect(destInserts[0]?.values).toEqual([{ guideId: 101, destination: 'Beijing' }]);
    });

    it('should not duplicate guide_destinations rows that already exist', async () => {
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{
          id: 101,
          platform: 'mafengwo',
          externalId: 'mg123',
          sourceUrl: 'https://example.com/1',
          content: 'existing content that is already long enough to win',
          destinations: [{ name: 'Beijing' }],
          title: 'Guide 101',
          viewCount: 500,
          likeCount: 50,
          commentCount: 9,
          publishedAt: new Date('2023-08-12T00:00:00Z'),
        }],
        mafengwoGuides: [{
          guideId: 'mg123',
          title: 'Staging Title',
          content: 'short',
          coverImageUrl: '',
          imageUrls: [],
          destinationName: 'Beijing',
          tags: [],
          authorName: '',
          publishedAt: null,
          viewsCount: 500,
          likesCount: 50,
          commentsCount: 9,
        }],
        guideDestinations: [{ destination: 'Beijing' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      await executeBackfillJob(1, {
        fetchImpl: vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const destInserts = mockDb.inserts.filter(i => i.table === 'guide_destinations');
      expect(destInserts.length).toBe(0);
      // 计数与目的地均无变化 → 不应产生 travel_guides 更新
      const guideUpdates = mockDb.updateSets.filter(u => u.table === 'travel_guides');
      expect(guideUpdates.length).toBe(0);
    });

    it('updates non-mafengwo guides through the TS crawler fetch service', async () => {
      // Arrange: non-mafengwo guide forces the direct source URL fetch path.
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{ id: 101, platform: 'other', externalId: null, sourceUrl: 'https://example.com/1', content: '', title: '' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);
      const mockFetch = vi.fn().mockResolvedValue(new Response(
        '<html><head><title>Fetched Title</title></head><body><p>Fetched content。</p></body></html>',
        { status: 200, statusText: 'OK' },
      ));

      // Act
      const result = await executeBackfillJob(1, { fetchImpl: mockFetch });

      // Assert
      expect(result.processed).toBe(1);
      expect(result.updated).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('https://example.com/1'),
        expect.objectContaining({
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelBot/1.0)' },
        }),
      );
      const guideUpdates = mockDb.updateSets.filter(u => u.table === 'travel_guides');
      expect(guideUpdates.at(-1)?.values).toMatchObject({
        title: 'Fetched Title',
        content: 'Fetched Title Fetched content。',
      });
    });

    it('counts crawler fetch failures as failed instead of hiding them', async () => {
      // Arrange: non-mafengwo guide forces the direct source URL fetch path.
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{ id: 101, platform: 'other', externalId: null, sourceUrl: 'https://example.com/1', content: '', title: 'Guide 101' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);
      const mockFetch = vi.fn().mockRejectedValue(new Error('验证码拦截'));

      // Act
      const result = await executeBackfillJob(1, { fetchImpl: mockFetch });

      // Assert
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(0);
    });

    it('counts non-OK fetch HTTP responses as failed', async () => {
      // Arrange
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{ id: 101, platform: 'other', externalId: null, sourceUrl: 'https://example.com/1', content: '', title: 'Guide 101' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);
      const mockFetch = vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502, statusText: 'Bad Gateway' }));

      // Act
      const result = await executeBackfillJob(1, { fetchImpl: mockFetch });

      // Assert
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(0);
    });

    it('destination_fill marks mafengwo source work as failed without calling the removed crawler', async () => {
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris', 'Tokyo'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);
      const fetchImpl = vi.fn();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      try {
        const result = await executeBackfillJob(2, { fetchImpl });

        expect(fetchImpl).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.processed).toBe(0);
        expect(result.imported).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.failed).toBe(2);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(MAFENGWO_CRAWLER_DISABLED_MESSAGE));

        const jobUpdates = mockDb.updateSets.filter(u => u.table === 'crawl_jobs');
        const completion = jobUpdates.at(-1)!.values;
        expect(completion.status).toBe('completed');
        expect(completion.progress).toEqual({
          processed: 0,
          imported: 0,
          updated: 0,
          rejected: 0,
          skipped: 0,
          failed: 2,
        });
      }
      finally {
        warn.mockRestore();
      }
    });
  });

  describe('executeAllPendingBackfillJobs', () => {
    it('should execute all pending backfill jobs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: {} }),
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb();
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await executeAllPendingBackfillJobs({ fetchImpl: mockFetch });

      expect(typeof result.executed).toBe('number');
      expect(typeof result.totalProcessed).toBe('number');
      expect(typeof result.totalFailed).toBe('number');
    });
  });
});
