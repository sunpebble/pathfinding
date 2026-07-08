import type { Database } from '@pathfinding/database';
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
 *   generateToken(userId, email, secret, sessionId?) → JWT
 *   verifyToken(token, secret) → payload
 *   createSession(db, userId) → sessionId
 *   deleteSession(db, sessionId) → void
 *   isSessionValid(db, sessionId) → boolean
 *
 * 注意：`secret`（JWT 签名密钥）由调用方通过参数透传，来源为请求
 * 级 `c.env.JWT_SECRET`（见 middleware/auth.ts、routes/auth.ts）。
 */
import { Buffer } from 'node:buffer';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { authSessions, users } from '@pathfinding/database';
import { and, eq, gt } from 'drizzle-orm';
import * as jose from 'jose';

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/** 将字符串密钥编码为 jose 所需的 Uint8Array。调用方负责保证非空。 */
function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
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
export async function createSession(db: Database, userId: string): Promise<string> {
  const expirationTime = new Date(Date.now() + SESSION_DURATION_MS);

  const [result] = await db.insert(authSessions).values({
    userId: Number(userId),
    expirationTime,
  }).returning({ id: authSessions.id });

  return String(result!.id);
}

/**
 * Delete a session (logout / revocation).
 */
export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.id, Number(sessionId)));
}

/**
 * Delete all sessions for a user (e.g. "log out everywhere").
 */
export async function deleteAllSessions(db: Database, userId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.userId, Number(userId)));
}

/**
 * Check whether a session exists and hasn't expired.
 */
export async function isSessionValid(db: Database, sessionId: string): Promise<boolean> {
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

/**
 * Validate a signed refresh token and, if its session is still valid,
 * re-mint a fresh access token *and* a rotated refresh token.
 *
 * The refresh token is a signed JWT (`typ: 'refresh'`, see
 * `generateRefreshToken`) — NOT the raw `authSessions.id`. This is
 * deliberate: an opaque auto-increment id is trivially enumerable
 * (`{refreshToken:"1"}`, `"2"`, …), which would let an unauthenticated
 * attacker mint access tokens for arbitrary users (account takeover).
 * A signed token can't be forged without `secret`, and its `sid` claim
 * still gates on `isSessionValid` so server-side revocation keeps working.
 *
 * Returns `null` on any failure (forged/expired/malformed token, wrong
 * `typ`, revoked session, or missing user) — the route maps that to 401.
 */
export async function refreshSession(
  db: Database,
  refreshToken: string,
  secret: string,
): Promise<{ token: string; refreshToken: string; userId: string; email: string } | null> {
  let payload: jose.JWTPayload;
  try {
    payload = await verifyToken(refreshToken, secret);
  }
  catch {
    return null; // forged, expired, or malformed
  }

  if (payload.typ !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    return null;
  }

  const valid = await isSessionValid(db, payload.sid);
  if (!valid)
    return null;

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, Number(payload.sub)))
    .limit(1);
  if (!user)
    return null;

  const userId = String(user.id);
  const email = user.email ?? '';
  const token = await generateToken(userId, email, secret, payload.sid);
  const rotatedRefreshToken = await generateRefreshToken(userId, email, secret, payload.sid);

  return { token, refreshToken: rotatedRefreshToken, userId, email };
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
 *
 * @param userId    用户 ID（写入 `sub` 声明）。
 * @param email     用户邮箱（写入 `email` 声明）。
 * @param secret    JWT 签名密钥（由调用方从 `c.env.JWT_SECRET` 透传）。
 * @param sessionId 可选的服务端会话 ID（写入 `sid` 声明，支持吊销）。
 */
export async function generateToken(
  userId: string,
  email: string,
  secret: string,
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
    .sign(encodeSecret(secret));
}

/**
 * Generate a signed *refresh* token (distinct from the access token).
 *
 * Carries `typ: 'refresh'` so `refreshSession` can reject access tokens
 * presented at `/refresh`, plus `sub` (user) and `sid` (session, for
 * revocation). Same 30-day lifetime and signing key as the access token —
 * being signed is what makes it non-enumerable, unlike the raw session id.
 */
export async function generateRefreshToken(
  userId: string,
  email: string,
  secret: string,
  sessionId: string,
): Promise<string> {
  return new jose.SignJWT({ sub: userId, email, sid: sessionId, typ: 'refresh' })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(encodeSecret(secret));
}

/**
 * Verify and decode a JWT. Throws on invalid/expired tokens.
 *
 * @param token  待校验的 JWT 字符串。
 * @param secret JWT 签名密钥（由调用方从 `c.env.JWT_SECRET` 透传）。
 */
export async function verifyToken(
  token: string,
  secret: string,
): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, encodeSecret(secret), {
    algorithms: [JWT_ALGORITHM],
  });
  return payload;
}
