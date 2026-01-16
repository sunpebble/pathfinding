/**
 * Share Events - Track share actions, manage share links, and control permissions
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Validators
const platformValidator = v.union(
  v.literal('wechat'),
  v.literal('weibo'),
  v.literal('xiaohongshu'),
  v.literal('qq'),
  v.literal('douyin'),
  v.literal('copy_link'),
  v.literal('system_share'),
  v.literal('generic')
);

const eventTypeValidator = v.union(
  v.literal('share'),
  v.literal('click'),
  v.literal('view'),
  v.literal('save')
);

const permissionValidator = v.union(
  v.literal('public'), // Anyone with link can view
  v.literal('unlisted'), // Only people with link can view (not searchable)
  v.literal('private'), // Only owner and explicitly shared users can view
  v.literal('password') // Requires password to view
);

const resourceTypeValidator = v.union(
  v.literal('itinerary'),
  v.literal('travelGuide'),
  v.literal('travelNote')
);

/**
 * Create a new share link
 */
export const createShareLink = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    ownerId: v.string(),
    platform: platformValidator,
    permission: v.optional(permissionValidator),
    password: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxViews: v.optional(v.number()),
    allowDownload: v.optional(v.boolean()),
    allowCopy: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Generate a unique share code
    const shareCode = generateShareCode();
    const shareUrl = `https://pathfinding.app/s/${shareCode}`;

    const id = await ctx.db.insert('shareLinks', {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      ownerId: args.ownerId,
      shareCode,
      shareUrl,
      platform: args.platform,
      permission: args.permission || 'public',
      password: args.password,
      expiresAt: args.expiresAt,
      maxViews: args.maxViews,
      allowDownload: args.allowDownload ?? true,
      allowCopy: args.allowCopy ?? true,
      viewCount: 0,
      clickCount: 0,
      saveCount: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Record the share event
    await ctx.db.insert('shareEvents', {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      sharerId: args.ownerId,
      shareLinkId: id,
      platform: args.platform,
      eventType: 'share',
      createdAt: Date.now(),
    });

    return {
      id,
      shareCode,
      shareUrl,
    };
  },
});

/**
 * Create a share event (for tracking shares without creating a link)
 */
export const create = mutation({
  args: {
    resourceType: v.optional(resourceTypeValidator),
    resourceId: v.string(),
    platform: platformValidator,
    sharerId: v.optional(v.string()),
    shareUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('shareEvents', {
      resourceType: args.resourceType || 'travelGuide',
      resourceId: args.resourceId,
      sharerId: args.sharerId,
      platform: args.platform,
      eventType: 'share',
      shareUrl: args.shareUrl,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Track a share-related event (click, view, save)
 */
export const trackEvent = mutation({
  args: {
    shareCode: v.optional(v.string()),
    shareLinkId: v.optional(v.id('shareLinks')),
    resourceType: v.optional(resourceTypeValidator),
    resourceId: v.optional(v.string()),
    platform: v.optional(platformValidator),
    eventType: eventTypeValidator,
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let shareLink = null;

    // Find the share link by code or ID
    if (args.shareCode) {
      shareLink = await ctx.db
        .query('shareLinks')
        .withIndex('by_share_code', (q) => q.eq('shareCode', args.shareCode))
        .first();
    } else if (args.shareLinkId) {
      shareLink = await ctx.db.get(args.shareLinkId);
    }

    if (shareLink) {
      // Check if link is still valid
      if (!shareLink.isActive) {
        throw new Error('Share link is no longer active');
      }
      if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
        throw new Error('Share link has expired');
      }
      if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
        throw new Error('Share link has reached maximum views');
      }

      // Update counters on the share link
      const updates: {
        viewCount?: number;
        clickCount?: number;
        saveCount?: number;
        lastAccessedAt?: number;
        updatedAt: number;
      } = {
        lastAccessedAt: Date.now(),
        updatedAt: Date.now(),
      };

      switch (args.eventType) {
        case 'view':
          updates.viewCount = (shareLink.viewCount || 0) + 1;
          break;
        case 'click':
          updates.clickCount = (shareLink.clickCount || 0) + 1;
          break;
        case 'save':
          updates.saveCount = (shareLink.saveCount || 0) + 1;
          break;
      }

      await ctx.db.patch(shareLink._id, updates);
    }

    // Create detailed event log
    await ctx.db.insert('shareEventLogs', {
      shareLinkId: shareLink?._id,
      resourceType:
        shareLink?.resourceType || args.resourceType || 'travelGuide',
      resourceId: shareLink?.resourceId || args.resourceId || '',
      platform: shareLink?.platform || args.platform || 'generic',
      eventType: args.eventType,
      referrer: args.referrer,
      userAgent: args.userAgent,
      ipHash: args.ipHash,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Verify share link access (check password, expiry, etc.)
 */
export const verifyAccess = query({
  args: {
    shareCode: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query('shareLinks')
      .withIndex('by_share_code', (q) => q.eq('shareCode', args.shareCode))
      .first();

    if (!shareLink) {
      return { valid: false, error: 'Share link not found' };
    }

    if (!shareLink.isActive) {
      return { valid: false, error: 'Share link is no longer active' };
    }

    if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
      return { valid: false, error: 'Share link has expired' };
    }

    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return { valid: false, error: 'Share link has reached maximum views' };
    }

    if (shareLink.permission === 'password') {
      if (!args.password) {
        return {
          valid: false,
          error: 'Password required',
          requiresPassword: true,
        };
      }
      if (shareLink.password !== args.password) {
        return {
          valid: false,
          error: 'Invalid password',
          requiresPassword: true,
        };
      }
    }

    return {
      valid: true,
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
      permission: shareLink.permission,
      allowDownload: shareLink.allowDownload,
      allowCopy: shareLink.allowCopy,
    };
  },
});

/**
 * Get share link by code
 */
export const getByCode = query({
  args: {
    shareCode: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query('shareLinks')
      .withIndex('by_share_code', (q) => q.eq('shareCode', args.shareCode))
      .first();

    if (!shareLink) {
      return null;
    }

    // Don't expose password
    const { password: _, ...safeLink } = shareLink;
    return safeLink;
  },
});

/**
 * Get share statistics for a resource
 */
export const getStats = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all share links for this resource
    const shareLinks = await ctx.db
      .query('shareLinks')
      .withIndex('by_resource', (q) =>
        q
          .eq('resourceType', args.resourceType)
          .eq('resourceId', args.resourceId)
      )
      .collect();

    // Get all share events for this resource
    const shareEvents = await ctx.db
      .query('shareEvents')
      .withIndex('by_resource', (q) =>
        q
          .eq('resourceType', args.resourceType)
          .eq('resourceId', args.resourceId)
      )
      .collect();

    // Aggregate stats by platform
    const statsByPlatform: Record<
      string,
      {
        shares: number;
        clicks: number;
        views: number;
        saves: number;
        lastShareAt?: number;
      }
    > = {};

    const totalShares = shareEvents.filter((e) => e.eventType === 'share').length;
    let totalClicks = 0;
    let totalViews = 0;
    let totalSaves = 0;

    // Aggregate from share links
    for (const link of shareLinks) {
      if (!statsByPlatform[link.platform]) {
        statsByPlatform[link.platform] = {
          shares: 0,
          clicks: 0,
          views: 0,
          saves: 0,
        };
      }

      statsByPlatform[link.platform].shares += 1;
      statsByPlatform[link.platform].clicks += link.clickCount || 0;
      statsByPlatform[link.platform].views += link.viewCount || 0;
      statsByPlatform[link.platform].saves += link.saveCount || 0;
      statsByPlatform[link.platform].lastShareAt = Math.max(
        statsByPlatform[link.platform].lastShareAt || 0,
        link.createdAt
      );

      totalClicks += link.clickCount || 0;
      totalViews += link.viewCount || 0;
      totalSaves += link.saveCount || 0;
    }

    return {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      totals: {
        shares: totalShares,
        clicks: totalClicks,
        views: totalViews,
        saves: totalSaves,
        activeLinks: shareLinks.filter((l) => l.isActive).length,
      },
      byPlatform: statsByPlatform,
      recentShares: shareEvents.slice(-10).reverse(),
    };
  },
});

/**
 * Get share links for a resource (owner only)
 */
export const getShareLinks = query({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLinks = await ctx.db
      .query('shareLinks')
      .withIndex('by_resource', (q) =>
        q
          .eq('resourceType', args.resourceType)
          .eq('resourceId', args.resourceId)
      )
      .filter((q) => q.eq(q.field('ownerId'), args.ownerId))
      .collect();

    // Don't expose passwords
    return shareLinks.map(({ password: _, ...link }) => ({
      ...link,
      hasPassword: !!_,
    }));
  },
});

/**
 * Get share history for a user
 */
export const getShareHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const shareEvents = await ctx.db
      .query('shareEvents')
      .withIndex('by_sharer', (q) => q.eq('sharerId', args.userId))
      .order('desc')
      .take(limit + 1);

    const hasMore = shareEvents.length > limit;
    const items = shareEvents.slice(0, limit);

    return {
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : undefined,
    };
  },
});

/**
 * Update share link settings
 */
export const updateShareLink = mutation({
  args: {
    shareLinkId: v.id('shareLinks'),
    ownerId: v.string(),
    permission: v.optional(permissionValidator),
    password: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxViews: v.optional(v.number()),
    allowDownload: v.optional(v.boolean()),
    allowCopy: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db.get(args.shareLinkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    if (shareLink.ownerId !== args.ownerId) {
      throw new Error('Not authorized to update this share link');
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.permission !== undefined) updates.permission = args.permission;
    if (args.password !== undefined) updates.password = args.password;
    if (args.expiresAt !== undefined) updates.expiresAt = args.expiresAt;
    if (args.maxViews !== undefined) updates.maxViews = args.maxViews;
    if (args.allowDownload !== undefined)
      updates.allowDownload = args.allowDownload;
    if (args.allowCopy !== undefined) updates.allowCopy = args.allowCopy;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.shareLinkId, updates);

    return { success: true };
  },
});

/**
 * Revoke (deactivate) a share link
 */
export const revokeShareLink = mutation({
  args: {
    shareLinkId: v.id('shareLinks'),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db.get(args.shareLinkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    if (shareLink.ownerId !== args.ownerId) {
      throw new Error('Not authorized to revoke this share link');
    }

    await ctx.db.patch(args.shareLinkId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a share link permanently
 */
export const deleteShareLink = mutation({
  args: {
    shareLinkId: v.id('shareLinks'),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db.get(args.shareLinkId);

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    if (shareLink.ownerId !== args.ownerId) {
      throw new Error('Not authorized to delete this share link');
    }

    await ctx.db.delete(args.shareLinkId);

    return { success: true };
  },
});

/**
 * Get top shared resources
 */
export const getTopShared = query({
  args: {
    resourceType: v.optional(resourceTypeValidator),
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const days = args.days || 30;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get share events within the time range
    let eventsQuery = ctx.db
      .query('shareEvents')
      .filter((q) => q.gte(q.field('createdAt'), cutoffTime));

    if (args.resourceType) {
      eventsQuery = eventsQuery.filter((q) =>
        q.eq(q.field('resourceType'), args.resourceType)
      );
    }

    const events = await eventsQuery.collect();

    // Aggregate by resource
    const sharesByResource = new Map<
      string,
      { count: number; resourceType: string }
    >();

    for (const event of events) {
      if (event.eventType === 'share') {
        const key = `${event.resourceType}:${event.resourceId}`;
        const current = sharesByResource.get(key) || {
          count: 0,
          resourceType: event.resourceType,
        };
        sharesByResource.set(key, {
          count: current.count + 1,
          resourceType: event.resourceType,
        });
      }
    }

    // Sort and get top resources
    const sortedResources = Array.from(sharesByResource.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    return sortedResources.map(([key, data]) => {
      const [resourceType, resourceId] = key.split(':');
      return {
        resourceType,
        resourceId,
        shareCount: data.count,
      };
    });
  },
});

/**
 * Clean up old share event logs
 */
export const cleanupOldLogs = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 90;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query('shareEventLogs')
      .filter((q) => q.lt(q.field('createdAt'), cutoffTime))
      .take(1000);

    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    return {
      deletedCount,
      hasMore: oldLogs.length === 1000,
    };
  },
});

/**
 * Clean up expired share links
 */
export const cleanupExpiredLinks = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredLinks = await ctx.db
      .query('shareLinks')
      .filter((q) =>
        q.and(
          q.eq(q.field('isActive'), true),
          q.neq(q.field('expiresAt'), undefined),
          q.lt(q.field('expiresAt'), now)
        )
      )
      .take(100);

    let deactivatedCount = 0;
    for (const link of expiredLinks) {
      await ctx.db.patch(link._id, {
        isActive: false,
        updatedAt: now,
      });
      deactivatedCount++;
    }

    return {
      deactivatedCount,
      hasMore: expiredLinks.length === 100,
    };
  },
});

// Helper function to generate share code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
