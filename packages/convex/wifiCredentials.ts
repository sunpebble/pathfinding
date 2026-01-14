/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * WiFi Credentials - User-saved WiFi passwords and credentials
 */

// List user's saved WiFi credentials
export const listByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('wifiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Sort by most recently used
    results.sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt));

    return args.limit ? results.slice(0, args.limit) : results;
  },
});

// Get credentials for a specific WiFi spot
export const getBySpot = query({
  args: {
    userId: v.string(),
    wifiSpotId: v.id('wifiSpots'),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('wifiCredentials')
      .withIndex('by_user_spot', (q) =>
        q.eq('userId', args.userId).eq('wifiSpotId', args.wifiSpotId)
      )
      .first();

    return results;
  },
});

// Get a credential by ID
export const getById = query({
  args: { id: v.id('wifiCredentials') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search user's credentials by name or SSID
export const search = query({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit ?? 20;

    const credentials = await ctx.db
      .query('wifiCredentials')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const searchLower = args.query.toLowerCase();
    const filtered = credentials.filter(
      (cred) =>
        cred.name.toLowerCase().includes(searchLower) ||
        cred.ssid.toLowerCase().includes(searchLower) ||
        cred.locationName?.toLowerCase().includes(searchLower)
    );

    return filtered.slice(0, maxResults);
  },
});

// Save a new WiFi credential
export const create = mutation({
  args: {
    userId: v.string(),
    wifiSpotId: v.optional(v.id('wifiSpots')),
    name: v.string(),
    ssid: v.string(),
    password: v.string(),
    securityType: v.optional(
      v.union(
        v.literal('open'),
        v.literal('wep'),
        v.literal('wpa'),
        v.literal('wpa2'),
        v.literal('wpa3'),
        v.literal('unknown')
      )
    ),
    locationName: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if credential already exists for this user and spot
    if (args.wifiSpotId) {
      const existing = await ctx.db
        .query('wifiCredentials')
        .withIndex('by_user_spot', (q) =>
          q.eq('userId', args.userId).eq('wifiSpotId', args.wifiSpotId)
        )
        .first();

      if (existing) {
        // Update existing credential
        await ctx.db.patch(existing._id, {
          password: args.password,
          securityType: args.securityType,
          notes: args.notes,
          isShared: args.isShared ?? false,
          updatedAt: Date.now(),
        });
        return existing._id;
      }
    }

    return await ctx.db.insert('wifiCredentials', {
      ...args,
      isShared: args.isShared ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update a WiFi credential
export const update = mutation({
  args: {
    id: v.id('wifiCredentials'),
    name: v.optional(v.string()),
    ssid: v.optional(v.string()),
    password: v.optional(v.string()),
    securityType: v.optional(
      v.union(
        v.literal('open'),
        v.literal('wep'),
        v.literal('wpa'),
        v.literal('wpa2'),
        v.literal('wpa3'),
        v.literal('unknown')
      )
    ),
    locationName: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    notes: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

// Mark credential as recently used
export const markUsed = mutation({
  args: {
    id: v.id('wifiCredentials'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastUsedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Delete a WiFi credential
export const remove = mutation({
  args: { id: v.id('wifiCredentials') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get shared credentials for a WiFi spot (community passwords)
export const getSharedBySpot = query({
  args: {
    wifiSpotId: v.id('wifiSpots'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('wifiCredentials')
      .withIndex('by_spot_shared', (q) =>
        q.eq('wifiSpotId', args.wifiSpotId).eq('isShared', true)
      )
      .collect();

    // Sort by most recently updated
    results.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit ?? 5;
    return results.slice(0, limit);
  },
});
