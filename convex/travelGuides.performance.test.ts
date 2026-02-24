/**
 * Tests for getByDestination optimization
 * Verifies that the optimized implementation using guideDestinations works correctly
 */

import { describe, expect, it, vi } from 'vitest';

// Mock the Convex server functions to expose the handler directly
vi.mock('./_generated/server', () => ({
  query: (config: any) => config,
  mutation: (config: any) => config,
  internalQuery: (config: any) => config,
  internalMutation: (config: any) => config,
}));

import { getByDestination } from './travelGuides';

// ============================================================
// Type Definitions (simplified for testing)
// ============================================================

interface TravelGuide {
  _id: string;
  destinations: string[];
  qualityScore: number;
}

interface GuideDestination {
  _id: string;
  guideId: string;
  destination: string;
}

// ============================================================
// Mock Data
// ============================================================

const mockGuides: Record<string, TravelGuide> = {
  'guide1': {
    _id: 'guide1',
    destinations: ['Tokyo', 'Kyoto'],
    qualityScore: 0.9,
  },
  'guide2': {
    _id: 'guide2',
    destinations: ['Paris'],
    qualityScore: 0.8,
  },
  'guide3': {
    _id: 'guide3',
    destinations: ['Tokyo Disney'],
    qualityScore: 0.7,
  },
  'guide4': {
    _id: 'guide4',
    destinations: ['New York'],
    qualityScore: 0.6,
  },
};

const mockGuideDestinations: GuideDestination[] = [
  { _id: 'gd1', guideId: 'guide1', destination: 'tokyo' },
  { _id: 'gd2', guideId: 'guide1', destination: 'kyoto' },
  { _id: 'gd3', guideId: 'guide2', destination: 'paris' },
  { _id: 'gd4', guideId: 'guide3', destination: 'tokyo disney' },
  { _id: 'gd5', guideId: 'guide4', destination: 'new york' },
];

// ============================================================
// Mock Context
// ============================================================

const createMockContext = () => {
  return {
    db: {
      query: vi.fn((tableName: string) => {
        if (tableName === 'guideDestinations') {
          return {
            collect: vi.fn().mockResolvedValue(mockGuideDestinations),
            withIndex: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
          };
        }
        if (tableName === 'travelGuides') {
          return {
            collect: vi.fn().mockResolvedValue(Object.values(mockGuides)),
            filter: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
          };
        }
        return {
          collect: vi.fn().mockResolvedValue([]),
        };
      }),
      get: vi.fn((id: string) => Promise.resolve(mockGuides[id] || null)),
    },
  };
};

// ============================================================
// Tests
// ============================================================

describe('travelGuides - getByDestination Optimization', () => {
  it('should return guides matching destination substring using guideDestinations', async () => {
    const ctx: any = createMockContext();
    const args = { destination: 'Tokyo' };

    // Call the actual handler
    const validGuides = await (getByDestination as any).handler(ctx, args);

    // Assertions
    expect(validGuides).toHaveLength(2);
    expect(validGuides[0]._id).toBe('guide1'); // Higher quality score
    expect(validGuides[1]._id).toBe('guide3');

    // Verify db calls
    expect(ctx.db.query).toHaveBeenCalledWith('guideDestinations');
    // Should NOT query travelGuides directly (except via get)
    expect(ctx.db.query).not.toHaveBeenCalledWith('travelGuides');

    expect(ctx.db.get).toHaveBeenCalledWith('guide1');
    expect(ctx.db.get).toHaveBeenCalledWith('guide3');
  });

  it('should handle partial matches correctly', async () => {
    const ctx: any = createMockContext();
    const args = { destination: 'York' };

    const validGuides = await (getByDestination as any).handler(ctx, args);

    expect(validGuides).toHaveLength(1);
    expect(validGuides[0]._id).toBe('guide4'); // "New York" matches "York"
  });

  it('should handle limit correctly', async () => {
    const ctx: any = createMockContext();
    const args = { destination: 'Tokyo', limit: 1 };

    const result = await (getByDestination as any).handler(ctx, args);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('guide1');
  });
});
