import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * 根据 ID 获取用户
 */
export const getById = query({
  args: {
    id: v.id('users'),
  },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (!user) {
      return null;
    }
    return {
      ...user,
      id: user._id,
    };
  },
});

/**
 * 根据手机号获取用户
 */
export const getByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, { phone }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', phone))
      .first();

    if (!user) {
      return null;
    }
    return {
      ...user,
      id: user._id,
    };
  },
});

/**
 * 根据邮箱获取用户
 */
export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    if (!user) {
      return null;
    }
    return {
      ...user,
      id: user._id,
    };
  },
});

/**
 * 更新用户资料
 */
export const updateProfile = mutation({
  args: {
    userId: v.id('users'),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...updates }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const patchData: Record<string, string | undefined> = {};
    if (updates.displayName !== undefined) {
      patchData.displayName = updates.displayName;
    }
    if (updates.avatarUrl !== undefined) {
      patchData.avatarUrl = updates.avatarUrl;
    }

    await ctx.db.patch(userId, patchData);
    return { success: true };
  },
});

/**
 * 更新推送 token
 */
export const updatePushToken = mutation({
  args: {
    userId: v.id('users'),
    expoPushToken: v.string(),
  },
  handler: async (ctx, { userId, expoPushToken }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    await ctx.db.patch(userId, { expoPushToken });
    return { success: true };
  },
});

/**
 * 删除用户账户
 */
export const deleteAccount = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 删除用户的所有行程
    const itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    for (const itinerary of itineraries) {
      // 删除行程天数和项目
      const days = await ctx.db
        .query('itineraryDays')
        .withIndex('by_itinerary', (q) => q.eq('itineraryId', itinerary._id))
        .collect();

      for (const day of days) {
        const items = await ctx.db
          .query('itineraryItems')
          .withIndex('by_day', (q) => q.eq('dayId', day._id))
          .collect();

        for (const item of items) {
          // 删除提醒
          const reminders = await ctx.db
            .query('reminders')
            .withIndex('by_item', (q) => q.eq('itemId', item._id))
            .collect();
          for (const reminder of reminders) {
            await ctx.db.delete(reminder._id);
          }
          await ctx.db.delete(item._id);
        }
        await ctx.db.delete(day._id);
      }
      await ctx.db.delete(itinerary._id);
    }

    // 删除用户的提醒
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // 删除用户
    await ctx.db.delete(userId);

    return { success: true };
  },
});
