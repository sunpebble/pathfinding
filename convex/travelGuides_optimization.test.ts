import { describe, it, expect, vi } from 'vitest';

// Mock the query function BEFORE importing the module under test
vi.mock('./_generated/server', () => ({
  query: vi.fn((def: any) => ({
    handler: def.handler,
    args: def.args,
  })),
  mutation: vi.fn((def: any) => ({
    handler: def.handler,
    args: def.args,
  })),
  internalMutation: vi.fn((def: any) => ({
    handler: def.handler,
    args: def.args,
  })),
  internalQuery: vi.fn((def: any) => ({
    handler: def.handler,
    args: def.args,
  })),
}));

// Now import the module under test
import { getByDestination } from './travelGuides';

// Mock data
const mockGuideDestinations = [
  { guideId: 'g1', destination: 'paris' },
  { guideId: 'g2', destination: 'london' },
  { guideId: 'g3', destination: 'paris' },
  { guideId: 'g4', destination: 'new york' },
];

const mockGuides: Record<string, any> = {
  'g1': { _id: 'g1', title: 'Paris Guide', qualityScore: 10, destinations: ['Paris'] },
  'g2': { _id: 'g2', title: 'London Guide', qualityScore: 8, destinations: ['London'] },
  'g3': { _id: 'g3', title: 'Paris Food', qualityScore: 15, destinations: ['Paris', 'Food'] },
  'g4': { _id: 'g4', title: 'NY Guide', qualityScore: 9, destinations: ['New York'] },
};

describe('getByDestination Optimization', () => {
  it('should use guideDestinations table and sort by qualityScore', async () => {
    const mockDb = {
      query: vi.fn().mockImplementation((table: string) => {
        if (table === 'guideDestinations') {
          return {
            collect: vi.fn().mockResolvedValue(mockGuideDestinations),
          };
        }
        // Fail if trying to scan travelGuides directly
        if (table === 'travelGuides') {
          throw new Error('Should not scan travelGuides table directly!');
        }
        return { collect: vi.fn().mockResolvedValue([]) };
      }),
      get: vi.fn().mockImplementation(async (id: string) => mockGuides[id] || null),
    };

    const ctx = { db: mockDb };
    const args = { destination: 'paris' };

    // Invoke the handler directly (thanks to our mock above exposing it)
    // @ts-ignore
    const result = await getByDestination.handler(ctx, args);

    // Verify query to guideDestinations
    expect(mockDb.query).toHaveBeenCalledWith('guideDestinations');

    // Verify results
    // Should return g3 (score 15) then g1 (score 10)
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('g3');
    expect(result[1]._id).toBe('g1');
  });

  it('should handle partial matches (substring search)', async () => {
    const mockDb = {
      query: vi.fn().mockImplementation((table: string) => {
        if (table === 'guideDestinations') {
          return {
            collect: vi.fn().mockResolvedValue(mockGuideDestinations),
          };
        }
        return { collect: vi.fn().mockResolvedValue([]) };
      }),
      get: vi.fn().mockImplementation(async (id: string) => mockGuides[id] || null),
    };

    const ctx = { db: mockDb };
    const args = { destination: 'york' };

    // @ts-ignore
    const result = await getByDestination.handler(ctx, args);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('g4');
  });
});
