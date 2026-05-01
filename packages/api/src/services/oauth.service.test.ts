import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyAppleToken, verifyGoogleToken } from './oauth.service.js';

const { mockJwtVerify } = vi.hoisted(() => ({ mockJwtVerify: vi.fn() }));

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof import('jose')>('jose');
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
    jwtVerify: mockJwtVerify,
  };
});

describe('oauth.service', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
  });

  describe('verifyGoogleToken', () => {
    it('verifies a valid Google token', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-id',
          email: 'user@gmail.com',
          name: 'Test User',
          picture: 'https://example.com/pic.jpg',
          email_verified: true,
        },
      });

      const result = await verifyGoogleToken('valid-google-token');
      expect(result.sub).toBe('google-user-id');
      expect(result.email).toBe('user@gmail.com');
      expect(result.name).toBe('Test User');
      expect(result.picture).toBe('https://example.com/pic.jpg');
      expect(result.email_verified).toBe(true);
    });

    it('throws when GOOGLE_CLIENT_ID is missing', async () => {
      await expect(verifyGoogleToken('token')).rejects.toThrow('GOOGLE_CLIENT_ID');
    });

    it('throws when token is missing subject claim', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      mockJwtVerify.mockResolvedValue({
        payload: {
          email: 'user@gmail.com',
        },
      });

      await expect(verifyGoogleToken('token')).rejects.toThrow('缺少 subject');
    });

    it('throws when token is missing email claim', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'google-user-id',
        },
      });

      await expect(verifyGoogleToken('token')).rejects.toThrow('缺少 email');
    });
  });

  describe('verifyAppleToken', () => {
    it('verifies a valid Apple token with audience', async () => {
      process.env.APPLE_CLIENT_ID = 'apple-client-id';
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'apple-user-id',
          email: 'user@icloud.com',
        },
      });

      const result = await verifyAppleToken('valid-apple-token');
      expect(result.sub).toBe('apple-user-id');
      expect(result.email).toBe('user@icloud.com');
    });

    it('verifies without audience when APPLE_CLIENT_ID is not set', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: {
          sub: 'apple-user-id',
        },
      });

      const result = await verifyAppleToken('valid-apple-token');
      expect(result.sub).toBe('apple-user-id');
      expect(result.email).toBeUndefined();
    });

    it('throws when token is missing subject claim', async () => {
      process.env.APPLE_CLIENT_ID = 'apple-client-id';
      mockJwtVerify.mockResolvedValue({
        payload: {
          email: 'user@icloud.com',
        },
      });

      await expect(verifyAppleToken('token')).rejects.toThrow('缺少 subject');
    });
  });
});
