/**
 * Travel Notes Service - Convex Implementation
 * CRUD operations for travel notes (游记)
 */

import type { Id } from '../lib/convex';
import type {
  CreateTravelNoteInput,
  PublicTravelNoteListQuery,
  TravelNoteListQuery,
  TravelNoteSearchQuery,
  UpdateTravelNoteInput,
} from '../models/travelNote';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

/**
 * Travel Notes service for CRUD operations
 */
export const TravelNotesService = {
  /**
   * Create a new travel note with optional images and tags
   */
  async create(userId: string, input: CreateTravelNoteInput) {
    // Create the note
    const noteId = await convex.mutation(api.travelNotes.create, {
      authorId: userId,
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      location: input.location,
      travelDate: input.travelDate,
    });

    // Add images if provided
    if (input.images && input.images.length > 0) {
      await convex.mutation(api.travelNotes.addImages, {
        noteId,
        userId,
        images: input.images,
      });
    }

    // Add tags if provided
    if (input.tags && input.tags.length > 0) {
      await convex.mutation(api.travelNotes.setTags, {
        noteId,
        userId,
        tags: input.tags,
      });
    }

    // Fetch and return the created note
    const note = await convex.query(api.travelNotes.getById, {
      id: noteId,
      userId,
    });

    return note;
  },

  /**
   * List travel notes for a user with pagination
   */
  async listByUser(userId: string, query: TravelNoteListQuery) {
    const result = await convex.query(api.travelNotes.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      visibility: query.visibility,
    });

    return result;
  },

  /**
   * List public travel notes for community discovery
   */
  async listPublic(query: PublicTravelNoteListQuery) {
    const result = await convex.query(api.travelNotes.listPublic, {
      page: query.page,
      pageSize: query.pageSize,
      tag: query.tag,
      sortBy: query.sortBy,
    });

    return result;
  },

  /**
   * Get a single travel note by ID
   */
  async getById(noteId: string, userId?: string) {
    const note = await convex.query(api.travelNotes.getById, {
      id: noteId as Id<'travelNotes'>,
      userId,
    });

    if (!note) {
      throw new NotFoundError('Travel note not found');
    }

    // Increment view count (fire and forget)
    convex
      .mutation(api.travelNotes.incrementViews, {
        id: noteId as Id<'travelNotes'>,
      })
      .catch(() => {
        // Ignore errors for view count
      });

    return note;
  },

  /**
   * Update a travel note
   */
  async update(noteId: string, userId: string, input: UpdateTravelNoteInput) {
    // Update the note
    const updated = await convex.mutation(api.travelNotes.update, {
      id: noteId as Id<'travelNotes'>,
      userId,
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      location: input.location ?? undefined,
      travelDate: input.travelDate ?? undefined,
      itineraryId: (input.itineraryId as Id<'itineraries'>) ?? undefined,
    });

    // Update tags if provided
    if (input.tags !== undefined) {
      await convex.mutation(api.travelNotes.setTags, {
        noteId: noteId as Id<'travelNotes'>,
        userId,
        tags: input.tags,
      });
    }

    // Fetch and return the updated note
    const note = await convex.query(api.travelNotes.getById, {
      id: noteId as Id<'travelNotes'>,
      userId,
    });

    return note;
  },

  /**
   * Delete a travel note
   */
  async delete(noteId: string, userId: string) {
    await convex.mutation(api.travelNotes.remove, {
      id: noteId as Id<'travelNotes'>,
      userId,
    });
  },

  /**
   * Search travel notes
   */
  async search(query: TravelNoteSearchQuery) {
    const result = await convex.query(api.travelNotes.search, {
      query: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get popular tags
   */
  async getPopularTags(limit?: number) {
    const tags = await convex.query(api.travelNotes.getPopularTags, {
      limit,
    });

    return tags;
  },

  // ============================================
  // Image Management
  // ============================================

  /**
   * Add an image to a travel note
   */
  async addImage(
    noteId: string,
    userId: string,
    image: {
      url: string;
      caption?: string;
      isCover?: boolean;
      orderIndex: number;
    }
  ) {
    const imageId = await convex.mutation(api.travelNotes.addImage, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
      url: image.url,
      caption: image.caption,
      isCover: image.isCover,
      orderIndex: image.orderIndex,
    });

    return { id: imageId };
  },

  /**
   * Remove an image from a travel note
   */
  async removeImage(imageId: string, userId: string) {
    await convex.mutation(api.travelNotes.removeImage, {
      imageId: imageId as Id<'noteImages'>,
      userId,
    });
  },

  // ============================================
  // POI Management
  // ============================================

  /**
   * Add a POI to a travel note
   */
  async addPoi(
    noteId: string,
    userId: string,
    poiId: string,
    mentionIndex?: number
  ) {
    const notePoiId = await convex.mutation(api.travelNotes.addPoi, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
      poiId: poiId as Id<'pois'>,
      mentionIndex,
    });

    return { id: notePoiId };
  },

  /**
   * Remove a POI from a travel note
   */
  async removePoi(noteId: string, userId: string, poiId: string) {
    await convex.mutation(api.travelNotes.removePoi, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
      poiId: poiId as Id<'pois'>,
    });
  },

  // ============================================
  // Likes
  // ============================================

  /**
   * Toggle like on a travel note
   */
  async toggleLike(noteId: string, userId: string) {
    const result = await convex.mutation(api.noteLikes.toggle, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
    });

    return result;
  },

  /**
   * Check if user has liked a note
   */
  async isLiked(noteId: string, userId: string) {
    const result = await convex.query(api.noteLikes.isLiked, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
    });

    return result;
  },

  /**
   * Get like count for a note
   */
  async getLikeCount(noteId: string) {
    const result = await convex.query(api.noteLikes.getCount, {
      noteId: noteId as Id<'travelNotes'>,
    });

    return result;
  },

  /**
   * Batch check likes for multiple notes
   */
  async batchCheckLikes(userId: string, noteIds: string[]) {
    const result = await convex.query(api.noteLikes.batchCheckLikes, {
      userId,
      noteIds: noteIds as Id<'travelNotes'>[],
    });

    return result;
  },

  // ============================================
  // Comments
  // ============================================

  /**
   * Create a comment on a travel note
   */
  async createComment(
    noteId: string,
    userId: string,
    content: string,
    parentId?: string
  ) {
    const commentId = await convex.mutation(api.noteComments.create, {
      noteId: noteId as Id<'travelNotes'>,
      userId,
      content,
      parentId: parentId as Id<'noteComments'> | undefined,
    });

    return { id: commentId };
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await convex.mutation(api.noteComments.update, {
      commentId: commentId as Id<'noteComments'>,
      userId,
      content,
    });

    return comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string) {
    await convex.mutation(api.noteComments.remove, {
      commentId: commentId as Id<'noteComments'>,
      userId,
    });
  },

  /**
   * List comments for a travel note
   */
  async listComments(
    noteId: string,
    query: { page: number; pageSize: number; sortBy: 'latest' | 'popular' }
  ) {
    const result = await convex.query(api.noteComments.listByNote, {
      noteId: noteId as Id<'travelNotes'>,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
    });

    return result;
  },

  /**
   * List replies to a comment
   */
  async listReplies(
    parentId: string,
    query: { page: number; pageSize: number }
  ) {
    const result = await convex.query(api.noteComments.listReplies, {
      parentId: parentId as Id<'noteComments'>,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(commentId: string, userId: string) {
    const result = await convex.mutation(api.noteComments.toggleLike, {
      commentId: commentId as Id<'noteComments'>,
      userId,
    });

    return result;
  },

  /**
   * Batch check comment likes
   */
  async batchCheckCommentLikes(userId: string, commentIds: string[]) {
    const result = await convex.query(api.noteComments.batchCheckCommentLikes, {
      userId,
      commentIds: commentIds as Id<'noteComments'>[],
    });

    return result;
  },
};
