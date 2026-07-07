import type { InferSelectModel } from 'drizzle-orm';
import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { authAccounts, users } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
/**
 * Auth routes — login, logout, verify session, current user.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { jsonData, jsonOk } from '../lib/response.js';
import { authRequired } from '../middleware/auth.js';
import {
  createSession,
  deleteAllSessions,
  deleteSession,
  generateToken,
  hashPassword,
  needsPasswordMigration,
  verifyPassword,
  verifyToken,
} from '../services/auth.service.js';
import { verifyAppleToken, verifyGoogleToken } from '../services/oauth.service.js';

const app = new Hono<AppContext>();

// ── POST /signin — Email/password sign-in ──────────────
const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  flow: z.enum(['signIn', 'signUp']).default('signIn'),
  name: z.string().optional(),
});

app.post('/signin', zValidator('json', signinSchema), async (c) => {
  const { email, password, flow, name } = c.req.valid('json');
  const db = c.get('db');

  if (flow === 'signUp') {
    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: '该邮箱已注册' }, 409);
    }

    // Create user
    const [result] = await db.insert(users).values({
      email,
      name: name ?? null,
    }).$returningId();

    const userId = String(result!.id);

    // Store account credentials (password hash should be done properly)
    await db.insert(authAccounts).values({
      userId: result!.id,
      provider: 'password',
      providerAccountId: email,
      secret: hashPassword(password),
    });

    // Create server-side session for token revocation support
    const sessionId = await createSession(userId);

    // Generate JWT with session ID
    const token = await generateToken(userId, email, c.env.JWT_SECRET, sessionId);

    return c.json({
      token,
      userId,
      email,
    });
  }

  // Sign in flow
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (userRows.length === 0) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  const user = userRows[0]!;

  // Verify password against authAccounts
  const accountRows = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.userId, user.id),
        eq(authAccounts.provider, 'password'),
      ),
    )
    .limit(1);

  if (accountRows.length === 0) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  const account = accountRows[0]!;

  if (!account.secret || !verifyPassword(password, account.secret)) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  // Migrate legacy plain-text secrets after successful authentication.
  if (needsPasswordMigration(account.secret)) {
    await db
      .update(authAccounts)
      .set({ secret: hashPassword(password) })
      .where(eq(authAccounts.id, account.id));
  }

  const userId = String(user.id);

  // Create server-side session for token revocation support
  const sessionId = await createSession(userId);

  // Generate JWT with session ID
  const token = await generateToken(userId, email, c.env.JWT_SECRET, sessionId);

  return c.json({
    token,
    userId,
    email,
  });
});

// ── POST /signout — Sign out ───────────────────────────
const signoutSchema = z.object({
  /** Set to true to log out all devices */
  allDevices: z.boolean().optional(),
}).optional();

app.post('/signout', authRequired(), zValidator('json', signoutSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  // Extract session ID from the current token to delete it server-side
  const authHeader = c.req.header('Authorization');
  const tokenStr = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (body?.allDevices) {
    // Revoke all sessions for this user
    await deleteAllSessions(userId);
  }
  else if (tokenStr) {
    try {
      const payload = await verifyToken(tokenStr, c.env.JWT_SECRET);
      if (typeof payload.sid === 'string') {
        await deleteSession(payload.sid);
      }
    }
    catch {
      // Token already invalid — that's fine for logout
    }
  }

  return jsonOk(c);
});

// ── POST /social — Social login (Google/Apple) ─────────
const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string().min(1),
  name: z.string().optional(),
});

app.post('/social', zValidator('json', socialLoginSchema), async (c) => {
  const { provider, idToken, name } = c.req.valid('json');
  const db = c.get('db');

  let providerAccountId: string;
  let email: string | undefined;
  let userName: string | undefined = name;
  let picture: string | undefined;

  // Verify token based on provider
  if (provider === 'google') {
    const googleUser = await verifyGoogleToken(idToken, c.env.GOOGLE_CLIENT_ID ?? '');
    providerAccountId = googleUser.sub;
    email = googleUser.email;
    userName = userName || googleUser.name;
    picture = googleUser.picture;
  }
  else {
    const appleUser = await verifyAppleToken(idToken, c.env.APPLE_CLIENT_ID);
    providerAccountId = appleUser.sub;
    email = appleUser.email;
  }

  // Check if this social account is already linked
  const existingAccounts = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);

  let userId: string;

  if (existingAccounts.length > 0) {
    // Existing social login — sign in
    userId = String(existingAccounts[0]!.userId);
  }
  else {
    // New social login — find or create user
    let user: InferSelectModel<typeof users> | undefined;

    if (email) {
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      user = existingUsers[0];
    }

    if (!user) {
      // Create new user
      const [result] = await db.insert(users).values({
        email: email ?? null,
        name: userName ?? null,
        image: picture ?? null,
      }).$returningId();
      userId = String(result!.id);
    }
    else {
      userId = String(user.id);
      // Update user info if not set
      if ((!user.name && userName) || (!user.image && picture)) {
        await db.update(users).set({
          ...((!user.name && userName) ? { name: userName } : {}),
          ...((!user.image && picture) ? { image: picture } : {}),
        }).where(eq(users.id, user.id));
      }
    }

    // Link social account
    await db.insert(authAccounts).values({
      userId: Number(userId),
      provider,
      providerAccountId,
      emailVerified: email ?? null,
    });
  }

  // Create session and generate JWT
  const sessionId = await createSession(userId);

  // Get user email for the token
  const userRows = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1);
  const userEmail = userRows[0]?.email ?? email ?? '';

  const token = await generateToken(userId, userEmail, c.env.JWT_SECRET, sessionId);

  return c.json({
    token,
    userId,
    email: userEmail,
  });
});

// ── GET /verify — Verify current session ───────────────
app.get('/verify', authRequired(), async (c) => {
  const userId = c.get('userId');
  return c.json({ valid: true, userId });
});

// ── GET /me — Get current user info ────────────────────
app.get('/me', authRequired(), async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(userId)))
    .limit(1);

  if (userRows.length === 0) {
    return c.json({ error: '用户不存在' }, 404);
  }

  const user = userRows[0]!;
  return jsonData(c, {
    id: String(user.id),
    name: user.name,
    email: user.email,
    image: user.image,
    created_at: user.createdAt,
  });
});

export default app;
