/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * SIM Cards - International SIM card recommendations for travelers
 */

// Card type validator
const cardTypeValidator = v.union(
  v.literal("physical"), // Physical SIM card
  v.literal("esim"), // eSIM
  v.literal("wifi_device"), // Portable WiFi device
);

// Coverage type validator
const coverageTypeValidator = v.union(
  v.literal("single_country"), // Single country
  v.literal("regional"), // Regional (e.g., Southeast Asia, Europe)
  v.literal("global"), // Global
);

// List SIM card products with optional filters
export const list = query({
  args: {
    destination: v.optional(v.string()),
    cardType: v.optional(cardTypeValidator),
    coverageType: v.optional(coverageTypeValidator),
    minData: v.optional(v.number()), // Minimum data in bytes
    maxPrice: v.optional(v.number()),
    minDays: v.optional(v.number()), // Minimum validity days
    includesVoice: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("simCards").collect();

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by destination
    if (args.destination) {
      results = results.filter(
        (card) =>
          card.destinations.includes(args.destination!) ||
          card.destinationNames?.some((name) =>
            name.toLowerCase().includes(args.destination!.toLowerCase()),
          ),
      );
    }

    // Filter by card type
    if (args.cardType) {
      results = results.filter((card) => card.cardType === args.cardType);
    }

    // Filter by coverage type
    if (args.coverageType) {
      results = results.filter(
        (card) => card.coverageType === args.coverageType,
      );
    }

    // Filter by minimum data
    if (args.minData) {
      results = results.filter((card) =>
        card.dataPlans.some(
          (plan) =>
            plan.isUnlimited ||
            (plan.dataAmountBytes && plan.dataAmountBytes >= args.minData!),
        ),
      );
    }

    // Filter by max price
    if (args.maxPrice) {
      results = results.filter((card) =>
        card.dataPlans.some((plan) => plan.price <= args.maxPrice!),
      );
    }

    // Filter by minimum validity days
    if (args.minDays) {
      results = results.filter((card) =>
        card.dataPlans.some((plan) => plan.validityDays >= args.minDays!),
      );
    }

    // Filter by voice support
    if (args.includesVoice !== undefined) {
      results = results.filter(
        (card) => card.includesVoice === args.includesVoice,
      );
    }

    // Sort by priority and rating
    results.sort((a, b) => {
      // Promoted items first
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      // Then by priority
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Then by rating
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    return results.slice(offset, offset + limit);
  },
});

// Get a SIM card product by ID
export const getById = query({
  args: { id: v.id("simCards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get recommended SIM cards for a destination
export const getRecommended = query({
  args: {
    destination: v.string(),
    tripDurationDays: v.optional(v.number()),
    needsVoice: v.optional(v.boolean()),
    preferEsim: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("simCards").collect();

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by destination
    results = results.filter(
      (card) =>
        card.destinations.includes(args.destination) ||
        card.destinationNames?.some((name) =>
          name.toLowerCase().includes(args.destination.toLowerCase()),
        ),
    );

    // Filter by voice requirement
    if (args.needsVoice) {
      results = results.filter((card) => card.includesVoice);
    }

    // Filter by trip duration (find plans that cover the duration)
    if (args.tripDurationDays) {
      results = results.filter((card) =>
        card.dataPlans.some(
          (plan) => plan.validityDays >= args.tripDurationDays!,
        ),
      );
    }

    // Sort by preference
    results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer eSIM if requested
      if (args.preferEsim) {
        if (a.cardType === "esim") scoreA += 10;
        if (b.cardType === "esim") scoreB += 10;
      }

      // Add rating score
      scoreA += (a.rating ?? 0) * 2;
      scoreB += (b.rating ?? 0) * 2;

      // Promoted items get bonus
      if (a.isPromoted) scoreA += 5;
      if (b.isPromoted) scoreB += 5;

      // Priority score
      scoreA += a.priority;
      scoreB += b.priority;

      return scoreB - scoreA;
    });

    const limit = args.limit ?? 10;
    return results.slice(0, limit);
  },
});

// Search SIM cards by name or provider
export const search = query({
  args: {
    query: v.string(),
    destination: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.limit ?? 50;
    let results = await ctx.db.query("simCards").take(maxResults * 5);

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by destination if provided
    if (args.destination) {
      results = results.filter(
        (card) =>
          card.destinations.includes(args.destination!) ||
          card.destinationNames?.some((name) =>
            name.toLowerCase().includes(args.destination!.toLowerCase()),
          ),
      );
    }

    // Search by name or provider
    const searchLower = args.query.toLowerCase();
    results = results.filter(
      (card) =>
        card.name.toLowerCase().includes(searchLower) ||
        card.nameEn?.toLowerCase().includes(searchLower) ||
        card.provider.toLowerCase().includes(searchLower) ||
        card.regionName?.toLowerCase().includes(searchLower),
    );

    // Sort by rating
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return results.slice(0, maxResults);
  },
});

// Compare SIM card products
export const compare = query({
  args: {
    ids: v.array(v.id("simCards")),
  },
  handler: async (ctx, args) => {
    const cards = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return cards.filter((card) => card !== null);
  },
});

// Get popular SIM cards (most reviewed/highest rated)
export const getPopular = query({
  args: {
    destination: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("simCards").collect();

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by destination if provided
    if (args.destination) {
      results = results.filter(
        (card) =>
          card.destinations.includes(args.destination!) ||
          card.destinationNames?.some((name) =>
            name.toLowerCase().includes(args.destination!.toLowerCase()),
          ),
      );
    }

    // Sort by review count and rating
    results.sort((a, b) => {
      const scoreA = (a.reviewCount ?? 0) * 0.3 + (a.rating ?? 0) * 0.7;
      const scoreB = (b.reviewCount ?? 0) * 0.3 + (b.rating ?? 0) * 0.7;
      return scoreB - scoreA;
    });

    const limit = args.limit ?? 10;
    return results.slice(0, limit);
  },
});

// Get SIM cards by region
export const getByRegion = query({
  args: {
    region: v.string(), // Region name like "东南亚", "欧洲"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db.query("simCards").collect();

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by region
    results = results.filter(
      (card) =>
        card.coverageType === "regional" &&
        card.regionName?.toLowerCase().includes(args.region.toLowerCase()),
    );

    // Sort by rating
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    const limit = args.limit ?? 20;
    return results.slice(0, limit);
  },
});

// Get eSIM compatible products
export const getEsimProducts = query({
  args: {
    destination: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("simCards")
      .withIndex("by_card_type", (q) => q.eq("cardType", "esim"))
      .collect();

    // Filter only active products
    results = results.filter((card) => card.isActive);

    // Filter by destination if provided
    if (args.destination) {
      results = results.filter(
        (card) =>
          card.destinations.includes(args.destination!) ||
          card.destinationNames?.some((name) =>
            name.toLowerCase().includes(args.destination!.toLowerCase()),
          ),
      );
    }

    // Sort by rating
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    const limit = args.limit ?? 20;
    return results.slice(0, limit);
  },
});

// Create a new SIM card product (admin)
export const create = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    provider: v.string(),
    providerLogo: v.optional(v.string()),
    cardType: cardTypeValidator,
    destinations: v.array(v.string()),
    destinationNames: v.optional(v.array(v.string())),
    coverageType: coverageTypeValidator,
    regionName: v.optional(v.string()),
    dataPlans: v.array(
      v.object({
        dataAmount: v.string(),
        dataAmountBytes: v.optional(v.number()),
        isUnlimited: v.boolean(),
        throttledSpeedAfterLimit: v.optional(v.string()),
        validityDays: v.number(),
        price: v.number(),
        originalPrice: v.optional(v.number()),
        currency: v.string(),
        pricePerDay: v.optional(v.number()),
        pricePerGB: v.optional(v.number()),
      }),
    ),
    networkType: v.array(v.string()),
    supportedCarriers: v.optional(v.array(v.string())),
    esimInfo: v.optional(
      v.object({
        supportsQrActivation: v.boolean(),
        supportsAppActivation: v.boolean(),
        activationInstructions: v.optional(v.string()),
        compatibleDevices: v.optional(v.array(v.string())),
        requiresUnlockedPhone: v.boolean(),
      }),
    ),
    physicalSimInfo: v.optional(
      v.object({
        simSize: v.array(v.string()),
        deliveryOptions: v.optional(
          v.array(
            v.object({
              method: v.string(),
              estimatedDays: v.optional(v.number()),
              fee: v.optional(v.number()),
              description: v.optional(v.string()),
            }),
          ),
        ),
        pickupLocations: v.optional(v.array(v.string())),
      }),
    ),
    includesVoice: v.boolean(),
    voiceMinutes: v.optional(v.number()),
    includesSms: v.boolean(),
    smsCount: v.optional(v.number()),
    localNumber: v.optional(v.boolean()),
    features: v.array(v.string()),
    hotspotSupported: v.boolean(),
    maxDevices: v.optional(v.number()),
    purchaseUrl: v.string(),
    purchasePlatforms: v.optional(v.array(v.string())),
    affiliateUrl: v.optional(v.string()),
    isPromoted: v.optional(v.boolean()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("simCards", {
      ...args,
      rating: undefined,
      reviewCount: 0,
      salesCount: undefined,
      isActive: true,
      priority: args.priority ?? 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update a SIM card product (admin)
export const update = mutation({
  args: {
    id: v.id("simCards"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerLogo: v.optional(v.string()),
    cardType: v.optional(cardTypeValidator),
    destinations: v.optional(v.array(v.string())),
    destinationNames: v.optional(v.array(v.string())),
    coverageType: v.optional(coverageTypeValidator),
    regionName: v.optional(v.string()),
    dataPlans: v.optional(
      v.array(
        v.object({
          dataAmount: v.string(),
          dataAmountBytes: v.optional(v.number()),
          isUnlimited: v.boolean(),
          throttledSpeedAfterLimit: v.optional(v.string()),
          validityDays: v.number(),
          price: v.number(),
          originalPrice: v.optional(v.number()),
          currency: v.string(),
          pricePerDay: v.optional(v.number()),
          pricePerGB: v.optional(v.number()),
        }),
      ),
    ),
    networkType: v.optional(v.array(v.string())),
    supportedCarriers: v.optional(v.array(v.string())),
    esimInfo: v.optional(
      v.object({
        supportsQrActivation: v.boolean(),
        supportsAppActivation: v.boolean(),
        activationInstructions: v.optional(v.string()),
        compatibleDevices: v.optional(v.array(v.string())),
        requiresUnlockedPhone: v.boolean(),
      }),
    ),
    physicalSimInfo: v.optional(
      v.object({
        simSize: v.array(v.string()),
        deliveryOptions: v.optional(
          v.array(
            v.object({
              method: v.string(),
              estimatedDays: v.optional(v.number()),
              fee: v.optional(v.number()),
              description: v.optional(v.string()),
            }),
          ),
        ),
        pickupLocations: v.optional(v.array(v.string())),
      }),
    ),
    includesVoice: v.optional(v.boolean()),
    voiceMinutes: v.optional(v.number()),
    includesSms: v.optional(v.boolean()),
    smsCount: v.optional(v.number()),
    localNumber: v.optional(v.boolean()),
    features: v.optional(v.array(v.string())),
    hotspotSupported: v.optional(v.boolean()),
    maxDevices: v.optional(v.number()),
    purchaseUrl: v.optional(v.string()),
    purchasePlatforms: v.optional(v.array(v.string())),
    affiliateUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    isPromoted: v.optional(v.boolean()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

// Delete a SIM card product (admin)
export const remove = mutation({
  args: { id: v.id("simCards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update rating (called internally after review is added/updated)
export const updateRating = mutation({
  args: {
    id: v.id("simCards"),
    rating: v.number(),
    reviewCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      rating: args.rating,
      reviewCount: args.reviewCount,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});
