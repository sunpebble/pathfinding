/**
 * Profiles schema - user profiles, follows.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Profiles ───────────────────────────────────────────
export const profiles = sqliteTable(
  'profiles',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    expoPushToken: text('expo_push_token'),
    followersCount: integer('followers_count').default(0),
    followingCount: integer('following_count').default(0),
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
export const userFollows = sqliteTable(
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
