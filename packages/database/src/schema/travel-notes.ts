/**
 * Travel Notes schema - 游记.
 */
import {
  index,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Travel Notes ───────────────────────────────────────
export const travelNotes = mysqlTable(
  'travel_notes',
  {
    id: id(),
    authorId: fk('author_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'),
    coverImageUrl: text('cover_image_url'),
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    itineraryId: fk('itinerary_id'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    likesCount: int('likes_count').notNull().default(0),
    commentsCount: int('comments_count').notNull().default(0),
    viewsCount: int('views_count').notNull().default(0),
    savesCount: int('saves_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('travel_notes_author_idx').on(t.authorId),
    index('travel_notes_visibility_idx').on(t.visibility),
    index('travel_notes_itinerary_idx').on(t.itineraryId),
    index('travel_notes_author_vis_idx').on(t.authorId, t.visibility),
    index('travel_notes_created_idx').on(t.createdAt),
  ],
);
