import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { describe, expect, it, vi } from 'vitest';
import { listPublicHandler } from './itineraries';

describe('itineraries - listPublic performance', () => {
  it('should use by_visibility_city index when cityId is provided', async () => {
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
    };

    const mockCtx = {
      db: {
        query: vi.fn().mockReturnValue(mockQuery),
        get: vi.fn().mockResolvedValue(null),
      },
    } as unknown as QueryCtx;

    const cityId = 'city123' as Id<'cities'>;
    await listPublicHandler(mockCtx, { cityId });

    // This expectation checks for the optimized behavior
    expect(mockQuery.withIndex).toHaveBeenCalledWith('by_visibility_city', expect.any(Function));

    // Verify the query filter function structure
    const filterFn = mockQuery.withIndex.mock.calls[0][1];
    const mockQ = {
      eq: vi.fn().mockReturnThis(),
    };
    filterFn(mockQ);

    expect(mockQ.eq).toHaveBeenCalledWith('visibility', 'public');
    expect(mockQ.eq).toHaveBeenCalledWith('cityId', cityId);
  });

  it('should use by_visibility index when cityId is NOT provided', async () => {
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
    };

    const mockCtx = {
      db: {
        query: vi.fn().mockReturnValue(mockQuery),
        get: vi.fn().mockResolvedValue(null),
      },
    } as unknown as QueryCtx;

    await listPublicHandler(mockCtx, {});

    expect(mockQuery.withIndex).toHaveBeenCalledWith('by_visibility', expect.any(Function));

    const filterFn = mockQuery.withIndex.mock.calls[0][1];
    const mockQ = {
      eq: vi.fn().mockReturnThis(),
    };
    filterFn(mockQ);

    expect(mockQ.eq).toHaveBeenCalledWith('visibility', 'public');
    expect(mockQ.eq).toHaveBeenCalledTimes(1);
  });
});
