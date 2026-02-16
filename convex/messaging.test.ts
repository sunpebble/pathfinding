import { describe, expect, it, vi } from 'vitest';
import { getUnreadCountHandler, listConversationsHandler } from './messaging';

// Mock context factory
function createMockCtx() {
  const queryMock = {
    withIndex: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    collect: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockResolvedValue(null),
    filter: vi.fn().mockReturnThis(),
  };

  const db = {
    query: vi.fn().mockReturnValue(queryMock),
    get: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue('id'),
    patch: vi.fn().mockResolvedValue(undefined),
  };
  return { db, queryMock };
}

describe('messaging Optimization Tests', () => {
  describe('listConversationsHandler', () => {
    it('should use messageReadStatus index to find conversations', async () => {
      const { db, queryMock } = createMockCtx();
      const args = { userId: 'user123' };

      // Mock messageReadStatus query result
      queryMock.collect.mockResolvedValueOnce([
        { conversationId: 'conv1', userId: 'user123' },
        { conversationId: 'conv2', userId: 'user123' },
      ]);

      // Mock db.get calls for conversations
      db.get
        .mockResolvedValueOnce({
          _id: 'conv1',
          participantIds: ['user123', 'otherUser1'],
          lastMessageAt: 2000,
        })
        .mockResolvedValueOnce({
          _id: 'conv2',
          participantIds: ['user123', 'otherUser2'],
          lastMessageAt: 1000,
        });

      await listConversationsHandler({ db }, args);

      // Verify we queried messageReadStatus instead of conversations
      // Note: The current implementation queries 'conversations', so this test is expected to fail initially
      expect(db.query).toHaveBeenCalledWith('messageReadStatus');
      expect(queryMock.withIndex).toHaveBeenCalledWith('by_user', expect.any(Function));
    });
  });

  describe('getUnreadCountHandler', () => {
    it('should use messageReadStatus index to find user conversations', async () => {
      const { db, queryMock } = createMockCtx();
      const args = { userId: 'user123' };

      // Mock messageReadStatus query result
      queryMock.collect.mockResolvedValueOnce([
        { conversationId: 'conv1', userId: 'user123', lastReadAt: 1000 },
      ]);

      // Mock db.get for conversation
      db.get.mockResolvedValueOnce({
        _id: 'conv1',
        participantIds: ['user123', 'otherUser1'],
        lastMessageAt: 2000,
      });

      await getUnreadCountHandler({ db }, args);

      // Verify we queried messageReadStatus
      expect(db.query).toHaveBeenCalledWith('messageReadStatus');
      expect(queryMock.withIndex).toHaveBeenCalledWith('by_user', expect.any(Function));
    });
  });
});
