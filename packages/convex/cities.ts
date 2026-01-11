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
      .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
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
      (city) =>
        city.name.toLowerCase().includes(searchLower) ||
        city.nameEn?.toLowerCase().includes(searchLower)
    );
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
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
