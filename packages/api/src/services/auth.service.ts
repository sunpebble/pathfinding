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
 *   generateToken(userId, email, sessionId?) → JWT
 *   verifyToken(token) → payload
 *   createSession(userId) → sessionId
 *   deleteSession(sessionId) → void
 *   isSessionValid(sessionId) → boolean
 */
import { Buffer } from 'node:buffer';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { authSessions, getDb } from '@pathfinding/database';
import { and, eq, gt } from 'drizzle-orm';
import * as jose from 'jose';

// ---------------------------------------------------------------------------
// JWT secret — resolved once, cached.
// ---------------------------------------------------------------------------

let _jwtSecret: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET 环境变量是必需的');
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
  // Use timing-safe comparison to prevent timing attacks.
  const passwordBuf = Buffer.from(password, 'utf-8');
  const storedBuf = Buffer.from(storedSecret, 'utf-8');

  // timingSafeEqual requires equal-length buffers, so hash both
  // with a fixed-length output to normalise the comparison.
  const passwordHash = scryptSync(passwordBuf, 'legacy-compare', 32);
  const storedHash = scryptSync(storedBuf, 'legacy-compare', 32);

  return timingSafeEqual(passwordHash, storedHash);
}

/**
 * Returns `true` if the stored secret is in the legacy (plain-text) format
 * and should be migrated to scrypt.
 */
export function needsPasswordMigration(storedSecret: string): boolean {
  return !storedSecret.startsWith('scrypt:');
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (matches JWT)

/**
 * Create a new server-side session for the user.
 * Returns the numeric session ID to embed in the JWT.
 */
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const expirationTime = new Date(Date.now() + SESSION_DURATION_MS);

  const [result] = await db.insert(authSessions).values({
    userId: Number(userId),
    expirationTime,
  }).$returningId();

  return String(result!.id);
}

/**
 * Delete a session (logout / revocation).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.delete(authSessions).where(eq(authSessions.id, Number(sessionId)));
}

/**
 * Delete all sessions for a user (e.g. "log out everywhere").
 */
export async function deleteAllSessions(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(authSessions).where(eq(authSessions.userId, Number(userId)));
}

/**
 * Check whether a session exists and hasn't expired.
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({ id: authSessions.id })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.id, Number(sessionId)),
        gt(authSessions.expirationTime, now),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// JWT token management
// ---------------------------------------------------------------------------

const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRATION = '30d';

/**
 * Generate a signed JWT for the given user.
 *
 * If a `sessionId` is provided it is included as the `sid` claim,
 * enabling server-side revocation. Tokens without `sid` remain valid
 * but cannot be revoked (backward compatibility).
 */
export async function generateToken(
  userId: string,
  email: string,
  sessionId?: string,
): Promise<string> {
  const claims: Record<string, unknown> = { sub: userId, email };
  if (sessionId) {
    claims.sid = sessionId;
  }

  return new jose.SignJWT(claims)
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
