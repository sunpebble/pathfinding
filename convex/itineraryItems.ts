import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * 获取单个项目详情
 */
export const getById = query({
  args: {
    id: v.id('itineraryItems'),
  },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item) {
      return null;
    }

    const poi = item.poiId ? await ctx.db.get(item.poiId) : null;

    return {
      ...item,
      id: item._id,
      poi: poi
        ? {
            id: poi._id,
            name: poi.name,
            category: poi.category,
            latitude: poi.latitude,
            longitude: poi.longitude,
          }
        : null,
    };
  },
});

/**
 * 列出某天的所有项目
 */
export const listByDay = query({
  args: {
    dayId: v.id('itineraryDays'),
  },
  handler: async (ctx, { dayId }) => {
    const items = await ctx.db
      .query('itineraryItems')
      .withIndex('by_day', (q) => q.eq('dayId', dayId))
      .collect();

    // 按 orderIndex 排序
    items.sort((a, b) => a.orderIndex - b.orderIndex);

    // 获取 POI 信息
    const itemsWithPoi = await Promise.all(
      items.map(async (item) => {
        const poi = item.poiId ? await ctx.db.get(item.poiId) : null;
        return {
          ...item,
          id: item._id,
          poi: poi
            ? {
                id: poi._id,
                name: poi.name,
                category: poi.category,
                latitude: poi.latitude,
                longitude: poi.longitude,
                imageUrls: poi.imageUrls,
              }
            : null,
        };
      })
    );

    return itemsWithPoi;
  },
});

/**
 * 添加项目到某天
 */
export const create = mutation({
  args: {
    dayId: v.id('itineraryDays'),
    userId: v.id('users'),
    poiId: v.optional(v.id('pois')),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    transportMode: v.optional(v.string()),
    transportMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { dayId, userId, ...itemData }) => {
    // 验证 day 存在并检查权限
    const day = await ctx.db.get(dayId);
    if (!day) {
      throw new Error('行程天不存在');
    }

    const itinerary = await ctx.db.get(day.itineraryId);
    if (!itinerary) {
      throw new Error('行程不存在');
    }

    if (itinerary.userId !== userId) {
      throw new Error('无权修改此行程');
    }

    // 获取当前最大 orderIndex
    const existingItems = await ctx.db
      .query('itineraryItems')
      .withIndex('by_day', (q) => q.eq('dayId', dayId))
      .collect();

    const maxOrderIndex = existingItems.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1
    );

    // 创建项目
    const itemId = await ctx.db.insert('itineraryItems', {
      dayId,
      poiId: itemData.poiId,
      orderIndex: maxOrderIndex + 1,
      startTime: itemData.startTime,
      endTime: itemData.endTime,
      notes: itemData.notes,
      transportMode: itemData.transportMode,
      transportMinutes: itemData.transportMinutes,
    });

    return { id: itemId };
  },
});

/**
 * 更新项目
 */
export const update = mutation({
  args: {
    id: v.id('itineraryItems'),
    userId: v.id('users'),
    poiId: v.optional(v.id('pois')),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    transportMode: v.optional(v.string()),
    transportMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { id, userId, ...updates }) => {
    const item = await ctx.db.get(id);
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
      throw new Error('无权修改此项目');
    }

    // 更新项目
    await ctx.db.patch(id, {
      poiId: updates.poiId,
      startTime: updates.startTime,
      endTime: updates.endTime,
      notes: updates.notes,
      transportMode: updates.transportMode,
      transportMinutes: updates.transportMinutes,
    });

    return { success: true };
  },
});

/**
 * 删除项目
 */
export const remove = mutation({
  args: {
    id: v.id('itineraryItems'),
    userId: v.id('users'),
  },
  handler: async (ctx, { id, userId }) => {
    const item = await ctx.db.get(id);
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
      throw new Error('无权删除此项目');
    }

    // 删除关联的提醒
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_item', (q) => q.eq('itemId', id))
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // 删除项目
    await ctx.db.delete(id);

    // 重新排序剩余项目
    const remainingItems = await ctx.db
      .query('itineraryItems')
      .withIndex('by_day', (q) => q.eq('dayId', item.dayId))
      .collect();

    remainingItems.sort((a, b) => a.orderIndex - b.orderIndex);

    for (let i = 0; i < remainingItems.length; i++) {
      if (remainingItems[i].orderIndex !== i) {
        await ctx.db.patch(remainingItems[i]._id, { orderIndex: i });
      }
    }

    return { success: true };
  },
});

/**
 * 重新排序项目
 */
export const reorder = mutation({
  args: {
    dayId: v.id('itineraryDays'),
    userId: v.id('users'),
    itemIds: v.array(v.id('itineraryItems')),
  },
  handler: async (ctx, { dayId, userId, itemIds }) => {
    // 验证权限
    const day = await ctx.db.get(dayId);
    if (!day) {
      throw new Error('行程天不存在');
    }

    const itinerary = await ctx.db.get(day.itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new Error('无权修改此行程');
    }

    // 验证所有项目都属于这一天
    const existingItems = await ctx.db
      .query('itineraryItems')
      .withIndex('by_day', (q) => q.eq('dayId', dayId))
      .collect();

    const existingIds = new Set(existingItems.map((i) => i._id));

    for (const itemId of itemIds) {
      if (!existingIds.has(itemId)) {
        throw new Error('项目不属于此行程天');
      }
    }

    // 更新顺序
    for (let i = 0; i < itemIds.length; i++) {
      await ctx.db.patch(itemIds[i], { orderIndex: i });
    }

    return { success: true };
  },
});

/**
 * 移动项目到另一天
 */
export const moveToDay = mutation({
  args: {
    itemId: v.id('itineraryItems'),
    targetDayId: v.id('itineraryDays'),
    userId: v.id('users'),
    newOrderIndex: v.optional(v.number()),
  },
  handler: async (ctx, { itemId, targetDayId, userId, newOrderIndex }) => {
    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error('项目不存在');
    }

    const sourceDay = await ctx.db.get(item.dayId);
    const targetDay = await ctx.db.get(targetDayId);

    if (!sourceDay || !targetDay) {
      throw new Error('行程天不存在');
    }

    // 验证两天属于同一行程
    if (sourceDay.itineraryId !== targetDay.itineraryId) {
      throw new Error('目标天不属于同一行程');
    }

    // 验证权限
    const itinerary = await ctx.db.get(sourceDay.itineraryId);
    if (!itinerary || itinerary.userId !== userId) {
      throw new Error('无权修改此行程');
    }

    // 获取目标天的项目
    const targetItems = await ctx.db
      .query('itineraryItems')
      .withIndex('by_day', (q) => q.eq('dayId', targetDayId))
      .collect();

    // 计算新的 orderIndex
    const orderIndex =
      newOrderIndex !== undefined
        ? newOrderIndex
        : targetItems.reduce((max, i) => Math.max(max, i.orderIndex), -1) + 1;

    // 更新项目
    await ctx.db.patch(itemId, {
      dayId: targetDayId,
      orderIndex,
    });

    // 重新排序源天的项目
    if (item.dayId !== targetDayId) {
      const sourceItems = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', (q) => q.eq('dayId', item.dayId))
        .collect();

      sourceItems.sort((a, b) => a.orderIndex - b.orderIndex);

      for (let i = 0; i < sourceItems.length; i++) {
        if (sourceItems[i].orderIndex !== i) {
          await ctx.db.patch(sourceItems[i]._id, { orderIndex: i });
        }
      }
    }

    return { success: true };
  },
});
