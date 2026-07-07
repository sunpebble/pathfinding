/**
 * Auth schema - users, sessions, accounts, rate limits.
 * Replaces Convex Auth tables (authTables) + custom auth tables.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Users ──────────────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: id(),
    name: text('name'),
    email: text('email'),
    emailVerificationTime: integer('email_verification_time', { mode: 'timestamp' }),
    phone: text('phone'),
    phoneVerificationTime: integer('phone_verification_time', { mode: 'timestamp' }),
    image: text('image'),
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    uniqueIndex('users_email_uniq').on(t.email),
    index('users_phone_idx').on(t.phone),
  ],
);

// ── Auth Sessions ──────────────────────────────────────
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    expirationTime: integer('expiration_time', { mode: 'timestamp' }).notNull(),
    createdAt: createdAt(),
  },
  t => [index('auth_sessions_user_idx').on(t.userId)],
);

// ── Auth Accounts ──────────────────────────────────────
export const authAccounts = sqliteTable(
  'auth_accounts',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    secret: text('secret'),
    emailVerified: text('email_verified'),
    phoneVerified: text('phone_verified'),
    createdAt: createdAt(),
  },
  t => [
    index('auth_accounts_user_idx').on(t.userId),
    index('auth_accounts_provider_idx').on(t.provider, t.providerAccountId),
  ],
);

// ── Rate Limits (general) ──────────────────────────────
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    id: id(),
    key: text('key').notNull(),
    count: integer('count').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: createdAt(),
  },
  t => [index('rate_limits_key_idx').on(t.key)],
);
