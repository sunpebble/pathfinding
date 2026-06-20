import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateToken,
  hashPassword,
  needsPasswordMigration,
  verifyPassword,
  verifyToken,
} from './auth.service.js';

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: vi.fn(() => ({})),
    getDb: vi.fn(() => ({})),
  };
});

describe('auth.service — password hashing', () => {
  it('hashPassword returns scrypt-prefixed hash', () => {
    const hash = hashPassword('my-password');
    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  });

  it('hashPassword produces different hashes for the same password (random salt)', () => {
    const hash1 = hashPassword('same');
    const hash2 = hashPassword('same');
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPassword returns true for correct password', () => {
    const hash = hashPassword('correct-password');
    expect(verifyPassword('correct-password', hash)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', () => {
    const hash = hashPassword('correct-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('verifyPassword handles legacy plain-text secrets (backward compatibility)', () => {
    // Legacy format: plain text stored directly
    expect(verifyPassword('legacy-secret', 'legacy-secret')).toBe(true);
    expect(verifyPassword('wrong', 'legacy-secret')).toBe(false);
  });

  it('verifyPassword returns false for malformed scrypt hash (missing parts)', () => {
    expect(verifyPassword('test', 'scrypt:')).toBe(false);
    expect(verifyPassword('test', 'scrypt:salt_only')).toBe(false);
  });
});

describe('auth.service — needsPasswordMigration', () => {
  it('returns true for legacy plain-text secrets', () => {
    expect(needsPasswordMigration('legacy-plain')).toBe(true);
  });

  it('returns false for scrypt-prefixed secrets', () => {
    const hash = hashPassword('password');
    expect(needsPasswordMigration(hash)).toBe(false);
  });
});

describe('auth.service — JWT tokens', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-auth-service';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    // Reset the module cache so getJwtSecret picks up the next test's env
    vi.resetModules();
  });

  it('generateToken creates a valid JWT that can be verified', async () => {
    const token = await generateToken('42', 'user@example.com');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyToken(token);
    expect(payload.sub).toBe('42');
    expect(payload.email).toBe('user@example.com');
  });

  it('generateToken includes session ID when provided', async () => {
    const token = await generateToken('42', 'user@example.com', '99');
    const payload = await verifyToken(token);
    expect(payload.sid).toBe('99');
  });

  it('generateToken omits session ID when not provided', async () => {
    const token = await generateToken('42', 'user@example.com');
    const payload = await verifyToken(token);
    expect(payload.sid).toBeUndefined();
  });

  it('verifyToken throws for an invalid token', async () => {
    await expect(verifyToken('invalid-token')).rejects.toThrow();
  });

  it('verifyToken throws for a token signed with a different secret', async () => {
    // Generate with current secret
    const token = await generateToken('42', 'user@example.com');

    // Switch env to a different secret and reimport the module to get a fresh cache
    process.env.JWT_SECRET = 'completely-different-secret';
    vi.resetModules();
    const { verifyToken: freshVerify } = await import('./auth.service.js');

    await expect(freshVerify(token)).rejects.toThrow();
  });
});
