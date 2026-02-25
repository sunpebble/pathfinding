/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Travel Insurance - User's travel insurance information management
 */

// List all insurance policies for a user
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const policies = await ctx.db
      .query("travelInsurance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by active first, then by end date (newest first)
    policies.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.endDate.localeCompare(a.endDate);
    });

    return policies;
  },
});

// Get a single insurance policy by ID
export const getById = query({
  args: { id: v.id("travelInsurance") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get active insurance policies for a user
export const getActive = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const policies = await ctx.db
      .query("travelInsurance")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .collect();

    return policies;
  },
});

// Get current valid insurance (active and within date range)
export const getCurrentValid = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const policies = await ctx.db
      .query("travelInsurance")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .collect();

    // Filter for policies that are currently valid
    const validPolicies = policies.filter(
      (p) => p.startDate <= today && p.endDate >= today,
    );

    return validPolicies;
  },
});

// Create a new insurance policy
export const create = mutation({
  args: {
    userId: v.string(),
    providerName: v.string(),
    policyNumber: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    emergencyHotline: v.string(),
    claimsPhone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    coverageType: v.string(),
    coverageAmount: v.optional(v.string()),
    medicalCoverage: v.optional(v.string()),
    evacuationCoverage: v.optional(v.string()),
    policyDocumentUrl: v.optional(v.string()),
    insuranceCardUrl: v.optional(v.string()),
    coveredRegions: v.optional(v.array(v.string())),
    exclusions: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("travelInsurance", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an insurance policy
export const update = mutation({
  args: {
    id: v.id("travelInsurance"),
    providerName: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    emergencyHotline: v.optional(v.string()),
    claimsPhone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    coverageType: v.optional(v.string()),
    coverageAmount: v.optional(v.string()),
    medicalCoverage: v.optional(v.string()),
    evacuationCoverage: v.optional(v.string()),
    policyDocumentUrl: v.optional(v.string()),
    insuranceCardUrl: v.optional(v.string()),
    coveredRegions: v.optional(v.array(v.string())),
    exclusions: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Insurance policy not found");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

// Delete an insurance policy
export const remove = mutation({
  args: { id: v.id("travelInsurance") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Toggle insurance active status
export const toggleActive = mutation({
  args: { id: v.id("travelInsurance") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Insurance policy not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !existing.isActive,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
