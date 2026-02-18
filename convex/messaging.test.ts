/* eslint-disable ts/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUnreadCount, listConversations } from './messaging';

// Mock convex/_generated/server
vi.mock('./_generated/server', () => ({
  query: (config: any) => config.handler,
  mutation: (config: any) => config.handler,
}));

// Mock convex/values
vi.mock('convex/values', () => ({
  v: {
    string: () => {},
    optional: (t: any) => {},
    number: () => {},
    boolean: () => {},
    id: (t: any) => {},
    array: (t: any) => {},
    object: (t: any) => {},
    union: (...args: any[]) => {},
    literal: (v: any) => {},
    any: () => {},
  },
}));

describe('messaging Optimization', () => {
  let ctx: any;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn().mockReturnThis(),
      withIndex: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    };
    ctx = { db: mockDb };
  });

  it('listConversations should query messageReadStatus instead of full conversations scan', async () => {
    await (listConversations as any)(ctx, { userId: 'user1' });

    // Optimized behavior:
    // Should query 'messageReadStatus' by user index first
    expect(mockDb.query).toHaveBeenCalledWith('messageReadStatus');

    // Should NOT scan 'conversations' table
    expect(mockDb.query).not.toHaveBeenCalledWith('conversations');
  });

  it('getUnreadCount should query messageReadStatus instead of full conversations scan', async () => {
    await (getUnreadCount as any)(ctx, { userId: 'user1' });

    // Optimized behavior:
    expect(mockDb.query).toHaveBeenCalledWith('messageReadStatus');
    expect(mockDb.query).not.toHaveBeenCalledWith('conversations');
  });
});
