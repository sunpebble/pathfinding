/**
 * Comment Service - Convex Implementation
 * CRUD operations for itinerary comments
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

// Types
export interface CreateCommentInput {
  content: string;
  parentId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface ReportCommentInput {
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description?: string;
}

export interface CommentListQuery {
  page: number;
  pageSize: number;
}

/**
 * Comment service for CRUD operations
 */
export const CommentService = {
  /**
   * List comments for an itinerary with pagination
   */
  async listByItinerary(
    itineraryId: string,
    query: CommentListQuery,
    userId?: string
  ) {
    const result = await convex.query(api.itineraryComments.listByItinerary, {
      itineraryId: itineraryId as Id<'itineraries'>,
      page: query.page,
      pageSize: query.pageSize,
      userId,
    });

    return result;
  },

  /**
   * Get replies for a comment
   */
  async getReplies(commentId: string, userId?: string) {
    const replies = await convex.query(api.itineraryComments.getReplies, {
      commentId: commentId as Id<'itineraryComments'>,
      userId,
    });

    return replies;
  },

  /**
   * Get a single comment by ID
   */
  async getById(commentId: string) {
    const comment = await convex.query(api.itineraryComments.getById, {
      id: commentId as Id<'itineraryComments'>,
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    return comment;
  },

  /**
   * Get comment count for an itinerary
   */
  async getCommentCount(itineraryId: string) {
    return await convex.query(api.itineraryComments.getCommentCount, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });
  },

  /**
   * Create a new comment
   */
  async create(
    itineraryId: string,
    userId: string,
    input: CreateCommentInput
  ) {
    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Comment content cannot be empty');
    }

    if (input.content.length > 2000) {
      throw new ValidationError(
        'Comment content exceeds maximum length of 2000 characters'
      );
    }

    const commentId = await convex.mutation(api.itineraryComments.create, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      content: input.content,
      parentId: input.parentId
        ? (input.parentId as Id<'itineraryComments'>)
        : undefined,
    });

    // Fetch the created comment
    const comment = await convex.query(api.itineraryComments.getById, {
      id: commentId,
    });

    return comment;
  },

  /**
   * Update a comment
   */
  async update(commentId: string, userId: string, input: UpdateCommentInput) {
    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Comment content cannot be empty');
    }

    const updated = await convex.mutation(api.itineraryComments.update, {
      id: commentId as Id<'itineraryComments'>,
      userId,
      content: input.content,
    });

    return updated;
  },

  /**
   * Delete a comment
   */
  async delete(commentId: string, userId: string) {
    await convex.mutation(api.itineraryComments.remove, {
      id: commentId as Id<'itineraryComments'>,
      userId,
    });
  },

  /**
   * Toggle like on a comment
   */
  async toggleLike(commentId: string, userId: string) {
    const result = await convex.mutation(api.itineraryComments.toggleLike, {
      commentId: commentId as Id<'itineraryComments'>,
      userId,
    });

    return result;
  },

  /**
   * Report a comment
   */
  async report(commentId: string, userId: string, input: ReportCommentInput) {
    const result = await convex.mutation(api.itineraryComments.report, {
      commentId: commentId as Id<'itineraryComments'>,
      userId,
      reason: input.reason,
      description: input.description,
    });

    return result;
  },
};

/**
 * Notification service for user notifications
 */
export const NotificationService = {
  /**
   * List notifications for a user
   */
  async list(
    userId: string,
    query: { page: number; pageSize: number; unreadOnly?: boolean }
  ) {
    const result = await convex.query(api.itineraryComments.listNotifications, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      unreadOnly: query.unreadOnly,
    });

    return result;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    return await convex.query(api.itineraryComments.getUnreadCount, {
      userId,
    });
  },

  /**
   * Mark a notification as read
   */
  async markRead(notificationId: string, userId: string) {
    await convex.mutation(api.itineraryComments.markNotificationRead, {
      id: notificationId as Id<'notifications'>,
      userId,
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId: string) {
    const result = await convex.mutation(
      api.itineraryComments.markAllNotificationsRead,
      { userId }
    );

    return result;
  },
};
