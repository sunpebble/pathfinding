/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * POI Photos - User-uploaded photos for Points of Interest
 */

const photoStatusValidator = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
  v.literal('hidden')
);

const photoCategoryValidator = v.union(
  v.literal('interior'),
  v.literal('exterior'),
  v.literal('food'),
  v.literal('scenery'),
  v.literal('activity'),
  v.literal('detail'),
  v.literal('other')
);

// ============================================
// Queries
// ============================================

// List photos for a POI with pagination
export const listByPoi = query({
  args: {
    poiId: v.id('pois'),
    status: v.optional(photoStatusValidator),
    category: v.optional(photoCategoryValidator),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const status = args.status ?? 'approved';

    let photosQuery;

    if (args.category) {
      // Filter by category
      photosQuery = ctx.db
        .query('poiPhotos')
        .withIndex('by_poi_category', (q) =>
          q.eq('poiId', args.poiId).eq('category', args.category)
        )
        .filter((q) => q.eq(q.field('status'), status))
        .order('desc');
    } else {
      photosQuery = ctx.db
        .query('poiPhotos')
        .withIndex('by_poi_status', (q) =>
          q.eq('poiId', args.poiId).eq('status', status)
        )
        .order('desc');
    }

    const photos = await photosQuery.take(limit + 1);

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1]._id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  },
});

// Get featured photos for a POI
export const getFeaturedByPoi = query({
  args: {
    poiId: v.id('pois'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    const photos = await ctx.db
      .query('poiPhotos')
      .withIndex('by_poi_featured', (q) =>
        q.eq('poiId', args.poiId).eq('isFeatured', true)
      )
      .order('desc')
      .take(limit);

    return photos;
  },
});

// Get a single photo by ID
export const getById = query({
  args: { id: v.id('poiPhotos') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get photos by user
export const listByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const photos = await ctx.db
      .query('poiPhotos')
      .withIndex('by_user_created', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);

    return photos;
  },
});

// Get photo timeline (all approved photos sorted by creation date)
export const getTimeline = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let photosQuery = ctx.db
      .query('poiPhotos')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .order('desc');

    const photos = await photosQuery.take(limit + 1);

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? items[items.length - 1]._id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  },
});

// Get photo stats for a POI
export const getPoiPhotoStats = query({
  args: { poiId: v.id('pois') },
  handler: async (ctx, args) => {
    const allPhotos = await ctx.db
      .query('poiPhotos')
      .withIndex('by_poi', (q) => q.eq('poiId', args.poiId))
      .collect();

    const approvedPhotos = allPhotos.filter((p) => p.status === 'approved');
    const featuredPhotos = approvedPhotos.filter((p) => p.isFeatured);
    const totalLikes = approvedPhotos.reduce((sum, p) => sum + p.likesCount, 0);
    const totalViews = approvedPhotos.reduce((sum, p) => sum + p.viewsCount, 0);

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const photo of approvedPhotos) {
      const cat = photo.category ?? 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;
    }

    return {
      totalPhotos: approvedPhotos.length,
      featuredCount: featuredPhotos.length,
      totalLikes,
      totalViews,
      pendingCount: allPhotos.filter((p) => p.status === 'pending').length,
      categoryBreakdown,
    };
  },
});

// Get popular photos (sorted by likes)
export const getPopularPhotos = query({
  args: {
    poiId: v.optional(v.id('pois')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let query;
    if (args.poiId) {
      query = ctx.db
        .query('poiPhotos')
        .withIndex('by_poi_status', (q) =>
          q.eq('poiId', args.poiId).eq('status', 'approved')
        );
    } else {
      query = ctx.db
        .query('poiPhotos')
        .withIndex('by_status', (q) => q.eq('status', 'approved'));
    }

    // Get all approved photos and sort by likes
    const photos = await query.collect();
    const sortedPhotos = photos
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, limit);

    return sortedPhotos;
  },
});

// Check if user has liked a photo
export const hasUserLiked = query({
  args: {
    photoId: v.id('poiPhotos'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query('poiPhotoLikes')
      .withIndex('by_photo_user', (q) =>
        q.eq('photoId', args.photoId).eq('userId', args.userId)
      )
      .first();

    return like !== null;
  },
});

// Get user's liked photos
export const getUserLikedPhotos = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const likes = await ctx.db
      .query('poiPhotoLikes')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);

    const photos = await Promise.all(
      likes.map(async (like) => {
        const photo = await ctx.db.get(like.photoId);
        return photo;
      })
    );

    return photos.filter((p) => p !== null && p.status === 'approved');
  },
});

// ============================================
// Mutations
// ============================================

// Upload a new photo
export const upload = mutation({
  args: {
    poiId: v.id('pois'),
    userId: v.string(),
    userName: v.optional(v.string()),
    userAvatarUrl: v.optional(v.string()),
    imageUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    category: v.optional(photoCategoryValidator),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    takenAt: v.optional(v.number()),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify POI exists
    const poi = await ctx.db.get(args.poiId);
    if (!poi) {
      throw new Error('POI not found');
    }

    const now = Date.now();

    const photoId = await ctx.db.insert('poiPhotos', {
      poiId: args.poiId,
      userId: args.userId,
      userName: args.userName,
      userAvatarUrl: args.userAvatarUrl,
      imageUrl: args.imageUrl,
      thumbnailUrl: args.thumbnailUrl,
      caption: args.caption,
      category: args.category ?? 'other',
      width: args.width,
      height: args.height,
      takenAt: args.takenAt,
      location: args.location,
      likesCount: 0,
      viewsCount: 0,
      isFeatured: false,
      status: 'pending', // New photos require approval
      createdAt: now,
    });

    return photoId;
  },
});

// Update photo caption
export const updateCaption = mutation({
  args: {
    id: v.id('poiPhotos'),
    userId: v.string(),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo) {
      throw new Error('Photo not found');
    }

    if (photo.userId !== args.userId) {
      throw new Error('Not authorized to update this photo');
    }

    await ctx.db.patch(args.id, {
      caption: args.caption,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Delete a photo (soft delete by setting status to hidden)
export const remove = mutation({
  args: {
    id: v.id('poiPhotos'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo) {
      throw new Error('Photo not found');
    }

    if (photo.userId !== args.userId) {
      throw new Error('Not authorized to delete this photo');
    }

    await ctx.db.patch(args.id, {
      status: 'hidden',
      updatedAt: Date.now(),
    });
  },
});

// Like a photo
export const like = mutation({
  args: {
    photoId: v.id('poiPhotos'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already liked
    const existingLike = await ctx.db
      .query('poiPhotoLikes')
      .withIndex('by_photo_user', (q) =>
        q.eq('photoId', args.photoId).eq('userId', args.userId)
      )
      .first();

    if (existingLike) {
      throw new Error('Already liked this photo');
    }

    // Create like
    await ctx.db.insert('poiPhotoLikes', {
      photoId: args.photoId,
      userId: args.userId,
      createdAt: Date.now(),
    });

    // Increment likes count
    const photo = await ctx.db.get(args.photoId);
    if (photo) {
      await ctx.db.patch(args.photoId, {
        likesCount: photo.likesCount + 1,
      });
    }
  },
});

// Unlike a photo
export const unlike = mutation({
  args: {
    photoId: v.id('poiPhotos'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query('poiPhotoLikes')
      .withIndex('by_photo_user', (q) =>
        q.eq('photoId', args.photoId).eq('userId', args.userId)
      )
      .first();

    if (!existingLike) {
      throw new Error('Like not found');
    }

    // Delete like
    await ctx.db.delete(existingLike._id);

    // Decrement likes count
    const photo = await ctx.db.get(args.photoId);
    if (photo && photo.likesCount > 0) {
      await ctx.db.patch(args.photoId, {
        likesCount: photo.likesCount - 1,
      });
    }
  },
});

// Increment view count
export const incrementViews = mutation({
  args: { id: v.id('poiPhotos') },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (photo) {
      await ctx.db.patch(args.id, {
        viewsCount: photo.viewsCount + 1,
      });
    }
  },
});

// ============================================
// Admin Mutations
// ============================================

// Approve a photo
export const approve = mutation({
  args: {
    id: v.id('poiPhotos'),
    reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'approved',
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Reject a photo
export const reject = mutation({
  args: {
    id: v.id('poiPhotos'),
    reviewedBy: v.string(),
    moderatorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'rejected',
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      moderatorNotes: args.moderatorNotes,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Feature a photo
export const setFeatured = mutation({
  args: {
    id: v.id('poiPhotos'),
    isFeatured: v.boolean(),
    featuredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      isFeatured: args.isFeatured,
      updatedAt: Date.now(),
    };

    if (args.isFeatured) {
      updates.featuredAt = Date.now();
      updates.featuredBy = args.featuredBy;
    } else {
      updates.featuredAt = undefined;
      updates.featuredBy = undefined;
    }

    await ctx.db.patch(args.id, updates);

    return await ctx.db.get(args.id);
  },
});

// Get pending photos for moderation
export const getPendingPhotos = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const photos = await ctx.db
      .query('poiPhotos')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('asc') // Oldest first for FIFO moderation
      .take(limit);

    return photos;
  },
});

// Bulk approve photos
export const bulkApprove = mutation({
  args: {
    ids: v.array(v.id('poiPhotos')),
    reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: 'approved',
        reviewedBy: args.reviewedBy,
        reviewedAt: now,
        updatedAt: now,
      });
    }

    return { approved: args.ids.length };
  },
});
