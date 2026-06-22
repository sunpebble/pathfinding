/**
 * Profiles schema - user profiles, follows.
 */
import {
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Profiles ───────────────────────────────────────────
export const profiles = mysqlTable(
  'profiles',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
    followersCount: int('followers_count').default(0),
    followingCount: int('following_count').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('profiles_user_idx').on(t.userId),
    index('profiles_email_idx').on(t.email),
    index('profiles_phone_idx').on(t.phone),
  ],
);

// ── User Follows ───────────────────────────────────────
export const userFollows = mysqlTable(
  'user_follows',
  {
    id: id(),
    followerId: fk('follower_id').notNull(),
    followingId: fk('following_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('user_follows_follower_idx').on(t.followerId),
    index('user_follows_following_idx').on(t.followingId),
    uniqueIndex('user_follows_uniq').on(t.followerId, t.followingId),
  ],
);
