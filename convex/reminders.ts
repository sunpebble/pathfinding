import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

/**
 * 列出用户的提醒
 */
export const listByUser = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    // 获取关联的项目和 POI 信息
    const remindersWithDetails = await Promise.all(
      reminders.map(async (reminder) => {
        const item = await ctx.db.get(reminder.itemId);
        if (!item) return null;

        const day = await ctx.db.get(item.dayId);
        if (!day) return null;

        const itinerary = await ctx.db.get(day.itineraryId);
        const poi = item.poiId ? await ctx.db.get(item.poiId) : null;

        return {
          ...reminder,
          id: reminder._id,
          item: {
            id: item._id,
            startTime: item.startTime,
            endTime: item.endTime,
            notes: item.notes,
          },
          day: {
            id: day._id,
            date: day.date,
            dayNumber: day.dayNumber,
          },
          itinerary: itinerary
            ? {
                id: itinerary._id,
                title: itinerary.title,
              }
            : null,
          poi: poi
            ? {
                id: poi._id,
                name: poi.name,
              }
            : null,
        };
      })
    );

    // 过滤掉无效的提醒并按时间排序
    return remindersWithDetails
      .filter(Boolean)
      .sort((a, b) => a!.scheduledAt - b!.scheduledAt);
  },
});

/**
 * 创建提醒
 */
export const create = mutation({
  args: {
    itemId: v.id('itineraryItems'),
    userId: v.id('users'),
    minutesBefore: v.number(),
  },
  handler: async (ctx, { itemId, userId, minutesBefore }) => {
    // 验证项目存在
    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error('项目不存在');
    }

    // 验证权限
    const day = await ctx.db.get(item.dayId);
    if (!day) {
      throw new Error('行程天不存在');
    }

    const itinerary = await ctx.db.get(day.itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new Error('无权为此项目创建提醒');
    }

    // 计算提醒时间
    if (!item.startTime) {
      throw new Error('项目没有开始时间，无法设置提醒');
    }

    const scheduledAt = calculateScheduledTime(
      day.date,
      item.startTime,
      minutesBefore
    );

    // 检查是否已存在相同的提醒
    const existingReminders = await ctx.db
      .query('reminders')
      .withIndex('by_item', (q) => q.eq('itemId', itemId))
      .collect();

    const duplicate = existingReminders.find(
      (r) => r.minutesBefore === minutesBefore
    );

    if (duplicate) {
      throw new Error('已存在相同时间的提醒');
    }

    // 创建提醒
    const reminderId = await ctx.db.insert('reminders', {
      itemId,
      userId,
      minutesBefore,
      scheduledAt,
    });

    return { id: reminderId };
  },
});

/**
 * 删除提醒
 */
export const remove = mutation({
  args: {
    id: v.id('reminders'),
    userId: v.id('users'),
  },
  handler: async (ctx, { id, userId }) => {
    const reminder = await ctx.db.get(id);
    if (!reminder) {
      throw new Error('提醒不存在');
    }

    if (reminder.userId !== userId) {
      throw new Error('无权删除此提醒');
    }

    await ctx.db.delete(id);

    return { success: true };
  },
});

/**
 * 更新提醒时间
 */
export const update = mutation({
  args: {
    id: v.id('reminders'),
    userId: v.id('users'),
    minutesBefore: v.number(),
  },
  handler: async (ctx, { id, userId, minutesBefore }) => {
    const reminder = await ctx.db.get(id);
    if (!reminder) {
      throw new Error('提醒不存在');
    }

    if (reminder.userId !== userId) {
      throw new Error('无权修改此提醒');
    }

    // 获取项目和天数信息以重新计算时间
    const item = await ctx.db.get(reminder.itemId);
    if (!item || !item.startTime) {
      throw new Error('无法计算提醒时间');
    }

    const day = await ctx.db.get(item.dayId);
    if (!day) {
      throw new Error('行程天不存在');
    }

    const scheduledAt = calculateScheduledTime(
      day.date,
      item.startTime,
      minutesBefore
    );

    await ctx.db.patch(id, {
      minutesBefore,
      scheduledAt,
    });

    return { success: true };
  },
});

/**
 * 获取待发送的提醒 (内部查询，供 cron 使用)
 */
export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // 获取未来5分钟内需要发送的提醒
    const fiveMinutesLater = now + 5 * 60 * 1000;

    const allReminders = await ctx.db
      .query('reminders')
      .withIndex('by_scheduled')
      .collect();

    // 过滤出未发送且在时间范围内的提醒
    const pending = allReminders.filter(
      (r) =>
        !r.sentAt && r.scheduledAt <= fiveMinutesLater && r.scheduledAt >= now
    );

    return pending;
  },
});

/**
 * 标记提醒已发送 (内部 mutation)
 */
export const markAsSent = internalMutation({
  args: {
    reminderId: v.id('reminders'),
  },
  handler: async (ctx, { reminderId }) => {
    await ctx.db.patch(reminderId, {
      sentAt: Date.now(),
    });
  },
});

/**
 * 重新计算项目的所有提醒时间 (当项目时间更新时调用)
 */
export const recalculateForItem = internalMutation({
  args: {
    itemId: v.id('itineraryItems'),
  },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || !item.startTime) return;

    const day = await ctx.db.get(item.dayId);
    if (!day) return;

    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_item', (q) => q.eq('itemId', itemId))
      .collect();

    for (const reminder of reminders) {
      // 只更新未发送的提醒
      if (!reminder.sentAt) {
        const scheduledAt = calculateScheduledTime(
          day.date,
          item.startTime,
          reminder.minutesBefore
        );
        await ctx.db.patch(reminder._id, { scheduledAt });
      }
    }
  },
});

/**
 * 计算提醒的调度时间
 */
function calculateScheduledTime(
  date: string,
  startTime: string,
  minutesBefore: number
): number {
  const [hours, minutes] = startTime.split(':').map(Number);
  const dateTime = new Date(`${date}T${startTime}:00`);
  dateTime.setHours(hours, minutes, 0, 0);
  return dateTime.getTime() - minutesBefore * 60 * 1000;
}
