import { v } from 'convex/values';
import { query } from './_generated/server';

/**
 * 列出所有城市
 */
export const list = query({
  args: {
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, { countryCode }) => {
    let citiesQuery;

    if (countryCode) {
      citiesQuery = ctx.db
        .query('cities')
        .withIndex('by_country', (q) => q.eq('countryCode', countryCode));
    } else {
      citiesQuery = ctx.db.query('cities');
    }

    const cities = await citiesQuery.collect();

    return cities.map((city) => ({
      ...city,
      id: city._id,
    }));
  },
});

/**
 * 获取单个城市详情
 */
export const getById = query({
  args: {
    id: v.id('cities'),
  },
  handler: async (ctx, { id }) => {
    const city = await ctx.db.get(id);
    if (!city) {
      return null;
    }
    return {
      ...city,
      id: city._id,
    };
  },
});

/**
 * 搜索城市
 */
export const search = query({
  args: {
    keyword: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { keyword, limit = 10 }) => {
    const normalizedKeyword = keyword.toLowerCase().trim();

    if (!normalizedKeyword) {
      return [];
    }

    const allCities = await ctx.db.query('cities').collect();

    const matched = allCities.filter((city) => {
      const name = city.name.toLowerCase();
      const nameEn = city.nameEn?.toLowerCase() || '';
      const country = city.country.toLowerCase();
      return (
        name.includes(normalizedKeyword) ||
        nameEn.includes(normalizedKeyword) ||
        country.includes(normalizedKeyword)
      );
    });

    return matched.slice(0, limit).map((city) => ({
      ...city,
      id: city._id,
    }));
  },
});
