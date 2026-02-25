import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Comments - Queries and Mutations
 * Supports nested comments (replies), likes, and reports
 */

const reportReasonValidator = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("inappropriate"),
  v.literal("misinformation"),
  v.literal("other"),
);

/**
 * Helper: Check if itinerary is public or user has access
 */
async function checkItineraryAccess(
  ctx: QueryCtx | MutationCtx,
  itineraryId: Id<"itineraries">,
  userId?: string,
): Promise<boolean> {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error("Itinerary not found");
  }

  // Public itineraries are accessible to everyone
  if (itinerary.visibility === "public") {
    return true;
  }

  // Private/team itineraries require ownership or collaboration
  if (!userId) {
    throw new Error("Authentication required");
  }

  if (itinerary.userId === userId) {
    return true;
  }

  // Check collaborator access
  const collab = await ctx.db
    .query("itineraryCollaborators")
    .withIndex("by_itinerary_user", (q) =>
      q.eq("itineraryId", itineraryId).eq("userId", userId),
    )
    .first();

  if (!collab) {
    throw new Error("You do not have access to this itinerary");
  }

  return true;
}

/**
 * Helper: Get user profile info
 */
async function getUserProfile(ctx: QueryCtx | MutationCtx, userId: string) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_email", (q) => q.eq("email", userId))
    .first();

  return profile;
}

/**
 * Helper: Create notification
 */
async function createNotification(
  ctx: MutationCtx,
  params: {
    userId: string;
    type: "comment" | "reply" | "like" | "mention";
    referenceType: "itinerary" | "comment";
    referenceId: string;
    actorId: string;
    message: string;
  },
) {
  // Don't notify yourself
  if (params.userId === params.actorId) {
    return;
  }

  await ctx.db.insert("notifications", {
    userId: params.userId,
    type: params.type,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    actorId: params.actorId,
    message: params.message,
    isRead: false,
    createdAt: Date.now(),
  });
}

// ============================================
// Queries
// ============================================

/**
 * List comments for an itinerary with pagination
 * Returns top-level comments with their reply counts
 */
export const listByItinerary = query({
  args: {
    itineraryId: v.id("itineraries"),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    userId: v.optional(v.string()), // For checking if user liked comments
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get top-level comments (no parentId)
    const allComments = await ctx.db
      .query("itineraryComments")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .order("desc")
      .collect();

    // Filter to top-level comments only
    const topLevelComments = allComments.filter((c) => !c.parentId);
    const total = topLevelComments.length;
    const paginatedComments = topLevelComments.slice(offset, offset + pageSize);

    // Enrich with user info and like status
    const enriched = await Promise.all(
      paginatedComments.map(async (comment) => {
        const profile = await getUserProfile(ctx, comment.userId);

        // Check if current user liked this comment
        let isLikedByUser = false;
        if (args.userId) {
          const like = await ctx.db
            .query("commentLikes")
            .withIndex("by_comment_user", (q) =>
              q.eq("commentId", comment._id).eq("userId", args.userId!),
            )
            .first();
          isLikedByUser = !!like;
        }

        return {
          ...comment,
          id: comment._id,
          authorName: profile?.displayName ?? "Anonymous",
          authorAvatar: profile?.avatarUrl,
          isLikedByUser,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Get replies for a comment
 */
export const getReplies = query({
  args: {
    commentId: v.id("itineraryComments"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("itineraryComments")
      .withIndex("by_parent", (q) => q.eq("parentId", args.commentId))
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      replies.map(async (reply) => {
        const profile = await getUserProfile(ctx, reply.userId);

        let isLikedByUser = false;
        if (args.userId) {
          const like = await ctx.db
            .query("commentLikes")
            .withIndex("by_comment_user", (q) =>
              q.eq("commentId", reply._id).eq("userId", args.userId!),
            )
            .first();
          isLikedByUser = !!like;
        }

        return {
          ...reply,
          id: reply._id,
          authorName: profile?.displayName ?? "Anonymous",
          authorAvatar: profile?.avatarUrl,
          isLikedByUser,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Get a single comment by ID
 */
export const getById = query({
  args: { id: v.id("itineraryComments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) return null;

    const profile = await getUserProfile(ctx, comment.userId);

    return {
      ...comment,
      id: comment._id,
      authorName: profile?.displayName ?? "Anonymous",
      authorAvatar: profile?.avatarUrl,
    };
  },
});

/**
 * Get comment count for an itinerary
 */
export const getCommentCount = query({
  args: { itineraryId: v.id("itineraries") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("itineraryComments")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();

    // Count only non-deleted comments
    return comments.filter((c) => !c.isDeleted).length;
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new comment
 */
export const create = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    userId: v.string(),
    content: v.string(),
    parentId: v.optional(v.id("itineraryComments")),
  },
  handler: async (ctx, args) => {
    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    if (args.content.length > 2000) {
      throw new Error(
        "Comment content exceeds maximum length of 2000 characters",
      );
    }

    // Check itinerary access
    await checkItineraryAccess(ctx, args.itineraryId, args.userId);

    // If this is a reply, validate parent comment exists
    let parentComment = null;
    if (args.parentId) {
      parentComment = await ctx.db.get(args.parentId);
      if (!parentComment) {
        throw new Error("Parent comment not found");
      }
      if (parentComment.itineraryId !== args.itineraryId) {
        throw new Error("Parent comment does not belong to this itinerary");
      }
    }

    // Create the comment
    const commentId = await ctx.db.insert("itineraryComments", {
      itineraryId: args.itineraryId,
      userId: args.userId,
      parentId: args.parentId,
      content: args.content.trim(),
      likesCount: 0,
      repliesCount: 0,
      isEdited: false,
      isDeleted: false,
      reportCount: 0,
      createdAt: Date.now(),
    });

    // Update parent's reply count if this is a reply
    if (args.parentId && parentComment) {
      await ctx.db.patch(args.parentId, {
        repliesCount: parentComment.repliesCount + 1,
      });

      // Notify parent comment author
      const profile = await getUserProfile(ctx, args.userId);
      await createNotification(ctx, {
        userId: parentComment.userId,
        type: "reply",
        referenceType: "comment",
        referenceId: args.parentId,
        actorId: args.userId,
        message: `${profile?.displayName ?? "Someone"} replied to your comment`,
      });
    } else {
      // Notify itinerary owner about new comment
      const itinerary = await ctx.db.get(args.itineraryId);
      if (itinerary) {
        const profile = await getUserProfile(ctx, args.userId);
        await createNotification(ctx, {
          userId: itinerary.userId,
          type: "comment",
          referenceType: "itinerary",
          referenceId: args.itineraryId,
          actorId: args.userId,
          message: `${profile?.displayName ?? "Someone"} commented on your itinerary`,
        });
      }
    }

    return commentId;
  },
});

/**
 * Update a comment
 */
export const update = mutation({
  args: {
    id: v.id("itineraryComments"),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("You can only edit your own comments");
    }

    if (comment.isDeleted) {
      throw new Error("Cannot edit a deleted comment");
    }

    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    if (args.content.length > 2000) {
      throw new Error(
        "Comment content exceeds maximum length of 2000 characters",
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
    id: v.id("itineraryComments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== args.userId) {
      throw new Error("You can only delete your own comments");
    }

    // Soft delete - keep the record for reply chain integrity
    await ctx.db.patch(args.id, {
      isDeleted: true,
      content: "[This comment has been deleted]",
      updatedAt: Date.now(),
    });

    // Update parent's reply count if this was a reply
    if (comment.parentId) {
      const parent = await ctx.db.get(comment.parentId);
      if (parent) {
        await ctx.db.patch(comment.parentId, {
          repliesCount: Math.max(0, parent.repliesCount - 1),
        });
      }
    }
  },
});

/**
 * Toggle like on a comment
 */
export const toggleLike = mutation({
  args: {
    commentId: v.id("itineraryComments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("commentLikes")
      .withIndex("by_comment_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", args.userId),
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
      await ctx.db.insert("commentLikes", {
        commentId: args.commentId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.commentId, {
        likesCount: comment.likesCount + 1,
      });

      // Notify comment author
      const profile = await getUserProfile(ctx, args.userId);
      await createNotification(ctx, {
        userId: comment.userId,
        type: "like",
        referenceType: "comment",
        referenceId: args.commentId,
        actorId: args.userId,
        message: `${profile?.displayName ?? "Someone"} liked your comment`,
      });

      return { liked: true, likesCount: comment.likesCount + 1 };
    }
  },
});

/**
 * Report a comment
 */
export const report = mutation({
  args: {
    commentId: v.id("itineraryComments"),
    userId: v.string(),
    reason: reportReasonValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check if user already reported this comment
    const existingReport = await ctx.db
      .query("commentReports")
      .withIndex("by_comment_user", (q) =>
        q.eq("commentId", args.commentId).eq("userId", args.userId),
      )
      .first();

    if (existingReport) {
      throw new Error("You have already reported this comment");
    }

    // Create report
    await ctx.db.insert("commentReports", {
      commentId: args.commentId,
      userId: args.userId,
      reason: args.reason,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update comment's report count
    await ctx.db.patch(args.commentId, {
      reportCount: comment.reportCount + 1,
    });

    return { success: true };
  },
});

// ============================================
// Notification Queries and Mutations
// ============================================

/**
 * List notifications for a user
 */
export const listNotifications = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", args.userId).eq("isRead", false),
        )
        .order("desc")
        .collect();
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }

    const total = notifications.length;
    const data = notifications.slice(offset, offset + pageSize);

    // Enrich with actor info
    const enriched = await Promise.all(
      data.map(async (notification) => {
        const actorProfile = notification.actorId
          ? await getUserProfile(ctx, notification.actorId)
          : null;
        return {
          ...notification,
          id: notification._id,
          actorName: actorProfile?.displayName ?? "Someone",
          actorAvatar: actorProfile?.avatarUrl,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("isRead", false),
      )
      .collect();

    return notifications.length;
  },
});

/**
 * Mark notification as read
 */
export const markNotificationRead = mutation({
  args: {
    id: v.id("notifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You can only mark your own notifications as read");
    }

    await ctx.db.patch(args.id, {
      isRead: true,
      readAt: Date.now(),
    });
  },
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("isRead", false),
      )
      .collect();

    const now = Date.now();
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return { count: notifications.length };
  },
});
