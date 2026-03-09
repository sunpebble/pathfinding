import type { AuthVariables } from '../middleware/auth.js';
import {
  commentReports,
  getDb,
  guideCommentLikes,
  guideComments,
} from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Comments routes — CRUD, replies, likes, reports.
 * Mirrors the Convex /api/comments/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List comments for a guide ──────────────────
app.get('/', async (c) => {
  const itineraryId = c.req.query('itineraryId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = getDb();
  const guideId = Number(itineraryId);
  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(guideComments)
      .where(
        and(
          eq(guideComments.guideId, guideId),
          eq(guideComments.isDeleted, false),
        ),
      )
      .orderBy(desc(guideComments.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(guideComments)
      .where(
        and(
          eq(guideComments.guideId, guideId),
          eq(guideComments.isDeleted, false),
        ),
      ),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json({
    success: true,
    data: convertKeysToSnakeCase(items),
    meta: {
      page,
      page_size: pageSize,
      total_count: total,
      total_pages: Math.ceil(total / pageSize),
    },
  });
});

// ── POST / — Create comment ────────────────────────────
app.post('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { itineraryId, content, parentId } = body;

  if (!itineraryId || !content) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();
  const guideId = Number(itineraryId);
  const userIdNum = Number(userId);

  const result = await db.insert(guideComments).values({
    guideId,
    userId: userIdNum,
    content,
    parentId: parentId ? Number(parentId) : null,
  });

  const commentId = Number(result[0].insertId);

  return c.json(
    {
      success: true,
      data: {
        id: commentId,
        itinerary_id: itineraryId,
        user_id: userId,
        parent_id: parentId || null,
        content,
        likes_count: 0,
        replies_count: 0,
        is_edited: false,
        is_deleted: false,
        created_at: Date.now(),
        updated_at: null,
        is_liked_by_user: false,
      },
    },
    201,
  );
});

// ── PATCH / — Update comment ───────────────────────────
app.patch('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { id, content } = body;

  if (!id || !content) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();
  const commentId = Number(id);

  // Verify ownership
  const existing = await db
    .select()
    .from(guideComments)
    .where(eq(guideComments.id, commentId))
    .limit(1);

  if (!existing[0] || existing[0].userId !== Number(userId)) {
    throw new ApiError(403, '无权编辑此评论');
  }

  await db
    .update(guideComments)
    .set({ content, isEdited: true, updatedAt: new Date() })
    .where(eq(guideComments.id, commentId));

  const updated = await db
    .select()
    .from(guideComments)
    .where(eq(guideComments.id, commentId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(updated[0]) });
});

// ── DELETE / — Delete comment ──────────────────────────
app.delete('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { id } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const commentId = Number(id);

  // Soft-delete: mark as deleted
  await db
    .update(guideComments)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(
      and(
        eq(guideComments.id, commentId),
        eq(guideComments.userId, Number(userId)),
      ),
    );

  return c.json({ success: true });
});

// ── GET /replies — Get replies for a comment ───────────
app.get('/replies', async (c) => {
  const commentId = c.req.query('commentId');

  if (!commentId) {
    throw new ApiError(400, '缺少commentId参数');
  }

  const db = getDb();
  const parentId = Number(commentId);

  const replies = await db
    .select()
    .from(guideComments)
    .where(
      and(
        eq(guideComments.parentId, parentId),
        eq(guideComments.isDeleted, false),
      ),
    )
    .orderBy(desc(guideComments.createdAt));

  return c.json({ success: true, data: convertKeysToSnakeCase(replies) });
});

// ── POST /like — Toggle like on a comment ──────────────
app.post('/like', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { commentId } = body;

  if (!commentId) {
    throw new ApiError(400, '缺少commentId参数');
  }

  const db = getDb();
  const cid = Number(commentId);
  const uid = Number(userId);

  // Check if already liked
  const existing = await db
    .select()
    .from(guideCommentLikes)
    .where(
      and(
        eq(guideCommentLikes.commentId, cid),
        eq(guideCommentLikes.userId, uid),
      ),
    )
    .limit(1);

  let liked: boolean;

  if (existing[0]) {
    // Unlike
    await db
      .delete(guideCommentLikes)
      .where(
        and(
          eq(guideCommentLikes.commentId, cid),
          eq(guideCommentLikes.userId, uid),
        ),
      );
    await db
      .update(guideComments)
      .set({ likesCount: sql`GREATEST(${guideComments.likesCount} - 1, 0)` })
      .where(eq(guideComments.id, cid));
    liked = false;
  }
  else {
    // Like
    await db.insert(guideCommentLikes).values({ commentId: cid, userId: uid });
    await db
      .update(guideComments)
      .set({ likesCount: sql`${guideComments.likesCount} + 1` })
      .where(eq(guideComments.id, cid));
    liked = true;
  }

  const updated = await db
    .select({ likesCount: guideComments.likesCount })
    .from(guideComments)
    .where(eq(guideComments.id, cid))
    .limit(1);

  return c.json({
    success: true,
    data: {
      liked,
      likes_count: updated[0]?.likesCount ?? 0,
    },
  });
});

// ── POST /report — Report a comment ────────────────────
app.post('/report', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { commentId, reason, description } = body;

  if (!commentId || !reason) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(commentReports).values({
    commentId: Number(commentId),
    userId: Number(userId),
    reason,
    description: description ?? null,
  });

  return c.json({
    data: {
      id: Number(result[0].insertId),
      success: true,
    },
  });
});

export default app;
