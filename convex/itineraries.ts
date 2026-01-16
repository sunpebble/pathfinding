import type { Doc} from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * 计算两个日期之间的天数
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 生成日期数组
 */
function generateDates(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * 列出用户的行程
 */
export const list = query({
  args: {
    userId: v.id('users'),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { userId, page = 1, pageSize = 20 }) => {
    const itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();

    // 获取城市信息
    const cityIds = [...new Set(itineraries.map((i) => i.cityId))];
    const cities = await Promise.all(cityIds.map((id) => ctx.db.get(id)));
    const cityMap = new Map(cities.filter(Boolean).map((c) => [c!._id, c!]));

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItineraries = itineraries.slice(start, end);

    // 获取每个行程的天数和项目统计
    const result = await Promise.all(
      paginatedItineraries.map(async (itinerary) => {
        const days = await ctx.db
          .query('itineraryDays')
          .withIndex('by_itinerary', (q) => q.eq('itineraryId', itinerary._id))
          .collect();

        let itemCount = 0;
        for (const day of days) {
          const items = await ctx.db
            .query('itineraryItems')
            .withIndex('by_day', (q) => q.eq('dayId', day._id))
            .collect();
          itemCount += items.length;
        }

        const city = cityMap.get(itinerary.cityId);

        return {
          ...itinerary,
          id: itinerary._id,
          cityName: city?.name,
          dayCount: days.length,
          itemCount,
          createdAt: itinerary._creationTime,
        };
      })
    );

    return {
      data: result,
      meta: {
        page,
        pageSize,
        totalCount: itineraries.length,
        totalPages: Math.ceil(itineraries.length / pageSize),
      },
    };
  },
});

/**
 * 列出公开行程 (社区发现)
 */
export const listPublic = query({
  args: {
    cityId: v.optional(v.id('cities')),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal('recent'), v.literal('popular'))),
  },
  handler: async (
    ctx,
    { cityId, page = 1, pageSize = 20, sortBy = 'recent' }
  ) => {
    const itinerariesQuery = ctx.db
      .query('itineraries')
      .withIndex('by_visibility', (q) => q.eq('visibility', 'public'));

    const allPublic = await itinerariesQuery.collect();

    // 按城市过滤
    const filtered = cityId
      ? allPublic.filter((i) => i.cityId === cityId)
      : allPublic;

    // 排序
    if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));
    } else {
      filtered.sort((a, b) => b._creationTime - a._creationTime);
    }

    // 分页
    const start = (page - 1) * pageSize;
    const paginatedItineraries = filtered.slice(start, start + pageSize);

    // 获取城市和用户信息
    const result = await Promise.all(
      paginatedItineraries.map(async (itinerary) => {
        const city = await ctx.db.get(itinerary.cityId);
        const user = await ctx.db.get(itinerary.userId);

        const days = await ctx.db
          .query('itineraryDays')
          .withIndex('by_itinerary', (q) => q.eq('itineraryId', itinerary._id))
          .collect();

        return {
          ...itinerary,
          id: itinerary._id,
          cityName: city?.name,
          authorName: user?.displayName || '匿名用户',
          dayCount: days.length,
          createdAt: itinerary._creationTime,
        };
      })
    );

    return {
      data: result,
      meta: {
        page,
        pageSize,
        totalCount: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
    };
  },
});

/**
 * 获取单个行程详情
 */
export const getById = query({
  args: {
    id: v.id('itineraries'),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, { id, userId }) => {
    const itinerary = await ctx.db.get(id);

    if (!itinerary) {
      throw new Error('行程不存在');
    }

    // 权限检查: 只能查看自己的或公开的行程
    if (itinerary.visibility !== 'public' && itinerary.userId !== userId) {
      throw new Error('无权访问此行程');
    }

    // 获取城市信息
    const city = await ctx.db.get(itinerary.cityId);

    // 获取所有天数
    const days = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', id))
      .collect();

    // 按天数排序
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    // 获取每天的项目
    const daysWithItems = await Promise.all(
      days.map(async (day) => {
        const items = await ctx.db
          .query('itineraryItems')
          .withIndex('by_day', (q) => q.eq('dayId', day._id))
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

        return {
          ...day,
          id: day._id,
          items: itemsWithPoi,
        };
      })
    );

    return {
      ...itinerary,
      id: itinerary._id,
      city: city
        ? {
            id: city._id,
            name: city.name,
            country: city.country,
          }
        : null,
      days: daysWithItems,
      createdAt: itinerary._creationTime,
    };
  },
});

/**
 * 创建行程
 */
export const create = mutation({
  args: {
    userId: v.id('users'),
    cityId: v.id('cities'),
    title: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    visibility: v.optional(v.union(v.literal('private'), v.literal('public'))),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      cityId,
      title,
      startDate,
      endDate,
      visibility = 'private',
      coverImageUrl,
    } = args;

    // 验证用户存在
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证城市存在
    const city = await ctx.db.get(cityId);
    if (!city) {
      throw new Error('城市不存在');
    }

    // 创建行程
    const itineraryId = await ctx.db.insert('itineraries', {
      userId,
      cityId,
      title,
      startDate,
      endDate,
      visibility,
      coverImageUrl,
      copyCount: 0,
    });

    // 计算天数并创建 itinerary_days
    const totalDays = daysBetween(startDate, endDate);
    const dates = generateDates(startDate, totalDays);

    for (let i = 0; i < dates.length; i++) {
      await ctx.db.insert('itineraryDays', {
        itineraryId,
        dayNumber: i + 1,
        date: dates[i],
      });
    }

    return { id: itineraryId };
  },
});

/**
 * 更新行程
 */
export const update = mutation({
  args: {
    id: v.id('itineraries'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal('private'), v.literal('public'))),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, userId, ...updates }) => {
    const itinerary = await ctx.db.get(id);

    if (!itinerary) {
      throw new Error('行程不存在');
    }

    if (itinerary.userId !== userId) {
      throw new Error('无权修改此行程');
    }

    const patchData: Partial<Doc<'itineraries'>> = {};
    if (updates.title !== undefined) patchData.title = updates.title;
    if (updates.visibility !== undefined)
      patchData.visibility = updates.visibility;
    if (updates.coverImageUrl !== undefined)
      patchData.coverImageUrl = updates.coverImageUrl;

    await ctx.db.patch(id, patchData);

    return { success: true };
  },
});

/**
 * 删除行程
 */
export const remove = mutation({
  args: {
    id: v.id('itineraries'),
    userId: v.id('users'),
  },
  handler: async (ctx, { id, userId }) => {
    const itinerary = await ctx.db.get(id);

    if (!itinerary) {
      throw new Error('行程不存在');
    }

    if (itinerary.userId !== userId) {
      throw new Error('无权删除此行程');
    }

    // 删除所有天数和项目
    const days = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', id))
      .collect();

    for (const day of days) {
      // 删除该天的所有项目
      const items = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', (q) => q.eq('dayId', day._id))
        .collect();

      for (const item of items) {
        // 删除项目的提醒
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

    // 删除行程
    await ctx.db.delete(id);

    return { success: true };
  },
});

/**
 * 复制公开行程
 */
export const copy = mutation({
  args: {
    sourceId: v.id('itineraries'),
    userId: v.id('users'),
    startDate: v.string(),
  },
  handler: async (ctx, { sourceId, userId, startDate }) => {
    const source = await ctx.db.get(sourceId);

    if (!source) {
      throw new Error('源行程不存在');
    }

    if (source.visibility !== 'public' && source.userId !== userId) {
      throw new Error('无权复制此行程');
    }

    // 计算新的日期范围
    const totalDays = daysBetween(source.startDate, source.endDate);
    const dates = generateDates(startDate, totalDays);
    const endDate = dates[dates.length - 1];

    // 创建新行程
    const newItineraryId = await ctx.db.insert('itineraries', {
      userId,
      cityId: source.cityId,
      title: `${source.title} (副本)`,
      startDate,
      endDate,
      visibility: 'private',
      coverImageUrl: source.coverImageUrl,
      copyCount: 0,
      sourceItineraryId: sourceId,
    });

    // 获取源行程的天数
    const sourceDays = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', sourceId))
      .collect();

    sourceDays.sort((a, b) => a.dayNumber - b.dayNumber);

    // 复制天数和项目
    for (let i = 0; i < sourceDays.length; i++) {
      const sourceDay = sourceDays[i];

      const newDayId = await ctx.db.insert('itineraryDays', {
        itineraryId: newItineraryId,
        dayNumber: i + 1,
        date: dates[i],
      });

      // 复制该天的项目
      const sourceItems = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', (q) => q.eq('dayId', sourceDay._id))
        .collect();

      for (const item of sourceItems) {
        await ctx.db.insert('itineraryItems', {
          dayId: newDayId,
          poiId: item.poiId,
          orderIndex: item.orderIndex,
          startTime: item.startTime,
          endTime: item.endTime,
          notes: item.notes,
          transportMode: item.transportMode,
          transportMinutes: item.transportMinutes,
        });
      }
    }

    // 更新源行程的复制计数
    await ctx.db.patch(sourceId, {
      copyCount: (source.copyCount || 0) + 1,
    });

    return { id: newItineraryId };
  },
});
