import { describe, expect, it, vi } from 'vitest';

import { getByDestination } from './travelGuides';

// Mock convex imports BEFORE importing the module under test
vi.mock('./_generated/server', () => ({
  // eslint-disable-next-line ts/no-explicit-any
  query: (def: any) => ({ ...def, isQuery: true }),
  // eslint-disable-next-line ts/no-explicit-any
  mutation: (def: any) => ({ ...def, isMutation: true }),
  // eslint-disable-next-line ts/no-explicit-any
  internalMutation: (def: any) => ({ ...def, isInternalMutation: true }),
}));

vi.mock('convex/values', () => ({
  v: {
    string: () => 'string',
    optional: () => 'optional',
    number: () => 'number',
    boolean: () => 'boolean',
    id: () => 'id',
    array: () => 'array',
    object: () => 'object',
    union: () => 'union',
    literal: () => 'literal',
    any: () => 'any',
  },
}));

// Mock other internal dependencies
vi.mock('./guideAggregates', () => ({
  deleteGuideFromAggregates: vi.fn(),
  insertGuideToAggregates: vi.fn(),
  replaceGuideInAggregates: vi.fn(),
}));

vi.mock('./guideDestinations', () => ({
  deleteDestinationsForGuide: vi.fn(),
  syncDestinationsInternal: vi.fn(),
  normalizeDestination: (s: string) => s.trim().toLowerCase(),
}));

describe('getByDestination', () => {
  it('should query guideDestinations and return sorted guides', async () => {
    // Mock data
    const mockGuide1 = { _id: 'g1', title: 'Paris Guide', qualityScore: 0.9 };
    const mockGuide2 = { _id: 'g2', title: 'Another Paris Guide', qualityScore: 0.5 };
    const mockGuide3 = { _id: 'g3', title: 'Best Paris Guide', qualityScore: 0.95 };

    const mockDestRecords = [
      { guideId: 'g1' },
      { guideId: 'g2' },
      { guideId: 'g3' },
    ];

    // Mock Context
    const mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(mockDestRecords),
        }),
      }),
      get: vi.fn().mockImplementation((id: string) => {
        if (id === 'g1')
          return Promise.resolve(mockGuide1);
        if (id === 'g2')
          return Promise.resolve(mockGuide2);
        if (id === 'g3')
          return Promise.resolve(mockGuide3);
        return Promise.resolve(null);
      }),
    };

    const ctx = { db: mockDb };
    const args = { destination: 'Paris' };

    // Execute
    // @ts-expect-error Mock context is partial
    const result = await getByDestination.handler(ctx, args);

    // Verify DB calls
    expect(mockDb.query).toHaveBeenCalledWith('guideDestinations');

    // Verify sorting (by qualityScore desc)
    expect(result).toHaveLength(3);
    expect(result[0]._id).toBe('g3'); // 0.95
    expect(result[1]._id).toBe('g1'); // 0.9
    expect(result[2]._id).toBe('g2'); // 0.5

    // Verify ensureDisplayFields applied (defaults filled)
    expect(result[0].likesCount).toBe(0);
    expect(result[0].viewsCount).toBe(0);
  });

  it('should handle limit', async () => {
    const mockGuide1 = { _id: 'g1', qualityScore: 0.9 };
    const mockGuide2 = { _id: 'g2', qualityScore: 0.5 };

    const mockDestRecords = [{ guideId: 'g1' }, { guideId: 'g2' }];

    const mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(mockDestRecords),
        }),
      }),
      get: vi.fn().mockImplementation((id: string) => {
        if (id === 'g1')
          return Promise.resolve(mockGuide1);
        if (id === 'g2')
          return Promise.resolve(mockGuide2);
        return Promise.resolve(null);
      }),
    };

    const ctx = { db: mockDb };
    const args = { destination: 'Paris', limit: 1 };

    // @ts-expect-error Mock context is partial
    const result = await getByDestination.handler(ctx, args);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('g1');
  });

  it('should filter out null guides (orphaned records)', async () => {
    const mockGuide1 = { _id: 'g1', qualityScore: 0.9 };

    const mockDestRecords = [
      { guideId: 'g1' },
      { guideId: 'orphaned_id' }, // Guide that doesn't exist
    ];

    const mockDb = {
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          collect: vi.fn().mockResolvedValue(mockDestRecords),
        }),
      }),
      get: vi.fn().mockImplementation((id: string) => {
        if (id === 'g1')
          return Promise.resolve(mockGuide1);
        return Promise.resolve(null);
      }),
    };

    const ctx = { db: mockDb };
    const args = { destination: 'Paris' };

    // @ts-expect-error Mock context is partial
    const result = await getByDestination.handler(ctx, args);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('g1');
  });
});
