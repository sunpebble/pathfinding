/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Medical Facilities - Hospitals, Clinics, Pharmacies
 * 医疗设施
 */

// List medical facilities for a city
export const listByCity = query({
  args: { cityId: v.id("cities") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalFacilities")
      .withIndex("by_city", (q) => q.eq("cityId", args.cityId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// List medical facilities by city and type
export const listByCityAndType = query({
  args: {
    cityId: v.id("cities"),
    facilityType: v.union(
      v.literal("hospital"),
      v.literal("clinic"),
      v.literal("pharmacy"),
      v.literal("emergency"),
      v.literal("dental"),
      v.literal("specialist"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalFacilities")
      .withIndex("by_city_type", (q) =>
        q.eq("cityId", args.cityId).eq("facilityType", args.facilityType),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// List 24-hour facilities
export const list24Hour = query({
  args: { cityId: v.optional(v.id("cities")) },
  handler: async (ctx, args) => {
    let facilities = await ctx.db
      .query("medicalFacilities")
      .withIndex("by_24hour", (q) => q.eq("is24Hour", true))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (args.cityId) {
      facilities = facilities.filter((f) => f.cityId === args.cityId);
    }

    return facilities;
  },
});

// List facilities with emergency rooms
export const listWithEmergency = query({
  args: { cityId: v.optional(v.id("cities")) },
  handler: async (ctx, args) => {
    let facilities = await ctx.db
      .query("medicalFacilities")
      .withIndex("by_emergency", (q) => q.eq("hasEmergencyRoom", true))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (args.cityId) {
      facilities = facilities.filter((f) => f.cityId === args.cityId);
    }

    return facilities;
  },
});

// Get a single medical facility by ID
export const getById = query({
  args: { id: v.id("medicalFacilities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search nearby facilities (simple distance filtering)
export const searchNearby = query({
  args: {
    cityId: v.id("cities"),
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()), // Default 5km
    facilityType: v.optional(
      v.union(
        v.literal("hospital"),
        v.literal("clinic"),
        v.literal("pharmacy"),
        v.literal("emergency"),
        v.literal("dental"),
        v.literal("specialist"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const radius = args.radiusKm ?? 5;

    let facilities = await ctx.db
      .query("medicalFacilities")
      .withIndex("by_city", (q) => q.eq("cityId", args.cityId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (args.facilityType) {
      facilities = facilities.filter(
        (f) => f.facilityType === args.facilityType,
      );
    }

    // Calculate distance and filter
    const filteredFacilities = facilities
      .map((facility) => {
        const distance = calculateDistance(
          args.latitude,
          args.longitude,
          facility.latitude,
          facility.longitude,
        );
        return { ...facility, distance };
      })
      .filter((f) => f.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return filteredFacilities;
  },
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Create a new medical facility
export const create = mutation({
  args: {
    cityId: v.id("cities"),
    name: v.string(),
    nameEn: v.optional(v.string()),
    facilityType: v.union(
      v.literal("hospital"),
      v.literal("clinic"),
      v.literal("pharmacy"),
      v.literal("emergency"),
      v.literal("dental"),
      v.literal("specialist"),
    ),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    phone: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    operatingHours: v.optional(v.string()),
    is24Hour: v.boolean(),
    hasEnglishService: v.boolean(),
    hasEmergencyRoom: v.boolean(),
    specialties: v.optional(v.array(v.string())),
    insuranceAccepted: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("medicalFacilities", {
      ...args,
      verifiedAt: Date.now(),
      isActive: true,
    });
  },
});

// Update a medical facility
export const update = mutation({
  args: {
    id: v.id("medicalFacilities"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    facilityType: v.optional(
      v.union(
        v.literal("hospital"),
        v.literal("clinic"),
        v.literal("pharmacy"),
        v.literal("emergency"),
        v.literal("dental"),
        v.literal("specialist"),
      ),
    ),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    phone: v.optional(v.string()),
    emergencyPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    operatingHours: v.optional(v.string()),
    is24Hour: v.optional(v.boolean()),
    hasEnglishService: v.optional(v.boolean()),
    hasEmergencyRoom: v.optional(v.boolean()),
    specialties: v.optional(v.array(v.string())),
    insuranceAccepted: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      verifiedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete a medical facility (soft delete)
export const remove = mutation({
  args: { id: v.id("medicalFacilities") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});
