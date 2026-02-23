/* eslint-disable ts/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { describe, expect, it, vi } from 'vitest';
import { getByDestination } from './travelGuides';

// Mock the Convex server functions
vi.mock('./_generated/server', () => ({
  query: (config: any) => config,
  mutation: (config: any) => config,
  internalMutation: (config: any) => config,
  internalQuery: (config: any) => config,
}));

// Mock the ensureDisplayFields function
vi.mock('./lib/displayFields', () => ({
  ensureDisplayFields: (guide: any) => guide,
}));

describe('travelGuides getByDestination Performance Optimization', () => {
  it('should find guides by exact match using guideDestinations', async () => {
    // Mock data
    const mockGuides = [
      {
        _id: 'guide1',
        title: 'Guide to New York',
        destinations: ['New York'],
        qualityScore: 10,
        content: 'Content about NYC',
      },
    ];

    const mockGuideDestinations = [
      {
        guideId: 'guide1',
        destination: 'new york',
      },
    ];

    const ctx = {
      db: {
        query: vi.fn((table: any) => {
          if (table === 'guideDestinations') {
            return {
              collect: vi.fn().mockResolvedValue(mockGuideDestinations),
              withIndex: vi.fn((indexName: any, q: any) => {
                // Verify index usage
                expect(indexName).toBe('by_destination');
                return {
                  collect: vi.fn().mockResolvedValue(mockGuideDestinations),
                };
              }),
            };
          }
          return {
            collect: vi.fn().mockResolvedValue([]),
          };
        }),
        get: vi.fn((id: any) => {
          if (id === 'guide1')
            return Promise.resolve(mockGuides[0]);
          return Promise.resolve(null);
        }),
      },
    };

    const result = await (getByDestination as any).handler(ctx, { destination: 'New York' });

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('guide1');
    expect(ctx.db.query).toHaveBeenCalledWith('guideDestinations');
  });

  it('should find guides by substring match using guideDestinations scan', async () => {
    // This confirms functionality preservation (substring match)

    const mockGuideDestinations = [
      {
        guideId: 'guide1',
        destination: 'new york',
      },
    ];

    const mockGuides = [
      {
        _id: 'guide1',
        title: 'Guide to New York',
        destinations: ['New York'],
        qualityScore: 10,
        content: 'Content about NYC',
      },
    ];

    const ctx = {
      db: {
        query: vi.fn((table: any) => {
          if (table === 'guideDestinations') {
            return {
              collect: vi.fn().mockResolvedValue(mockGuideDestinations),
            };
          }
          return {};
        }),
        get: vi.fn((id: any) => {
          if (id === 'guide1')
            return Promise.resolve(mockGuides[0]);
          return Promise.resolve(null);
        }),
      },
    };

    const result = await (getByDestination as any).handler(ctx, { destination: 'York' });

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('guide1');
    expect(ctx.db.query).toHaveBeenCalledWith('guideDestinations');
  });
});
