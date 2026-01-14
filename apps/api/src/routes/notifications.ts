/**
 * Notification Routes - Push Notification API Endpoints
 * Handles notifications, push tokens, settings, and scheduled notifications
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  NotificationService,
  NotificationSettingsService,
  PushTokenService,
  ScheduledNotificationService,
} from '../services/notificationService';

interface Variables {
  userId?: string;
  accessToken?: string;
}

// ============================================
// Schema Definitions
// ============================================

const NotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
  type: z
    .enum([
      'comment',
      'reply',
      'like',
      'mention',
      'new_follower',
      'following_itinerary',
      'itinerary_reminder',
      'flight_status',
      'weather_alert',
      'social_interaction',
    ])
    .optional(),
});

const RegisterPushTokenSchema = z.object({
  token: z.string().min(10, 'Invalid push token'),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
});

const UpdateNotificationSettingsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
    .optional(),
  timezone: z.string().optional(),
  itineraryReminders: z
    .object({
      enabled: z.boolean(),
      advanceHours: z.number().int().min(1).max(168), // 1 hour to 7 days
    })
    .optional(),
  flightAlerts: z
    .object({
      enabled: z.boolean(),
      statusChanges: z.boolean(),
      checkInReminders: z.boolean(),
      boardingReminders: z.boolean(),
    })
    .optional(),
  weatherAlerts: z
    .object({
      enabled: z.boolean(),
      severeOnly: z.boolean(),
    })
    .optional(),
  socialNotifications: z
    .object({
      enabled: z.boolean(),
      comments: z.boolean(),
      likes: z.boolean(),
      follows: z.boolean(),
      mentions: z.boolean(),
    })
    .optional(),
});

const ScheduleNotificationSchema = z.object({
  type: z.enum([
    'itinerary_reminder',
    'flight_checkin',
    'flight_boarding',
    'weather_check',
    'custom',
  ]),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  scheduledFor: z.number().int().positive(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

// ============================================
// Notification Routes
// ============================================

export const pushNotificationRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /notifications - List notifications for current user
 */
pushNotificationRoutes.get(
  '/',
  zValidator('query', NotificationListQuerySchema),
  async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const result = await NotificationService.list(userId, query);

    return c.json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        totalCount: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasMore: result.hasMore,
      },
    });
  }
);

/**
 * GET /notifications/unread-count - Get unread notification count
 */
pushNotificationRoutes.get('/unread-count', async (c) => {
  const userId = c.get('userId')!;

  const count = await NotificationService.getUnreadCount(userId);

  return c.json({
    success: true,
    data: { count },
  });
});

/**
 * GET /notifications/:notificationId - Get a single notification
 */
pushNotificationRoutes.get('/:notificationId', async (c) => {
  const notificationId = c.req.param('notificationId');

  const notification = await NotificationService.getById(notificationId);

  return c.json({
    success: true,
    data: notification,
  });
});

/**
 * POST /notifications/:notificationId/read - Mark notification as read
 */
pushNotificationRoutes.post('/:notificationId/read', async (c) => {
  const userId = c.get('userId')!;
  const notificationId = c.req.param('notificationId');

  await NotificationService.markRead(notificationId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /notifications/read-all - Mark all notifications as read
 */
pushNotificationRoutes.post('/read-all', async (c) => {
  const userId = c.get('userId')!;

  const result = await NotificationService.markAllRead(userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * DELETE /notifications/:notificationId - Delete a notification
 */
pushNotificationRoutes.delete('/:notificationId', async (c) => {
  const userId = c.get('userId')!;
  const notificationId = c.req.param('notificationId');

  await NotificationService.delete(notificationId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * DELETE /notifications - Delete all notifications
 */
pushNotificationRoutes.delete('/', async (c) => {
  const userId = c.get('userId')!;

  const result = await NotificationService.deleteAll(userId);

  return c.json({
    success: true,
    data: result,
  });
});

// ============================================
// Push Token Routes
// ============================================

/**
 * POST /notifications/push-tokens - Register a push token
 */
pushNotificationRoutes.post(
  '/push-tokens',
  zValidator('json', RegisterPushTokenSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');

    const tokenId = await PushTokenService.register(userId, input);

    return c.json(
      {
        success: true,
        data: { id: tokenId },
      },
      201
    );
  }
);

/**
 * GET /notifications/push-tokens - Get active push tokens
 */
pushNotificationRoutes.get('/push-tokens', async (c) => {
  const userId = c.get('userId')!;

  const tokens = await PushTokenService.getActiveTokens(userId);

  return c.json({
    success: true,
    data: tokens,
  });
});

/**
 * DELETE /notifications/push-tokens/:token - Deactivate a push token
 */
pushNotificationRoutes.delete('/push-tokens/:token', async (c) => {
  const token = c.req.param('token');

  await PushTokenService.deactivate(token);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * DELETE /notifications/push-tokens - Deactivate all push tokens (logout)
 */
pushNotificationRoutes.delete('/push-tokens/all', async (c) => {
  const userId = c.get('userId')!;

  const result = await PushTokenService.deactivateAllForUser(userId);

  return c.json({
    success: true,
    data: result,
  });
});

// ============================================
// Notification Settings Routes
// ============================================

/**
 * GET /notifications/settings - Get notification settings
 */
pushNotificationRoutes.get('/settings', async (c) => {
  const userId = c.get('userId')!;

  const settings = await NotificationSettingsService.get(userId);

  return c.json({
    success: true,
    data: settings,
  });
});

/**
 * PUT /notifications/settings - Update notification settings
 */
pushNotificationRoutes.put(
  '/settings',
  zValidator('json', UpdateNotificationSettingsSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const settings = c.req.valid('json');

    await NotificationSettingsService.update(userId, settings);
    const updatedSettings = await NotificationSettingsService.get(userId);

    return c.json({
      success: true,
      data: updatedSettings,
    });
  }
);

/**
 * PATCH /notifications/settings - Partially update notification settings
 */
pushNotificationRoutes.patch(
  '/settings',
  zValidator('json', UpdateNotificationSettingsSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const settings = c.req.valid('json');

    await NotificationSettingsService.update(userId, settings);
    const updatedSettings = await NotificationSettingsService.get(userId);

    return c.json({
      success: true,
      data: updatedSettings,
    });
  }
);

// ============================================
// Scheduled Notification Routes
// ============================================

/**
 * GET /notifications/scheduled - Get scheduled notifications
 */
pushNotificationRoutes.get('/scheduled', async (c) => {
  const userId = c.get('userId')!;

  const scheduled = await ScheduledNotificationService.listByUser(userId);

  return c.json({
    success: true,
    data: scheduled,
  });
});

/**
 * POST /notifications/scheduled - Schedule a notification
 */
pushNotificationRoutes.post(
  '/scheduled',
  zValidator('json', ScheduleNotificationSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');

    const scheduledId = await ScheduledNotificationService.schedule(
      userId,
      input
    );

    return c.json(
      {
        success: true,
        data: { id: scheduledId },
      },
      201
    );
  }
);

/**
 * DELETE /notifications/scheduled/:scheduledId - Cancel a scheduled notification
 */
pushNotificationRoutes.delete('/scheduled/:scheduledId', async (c) => {
  const userId = c.get('userId')!;
  const scheduledId = c.req.param('scheduledId');

  await ScheduledNotificationService.cancel(scheduledId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * DELETE /notifications/scheduled/by-reference - Cancel by reference
 */
pushNotificationRoutes.delete('/scheduled/by-reference', async (c) => {
  const userId = c.get('userId')!;
  const referenceType = c.req.query('referenceType');
  const referenceId = c.req.query('referenceId');

  if (!referenceType || !referenceId) {
    return c.json(
      {
        success: false,
        error: 'referenceType and referenceId are required',
      },
      400
    );
  }

  const result = await ScheduledNotificationService.cancelByReference(
    userId,
    referenceType,
    referenceId
  );

  return c.json({
    success: true,
    data: result,
  });
});
