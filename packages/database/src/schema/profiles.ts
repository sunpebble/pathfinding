/**
 * Profiles schema - user profiles.
 */
import {
  index,
  sqliteTable,
  text,
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('profiles_user_idx').on(t.userId),
    index('profiles_email_idx').on(t.email),
    index('profiles_phone_idx').on(t.phone),
  ],
);
