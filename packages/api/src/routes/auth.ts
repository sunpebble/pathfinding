import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { authAccounts, getDb, users } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
/**
 * Auth routes — login, logout, verify session, current user.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';
import {
  generateToken,
  hashPassword,
  needsPasswordMigration,
  verifyPassword,
} from '../services/auth.service.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── POST /signin — Email/password sign-in ──────────────
const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  flow: z.enum(['signIn', 'signUp']).default('signIn'),
  name: z.string().optional(),
});

app.post('/signin', zValidator('json', signinSchema), async (c) => {
  const { email, password, flow, name } = c.req.valid('json');
  const db = getDb();

  if (flow === 'signUp') {
    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 409);
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

    // Generate JWT
    const token = await generateToken(userId, email);

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
    return c.json({ error: 'Invalid email or password' }, 401);
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
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const account = accountRows[0]!;

  if (!account.secret || !verifyPassword(password, account.secret)) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  // Migrate legacy plain-text secrets after successful authentication.
  if (needsPasswordMigration(account.secret)) {
    await db
      .update(authAccounts)
      .set({ secret: hashPassword(password) })
      .where(eq(authAccounts.id, account.id));
  }

  const userId = String(user.id);

  // Generate JWT
  const token = await generateToken(userId, email);

  return c.json({
    token,
    userId,
    email,
  });
});

// ── POST /signout — Sign out ───────────────────────────
app.post('/signout', async (c) => {
  // With JWT-based auth, sign-out is client-side (discard token).
  // Optionally invalidate server-side sessions here.
  return c.json({ success: true });
});

// ── GET /verify — Verify current session ───────────────
app.get('/verify', authRequired(), async (c) => {
  const userId = c.get('userId');
  return c.json({ valid: true, userId });
});

// ── GET /me — Get current user info ────────────────────
app.get('/me', authRequired(), async (c) => {
  const userId = c.get('userId');
  const db = getDb();

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(userId)))
    .limit(1);

  if (userRows.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  const user = userRows[0]!;
  return c.json({
    data: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      image: user.image,
      created_at: user.createdAt,
    },
  });
});

export default app;
