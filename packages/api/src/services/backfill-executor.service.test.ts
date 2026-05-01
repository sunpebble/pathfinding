import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAllPendingBackfillJobs, executeBackfillJob } from './backfill-executor.service.js';

function createMockDb(overrides?: {
  jobs?: Array<Record<string, unknown>>;
  guides?: Array<Record<string, unknown>>;
  mafengwoGuides?: Array<Record<string, unknown>>;
  mafengwoDests?: Array<Record<string, unknown>>;
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

  return {
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
            if (condition && typeof condition === 'object' && 'id' in condition) {
              const id = (condition as { id: number }).id;
              return {
                limit: vi.fn().mockResolvedValue(guides.filter((g: Record<string, unknown>) => g.id === id)),
              };
            }
            return { limit: vi.fn().mockResolvedValue(guides) };
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
      return {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      };
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  };
}

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  crawlJobs: 'crawl_jobs',
  travelGuides: 'travel_guides',
  mafengwoGuides: 'mafengwo_guides',
  mafengwoDestinations: 'mafengwo_destinations',
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

    it('should execute destination_fill job', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: { city: 'Paris', urls: [], total: 0 } }),
      });

      const { getDb } = await import('@pathfinding/database');
      const mockDb = createMockDb({
        jobs: [{ id: 2, jobType: 'destination_fill', config: { targetDestinations: ['Paris'] }, status: 'pending', platform: 'multi' }],
      });
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await executeBackfillJob(2, { fetchImpl: mockFetch });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
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
