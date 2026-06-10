import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAllPendingBackfillJobs, executeBackfillJob } from './backfill-executor.service.js';

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

const { batchImportGuidesMock } = vi.hoisted(() => ({
  batchImportGuidesMock: vi.fn(),
}));

// D12: destination_fill delegates to the guide-import main pipeline; mock only
// batchImportGuides and keep the rest (syncGuideDestinations) real.
vi.mock('./guide-import.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./guide-import.service.js')>();
  return {
    ...actual,
    batchImportGuides: batchImportGuidesMock,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  batchImportGuidesMock.mockResolvedValue({
    imported: 0,
    updated: 0,
    rejected: 0,
    failed: 0,
    skipped: 0,
    results: [],
  });
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

    it('counts crawler-reported fetch failures as failed instead of hiding them', async () => {
      // Arrange: non-mafengwo guide forces the /fetch path; crawler says failure.
      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        guides: [{ id: 101, platform: 'other', externalId: null, sourceUrl: 'https://example.com/1', content: '', title: 'Guide 101' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: false, error: '验证码拦截' }),
      });

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
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 502, json: vi.fn() });

      // Act
      const result = await executeBackfillJob(1, { fetchImpl: mockFetch });

      // Assert
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(0);
    });

    it('destination_fill imports discovered URLs through the guide-import pipeline (D12)', async () => {
      // Arrange: list crawl finds two URLs, city-scoped via mddId.
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Paris', urls: ['https://m.example.com/1', 'https://m.example.com/2'], total: 2, cityScoped: true },
        }),
      });
      batchImportGuidesMock.mockResolvedValue({
        imported: 1,
        updated: 1,
        rejected: 0,
        failed: 0,
        skipped: 0,
        results: [],
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      // Act
      const result = await executeBackfillJob(2, { fetchImpl: mockFetch });

      // Assert: mddId from mafengwo_destinations is forwarded to Go /list.
      const requestBody = JSON.parse(
        (mockFetch.mock.calls[0]?.[1] as { body: string }).body,
      );
      expect(requestBody).toEqual({ city: 'Paris', scrollCount: 5, mddId: '10573' });

      // Import goes through the main pipeline with city/cityScoped/jobId context.
      expect(batchImportGuidesMock).toHaveBeenCalledWith(
        'mafengwo',
        ['https://m.example.com/1', 'https://m.example.com/2'],
        expect.objectContaining({ fetchImpl: mockFetch }),
        { city: 'Paris', cityScoped: true, jobId: 2 },
      );

      // Real counts, not response.ok.
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.imported).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(0);

      // D16: counters land in crawl_jobs.progress.
      const jobUpdates = mockDb.updateSets.filter(u => u.table === 'crawl_jobs');
      const completion = jobUpdates.at(-1)!.values;
      expect(completion.status).toBe('completed');
      expect(completion.progress).toEqual({
        processed: 2,
        imported: 1,
        updated: 1,
        rejected: 0,
        skipped: 0,
        failed: 0,
      });
    });

    it('destination_fill treats a missing cityScoped flag as not city-scoped (D10)', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { city: 'Paris', urls: ['https://m.example.com/1'], total: 1 },
        }),
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      // Act
      await executeBackfillJob(2, { fetchImpl: mockFetch });

      // Assert
      expect(batchImportGuidesMock).toHaveBeenCalledWith(
        'mafengwo',
        ['https://m.example.com/1'],
        expect.anything(),
        expect.objectContaining({ cityScoped: false }),
      );
    });

    it('destination_fill counts a failed list crawl as failed and never fakes success', async () => {
      // Arrange: HTTP 500 from Go /list.
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      // Act
      const result = await executeBackfillJob(2, { fetchImpl: mockFetch });

      // Assert
      expect(batchImportGuidesMock).not.toHaveBeenCalled();
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(0);
      expect(result.imported).toBe(0);
    });

    it('destination_fill counts an unsuccessful list payload as failed', async () => {
      // Arrange: HTTP 200 but the crawler reports failure.
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: false, error: '触发反爬' }),
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      // Act
      const result = await executeBackfillJob(2, { fetchImpl: mockFetch });

      // Assert
      expect(batchImportGuidesMock).not.toHaveBeenCalled();
      expect(result.failed).toBe(1);
      expect(result.processed).toBe(0);
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
