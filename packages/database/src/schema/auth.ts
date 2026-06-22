/**
 * Auth schema - users, sessions, accounts, rate limits.
 * Replaces Convex Auth tables (authTables) + custom auth tables.
 */
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Users ──────────────────────────────────────────────
export const users = mysqlTable(
  'users',
  {
    id: id(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    emailVerificationTime: timestamp('email_verification_time', { mode: 'date' }),
    phone: varchar('phone', { length: 50 }),
    phoneVerificationTime: timestamp('phone_verification_time', { mode: 'date' }),
    image: text('image'),
    isAnonymous: boolean('is_anonymous'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    uniqueIndex('users_email_uniq').on(t.email),
    index('users_phone_idx').on(t.phone),
  ],
);

// ── Auth Sessions ──────────────────────────────────────
export const authSessions = mysqlTable(
  'auth_sessions',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    expirationTime: timestamp('expiration_time', { mode: 'date' }).notNull(),
    createdAt: createdAt(),
  },
  t => [index('auth_sessions_user_idx').on(t.userId)],
);

// ── Auth Accounts ──────────────────────────────────────
export const authAccounts = mysqlTable(
  'auth_accounts',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    provider: varchar('provider', { length: 100 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    secret: text('secret'),
    emailVerified: varchar('email_verified', { length: 255 }),
    phoneVerified: varchar('phone_verified', { length: 50 }),
    createdAt: createdAt(),
  },
  t => [
    index('auth_accounts_user_idx').on(t.userId),
    index('auth_accounts_provider_idx').on(t.provider, t.providerAccountId),
  ],
);

// ── Rate Limits (general) ──────────────────────────────
export const rateLimits = mysqlTable(
  'rate_limits',
  {
    id: id(),
    key: varchar('key', { length: 255 }).notNull(),
    count: int('count').notNull().default(0),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: createdAt(),
  },
  t => [index('rate_limits_key_idx').on(t.key)],
);
