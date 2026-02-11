import type { Doc } from './_generated/dataModel';
import { ConvexError, v } from 'convex/values';
import {
  notificationDataValidator,
  scheduledNotificationDataValidator,
} from '../packages/convex-client/src/validators/index.js';
import { internalMutation, mutation, query } from './_generated/server';

/**
 * Notifications - Push Notification Management
 * Handles notifications, push tokens, settings, and scheduled notifications
 */

// Notification type validator
const notificationTypeValidator = v.union(
  v.literal('comment'),
  v.literal('reply'),
  v.literal('like'),
  v.literal('mention'),
  v.literal('new_follower'),
  v.literal('following_itinerary'),
  v.literal('itinerary_reminder'),
  v.literal('flight_status'),
  v.literal('weather_alert'),
  v.literal('social_interaction'),
);

const referenceTypeValidator = v.union(
  v.literal('itinerary'),
  v.literal('comment'),
  v.literal('user'),
  v.literal('flight'),
  v.literal('weather'),
);

const priorityValidator = v.union(
  v.literal('low'),
  v.literal('normal'),
  v.literal('high'),
);

// ============================================
// Notification Queries
// ============================================

/**
 * List notifications for a user with pagination
 */
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
    type: v.optional(notificationTypeValidator),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let notifications;

    if (args.unreadOnly) {
      notifications = await ctx.db
        .query('notifications')
        .withIndex('by_user_read', q =>
          q.eq('userId', args.userId).eq('isRead', false))
        .order('desc')
        .collect();
    }
    else {
      notifications = await ctx.db
        .query('notifications')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .order('desc')
        .collect();
    }

    // Filter by type if provided
    if (args.type) {
      notifications = notifications.filter(n => n.type === args.type);
    }

    const total = notifications.length;
    const data = notifications.slice(offset, offset + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total,
    };
  },
});

/**
 * Get unread notification count for a user
 */
export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', q =>
        q.eq('userId', args.userId).eq('isRead', false))
      .collect();

    return { count: unread.length };
  },
});

/**
 * Get a single notification by ID
 */
export const getById = query({
  args: { id: v.id('notifications') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================
// Notification Mutations
// ============================================

/**
 * Create a new notification
 */
export const create = mutation({
  args: {
    userId: v.string(),
    type: notificationTypeValidator,
    referenceType: referenceTypeValidator,
    referenceId: v.string(),
    actorId: v.optional(v.string()),
    message: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    data: v.optional(notificationDataValidator),
    priority: v.optional(priorityValidator),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert('notifications', {
      userId: args.userId,
      type: args.type,
      referenceType: args.referenceType,
      referenceId: args.referenceId,
      actorId: args.actorId,
      message: args.message,
      title: args.title,
      body: args.body,
      data: args.data,
      priority: args.priority ?? 'normal',
      isRead: false,
      isPushSent: false,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * Mark a notification as read
 */
export const markRead = mutation({
  args: {
    id: v.id('notifications'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new ConvexError('Notification not found');
    }
    if (notification.userId !== args.userId) {
      throw new ConvexError('Access denied');
    }

    await ctx.db.patch(args.id, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', q =>
        q.eq('userId', args.userId).eq('isRead', false))
      .collect();

    const now = Date.now();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return { markedCount: unread.length };
  },
});

/**
 * Mark notification as push sent
 */
export const markPushSent = mutation({
  args: {
    id: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isPushSent: true,
      pushSentAt: Date.now(),
    });
  },
});

/**
 * Delete a notification
 */
export const remove = mutation({
  args: {
    id: v.id('notifications'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new ConvexError('Notification not found');
    }
    if (notification.userId !== args.userId) {
      throw new ConvexError('Access denied');
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Delete all notifications for a user
 */
export const deleteAll = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return { deletedCount: notifications.length };
  },
});

// ============================================
// Push Token Queries
// ============================================

/**
 * Get active push tokens for a user
 */
export const getActiveTokens = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query('pushTokens')
      .withIndex('by_user_active', q =>
        q.eq('userId', args.userId).eq('isActive', true))
      .collect();

    return tokens;
  },
});

/**
 * Get token by device token string
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pushTokens')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();
  },
});

// ============================================
// Push Token Mutations
// ============================================

/**
 * Register or update a push token
 */
export const registerPushToken = mutation({
  args: {
    userId: v.string(),
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
    deviceId: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    osVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if token already exists
    const existingToken = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (existingToken) {
      // Update existing token
      await ctx.db.patch(existingToken._id, {
        userId: args.userId,
        isActive: true,
        lastUsedAt: now,
        updatedAt: now,
        deviceName: args.deviceName ?? existingToken.deviceName,
        appVersion: args.appVersion ?? existingToken.appVersion,
        osVersion: args.osVersion ?? existingToken.osVersion,
      });
      return existingToken._id;
    }

    // Create new token
    return await ctx.db.insert('pushTokens', {
      userId: args.userId,
      token: args.token,
      platform: args.platform,
      deviceId: args.deviceId,
      deviceName: args.deviceName,
      appVersion: args.appVersion,
      osVersion: args.osVersion,
      isActive: true,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Deactivate a push token
 */
export const deactivateToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const existingToken = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first();

    if (existingToken) {
      await ctx.db.patch(existingToken._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Deactivate all tokens for a user (on logout)
 */
export const deactivateAllUserTokens = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query('pushTokens')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    const now = Date.now();
    for (const token of tokens) {
      await ctx.db.patch(token._id, {
        isActive: false,
        updatedAt: now,
      });
    }

    return { deactivatedCount: tokens.length };
  },
});

// ============================================
// Notification Settings Queries
// ============================================

/**
 * Get notification settings for a user
 */
export const getSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query('notificationSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return {
        userId: args.userId,
        pushEnabled: true,
        emailEnabled: false,
        inAppEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'Asia/Shanghai',
        itineraryReminders: {
          enabled: true,
          advanceHours: 24,
        },
        flightAlerts: {
          enabled: true,
          statusChanges: true,
          checkInReminders: true,
          boardingReminders: true,
        },
        weatherAlerts: {
          enabled: true,
          severeOnly: false,
        },
        socialNotifications: {
          enabled: true,
          comments: true,
          likes: true,
          follows: true,
          mentions: true,
        },
        isDefault: true,
      };
    }

    return settings;
  },
});

// ============================================
// Notification Settings Mutations
// ============================================

/**
 * Update notification settings
 */
export const updateSettings = mutation({
  args: {
    userId: v.string(),
    pushEnabled: v.optional(v.boolean()),
    emailEnabled: v.optional(v.boolean()),
    inAppEnabled: v.optional(v.boolean()),
    quietHoursEnabled: v.optional(v.boolean()),
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
    timezone: v.optional(v.string()),
    itineraryReminders: v.optional(
      v.object({
        enabled: v.boolean(),
        advanceHours: v.number(),
      }),
    ),
    flightAlerts: v.optional(
      v.object({
        enabled: v.boolean(),
        statusChanges: v.boolean(),
        checkInReminders: v.boolean(),
        boardingReminders: v.boolean(),
      }),
    ),
    weatherAlerts: v.optional(
      v.object({
        enabled: v.boolean(),
        severeOnly: v.boolean(),
      }),
    ),
    socialNotifications: v.optional(
      v.object({
        enabled: v.boolean(),
        comments: v.boolean(),
        likes: v.boolean(),
        follows: v.boolean(),
        mentions: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { userId, ...updates } = args;

    // Check if settings exist
    const existing = await ctx.db
      .query('notificationSettings')
      .withIndex('by_user', q => q.eq('userId', userId))
      .first();

    if (existing) {
      // Update existing settings
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined),
      );

      await ctx.db.patch(existing._id, {
        ...filteredUpdates,
        updatedAt: now,
      });

      return existing._id;
    }

    // Create new settings with defaults
    return await ctx.db.insert('notificationSettings', {
      userId,
      pushEnabled: updates.pushEnabled ?? true,
      emailEnabled: updates.emailEnabled ?? false,
      inAppEnabled: updates.inAppEnabled ?? true,
      quietHoursEnabled: updates.quietHoursEnabled ?? false,
      quietHoursStart: updates.quietHoursStart ?? '22:00',
      quietHoursEnd: updates.quietHoursEnd ?? '08:00',
      timezone: updates.timezone ?? 'Asia/Shanghai',
      itineraryReminders: updates.itineraryReminders ?? {
        enabled: true,
        advanceHours: 24,
      },
      flightAlerts: updates.flightAlerts ?? {
        enabled: true,
        statusChanges: true,
        checkInReminders: true,
        boardingReminders: true,
      },
      weatherAlerts: updates.weatherAlerts ?? {
        enabled: true,
        severeOnly: false,
      },
      socialNotifications: updates.socialNotifications ?? {
        enabled: true,
        comments: true,
        likes: true,
        follows: true,
        mentions: true,
      },
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================
// Scheduled Notification Queries
// ============================================

/**
 * Get pending scheduled notifications
 */
export const getPendingScheduled = query({
  args: {
    beforeTime: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const scheduled = await ctx.db
      .query('scheduledNotifications')
      .withIndex('by_status_scheduled', q =>
        q.eq('status', 'pending').lte('scheduledFor', args.beforeTime))
      .take(limit);

    return scheduled;
  },
});

/**
 * Get scheduled notifications for a user
 */
export const getScheduledByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('scheduledNotifications')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();
  },
});

// ============================================
// Scheduled Notification Mutations
// ============================================

/**
 * Create a scheduled notification
 */
export const createScheduled = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal('itinerary_reminder'),
      v.literal('flight_checkin'),
      v.literal('flight_boarding'),
      v.literal('weather_check'),
      v.literal('custom'),
    ),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    scheduledFor: v.number(),
    title: v.string(),
    body: v.string(),
    data: v.optional(scheduledNotificationDataValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('scheduledNotifications', {
      userId: args.userId,
      type: args.type,
      referenceType: args.referenceType,
      referenceId: args.referenceId,
      scheduledFor: args.scheduledFor,
      title: args.title,
      body: args.body,
      data: args.data,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Mark scheduled notification as sent
 */
export const markScheduledSent = mutation({
  args: { id: v.id('scheduledNotifications') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'sent',
      sentAt: Date.now(),
    });
  },
});

/**
 * Mark scheduled notification as failed
 */
export const markScheduledFailed = mutation({
  args: {
    id: v.id('scheduledNotifications'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const scheduled = await ctx.db.get(args.id);
    if (!scheduled)
      return;

    await ctx.db.patch(args.id, {
      status: 'failed',
      errorMessage: args.errorMessage,
      retryCount: (scheduled.retryCount ?? 0) + 1,
    });
  },
});

/**
 * Cancel a scheduled notification
 */
export const cancelScheduled = mutation({
  args: {
    id: v.id('scheduledNotifications'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const scheduled = await ctx.db.get(args.id);
    if (!scheduled) {
      throw new ConvexError('Scheduled notification not found');
    }
    if (scheduled.userId !== args.userId) {
      throw new ConvexError('Access denied');
    }

    await ctx.db.patch(args.id, {
      status: 'cancelled',
    });

    return { success: true };
  },
});

/**
 * Cancel scheduled notifications by reference
 */
export const cancelScheduledByReference = mutation({
  args: {
    userId: v.string(),
    referenceType: v.string(),
    referenceId: v.string(),
  },
  handler: async (ctx, args) => {
    const scheduled = await ctx.db
      .query('scheduledNotifications')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    let cancelledCount = 0;
    for (const notification of scheduled) {
      if (
        notification.referenceType === args.referenceType
        && notification.referenceId === args.referenceId
        && notification.status === 'pending'
      ) {
        await ctx.db.patch(notification._id, {
          status: 'cancelled',
        });
        cancelledCount++;
      }
    }

    return { cancelledCount };
  },
});

/**
 * Send pending reminders (called by cron job)
 * Checks for scheduled notifications that are due and sends them
 */
import type { RegisteredMutation } from 'convex/server';

export const sendPendingReminders: RegisteredMutation<'internal', Record<string, never>, Promise<{ sentCount: number; total: number }>> = internalMutation({
  handler: async (ctx): Promise<{ sentCount: number; total: number }> => {
    const now = Date.now();

    // Find all pending scheduled notifications that are due
    const pendingNotifications = await ctx.db
      .query('scheduledNotifications')
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'pending'),
          q.lte(q.field('scheduledFor'), now),
        ),
      )
      .collect();

    let sentCount = 0;

    for (const scheduled of pendingNotifications) {
      try {
        // Create the actual notification
        await ctx.db.insert('notifications', {
          userId: scheduled.userId,
          type: scheduled.type as Doc<'notifications'>['type'],
          title: scheduled.title,
          body: scheduled.body,
          referenceType: (scheduled.referenceType
            ?? 'itinerary') as Doc<'notifications'>['referenceType'],
          referenceId: scheduled.referenceId ?? '',
          message: scheduled.body,
          isRead: false,
          priority: (scheduled.priority ?? 'normal') as
          | 'low'
          | 'normal'
          | 'high',
          createdAt: now,
        });

        // Mark scheduled notification as sent
        await ctx.db.patch(scheduled._id, {
          status: 'sent',
          sentAt: now,
        });

        sentCount++;
      }
      catch (error) {
        // Mark as failed
        await ctx.db.patch(scheduled._id, {
          status: 'failed',
        });

        console.error('Failed to send notification:', error);
      }
    }

    return { sentCount, total: pendingNotifications.length };
  },
});

/**
 * Clean up old read notifications (internal, called by cron)
 * Deletes read notifications older than 30 days
 */
export const cleanupOldNotifications: RegisteredMutation<'internal', Record<string, never>, Promise<{ deletedCount: number }>> = internalMutation({
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Find old read notifications
    const oldNotifications = await ctx.db
      .query('notifications')
      .filter(q =>
        q.and(
          q.eq(q.field('isRead'), true),
          q.lt(q.field('createdAt'), thirtyDaysAgo),
        ),
      )
      .collect();

    // Delete them
    let deletedCount = 0;
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});
