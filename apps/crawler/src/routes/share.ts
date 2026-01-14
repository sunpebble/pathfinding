/**
 * Share API Routes
 * Endpoints for generating share cards and tracking shares
 */

import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
import { Errors } from '../middleware/error-handler.js';
import {
  getShareCardService,
  type ShareCardData,
  type SharePlatform,
} from '../services/share-card.service.js';

export const shareRouter = new Hono();

const shareCardService = getShareCardService();

/**
 * POST /api/share/card
 * Generate a share card for a guide or itinerary
 */
shareRouter.post('/card', async (c: Context) => {
  const body = await c.req.json();

  const {
    guide_id,
    platform = 'generic',
    template,
    custom_text,
  } = body as {
    guide_id: string;
    platform?: SharePlatform;
    template?: 'simple' | 'elegant' | 'vibrant' | 'minimal';
    custom_text?: string;
  };

  if (!guide_id) {
    throw Errors.badRequest('guide_id is required');
  }

  // Fetch guide data
  const guide = await convex.query(api.travelGuides.getById, {
    id: guide_id as Id<'travelGuides'>,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  // Build share card data
  const shareData: ShareCardData = {
    id: guide._id,
    title: guide.title || '精彩旅行攻略',
    duration: guide.aiDuration,
    destinations: guide.destinations || [],
    coverImageUrl: guide.coverImageUrl,
    authorName: guide.authorName,
    summary: custom_text || guide.aiSummary,
    poiCount: guide.aiDays?.reduce((acc, day) => acc + day.pois.length, 0),
    dayCount: guide.aiDays?.length,
    viewsCount: guide.viewsCount,
    likesCount: guide.likesCount,
    bestTime: guide.aiBestTime,
    budget: guide.aiBudget,
    shareUrl: `${process.env.APP_URL || 'https://pathfinding.app'}/guide/${guide._id}`,
  };

  // Generate share card
  const result = await shareCardService.generateShareCard(shareData, platform, {
    template,
  });

  // Generate share text
  const shareText = shareCardService.generateShareText({
    platform,
    title: shareData.title,
    destinations: shareData.destinations,
    duration: shareData.duration,
    summary: shareData.summary,
    shareUrl: shareData.shareUrl,
    hashtags: guide.tags?.slice(0, 5),
  });

  return c.json({
    success: true,
    data: {
      card: {
        image_data: result.imageData,
        format: result.format,
        width: result.width,
        height: result.height,
        file_size: result.fileSize,
      },
      share_text: shareText,
      share_url: shareData.shareUrl,
    },
  });
});

/**
 * POST /api/share/link
 * Generate a trackable share link
 */
shareRouter.post('/link', async (c: Context) => {
  const body = await c.req.json();

  const {
    guide_id,
    platform = 'generic',
    user_id,
  } = body as {
    guide_id: string;
    platform?: SharePlatform;
    user_id?: string;
  };

  if (!guide_id) {
    throw Errors.badRequest('guide_id is required');
  }

  // Verify guide exists
  const guide = await convex.query(api.travelGuides.getById, {
    id: guide_id as Id<'travelGuides'>,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  const baseUrl = process.env.APP_URL || 'https://pathfinding.app';
  const shareUrl = shareCardService.generateShareLink(baseUrl, guide_id, platform, user_id);

  // Record share event
  try {
    await convex.mutation(api.shareEvents.create, {
      guideId: guide_id as Id<'travelGuides'>,
      platform,
      sharerId: user_id,
      shareUrl,
    });
  } catch (error) {
    // Don't fail if share tracking fails
    console.error('Failed to record share event:', error);
  }

  return c.json({
    success: true,
    data: {
      share_url: shareUrl,
      guide_id,
      platform,
    },
  });
});

/**
 * POST /api/share/track
 * Track a share click/view event
 */
shareRouter.post('/track', async (c: Context) => {
  const body = await c.req.json();

  const {
    guide_id,
    platform,
    event_type,
    referrer,
  } = body as {
    guide_id: string;
    platform: SharePlatform;
    event_type: 'click' | 'view' | 'save';
    referrer?: string;
  };

  if (!guide_id || !platform || !event_type) {
    throw Errors.badRequest('guide_id, platform, and event_type are required');
  }

  // Record the tracking event
  try {
    await convex.mutation(api.shareEvents.trackEvent, {
      guideId: guide_id as Id<'travelGuides'>,
      platform,
      eventType: event_type,
      referrer,
    });
  } catch (error) {
    console.error('Failed to track share event:', error);
    // Continue even if tracking fails
  }

  return c.json({
    success: true,
  });
});

/**
 * GET /api/share/stats/:guideId
 * Get share statistics for a guide
 */
shareRouter.get('/stats/:guideId', async (c: Context) => {
  const guideId = c.req.param('guideId');

  if (!guideId) {
    throw Errors.badRequest('guideId is required');
  }

  // Fetch share statistics
  const stats = await convex.query(api.shareEvents.getStats, {
    guideId: guideId as Id<'travelGuides'>,
  });

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/share/platforms
 * Get available share platforms and their configurations
 */
shareRouter.get('/platforms', async (c: Context) => {
  const platforms: Array<{
    id: SharePlatform;
    name: string;
    name_zh: string;
    icon: string;
    supported: boolean;
    card_dimensions: { width: number; height: number };
  }> = [
    {
      id: 'wechat',
      name: 'WeChat',
      name_zh: '微信',
      icon: 'wechat',
      supported: true,
      card_dimensions: { width: 750, height: 1334 },
    },
    {
      id: 'weibo',
      name: 'Weibo',
      name_zh: '微博',
      icon: 'weibo',
      supported: true,
      card_dimensions: { width: 1080, height: 1920 },
    },
    {
      id: 'xiaohongshu',
      name: 'Xiaohongshu',
      name_zh: '小红书',
      icon: 'xiaohongshu',
      supported: true,
      card_dimensions: { width: 1080, height: 1440 },
    },
    {
      id: 'generic',
      name: 'Generic',
      name_zh: '通用',
      icon: 'share',
      supported: true,
      card_dimensions: { width: 1200, height: 630 },
    },
  ];

  return c.json({
    success: true,
    data: platforms,
  });
});

/**
 * POST /api/share/preview
 * Generate a preview of the share card without tracking
 */
shareRouter.post('/preview', async (c: Context) => {
  const body = await c.req.json();

  const {
    title,
    destinations = [],
    duration,
    summary,
    platform = 'generic',
    template,
  } = body as {
    title: string;
    destinations?: string[];
    duration?: string;
    summary?: string;
    platform?: SharePlatform;
    template?: 'simple' | 'elegant' | 'vibrant' | 'minimal';
  };

  if (!title) {
    throw Errors.badRequest('title is required');
  }

  const shareData: ShareCardData = {
    id: 'preview',
    title,
    destinations,
    duration,
    summary,
    shareUrl: 'https://pathfinding.app/preview',
  };

  const result = await shareCardService.generateShareCard(shareData, platform, {
    template,
  });

  return c.json({
    success: true,
    data: {
      image_data: result.imageData,
      format: result.format,
      width: result.width,
      height: result.height,
    },
  });
});
