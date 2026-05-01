import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchImportGuides, discoverNewGuides, importGuide } from './guide-import.service.js';

function createMockDb(existingGuides: Array<Record<string, unknown>> = []) {
  const limitFn = vi.fn().mockResolvedValue(existingGuides);
  const insertValuesFn = vi.fn().mockResolvedValue([{ insertId: 999 }]);

  // Create a thenable that also has a limit method
  const whereResult = {
    limit: limitFn,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(existingGuides)),
  };

  const mockSelectResult = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereResult),
      limit: limitFn,
    }),
  };

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectResult),
    insert: vi.fn().mockReturnValue({
      values: insertValuesFn,
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    insertValues: insertValuesFn,
  };

  return mockDb;
}

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  travelGuides: 'travel_guides',
  guideDestinations: 'guide_destinations',
}));

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

      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(createMockDb([]) as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

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

      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(createMockDb([{ sourceUrl: 'https://example.com/1' }]) as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await discoverNewGuides('mafengwo', 'Beijing', { fetchImpl: mockFetch });

      expect(result.newGuides.length).toBe(1);
      expect(result.newGuides[0]?.url).toBe('https://example.com/2');
      expect(result.existingCount).toBe(1);
    });

    it('should throw for unsupported platform', async () => {
      await expect(discoverNewGuides('unknown', 'Beijing')).rejects.toThrow('不支持的平台');
    });
  });

  describe('importGuide', () => {
    it('should skip existing guide', async () => {
      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(createMockDb([{ id: 1, sourceUrl: 'https://example.com/1' }]) as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await importGuide('mafengwo', 'https://example.com/1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('已存在');
    });

    it('should import new guide from mafengwo', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            url: 'https://example.com/1',
            externalId: 'mg123',
            title: 'Test Guide',
            content: 'Test content',
            author: 'Author',
            views: '100',
            likes: '50',
            coverImage: 'https://img.example.com/cover.jpg',
            images: ['https://img.example.com/1.jpg'],
            qualityScore: 85,
          },
        }),
      });

      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(createMockDb([]) as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(true);
      expect(result.guideId).toBe(999);
    });

    it('should save structured rich content for imported guides', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            url: 'https://example.com/1',
            externalId: 'mg123',
            title: 'Beijing Guide',
            content: '第一天到达北京，入住酒店后去了天安门广场。第二天游览故宫，建议提前预约。',
            contentHtml: '<p>第一天到达北京，入住酒店后去了天安门广场。</p><p>第二天游览故宫，建议提前预约。</p>',
            author: 'Author',
            views: '100',
            likes: '50',
            coverImage: 'https://img.example.com/cover.jpg',
            images: ['https://img.example.com/1.jpg'],
            qualityScore: 85,
          },
        }),
      });

      const mockDb = createMockDb([]);
      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(mockDb as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl: mockFetch });

      expect(result.success).toBe(true);
      expect(mockDb.insertValues).toHaveBeenCalledWith(expect.objectContaining({
        enrichedData: expect.objectContaining({
          contentHtml: '<p>第一天到达北京，入住酒店后去了天安门广场。</p><p>第二天游览故宫，建议提前预约。</p>',
          contentMarkdown: expect.stringContaining('![游记图片 1](https://img.example.com/1.jpg)'),
        }),
      }));
    });
  });

  describe('batchImportGuides', () => {
    it('should batch import guides', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            url: 'https://example.com/1',
            externalId: 'mg123',
            title: 'Test',
            content: 'Content',
            author: 'Author',
            views: '100',
            likes: '50',
            coverImage: '',
            images: [],
            qualityScore: 80,
          },
        }),
      });

      const { getDb } = await import('@pathfinding/database');
      vi.mocked(getDb).mockReturnValue(createMockDb([]) as unknown as ReturnType<typeof import('@pathfinding/database').getDb>);

      const result = await batchImportGuides('mafengwo', ['https://example.com/1', 'https://example.com/2'], { fetchImpl: mockFetch });

      expect(typeof result.imported).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(result.results.length).toBe(2);
    });
  });
});
