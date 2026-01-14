import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Note Likes - 游记点赞相关操作
 */

// 切换点赞状态
export const toggle = mutation({
  args: {
    userId: v.string(),
    noteId: v.id('travelNotes'),
  },
  handler: async (ctx, args) => {
    // 检查游记是否存在且公开
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error('Travel note not found');
    }

    if (note.visibility !== 'public' && note.authorId !== args.userId) {
      throw new Error('Cannot like a private travel note');
    }

    // 检查是否已点赞
    const existing = await ctx.db
      .query('noteLikes')
      .withIndex('by_user_note', (q) =>
        q.eq('userId', args.userId).eq('noteId', args.noteId)
      )
      .first();

    if (existing) {
      // 取消点赞
      await ctx.db.delete(existing._id);
      // 更新计数
      await ctx.db.patch(args.noteId, {
        likesCount: Math.max(0, note.likesCount - 1),
      });
      return { liked: false };
    } else {
      // 添加点赞
      await ctx.db.insert('noteLikes', {
        userId: args.userId,
        noteId: args.noteId,
        createdAt: Date.now(),
      });
      // 更新计数
      await ctx.db.patch(args.noteId, {
        likesCount: note.likesCount + 1,
      });
      return { liked: true };
    }
  },
});

// 检查用户是否已点赞
export const isLiked = query({
  args: {
    userId: v.string(),
    noteId: v.id('travelNotes'),
  },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query('noteLikes')
      .withIndex('by_user_note', (q) =>
        q.eq('userId', args.userId).eq('noteId', args.noteId)
      )
      .first();

    return { liked: !!like };
  },
});

// 获取点赞数
export const getCount = query({
  args: {
    noteId: v.id('travelNotes'),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    return { count: note?.likesCount ?? 0 };
  },
});

// 获取用户点赞的游记列表
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const likes = await ctx.db
      .query('noteLikes')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const total = likes.length;
    const paginatedLikes = likes.slice(offset, offset + pageSize);

    // 获取游记详情
    const enriched = await Promise.all(
      paginatedLikes.map(async (like) => {
        const note = await ctx.db.get(like.noteId);
        if (!note || note.visibility !== 'public') return null;

        const images = await ctx.db
          .query('noteImages')
          .withIndex('by_note', (q) => q.eq('noteId', note._id))
          .collect();

        const profile = await ctx.db
          .query('profiles')
          .filter((q) => q.eq(q.field('email'), note.authorId))
          .first();

        return {
          ...like,
          note: {
            ...note,
            coverImage: images.find((i) => i.isCover)?.url ?? images[0]?.url,
            authorName: profile?.displayName,
            authorAvatar: profile?.avatarUrl,
          },
        };
      })
    );

    const data = enriched.filter((item) => item !== null);

    return { data, total };
  },
});

// 批量检查点赞状态
export const batchCheckLikes = query({
  args: {
    userId: v.string(),
    noteIds: v.array(v.id('travelNotes')),
  },
  handler: async (ctx, args) => {
    const results: Record<string, boolean> = {};

    await Promise.all(
      args.noteIds.map(async (noteId) => {
        const like = await ctx.db
          .query('noteLikes')
          .withIndex('by_user_note', (q) =>
            q.eq('userId', args.userId).eq('noteId', noteId)
          )
          .first();

        results[noteId] = !!like;
      })
    );

    return results;
  },
});
