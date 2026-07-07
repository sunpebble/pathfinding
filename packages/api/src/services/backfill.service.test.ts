import type { Database } from '@pathfinding/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

/** Cast view of mockDb for passing to service functions that expect Database. */
const db = mockDb as unknown as Database;

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

/** Chain for: select().from().where().orderBy().limit() → rows */
function createRankedSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, orderBy, limit };
}

/** Chain for: select().from() → rows (awaited directly) */
function createAggregateSelectChain(result: unknown) {
  const from = vi.fn().mockResolvedValue(result);
  return { from };
}

/** Chain for: select().from().where() → rows (awaited directly) */
function createWhereSelectChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

/** Chain for the un-awaited correlated subquery builder. */
function createSubqueryChain() {
  const where = vi.fn().mockReturnValue({ kind: 'subquery' });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

const gapRow = {
  guideId: 1,
  title: 'Guide A',
  platform: 'mafengwo',
  missingCount: 3,
  content: 1,
  imageUrls: 0,
  destinations: 1,
  dayItineraries: 0,
  geoData: 0,
  enrichedData: 1,
  coverImageUrl: 0,
};

const summaryRow = {
  totalGuides: 10,
  guidesWithGaps: 4,
  content: 2,
  imageUrls: 1,
  destinations: 3,
  dayItineraries: 4,
  geoData: 4,
  enrichedData: 2,
  coverImageUrl: 0,
};

describe('backfill.service', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  describe('analyzeFieldGaps', () => {
    it('maps SQL missing flags to field names with full DB-side ranking', async () => {
      // Arrange
      const { analyzeFieldGaps } = await import('./backfill.service.js');
      const chain = createRankedSelectChain([gapRow]);
      mockDb.select.mockReturnValueOnce(chain);

      // Act
      const result = await analyzeFieldGaps(db, 10);

      // Assert
      expect(result).toEqual([
        {
          guideId: 1,
          title: 'Guide A',
          platform: 'mafengwo',
          missingFields: ['content', 'destinations', 'enrichedData'],
          missingCount: 3,
        },
      ]);
      expect(chain.where).toHaveBeenCalledWith(expect.anything());
      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it('returns empty array when no gaps', async () => {
      // Arrange
      const { analyzeFieldGaps } = await import('./backfill.service.js');
      mockDb.select.mockReturnValueOnce(createRankedSelectChain([]));

      // Act / Assert
      await expect(analyzeFieldGaps(db, 10)).resolves.toEqual([]);
    });
  });

  describe('summarizeFieldGaps', () => {
    it('aggregates full-table totals and per-field missing counts', async () => {
      // Arrange
      const { summarizeFieldGaps } = await import('./backfill.service.js');
      mockDb.select.mockReturnValueOnce(createAggregateSelectChain([summaryRow]));

      // Act
      const result = await summarizeFieldGaps(db);

      // Assert
      expect(result).toEqual({
        totalGuides: 10,
        guidesWithGaps: 4,
        missingByField: {
          content: 2,
          imageUrls: 1,
          destinations: 3,
          dayItineraries: 4,
          geoData: 4,
          enrichedData: 2,
          coverImageUrl: 0,
        },
      });
    });

    it('coerces driver string sums to numbers', async () => {
      // Arrange: mysql2 may return SUM() as strings.
      const { summarizeFieldGaps } = await import('./backfill.service.js');
      mockDb.select.mockReturnValueOnce(createAggregateSelectChain([
        { ...summaryRow, totalGuides: '10', guidesWithGaps: '4', content: '2' },
      ]));

      // Act
      const result = await summarizeFieldGaps(db);

      // Assert
      expect(result.totalGuides).toBe(10);
      expect(result.guidesWithGaps).toBe(4);
      expect(result.missingByField.content).toBe(2);
    });

    it('throws when the aggregate query returns nothing', async () => {
      // Arrange
      const { summarizeFieldGaps } = await import('./backfill.service.js');
      mockDb.select.mockReturnValueOnce(createAggregateSelectChain([]));

      // Act / Assert
      await expect(summarizeFieldGaps(db)).rejects.toThrow('字段缺口聚合查询未返回结果');
    });
  });

  describe('analyzeDestinationGaps', () => {
    it('returns uncovered cities via DB anti-join with an exact total', async () => {
      // Arrange
      const { analyzeDestinationGaps } = await import('./backfill.service.js');
      const subChain = createSubqueryChain();
      const listChain = createRankedSelectChain([
        { cityName: 'Chengdu', countryCode: 'CN' },
        { cityName: 'Hangzhou', countryCode: null },
      ]);
      const countChain = createWhereSelectChain([{ total: 42 }]);
      mockDb.select
        .mockReturnValueOnce(subChain)
        .mockReturnValueOnce(listChain)
        .mockReturnValueOnce(countChain);

      // Act
      const result = await analyzeDestinationGaps(db, 100);

      // Assert
      expect(result.gaps).toEqual([
        { cityName: 'Chengdu', countryCode: 'CN', guideCount: 0 },
        { cityName: 'Hangzhou', countryCode: '', guideCount: 0 },
      ]);
      expect(result.total).toBe(42);
      expect(listChain.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('generateBackfillJobs', () => {
    it('creates field_backfill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs(db, [1, 2, 3]);

      expect(result.jobsCreated).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('creates destination_fill jobs', async () => {
      const { generateBackfillJobs } = await import('./backfill.service.js');

      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const result = await generateBackfillJobs(db, undefined, ['Chengdu', 'Hangzhou']);

      expect(result.jobsCreated).toBe(1);
    });
  });

  describe('runFullAnalysis', () => {
    it('combines top gaps with full-table totals', async () => {
      // Arrange
      const { runFullAnalysis } = await import('./backfill.service.js');
      mockDb.select
        .mockReturnValueOnce(createRankedSelectChain([gapRow]))
        .mockReturnValueOnce(createAggregateSelectChain([summaryRow]))
        .mockReturnValueOnce(createSubqueryChain())
        .mockReturnValueOnce(createRankedSelectChain([{ cityName: 'Chengdu', countryCode: 'CN' }]))
        .mockReturnValueOnce(createWhereSelectChain([{ total: 1 }]));

      // Act
      const analysis = await runFullAnalysis(db, 10);

      // Assert
      expect(analysis.totalGuides).toBe(10);
      expect(analysis.totalFieldGaps).toBe(4);
      expect(analysis.fieldGaps).toHaveLength(1);
      expect(analysis.fieldMissingDistribution).toEqual({
        content: 2,
        imageUrls: 1,
        destinations: 3,
        dayItineraries: 4,
        geoData: 4,
        enrichedData: 2,
        coverImageUrl: 0,
      });
      expect(analysis.totalDestinationGaps).toBe(1);
      expect(analysis.destinationGaps).toEqual([
        { cityName: 'Chengdu', countryCode: 'CN', guideCount: 0 },
      ]);
    });
  });

  describe('computeIngestStats', () => {
    it('builds daily inserted/updated buckets and field fill rates', async () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-10T12:00:00'));
      const { computeIngestStats } = await import('./backfill.service.js');

      const insertedChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { day: '2026-06-09', count: 3 },
              { day: '2026-06-10', count: 1 },
            ]),
          }),
        }),
      };
      const updatedChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { day: '2026-06-10', count: 5 },
            ]),
          }),
        }),
      };
      mockDb.select
        .mockReturnValueOnce(insertedChain)
        .mockReturnValueOnce(updatedChain)
        .mockReturnValueOnce(createAggregateSelectChain([summaryRow]));

      // Act
      const stats = await computeIngestStats(db, 3);
      vi.useRealTimers();

      // Assert
      expect(stats.days).toBe(3);
      expect(stats.daily).toEqual([
        { date: '2026-06-08', inserted: 0, updated: 0 },
        { date: '2026-06-09', inserted: 3, updated: 0 },
        { date: '2026-06-10', inserted: 1, updated: 5 },
      ]);
      expect(stats.totalGuides).toBe(10);
      // content: (10 - 2) / 10
      expect(stats.fieldFillRates.content).toBe(0.8);
      expect(stats.fieldFillRates.coverImageUrl).toBe(1);
    });

    it('reports null fill rates when the table is empty', async () => {
      // Arrange
      const { computeIngestStats } = await import('./backfill.service.js');
      const emptyGroupChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue([]) }),
        }),
      };
      mockDb.select
        .mockReturnValueOnce(emptyGroupChain)
        .mockReturnValueOnce(emptyGroupChain)
        .mockReturnValueOnce(createAggregateSelectChain([
          { ...summaryRow, totalGuides: 0, guidesWithGaps: 0 },
        ]));

      // Act
      const stats = await computeIngestStats(db, 1);

      // Assert
      expect(stats.totalGuides).toBe(0);
      expect(stats.fieldFillRates.content).toBeNull();
    });
  });
});
