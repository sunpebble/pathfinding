/**
 * Share Service - Convex Implementation
 * Handles share link management, event tracking, and statistics
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

// Types
export type SharePlatform =
  | 'wechat'
  | 'weibo'
  | 'xiaohongshu'
  | 'qq'
  | 'douyin'
  | 'copy_link'
  | 'system_share'
  | 'generic';

export type SharePermission = 'public' | 'unlisted' | 'private' | 'password';

export type ShareEventType = 'share' | 'click' | 'view' | 'save';

export type ResourceType = 'itinerary' | 'travelGuide' | 'travelNote';

export interface CreateShareLinkParams {
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  platform: SharePlatform;
  permission?: SharePermission;
  password?: string;
  expiresAt?: number;
  maxViews?: number;
  allowDownload?: boolean;
  allowCopy?: boolean;
}

export interface UpdateShareLinkParams {
  shareLinkId: string;
  ownerId: string;
  permission?: SharePermission;
  password?: string;
  expiresAt?: number;
  maxViews?: number;
  allowDownload?: boolean;
  allowCopy?: boolean;
  isActive?: boolean;
}

export interface TrackEventParams {
  shareCode?: string;
  shareLinkId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  platform?: SharePlatform;
  eventType: ShareEventType;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}

export const ShareService = {
  /**
   * Create a new share link with permissions
   */
  async createShareLink(params: CreateShareLinkParams) {
    const result = await convex.mutation(api.shareEvents.createShareLink, {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      ownerId: params.ownerId,
      platform: params.platform,
      permission: params.permission,
      password: params.password,
      expiresAt: params.expiresAt,
      maxViews: params.maxViews,
      allowDownload: params.allowDownload,
      allowCopy: params.allowCopy,
    });
    return result;
  },

  /**
   * Create a simple share event (without creating a managed link)
   */
  async createShareEvent(
    resourceId: string,
    platform: SharePlatform,
    sharerId?: string,
    resourceType?: ResourceType,
    shareUrl?: string
  ) {
    const result = await convex.mutation(api.shareEvents.create, {
      resourceType,
      resourceId,
      platform,
      sharerId,
      shareUrl,
    });
    return result;
  },

  /**
   * Track a share-related event (click, view, save)
   */
  async trackEvent(params: TrackEventParams) {
    const result = await convex.mutation(api.shareEvents.trackEvent, {
      shareCode: params.shareCode,
      shareLinkId: params.shareLinkId as Id<'shareLinks'> | undefined,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      platform: params.platform,
      eventType: params.eventType,
      referrer: params.referrer,
      userAgent: params.userAgent,
      ipHash: params.ipHash,
    });
    return result;
  },

  /**
   * Verify access to a share link
   */
  async verifyAccess(shareCode: string, password?: string) {
    const result = await convex.query(api.shareEvents.verifyAccess, {
      shareCode,
      password,
    });
    return result;
  },

  /**
   * Get share link by code
   */
  async getByCode(shareCode: string) {
    const result = await convex.query(api.shareEvents.getByCode, {
      shareCode,
    });
    return result;
  },

  /**
   * Get share statistics for a resource
   */
  async getStats(resourceType: ResourceType, resourceId: string) {
    const result = await convex.query(api.shareEvents.getStats, {
      resourceType,
      resourceId,
    });
    return result;
  },

  /**
   * Get share links for a resource (owner only)
   */
  async getShareLinks(
    resourceType: ResourceType,
    resourceId: string,
    ownerId: string
  ) {
    const result = await convex.query(api.shareEvents.getShareLinks, {
      resourceType,
      resourceId,
      ownerId,
    });
    return result;
  },

  /**
   * Get share history for a user
   */
  async getShareHistory(userId: string, limit?: number, cursor?: string) {
    const result = await convex.query(api.shareEvents.getShareHistory, {
      userId,
      limit,
      cursor,
    });
    return result;
  },

  /**
   * Update share link settings
   */
  async updateShareLink(params: UpdateShareLinkParams) {
    const result = await convex.mutation(api.shareEvents.updateShareLink, {
      shareLinkId: params.shareLinkId as Id<'shareLinks'>,
      ownerId: params.ownerId,
      permission: params.permission,
      password: params.password,
      expiresAt: params.expiresAt,
      maxViews: params.maxViews,
      allowDownload: params.allowDownload,
      allowCopy: params.allowCopy,
      isActive: params.isActive,
    });
    return result;
  },

  /**
   * Revoke (deactivate) a share link
   */
  async revokeShareLink(shareLinkId: string, ownerId: string) {
    const result = await convex.mutation(api.shareEvents.revokeShareLink, {
      shareLinkId: shareLinkId as Id<'shareLinks'>,
      ownerId,
    });
    return result;
  },

  /**
   * Delete a share link permanently
   */
  async deleteShareLink(shareLinkId: string, ownerId: string) {
    const result = await convex.mutation(api.shareEvents.deleteShareLink, {
      shareLinkId: shareLinkId as Id<'shareLinks'>,
      ownerId,
    });
    return result;
  },

  /**
   * Get top shared resources
   */
  async getTopShared(resourceType?: ResourceType, days?: number, limit?: number) {
    const result = await convex.query(api.shareEvents.getTopShared, {
      resourceType,
      days,
      limit,
    });
    return result;
  },

  /**
   * Clean up old share event logs
   */
  async cleanupOldLogs(olderThanDays?: number) {
    const result = await convex.mutation(api.shareEvents.cleanupOldLogs, {
      olderThanDays,
    });
    return result;
  },

  /**
   * Clean up expired share links
   */
  async cleanupExpiredLinks() {
    const result = await convex.mutation(api.shareEvents.cleanupExpiredLinks, {});
    return result;
  },
};
