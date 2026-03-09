/**
 * Authentication service — deep module for credential management.
 *
 * Centralises password hashing, verification, and JWT token
 * generation/verification so that route handlers and middleware share
 * one well-tested implementation instead of duplicating crypto logic.
 *
 * Interface surface:
 *   hashPassword(plain) → hash
 *   verifyPassword(plain, stored) → boolean
 *   generateToken(userId, email) → JWT
 *   verifyToken(token) → payload
 */
import { Buffer } from 'node:buffer';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import * as jose from 'jose';

// ---------------------------------------------------------------------------
// JWT secret — resolved once, cached.
// ---------------------------------------------------------------------------

let _jwtSecret: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    _jwtSecret = new TextEncoder().encode(secret);
  }
  return _jwtSecret;
}

/**
 * Reset cached JWT secret (useful in tests).
 */
export function resetJwtSecret(): void {
  _jwtSecret = null;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

const SCRYPT_KEY_LENGTH = 64;

/**
 * Hash a plain-text password using scrypt with a random salt.
 *
 * Format: `scrypt:<hex-salt>:<hex-hash>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored hash.
 *
 * Supports both the `scrypt:` format and legacy plain-text secrets
 * (for backward-compatible migration).
 */
export function verifyPassword(password: string, storedSecret: string): boolean {
  if (storedSecret.startsWith('scrypt:')) {
    const [, salt, storedHashHex] = storedSecret.split(':');
    if (!salt || !storedHashHex) {
      return false;
    }

    const expectedHash = Buffer.from(storedHashHex, 'hex');
    const actualHash = scryptSync(password, salt, expectedHash.length);

    return (
      expectedHash.length === actualHash.length
      && timingSafeEqual(expectedHash, actualHash)
    );
  }

  // Backward compatibility for legacy plain-text secrets.
  return storedSecret === password;
}

/**
 * Returns `true` if the stored secret is in the legacy (plain-text) format
 * and should be migrated to scrypt.
 */
export function needsPasswordMigration(storedSecret: string): boolean {
  return !storedSecret.startsWith('scrypt:');
}

// ---------------------------------------------------------------------------
// JWT token management
// ---------------------------------------------------------------------------

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '30d';

/**
 * Generate a signed JWT for the given user.
 */
export async function generateToken(
  userId: string,
  email: string,
): Promise<string> {
  return new jose.SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT. Throws on invalid/expired tokens.
 */
export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  });
  return payload;
}
