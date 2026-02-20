
import { describe, it, expect, vi } from 'vitest';
import { createWrapper, createHandler } from './guideComments';

describe('guideComments Security', () => {
  it('createWrapper should throw if user is not authenticated', async () => {
    const mockCtx = {
      auth: { getUserIdentity: vi.fn().mockResolvedValue(null) }
    };

    await expect(createWrapper(mockCtx as any, {
      guideId: 'g1', content: 'c'
    })).rejects.toThrow('Not authenticated');
  });

  it('createWrapper should use authenticated email as userId', async () => {
    const mockDb = {
      insert: vi.fn().mockResolvedValue('comment123'),
      get: vi.fn().mockResolvedValue(null)
    };
    const mockCtx = {
      db: mockDb,
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue({
          email: 'user@example.com',
          subject: 'user123'
        })
      }
    };

    await createWrapper(mockCtx as any, {
      guideId: 'g1', content: 'c'
    });

    expect(mockDb.insert).toHaveBeenCalledWith('guideComments', expect.objectContaining({
      userId: 'user@example.com'
    }));
  });

  it('createHandler should trust passed userId (internal use)', async () => {
    const mockDb = {
      insert: vi.fn().mockResolvedValue('comment123'),
      get: vi.fn().mockResolvedValue(null)
    };
    const mockCtx = { db: mockDb };

    await createHandler(mockCtx as any, {
      guideId: 'g1', content: 'c', userId: 'trusted_user'
    });

    expect(mockDb.insert).toHaveBeenCalledWith('guideComments', expect.objectContaining({
      userId: 'trusted_user'
    }));
  });
});
