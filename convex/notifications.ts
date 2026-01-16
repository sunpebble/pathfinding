'use node';

import type { ExpoPushMessage } from 'expo-server-sdk';
import { v } from 'convex/values';
import Expo from 'expo-server-sdk';
import { api, internal } from './_generated/api';
import { action, internalAction } from './_generated/server';

const expo = new Expo();

/**
 * 发送待处理的提醒 (由 cron 调用)
 */
export const sendPendingReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // 获取待发送的提醒
    const pendingReminders = await ctx.runQuery(
      api.reminders.getPendingReminders
    );

    if (pendingReminders.length === 0) {
      return { sent: 0 };
    }

    const messages: ExpoPushMessage[] = [];
    const reminderUserMap: Map<string, (typeof pendingReminders)[0]> =
      new Map();

    for (const reminder of pendingReminders) {
      // 获取用户的推送 token
      const user = await ctx.runQuery(api.users.getById, {
        id: reminder.userId,
      });
      if (!user?.expoPushToken) continue;

      // 验证 token 格式
      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.warn(`Invalid Expo push token for user ${reminder.userId}`);
        continue;
      }

      // 获取项目详情
      const item = await ctx.runQuery(api.itineraryItems.getById, {
        id: reminder.itemId,
      });
      if (!item) continue;

      const title = '行程提醒';
      const body = item.poi
        ? `${reminder.minutesBefore}分钟后: ${item.poi.name}`
        : `${reminder.minutesBefore}分钟后有行程安排`;

      messages.push({
        to: user.expoPushToken,
        sound: 'default',
        title,
        body,
        data: {
          type: 'reminder',
          reminderId: reminder._id,
          itemId: reminder.itemId,
        },
      });

      reminderUserMap.set(user.expoPushToken, reminder);
    }

    if (messages.length === 0) {
      return { sent: 0 };
    }

    // 批量发送推送
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const message = chunk[i];
          const reminder = reminderUserMap.get(message.to as string);

          if (ticket.status === 'ok' && reminder) {
            // 标记提醒已发送
            await ctx.runMutation(internal.reminders.markAsSent, {
              reminderId: reminder._id,
            });
            successCount++;
          } else if (ticket.status === 'error') {
            console.error(`Failed to send notification: ${ticket.message}`);
          }
        }
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    return { sent: successCount };
  },
});

/**
 * 发送单个推送通知
 */
export const sendPush = action({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { userId, title, body, data }) => {
    const user = await ctx.runQuery(api.users.getById, { id: userId });
    if (!user?.expoPushToken) {
      return { success: false, error: '用户未注册推送' };
    }

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      return { success: false, error: '无效的推送 token' };
    }

    try {
      const tickets = await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: 'default',
          title,
          body,
          data,
        },
      ]);

      const ticket = tickets[0];
      if (ticket.status === 'ok') {
        return { success: true };
      } else {
        return { success: false, error: ticket.message };
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: '发送失败' };
    }
  },
});
