/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Cities - Reference Data Queries and Mutations
 */

// List all cities
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('cities').collect();
  },
});

// Get a city by ID
export const getById = query({
  args: { id: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get cities by country code
export const getByCountry = query({
  args: { countryCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_country', q => q.eq('countryCode', args.countryCode))
      .collect();
  },
});

// Get cities by timezone
export const getByTimezone = query({
  args: { timezone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_timezone', q => q.eq('timezone', args.timezone))
      .collect();
  },
});

// Search cities by name
export const searchByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const cities = await ctx.db.query('cities').collect();
    const searchLower = args.name.toLowerCase();
    return cities.filter(
      city =>
        city.name.toLowerCase().includes(searchLower)
        || city.nameEn?.toLowerCase().includes(searchLower),
    );
  },
});

// Get multiple cities by IDs (for world clock)
export const getByIds = query({
  args: { ids: v.array(v.id('cities')) },
  handler: async (ctx, args) => {
    const cities = await Promise.all(args.ids.map(id => ctx.db.get(id)));
    return cities.filter(city => city !== null);
  },
});

// Get timezone info for a city
export const getTimezoneInfo = query({
  args: { id: v.id('cities') },
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.id);
    if (!city)
      return null;

    return {
      id: city._id,
      name: city.name,
      nameEn: city.nameEn,
      timezone: city.timezone,
      utcOffset: city.utcOffset,
      dstOffset: city.dstOffset,
      observesDst: city.observesDst,
      countryCode: city.countryCode,
    };
  },
});

// Create a new city
export const create = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    timezone: v.string(),
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    utcOffset: v.optional(v.number()),
    dstOffset: v.optional(v.number()),
    observesDst: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('cities', args);
  },
});

// Update a city
export const update = mutation({
  args: {
    id: v.id('cities'),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    timezone: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    utcOffset: v.optional(v.number()),
    dstOffset: v.optional(v.number()),
    observesDst: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Delete a city
export const remove = mutation({
  args: { id: v.id('cities') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================
// City Encyclopedia Functions
// ============================================

// Get city encyclopedia by city ID
export const getEncyclopedia = query({
  args: { cityId: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cityEncyclopedia')
      .withIndex('by_city', q => q.eq('cityId', args.cityId))
      .first();
  },
});

// Get city with encyclopedia data
export const getCityWithEncyclopedia = query({
  args: { cityId: v.id('cities') },
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId);
    if (!city)
      return null;

    const encyclopedia = await ctx.db
      .query('cityEncyclopedia')
      .withIndex('by_city', q => q.eq('cityId', args.cityId))
      .first();

    return {
      ...city,
      encyclopedia: encyclopedia || null,
    };
  },
});

// Create city encyclopedia entry
export const createEncyclopedia = mutation({
  args: {
    cityId: v.id('cities'),
    basicInfo: v.optional(
      v.object({
        population: v.optional(v.number()),
        populationYear: v.optional(v.number()),
        area: v.optional(v.number()),
        elevation: v.optional(v.number()),
        climate: v.optional(v.string()),
        climateEn: v.optional(v.string()),
        motto: v.optional(v.string()),
        mottoEn: v.optional(v.string()),
        nicknames: v.optional(v.array(v.string())),
        nicknamesEn: v.optional(v.array(v.string())),
      }),
    ),
    history: v.optional(
      v.object({
        foundedYear: v.optional(v.number()),
        historicalNames: v.optional(v.array(v.string())),
        briefHistory: v.string(),
        briefHistoryEn: v.optional(v.string()),
        culturalHighlights: v.array(v.string()),
        culturalHighlightsEn: v.optional(v.array(v.string())),
        famousFor: v.array(v.string()),
        famousForEn: v.optional(v.array(v.string())),
        worldHeritageSites: v.optional(v.array(v.string())),
      }),
    ),
    bestTravelTime: v.optional(
      v.object({
        seasons: v.array(
          v.union(
            v.literal('spring'),
            v.literal('summer'),
            v.literal('autumn'),
            v.literal('winter'),
            v.literal('all_year'),
          ),
        ),
        months: v.array(v.number()),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        weatherNotes: v.optional(v.string()),
        crowdLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
        ),
        priceLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
        ),
      }),
    ),
    customs: v.array(
      v.object({
        category: v.union(
          v.literal('etiquette'),
          v.literal('religion'),
          v.literal('dining'),
          v.literal('dress'),
          v.literal('gift'),
          v.literal('gesture'),
          v.literal('general'),
        ),
        title: v.string(),
        titleEn: v.optional(v.string()),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        isTaboo: v.boolean(),
        importance: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high'),
        ),
      }),
    ),
    practicalInfo: v.optional(
      v.object({
        voltage: v.string(),
        plugType: v.array(v.string()),
        currency: v.string(),
        currencySymbol: v.string(),
        currencyNameLocal: v.string(),
        currencyNameEn: v.string(),
        tippingCustom: v.string(),
        tippingCustomEn: v.optional(v.string()),
        waterSafety: v.union(
          v.literal('safe'),
          v.literal('boil'),
          v.literal('bottled'),
        ),
        waterSafetyNote: v.optional(v.string()),
        visaRequired: v.optional(v.boolean()),
        visaNote: v.optional(v.string()),
        languageOfficial: v.array(v.string()),
        languageCommon: v.array(v.string()),
        emergencyNumber: v.string(),
        ambulanceNumber: v.string(),
        fireNumber: v.string(),
        touristHotline: v.optional(v.string()),
      }),
    ),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if encyclopedia already exists for this city
    const existing = await ctx.db
      .query('cityEncyclopedia')
      .withIndex('by_city', q => q.eq('cityId', args.cityId))
      .first();

    if (existing) {
      // Update existing entry
      const { cityId: _, ...updates } = args;
      await ctx.db.patch(existing._id, {
        ...updates,
        lastUpdatedAt: now,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert('cityEncyclopedia', {
      ...args,
      createdAt: now,
      lastUpdatedAt: now,
    });
  },
});

// Update city encyclopedia entry
export const updateEncyclopedia = mutation({
  args: {
    id: v.id('cityEncyclopedia'),
    basicInfo: v.optional(
      v.object({
        population: v.optional(v.number()),
        populationYear: v.optional(v.number()),
        area: v.optional(v.number()),
        elevation: v.optional(v.number()),
        climate: v.optional(v.string()),
        climateEn: v.optional(v.string()),
        motto: v.optional(v.string()),
        mottoEn: v.optional(v.string()),
        nicknames: v.optional(v.array(v.string())),
        nicknamesEn: v.optional(v.array(v.string())),
      }),
    ),
    history: v.optional(
      v.object({
        foundedYear: v.optional(v.number()),
        historicalNames: v.optional(v.array(v.string())),
        briefHistory: v.string(),
        briefHistoryEn: v.optional(v.string()),
        culturalHighlights: v.array(v.string()),
        culturalHighlightsEn: v.optional(v.array(v.string())),
        famousFor: v.array(v.string()),
        famousForEn: v.optional(v.array(v.string())),
        worldHeritageSites: v.optional(v.array(v.string())),
      }),
    ),
    bestTravelTime: v.optional(
      v.object({
        seasons: v.array(
          v.union(
            v.literal('spring'),
            v.literal('summer'),
            v.literal('autumn'),
            v.literal('winter'),
            v.literal('all_year'),
          ),
        ),
        months: v.array(v.number()),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        weatherNotes: v.optional(v.string()),
        crowdLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
        ),
        priceLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
        ),
      }),
    ),
    customs: v.optional(
      v.array(
        v.object({
          category: v.union(
            v.literal('etiquette'),
            v.literal('religion'),
            v.literal('dining'),
            v.literal('dress'),
            v.literal('gift'),
            v.literal('gesture'),
            v.literal('general'),
          ),
          title: v.string(),
          titleEn: v.optional(v.string()),
          description: v.string(),
          descriptionEn: v.optional(v.string()),
          isTaboo: v.boolean(),
          importance: v.union(
            v.literal('low'),
            v.literal('medium'),
            v.literal('high'),
          ),
        }),
      ),
    ),
    practicalInfo: v.optional(
      v.object({
        voltage: v.string(),
        plugType: v.array(v.string()),
        currency: v.string(),
        currencySymbol: v.string(),
        currencyNameLocal: v.string(),
        currencyNameEn: v.string(),
        tippingCustom: v.string(),
        tippingCustomEn: v.optional(v.string()),
        waterSafety: v.union(
          v.literal('safe'),
          v.literal('boil'),
          v.literal('bottled'),
        ),
        waterSafetyNote: v.optional(v.string()),
        visaRequired: v.optional(v.boolean()),
        visaNote: v.optional(v.string()),
        languageOfficial: v.array(v.string()),
        languageCommon: v.array(v.string()),
        emergencyNumber: v.string(),
        ambulanceNumber: v.string(),
        fireNumber: v.string(),
        touristHotline: v.optional(v.string()),
      }),
    ),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      lastUpdatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete city encyclopedia entry
export const removeEncyclopedia = mutation({
  args: { id: v.id('cityEncyclopedia') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// List all cities with encyclopedia data
export const listWithEncyclopedia = query({
  args: {
    limit: v.optional(v.number()),
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let citiesQuery = ctx.db.query('cities');

    if (args.countryCode) {
      citiesQuery = citiesQuery.withIndex('by_country', q =>
        q.eq('countryCode', args.countryCode!));
    }

    const cities = await citiesQuery.take(limit);

    // Fetch encyclopedia data for each city
    const citiesWithEncyclopedia = await Promise.all(
      cities.map(async (city) => {
        const encyclopedia = await ctx.db
          .query('cityEncyclopedia')
          .withIndex('by_city', q => q.eq('cityId', city._id))
          .first();

        return {
          ...city,
          encyclopedia: encyclopedia || null,
          hasEncyclopedia: !!encyclopedia,
        };
      }),
    );

    return citiesWithEncyclopedia;
  },
});
