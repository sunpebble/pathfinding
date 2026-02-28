/**
 * Travel Notes schema - 游记, images, tags, POIs, likes, comments, saves.
 */
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

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

// ── Note Images ────────────────────────────────────────
export const noteImages = mysqlTable(
  'note_images',
  {
    id: id(),
    noteId: fk('note_id').notNull(),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    caption: text('caption'),
    orderIndex: int('order_index').notNull().default(0),
    createdAt: createdAt(),
  },
  t => [
    index('note_images_note_idx').on(t.noteId),
    index('note_images_note_order_idx').on(t.noteId, t.orderIndex),
  ],
);

// ── Note Tags ──────────────────────────────────────────
export const noteTags = mysqlTable(
  'note_tags',
  {
    id: id(),
    noteId: fk('note_id').notNull(),
    tag: varchar('tag', { length: 100 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('note_tags_note_idx').on(t.noteId),
    index('note_tags_tag_idx').on(t.tag),
  ],
);

// ── Note POIs ──────────────────────────────────────────
export const notePois = mysqlTable(
  'note_pois',
  {
    id: id(),
    noteId: fk('note_id').notNull(),
    poiId: fk('poi_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('note_pois_note_idx').on(t.noteId),
    index('note_pois_poi_idx').on(t.poiId),
  ],
);

// ── Note Likes ─────────────────────────────────────────
export const noteLikes = mysqlTable(
  'note_likes',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    noteId: fk('note_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('note_likes_user_idx').on(t.userId),
    index('note_likes_note_idx').on(t.noteId),
    index('note_likes_pair_idx').on(t.userId, t.noteId),
  ],
);

// ── Note Comments ──────────────────────────────────────
export const noteComments = mysqlTable(
  'note_comments',
  {
    id: id(),
    noteId: fk('note_id').notNull(),
    userId: fk('user_id').notNull(),
    parentId: fk('parent_id'),
    content: text('content').notNull(),
    likesCount: int('likes_count').notNull().default(0),
    isEdited: boolean('is_edited').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('note_comments_note_idx').on(t.noteId),
    index('note_comments_user_idx').on(t.userId),
    index('note_comments_parent_idx').on(t.parentId),
    index('note_comments_note_created_idx').on(t.noteId, t.createdAt),
  ],
);

// ── Note Comment Likes ─────────────────────────────────
export const noteCommentLikes = mysqlTable(
  'note_comment_likes',
  {
    id: id(),
    commentId: fk('comment_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('note_clikes_comment_idx').on(t.commentId),
    index('note_clikes_user_idx').on(t.userId),
    index('note_clikes_pair_idx').on(t.commentId, t.userId),
  ],
);

// ── Note Saves ─────────────────────────────────────────
export const noteSaves = mysqlTable(
  'note_saves',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    noteId: fk('note_id').notNull(),
    collectionId: fk('collection_id'),
    createdAt: createdAt(),
  },
  t => [
    index('note_saves_user_idx').on(t.userId),
    index('note_saves_note_idx').on(t.noteId),
    index('note_saves_pair_idx').on(t.userId, t.noteId),
    index('note_saves_collection_idx').on(t.collectionId),
  ],
);
