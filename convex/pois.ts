import { v } from 'convex/values';
import { query } from './_generated/server';

/**
 * 按城市列出 POI
 */
export const listByCity = query({
  args: {
    cityId: v.id('cities'),
    category: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { cityId, category, page = 1, pageSize = 20 }) => {
    let poisQuery;

    if (category) {
      poisQuery = ctx.db
        .query('pois')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', cityId).eq('category', category)
        );
    } else {
      poisQuery = ctx.db
        .query('pois')
        .withIndex('by_city', (q) => q.eq('cityId', cityId));
    }

    const allPois = await poisQuery.collect();

    // 分页
    const start = (page - 1) * pageSize;
    const paginatedPois = allPois.slice(start, start + pageSize);

    return {
      data: paginatedPois.map((poi) => ({
        ...poi,
        id: poi._id,
      })),
      meta: {
        page,
        pageSize,
        totalCount: allPois.length,
        totalPages: Math.ceil(allPois.length / pageSize),
      },
    };
  },
});

/**
 * 获取单个 POI 详情
 */
export const getById = query({
  args: {
    id: v.id('pois'),
  },
  handler: async (ctx, { id }) => {
    const poi = await ctx.db.get(id);

    if (!poi) {
      throw new Error('POI 不存在');
    }

    // 获取城市信息
    const city = await ctx.db.get(poi.cityId);

    return {
      ...poi,
      id: poi._id,
      city: city
        ? {
            id: city._id,
            name: city.name,
            country: city.country,
          }
        : null,
    };
  },
});

/**
 * 搜索 POI (按名称)
 */
export const search = query({
  args: {
    cityId: v.id('cities'),
    keyword: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cityId, keyword, category, limit = 20 }) => {
    const normalizedKeyword = keyword.toLowerCase().trim();

    if (!normalizedKeyword) {
      return [];
    }

    // 获取城市的所有 POI
    let poisQuery;
    if (category) {
      poisQuery = ctx.db
        .query('pois')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', cityId).eq('category', category)
        );
    } else {
      poisQuery = ctx.db
        .query('pois')
        .withIndex('by_city', (q) => q.eq('cityId', cityId));
    }

    const allPois = await poisQuery.collect();

    // 在应用层进行模糊搜索
    const matched = allPois.filter((poi) => {
      const name = poi.name.toLowerCase();
      const nameEn = poi.nameEn?.toLowerCase() || '';
      return (
        name.includes(normalizedKeyword) || nameEn.includes(normalizedKeyword)
      );
    });

    return matched.slice(0, limit).map((poi) => ({
      ...poi,
      id: poi._id,
    }));
  },
});

/**
 * 获取 POI 分类列表
 */
export const getCategories = query({
  args: {
    cityId: v.id('cities'),
  },
  handler: async (ctx, { cityId }) => {
    const pois = await ctx.db
      .query('pois')
      .withIndex('by_city', (q) => q.eq('cityId', cityId))
      .collect();

    // 统计每个分类的数量
    const categoryCount = new Map<string, number>();
    for (const poi of pois) {
      const count = categoryCount.get(poi.category) || 0;
      categoryCount.set(poi.category, count + 1);
    }

    // 转换为数组并排序
    return Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * 获取附近的 POI (基于距离)
 */
export const getNearby = query({
  args: {
    cityId: v.id('cities'),
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { cityId, latitude, longitude, radiusKm = 2, limit = 10 }
  ) => {
    const pois = await ctx.db
      .query('pois')
      .withIndex('by_city', (q) => q.eq('cityId', cityId))
      .collect();

    // 计算距离并过滤
    const poisWithDistance = pois
      .map((poi) => {
        const distance = haversineDistance(
          latitude,
          longitude,
          poi.latitude,
          poi.longitude
        );
        return { ...poi, distance };
      })
      .filter((poi) => poi.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return poisWithDistance.map((poi) => ({
      ...poi,
      id: poi._id,
      distanceKm: Math.round(poi.distance * 100) / 100,
    }));
  },
});

/**
 * Haversine 公式计算两点间距离 (km)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球半径 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
