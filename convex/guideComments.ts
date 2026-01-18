import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Guide Comments - Comments on Travel Guides (travelGuides table)
 * Uses string IDs to support various guide sources
 */

/**
 * Create a new comment on a guide
 */
export const create = mutation({
  args: {
    guideId: v.string(), // Travel guide ID (string, not Convex ID)
    userId: v.string(),
    content: v.string(),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate content
    if (!args.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    if (args.content.length > 2000) {
      throw new Error(
        'Comment content exceeds maximum length of 2000 characters'
      );
    }

    // Create the comment
    const commentId = await ctx.db.insert('guideComments', {
      guideId: args.guideId,
      userId: args.userId,
      parentId: args.parentId,
      content: args.content.trim(),
      likesCount: 0,
      repliesCount: 0,
      isEdited: false,
      isDeleted: false,
      createdAt: Date.now(),
    });

    // If this is a reply, update parent's reply count
    if (args.parentId) {
      const parentComment = await ctx.db
        .query('guideComments')
        .filter((q) => q.eq(q.field('_id'), args.parentId))
        .first();

      if (parentComment) {
        await ctx.db.patch(parentComment._id, {
          repliesCount: parentComment.repliesCount + 1,
        });
      }
    }

    return commentId;
  },
});

/**
 * List comments for a guide
 */
export const listByGuide = query({
  args: {
    guideId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all comments for this guide
    const allComments = await ctx.db
      .query('guideComments')
      .withIndex('by_guide', (q) => q.eq('guideId', args.guideId))
      .order('desc')
      .collect();

    // Filter to top-level comments only
    const topLevelComments = allComments.filter(
      (c) => !c.parentId && !c.isDeleted
    );
    const total = topLevelComments.length;
    const paginatedComments = topLevelComments.slice(offset, offset + pageSize);

    // Enrich with user info
    const enriched = await Promise.all(
      paginatedComments.map(async (comment) => {
        // Try to get user profile
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', comment.userId))
          .first();

        // Check if current user liked this comment
        let isLikedByUser = false;
        if (args.userId) {
          const like = await ctx.db
            .query('guideCommentLikes')
            .withIndex('by_comment_user', (q) =>
              q.eq('commentId', comment._id).eq('userId', args.userId!)
            )
            .first();
          isLikedByUser = !!like;
        }

        return {
          id: comment._id,
          itinerary_id: comment.guideId,
          user_id: comment.userId,
          parent_id: comment.parentId,
          content: comment.content,
          likes_count: comment.likesCount,
          replies_count: comment.repliesCount,
          is_edited: comment.isEdited,
          is_deleted: comment.isDeleted,
          created_at: comment.createdAt,
          updated_at: comment.updatedAt,
          author_name: profile?.displayName ?? 'User',
          author_avatar: profile?.avatarUrl,
          is_liked_by_user: isLikedByUser,
        };
      })
    );

    return {
      data: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

/**
 * Get replies for a comment
 */
export const getReplies = query({
  args: {
    commentId: v.id('guideComments'),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query('guideComments')
      .withIndex('by_parent', (q) => q.eq('parentId', args.commentId))
      .order('asc')
      .collect();

    const enriched = await Promise.all(
      replies.map(async (reply) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', reply.userId))
          .first();

        let isLikedByUser = false;
        if (args.userId) {
          const like = await ctx.db
            .query('guideCommentLikes')
            .withIndex('by_comment_user', (q) =>
              q.eq('commentId', reply._id).eq('userId', args.userId!)
            )
            .first();
          isLikedByUser = !!like;
        }

        return {
          id: reply._id,
          itinerary_id: reply.guideId,
          user_id: reply.userId,
          parent_id: reply.parentId,
          content: reply.content,
          likes_count: reply.likesCount,
          replies_count: reply.repliesCount,
          is_edited: reply.isEdited,
          is_deleted: reply.isDeleted,
          created_at: reply.createdAt,
          updated_at: reply.updatedAt,
          author_name: profile?.displayName ?? 'User',
          author_avatar: profile?.avatarUrl,
          is_liked_by_user: isLikedByUser,
        };
      })
    );

    return enriched;
  },
});

/**
 * Toggle like on a comment
 */
export const toggleLike = mutation({
  args: {
    commentId: v.id('guideComments'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query('guideCommentLikes')
      .withIndex('by_comment_user', (q) =>
        q.eq('commentId', args.commentId).eq('userId', args.userId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.commentId, {
        likesCount: Math.max(0, comment.likesCount - 1),
      });
      return { liked: false, likesCount: Math.max(0, comment.likesCount - 1) };
    } else {
      // Like
      await ctx.db.insert('guideCommentLikes', {
        commentId: args.commentId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.commentId, {
        likesCount: comment.likesCount + 1,
      });
      return { liked: true, likesCount: comment.likesCount + 1 };
    }
  },
});

/**
 * Update a comment
 */
export const update = mutation({
  args: {
    id: v.id('guideComments'),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== args.userId) {
      throw new Error('You can only edit your own comments');
    }

    if (comment.isDeleted) {
      throw new Error('Cannot edit a deleted comment');
    }

    if (!args.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    if (args.content.length > 2000) {
      throw new Error(
        'Comment content exceeds maximum length of 2000 characters'
      );
    }

    await ctx.db.patch(args.id, {
      content: args.content.trim(),
      isEdited: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a comment (soft delete)
 */
export const remove = mutation({
  args: {
    id: v.id('guideComments'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== args.userId) {
      throw new Error('You can only delete your own comments');
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      content: '[This comment has been deleted]',
      updatedAt: Date.now(),
    });

    // Update parent's reply count if this was a reply
    if (comment.parentId) {
      const parentComment = await ctx.db
        .query('guideComments')
        .filter((q) => q.eq(q.field('_id'), comment.parentId))
        .first();

      if (parentComment) {
        await ctx.db.patch(parentComment._id, {
          repliesCount: Math.max(0, parentComment.repliesCount - 1),
        });
      }
    }
  },
});
