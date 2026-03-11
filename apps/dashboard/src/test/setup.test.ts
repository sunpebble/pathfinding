import { describe, expect, it } from 'vitest';
import { createMockAuthApi, createMockAuthContext } from './setup';

describe('test setup helpers', () => {
  it('creates an authenticated auth context with override support', () => {
    const signOut = async () => {};
    const auth = createMockAuthContext({ isAuthenticated: true, signOut });

    expect(auth.user?.email).toBe('owner@example.com');
    expect(auth.token).toBe('test-token');
    expect(auth.signOut).toBe(signOut);
  });

  it('creates reusable auth api mocks with stable response shapes', async () => {
    const authApi = createMockAuthApi();

    await expect(authApi.signIn({ email: 'owner@example.com', password: 'Password123' })).resolves.toEqual({
      token: 'test-token',
      userId: 'user-1',
      email: 'owner@example.com',
    });

    await expect(authApi.getCurrentUser()).resolves.toEqual({
      data: expect.objectContaining({ email: 'owner@example.com' }),
    });
  });
});
