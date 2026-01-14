/**
 * POI Photo Service - Convex Implementation
 * Photo wall operations for Points of Interest
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Photo status type
export type PhotoStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

// Photo category type
export type PhotoCategory = 'interior' | 'exterior' | 'food' | 'scenery' | 'activity' | 'detail' | 'other';

// API response types
export interface PoiPhoto {
  id: string;
  poiId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  category?: PhotoCategory;
  width?: number;
  height?: number;
  takenAt?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  likesCount: number;
  viewsCount: number;
  isFeatured: boolean;
  featuredAt?: number;
  status: PhotoStatus;
  createdAt: number;
  updatedAt?: number;
}

export interface PhotoListResponse {
  data: PoiPhoto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PhotoStats {
  totalPhotos: number;
  featuredCount: number;
  totalLikes: number;
  totalViews: number;
  pendingCount: number;
  categoryBreakdown: Record<string, number>;
}

/**
 * POI Photo service for photo wall operations
 */
export const PoiPhotoService = {
  /**
   * List photos for a POI
   */
  async listByPoi(
    poiId: string,
    options: {
      status?: PhotoStatus;
      limit?: number;
      cursor?: string;
    } = {},
    _accessToken: string
  ): Promise<PhotoListResponse> {
    const result = await convex.query(api.poiPhotos.listByPoi, {
      poiId: poiId as Id<'pois'>,
      status: options.status,
      limit: options.limit,
      cursor: options.cursor,
    });

    return {
      data: result.items.map(toPoiPhoto),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  },

  /**
   * Get featured photos for a POI
   */
  async getFeaturedByPoi(
    poiId: string,
    limit: number = 5,
    _accessToken: string
  ): Promise<PoiPhoto[]> {
    const photos = await convex.query(api.poiPhotos.getFeaturedByPoi, {
      poiId: poiId as Id<'pois'>,
      limit,
    });

    return photos.map(toPoiPhoto);
  },

  /**
   * Get a single photo by ID
   */
  async getById(photoId: string, _accessToken: string): Promise<PoiPhoto> {
    const photo = await convex.query(api.poiPhotos.getById, {
      id: photoId as Id<'poiPhotos'>,
    });

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    return toPoiPhoto(photo);
  },

  /**
   * Get photos by user
   */
  async listByUser(
    userId: string,
    limit: number = 20,
    _accessToken: string
  ): Promise<PoiPhoto[]> {
    const photos = await convex.query(api.poiPhotos.listByUser, {
      userId,
      limit,
    });

    return photos.map(toPoiPhoto);
  },

  /**
   * Get photo timeline (all approved photos)
   */
  async getTimeline(
    options: {
      limit?: number;
      cursor?: string;
    } = {},
    _accessToken: string
  ): Promise<PhotoListResponse> {
    const result = await convex.query(api.poiPhotos.getTimeline, {
      limit: options.limit,
      cursor: options.cursor,
    });

    return {
      data: result.items.map(toPoiPhoto),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  },

  /**
   * Get photo stats for a POI
   */
  async getPoiPhotoStats(
    poiId: string,
    _accessToken: string
  ): Promise<PhotoStats> {
    return await convex.query(api.poiPhotos.getPoiPhotoStats, {
      poiId: poiId as Id<'pois'>,
    });
  },

  /**
   * Check if user has liked a photo
   */
  async hasUserLiked(
    photoId: string,
    userId: string,
    _accessToken: string
  ): Promise<boolean> {
    return await convex.query(api.poiPhotos.hasUserLiked, {
      photoId: photoId as Id<'poiPhotos'>,
      userId,
    });
  },

  /**
   * Get user's liked photos
   */
  async getUserLikedPhotos(
    userId: string,
    limit: number = 20,
    _accessToken: string
  ): Promise<PoiPhoto[]> {
    const photos = await convex.query(api.poiPhotos.getUserLikedPhotos, {
      userId,
      limit,
    });

    return photos.filter((p): p is NonNullable<typeof p> => p !== null).map(toPoiPhoto);
  },

  /**
   * Upload a new photo
   */
  async upload(
    data: {
      poiId: string;
      userId: string;
      userName?: string;
      userAvatarUrl?: string;
      imageUrl: string;
      thumbnailUrl?: string;
      caption?: string;
      width?: number;
      height?: number;
      takenAt?: number;
      location?: {
        latitude: number;
        longitude: number;
      };
    },
    _accessToken: string
  ): Promise<string> {
    const photoId = await convex.mutation(api.poiPhotos.upload, {
      poiId: data.poiId as Id<'pois'>,
      userId: data.userId,
      userName: data.userName,
      userAvatarUrl: data.userAvatarUrl,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      caption: data.caption,
      width: data.width,
      height: data.height,
      takenAt: data.takenAt,
      location: data.location,
    });

    return photoId;
  },

  /**
   * Update photo caption
   */
  async updateCaption(
    photoId: string,
    userId: string,
    caption: string,
    _accessToken: string
  ): Promise<PoiPhoto> {
    const photo = await convex.mutation(api.poiPhotos.updateCaption, {
      id: photoId as Id<'poiPhotos'>,
      userId,
      caption,
    });

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    return toPoiPhoto(photo);
  },

  /**
   * Delete a photo (soft delete)
   */
  async remove(
    photoId: string,
    userId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.poiPhotos.remove, {
      id: photoId as Id<'poiPhotos'>,
      userId,
    });
  },

  /**
   * Like a photo
   */
  async like(
    photoId: string,
    userId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.poiPhotos.like, {
      photoId: photoId as Id<'poiPhotos'>,
      userId,
    });
  },

  /**
   * Unlike a photo
   */
  async unlike(
    photoId: string,
    userId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.poiPhotos.unlike, {
      photoId: photoId as Id<'poiPhotos'>,
      userId,
    });
  },

  /**
   * Increment view count
   */
  async incrementViews(
    photoId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.poiPhotos.incrementViews, {
      id: photoId as Id<'poiPhotos'>,
    });
  },

  // ============================================
  // Admin Operations
  // ============================================

  /**
   * Approve a photo
   */
  async approve(
    photoId: string,
    reviewedBy: string,
    _accessToken: string
  ): Promise<PoiPhoto> {
    const photo = await convex.mutation(api.poiPhotos.approve, {
      id: photoId as Id<'poiPhotos'>,
      reviewedBy,
    });

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    return toPoiPhoto(photo);
  },

  /**
   * Reject a photo
   */
  async reject(
    photoId: string,
    reviewedBy: string,
    moderatorNotes?: string,
    _accessToken?: string
  ): Promise<PoiPhoto> {
    const photo = await convex.mutation(api.poiPhotos.reject, {
      id: photoId as Id<'poiPhotos'>,
      reviewedBy,
      moderatorNotes,
    });

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    return toPoiPhoto(photo);
  },

  /**
   * Set featured status
   */
  async setFeatured(
    photoId: string,
    isFeatured: boolean,
    featuredBy?: string,
    _accessToken?: string
  ): Promise<PoiPhoto> {
    const photo = await convex.mutation(api.poiPhotos.setFeatured, {
      id: photoId as Id<'poiPhotos'>,
      isFeatured,
      featuredBy,
    });

    if (!photo) {
      throw new NotFoundError('Photo not found');
    }

    return toPoiPhoto(photo);
  },

  /**
   * Get pending photos for moderation
   */
  async getPendingPhotos(
    limit: number = 50,
    _accessToken: string
  ): Promise<PoiPhoto[]> {
    const photos = await convex.query(api.poiPhotos.getPendingPhotos, {
      limit,
    });

    return photos.map(toPoiPhoto);
  },

  /**
   * Bulk approve photos
   */
  async bulkApprove(
    photoIds: string[],
    reviewedBy: string,
    _accessToken: string
  ): Promise<{ approved: number }> {
    return await convex.mutation(api.poiPhotos.bulkApprove, {
      ids: photoIds as Id<'poiPhotos'>[],
      reviewedBy,
    });
  },
};

// Helper function to convert Convex document to API response
function toPoiPhoto(doc: Doc<'poiPhotos'>): PoiPhoto {
  return {
    id: doc._id,
    poiId: doc.poiId,
    userId: doc.userId,
    userName: doc.userName,
    userAvatarUrl: doc.userAvatarUrl,
    imageUrl: doc.imageUrl,
    thumbnailUrl: doc.thumbnailUrl,
    caption: doc.caption,
    width: doc.width,
    height: doc.height,
    takenAt: doc.takenAt,
    location: doc.location,
    likesCount: doc.likesCount,
    viewsCount: doc.viewsCount,
    isFeatured: doc.isFeatured,
    featuredAt: doc.featuredAt,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
