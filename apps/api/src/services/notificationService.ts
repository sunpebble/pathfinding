/**
 * Notification Service - Complete Push Notification Management
 * Handles notifications, push tokens, settings, and APNs integration
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

// ============================================
// Types
// ============================================

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'like'
  | 'mention'
  | 'new_follower'
  | 'following_itinerary'
  | 'itinerary_reminder'
  | 'flight_status'
  | 'weather_alert'
  | 'social_interaction';

export type ReferenceType =
  | 'itinerary'
  | 'comment'
  | 'user'
  | 'flight'
  | 'weather';

export type Priority = 'low' | 'normal' | 'high';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  referenceType: ReferenceType;
  referenceId: string;
  actorId?: string;
  message: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  priority?: Priority;
}

export interface RegisterPushTokenInput {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
}

export interface NotificationSettingsInput {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  itineraryReminders?: {
    enabled: boolean;
    advanceHours: number;
  };
  flightAlerts?: {
    enabled: boolean;
    statusChanges: boolean;
    checkInReminders: boolean;
    boardingReminders: boolean;
  };
  weatherAlerts?: {
    enabled: boolean;
    severeOnly: boolean;
  };
  socialNotifications?: {
    enabled: boolean;
    comments: boolean;
    likes: boolean;
    follows: boolean;
    mentions: boolean;
  };
}

export interface ScheduleNotificationInput {
  type:
    | 'itinerary_reminder'
    | 'flight_checkin'
    | 'flight_boarding'
    | 'weather_check'
    | 'custom';
  referenceType?: string;
  referenceId?: string;
  scheduledFor: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ListNotificationsQuery {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

// ============================================
// Notification Service
// ============================================

export const NotificationService = {
  /**
   * List notifications for a user with pagination
   */
  async list(userId: string, query: ListNotificationsQuery) {
    const result = await convex.query(api.notifications.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      unreadOnly: query.unreadOnly,
      type: query.type,
    });

    return result;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    const result = await convex.query(api.notifications.getUnreadCount, {
      userId,
    });
    return result.count;
  },

  /**
   * Get a single notification
   */
  async getById(notificationId: string) {
    const notification = await convex.query(api.notifications.getById, {
      id: notificationId as Id<'notifications'>,
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  },

  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput) {
    const notificationId = await convex.mutation(api.notifications.create, {
      userId: input.userId,
      type: input.type,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      actorId: input.actorId,
      message: input.message,
      title: input.title,
      body: input.body,
      data: input.data,
      priority: input.priority,
    });

    return notificationId;
  },

  /**
   * Mark a notification as read
   */
  async markRead(notificationId: string, userId: string) {
    await convex.mutation(api.notifications.markRead, {
      id: notificationId as Id<'notifications'>,
      userId,
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId: string) {
    const result = await convex.mutation(api.notifications.markAllRead, {
      userId,
    });
    return result;
  },

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string) {
    await convex.mutation(api.notifications.remove, {
      id: notificationId as Id<'notifications'>,
      userId,
    });
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string) {
    const result = await convex.mutation(api.notifications.deleteAll, {
      userId,
    });
    return result;
  },
};

// ============================================
// Push Token Service
// ============================================

export const PushTokenService = {
  /**
   * Register or update a push token
   */
  async register(userId: string, input: RegisterPushTokenInput) {
    if (!input.token || input.token.length < 10) {
      throw new ValidationError('Invalid push token');
    }

    const tokenId = await convex.mutation(api.notifications.registerPushToken, {
      userId,
      token: input.token,
      platform: input.platform,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      appVersion: input.appVersion,
      osVersion: input.osVersion,
    });

    return tokenId;
  },

  /**
   * Get active push tokens for a user
   */
  async getActiveTokens(userId: string) {
    return await convex.query(api.notifications.getActiveTokens, { userId });
  },

  /**
   * Deactivate a push token
   */
  async deactivate(token: string) {
    await convex.mutation(api.notifications.deactivateToken, { token });
  },

  /**
   * Deactivate all tokens for a user (on logout)
   */
  async deactivateAllForUser(userId: string) {
    const result = await convex.mutation(
      api.notifications.deactivateAllUserTokens,
      { userId }
    );
    return result;
  },
};

// ============================================
// Notification Settings Service
// ============================================

export const NotificationSettingsService = {
  /**
   * Get notification settings for a user
   */
  async get(userId: string) {
    return await convex.query(api.notifications.getSettings, { userId });
  },

  /**
   * Update notification settings
   */
  async update(userId: string, settings: NotificationSettingsInput) {
    const settingsId = await convex.mutation(api.notifications.updateSettings, {
      userId,
      ...settings,
    });

    return settingsId;
  },
};

// ============================================
// Scheduled Notification Service
// ============================================

export const ScheduledNotificationService = {
  /**
   * Schedule a notification
   */
  async schedule(userId: string, input: ScheduleNotificationInput) {
    if (input.scheduledFor <= Date.now()) {
      throw new ValidationError(
        'Scheduled time must be in the future'
      );
    }

    const scheduledId = await convex.mutation(
      api.notifications.createScheduled,
      {
        userId,
        type: input.type,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        scheduledFor: input.scheduledFor,
        title: input.title,
        body: input.body,
        data: input.data,
      }
    );

    return scheduledId;
  },

  /**
   * Get scheduled notifications for a user
   */
  async listByUser(userId: string) {
    return await convex.query(api.notifications.getScheduledByUser, { userId });
  },

  /**
   * Cancel a scheduled notification
   */
  async cancel(scheduledId: string, userId: string) {
    await convex.mutation(api.notifications.cancelScheduled, {
      id: scheduledId as Id<'scheduledNotifications'>,
      userId,
    });
  },

  /**
   * Cancel scheduled notifications by reference
   */
  async cancelByReference(
    userId: string,
    referenceType: string,
    referenceId: string
  ) {
    const result = await convex.mutation(
      api.notifications.cancelScheduledByReference,
      {
        userId,
        referenceType,
        referenceId,
      }
    );
    return result;
  },
};

// ============================================
// Push Notification Helpers
// ============================================

/**
 * Helper to create itinerary reminder notifications
 */
export async function createItineraryReminder(
  userId: string,
  itineraryId: string,
  itineraryTitle: string,
  startDate: string,
  advanceHours: number
) {
  const startTime = new Date(startDate).getTime();
  const reminderTime = startTime - advanceHours * 60 * 60 * 1000;

  // Only schedule if reminder time is in the future
  if (reminderTime > Date.now()) {
    await ScheduledNotificationService.schedule(userId, {
      type: 'itinerary_reminder',
      referenceType: 'itinerary',
      referenceId: itineraryId,
      scheduledFor: reminderTime,
      title: '行程提醒',
      body: `您的行程「${itineraryTitle}」即将开始`,
      data: {
        itineraryId,
        action: 'open_itinerary',
      },
    });
  }
}

/**
 * Helper to create flight status notifications
 */
export async function createFlightStatusNotification(
  userId: string,
  flightId: string,
  flightNumber: string,
  status: string,
  message: string
) {
  await NotificationService.create({
    userId,
    type: 'flight_status',
    referenceType: 'flight',
    referenceId: flightId,
    message,
    title: `航班 ${flightNumber} ${status}`,
    body: message,
    data: {
      flightId,
      flightNumber,
      status,
      action: 'open_flight',
    },
    priority: status === 'cancelled' || status === 'delayed' ? 'high' : 'normal',
  });
}

/**
 * Helper to create weather alert notifications
 */
export async function createWeatherAlertNotification(
  userId: string,
  destination: string,
  alertType: string,
  message: string,
  severity: 'low' | 'medium' | 'high'
) {
  await NotificationService.create({
    userId,
    type: 'weather_alert',
    referenceType: 'weather',
    referenceId: destination,
    message,
    title: `${destination} 天气预警`,
    body: message,
    data: {
      destination,
      alertType,
      severity,
      action: 'open_weather',
    },
    priority: severity === 'high' ? 'high' : 'normal',
  });
}

/**
 * Helper to create social interaction notifications
 */
export async function createSocialNotification(
  userId: string,
  actorId: string,
  actorName: string,
  type: 'comment' | 'reply' | 'like' | 'follow' | 'mention',
  referenceType: ReferenceType,
  referenceId: string,
  content?: string
) {
  const messages: Record<string, string> = {
    comment: `${actorName} 评论了您的内容`,
    reply: `${actorName} 回复了您的评论`,
    like: `${actorName} 点赞了您的内容`,
    follow: `${actorName} 关注了您`,
    mention: `${actorName} 提到了您`,
  };

  const notificationType = type === 'follow' ? 'new_follower' : type;

  await NotificationService.create({
    userId,
    type: notificationType as NotificationType,
    referenceType,
    referenceId,
    actorId,
    message: messages[type],
    title: messages[type],
    body: content ? content.substring(0, 100) : undefined,
    data: {
      actorId,
      actorName,
      type,
      referenceType,
      referenceId,
    },
    priority: 'normal',
  });
}
