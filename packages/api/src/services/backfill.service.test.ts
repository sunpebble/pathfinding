import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    getDb: vi.fn(() => mockDb),
  };
});

describe('backfill.service', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  describe('analyzeFieldGaps', () => {
    it('returns guides sorted by missing field count', async () => {
      const { analyzeFieldGaps } = await import('./backfill.service.js');

      const from = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, title: 'Guide A', platform: 'xiaohongshu', content: '', imageUrls: null, destinations: null, dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
        { id: 2, title: 'Guide B', platform: 'mafengwo', content: 'Has content', imageUrls: ['a.jpg'], destinations: [{ name: 'Paris' }], dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
      ]) });
      mockDb.select.mockReturnValue({ from });

      const result = await analyzeFieldGaps(10);

      expect(result).toHaveLength(2);
      expect(result[0]!.guideId).toBe(1);
      expect(result[0]!.missingCount).toBe(7);
      expect(result[1]!.guideId).toBe(2);
      expect(result[1]!.missingCount).toBe(4);
    });

    it('returns empty array when no gaps', async () => {
      const { analyzeFieldGaps } = await import('./backfill.service.js');

      const from = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, title: 'Complete', platform: 'xiaohongshu', content: 'ok', imageUrls: ['a.jpg'], destinations: [{ name: 'P' }], dayItineraries: [{ day: 1, pois: [] }], geoData: { coordinates: [] }, enrichedData: { summary: 'x' }, coverImageUrl: 'http://x' },
      ]) });
      mockDb.select.mockReturnValue({ from });

      const result = await analyzeFieldGaps(10);
      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeDestinationGaps', () => {
    it('returns cities with no guides', async () => {
      const { analyzeDestinationGaps } = await import('./backfill.service.js');

      const citiesFrom = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([
        { id: 1, name: 'Chengdu', countryCode: 'CN' },
        { id: 2, name: 'Shanghai', countryCode: 'CN' },
      ]) });

      const destGroupBy = vi.fn().mockResolvedValue([
        { destination: 'Shanghai' },
      ]);
      const destFrom = vi.fn().mockReturnValue({ groupBy: destGroupBy });

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return { from: citiesFrom };
        }
        return { from: destFrom };
      });

      const result = await analyzeDestinationGaps();

      expect(result).toHaveLength(1);
      expect(result[0]!.cityName).toBe('Chengdu');
      expect(result[0]!.guideCount).toBe(0);
    });
  });

  describe('generateBackfillJobs', () => {
    it('creates field_backfill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs([1, 2, 3]);

      expect(result.jobsCreated).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('creates destination_fill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs(undefined, ['Chengdu', 'Hangzhou']);

      expect(result.jobsCreated).toBe(1);
    });
  });
});
