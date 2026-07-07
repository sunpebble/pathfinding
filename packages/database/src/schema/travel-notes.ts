/**
 * Travel Notes schema - 游记.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Travel Notes ───────────────────────────────────────
export const travelNotes = sqliteTable(
  'travel_notes',
  {
    id: id(),
    authorId: fk('author_id').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    coverImageUrl: text('cover_image_url'),
    visibility: text('visibility').notNull().default('public'),
    itineraryId: fk('itinerary_id'),
    status: text('status').notNull().default('draft'),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    savesCount: integer('saves_count').notNull().default(0),
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
