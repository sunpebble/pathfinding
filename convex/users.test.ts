import { describe, expect, it, vi } from 'vitest';
import { updateProfileHandler } from './users';

describe('updateProfile', () => {
  const mockIdentity = {
    subject: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    pictureUrl: 'https://example.com/avatar.jpg',
  };

  const mockDb = {
    query: vi.fn(),
    patch: vi.fn(),
    insert: vi.fn(),
  };

  const mockAuth = {
    getUserIdentity: vi.fn(),
  };

  const mockCtx = {
    db: mockDb,
    auth: mockAuth,
  } as unknown as any;

  it('should update profile successfully with valid input', async () => {
    mockAuth.getUserIdentity.mockResolvedValue(mockIdentity);

    // Mock existing profile query
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ _id: 'profile123', email: 'test@example.com' }),
    };
    mockDb.query.mockReturnValue(mockQuery);
    mockDb.patch.mockResolvedValue(undefined);

    const args = {
      displayName: 'Valid Name',
      bio: 'Valid bio',
    };

    const result = await updateProfileHandler(mockCtx, args);

    expect(result).toBe('profile123');
    expect(mockDb.patch).toHaveBeenCalledWith('profile123', {
      email: 'test@example.com',
      displayName: 'Valid Name',
      bio: 'Valid bio',
    });
  });

  it('should throw error if not authenticated', async () => {
    mockAuth.getUserIdentity.mockResolvedValue(null);

    await expect(updateProfileHandler(mockCtx, {}))
      .rejects
      .toThrow('Not authenticated');
  });

  it('should throw error if displayName exceeds 50 characters', async () => {
    mockAuth.getUserIdentity.mockResolvedValue(mockIdentity);

    // Mock existing profile query
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ _id: 'profile123', email: 'test@example.com' }),
    };
    mockDb.query.mockReturnValue(mockQuery);

    const args = {
      displayName: 'A'.repeat(51),
    };

    await expect(updateProfileHandler(mockCtx, args))
      .rejects
      .toThrow('Display name must be 50 characters or less');
  });

  it('should throw error if bio exceeds 500 characters', async () => {
    mockAuth.getUserIdentity.mockResolvedValue(mockIdentity);

    // Mock existing profile query
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ _id: 'profile123', email: 'test@example.com' }),
    };
    mockDb.query.mockReturnValue(mockQuery);

    const args = {
      bio: 'A'.repeat(501),
    };

    await expect(updateProfileHandler(mockCtx, args))
      .rejects
      .toThrow('Bio must be 500 characters or less');
  });
});
