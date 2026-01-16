/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Insurance - Travel Insurance Queries and Mutations
 */

// Insurance type validator
const insuranceTypeValidator = v.union(
  v.literal('comprehensive'),
  v.literal('medical'),
  v.literal('accident'),
  v.literal('flight_delay'),
  v.literal('luggage'),
  v.literal('cancellation'),
  v.literal('emergency_evacuation')
);

// Risk level validator
const riskLevelValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('extreme')
);

// Claim type validator
const claimTypeValidator = v.union(
  v.literal('medical'),
  v.literal('accident'),
  v.literal('flight_delay'),
  v.literal('luggage_loss'),
  v.literal('trip_cancellation'),
  v.literal('emergency_evacuation'),
  v.literal('other')
);

// ============================================
// Insurance Products Queries
// ============================================

// List all active insurance products
export const listProducts = query({
  args: {
    type: v.optional(insuranceTypeValidator),
    domesticOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.type) {
      results = await ctx.db
        .query('insuranceProducts')
        .withIndex('by_type', (q) => q.eq('type', args.type!))
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
    } else if (args.domesticOnly !== undefined) {
      results = await ctx.db
        .query('insuranceProducts')
        .withIndex('by_domestic', (q) =>
          q.eq('domesticOnly', args.domesticOnly!)
        )
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
    } else {
      results = await ctx.db
        .query('insuranceProducts')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect();
    }

    // Sort by priority
    results.sort((a, b) => b.priority - a.priority);

    return args.limit ? results.slice(0, args.limit) : results;
  },
});

// Get insurance product by ID
export const getProductById = query({
  args: { id: v.id('insuranceProducts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get recommended insurance products for a destination
export const getRecommendedProducts = query({
  args: {
    destination: v.string(),
    tripDays: v.number(),
    riskLevel: v.optional(riskLevelValidator),
  },
  handler: async (ctx, args) => {
    // First, try to find the destination risk profile
    const riskProfile = await ctx.db
      .query('destinationRiskProfiles')
      .withIndex('by_destination', (q) => q.eq('destination', args.destination))
      .first();

    const effectiveRiskLevel =
      args.riskLevel || riskProfile?.riskLevel || 'medium';
    const recommendedTypes = riskProfile?.recommendedInsuranceTypes || [
      'comprehensive',
      'medical',
      'accident',
    ];

    // Get all active products
    const allProducts = await ctx.db
      .query('insuranceProducts')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .collect();

    // Filter products that:
    // 1. Cover the risk level
    // 2. Have trip days within min/max range
    // 3. Are of recommended types (prioritized)
    const filteredProducts = allProducts.filter((product) => {
      const coversRiskLevel =
        product.riskLevelCoverage.includes(effectiveRiskLevel);
      const coversDuration =
        args.tripDays >= product.minDays && args.tripDays <= product.maxDays;
      return coversRiskLevel && coversDuration;
    });

    // Sort: recommended types first, then by priority and rating
    filteredProducts.sort((a, b) => {
      const aIsRecommended = recommendedTypes.includes(a.type) ? 1 : 0;
      const bIsRecommended = recommendedTypes.includes(b.type) ? 1 : 0;

      if (aIsRecommended !== bIsRecommended) {
        return bIsRecommended - aIsRecommended;
      }

      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then by rating
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return {
      products: filteredProducts,
      riskProfile,
      effectiveRiskLevel,
      recommendedTypes,
    };
  },
});

// Compare insurance products
export const compareProducts = query({
  args: {
    productIds: v.array(v.id('insuranceProducts')),
  },
  handler: async (ctx, args) => {
    const products = await Promise.all(
      args.productIds.map((id) => ctx.db.get(id))
    );

    return products.filter((p) => p !== null);
  },
});

// ============================================
// User Insurance Queries
// ============================================

// List user's insurance policies
export const listUserInsurance = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('active'),
        v.literal('expired'),
        v.literal('cancelled'),
        v.literal('claimed')
      )
    ),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.status) {
      results = await ctx.db
        .query('userInsurance')
        .withIndex('by_user_status', (q) =>
          q.eq('userId', args.userId).eq('status', args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query('userInsurance')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();
    }

    // Sort by purchase date descending
    results.sort((a, b) => b.purchasedAt - a.purchasedAt);

    return results;
  },
});

// Get user insurance by ID
export const getUserInsuranceById = query({
  args: { id: v.id('userInsurance') },
  handler: async (ctx, args) => {
    const insurance = await ctx.db.get(args.id);
    if (!insurance) return null;

    // Also fetch the product details
    const product = await ctx.db.get(insurance.productId);

    return {
      ...insurance,
      product,
    };
  },
});

// Get insurance for an itinerary
export const getInsuranceByItinerary = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    const insurances = await ctx.db
      .query('userInsurance')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Fetch product details for each insurance
    const results = await Promise.all(
      insurances.map(async (insurance) => {
        const product = await ctx.db.get(insurance.productId);
        return { ...insurance, product };
      })
    );

    return results;
  },
});

// ============================================
// User Insurance Mutations
// ============================================

// Create user insurance record
export const createUserInsurance = mutation({
  args: {
    userId: v.string(),
    productId: v.id('insuranceProducts'),
    itineraryId: v.optional(v.id('itineraries')),
    startDate: v.string(),
    endDate: v.string(),
    coverageDays: v.number(),
    destinations: v.array(v.string()),
    insuredPersons: v.array(
      v.object({
        name: v.string(),
        idType: v.union(
          v.literal('id_card'),
          v.literal('passport'),
          v.literal('other')
        ),
        idNumber: v.string(),
        phone: v.optional(v.string()),
        relationship: v.union(
          v.literal('self'),
          v.literal('spouse'),
          v.literal('child'),
          v.literal('parent'),
          v.literal('other')
        ),
      })
    ),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert('userInsurance', {
      ...args,
      paymentStatus: 'pending',
      status: 'pending',
      purchasedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update user insurance status
export const updateUserInsuranceStatus = mutation({
  args: {
    id: v.id('userInsurance'),
    status: v.union(
      v.literal('pending'),
      v.literal('active'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('claimed')
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('paid'),
        v.literal('refunded'),
        v.literal('failed')
      )
    ),
    orderNumber: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Add claim to user insurance
export const addInsuranceClaim = mutation({
  args: {
    insuranceId: v.id('userInsurance'),
    claimType: v.string(),
    claimAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const insurance = await ctx.db.get(args.insuranceId);
    if (!insurance) {
      throw new Error('Insurance not found');
    }

    const newClaim = {
      claimId: `CLM-${Date.now()}`,
      claimDate: Date.now(),
      claimType: args.claimType,
      claimAmount: args.claimAmount,
      status: 'submitted' as const,
      notes: args.notes,
    };

    const existingClaims = insurance.claimHistory || [];

    await ctx.db.patch(args.insuranceId, {
      claimHistory: [...existingClaims, newClaim],
      status: 'claimed',
      updatedAt: Date.now(),
    });

    return newClaim;
  },
});

// ============================================
// Destination Risk Profiles
// ============================================

// Get destination risk profile
export const getDestinationRiskProfile = query({
  args: {
    destination: v.optional(v.string()),
    destinationCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.destination) {
      return await ctx.db
        .query('destinationRiskProfiles')
        .withIndex('by_destination', (q) =>
          q.eq('destination', args.destination!)
        )
        .first();
    }

    if (args.destinationCode) {
      return await ctx.db
        .query('destinationRiskProfiles')
        .withIndex('by_code', (q) =>
          q.eq('destinationCode', args.destinationCode!)
        )
        .first();
    }

    return null;
  },
});

// List destinations by risk level
export const listDestinationsByRiskLevel = query({
  args: {
    riskLevel: riskLevelValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('destinationRiskProfiles')
      .withIndex('by_risk_level', (q) => q.eq('riskLevel', args.riskLevel))
      .collect();
  },
});

// ============================================
// Insurance Claim Guides
// ============================================

// List claim guides
export const listClaimGuides = query({
  args: {
    claimType: v.optional(claimTypeValidator),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.claimType) {
      results = await ctx.db
        .query('insuranceClaimGuides')
        .withIndex('by_claim_type', (q) => q.eq('claimType', args.claimType!))
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect();
    } else {
      results = await ctx.db
        .query('insuranceClaimGuides')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect();
    }

    // Sort by priority
    results.sort((a, b) => b.priority - a.priority);

    return results;
  },
});

// Get claim guide by ID
export const getClaimGuideById = query({
  args: { id: v.id('insuranceClaimGuides') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================
// Admin Mutations (for seeding data)
// ============================================

// Create insurance product
export const createProduct = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    provider: v.string(),
    providerLogo: v.optional(v.string()),
    type: insuranceTypeValidator,
    coverageAmount: v.number(),
    coverageDetails: v.array(
      v.object({
        item: v.string(),
        amount: v.number(),
        description: v.optional(v.string()),
      })
    ),
    pricePerDay: v.number(),
    minDays: v.number(),
    maxDays: v.number(),
    applicableRegions: v.array(v.string()),
    domesticOnly: v.boolean(),
    riskLevelCoverage: v.array(riskLevelValidator),
    features: v.array(v.string()),
    exclusions: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
    reviewCount: v.number(),
    purchaseUrl: v.string(),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('insuranceProducts', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create destination risk profile
export const createDestinationRiskProfile = mutation({
  args: {
    destination: v.string(),
    destinationCode: v.optional(v.string()),
    riskLevel: riskLevelValidator,
    riskFactors: v.array(v.string()),
    recommendedInsuranceTypes: v.array(insuranceTypeValidator),
    travelAdvisory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('destinationRiskProfiles', {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

// Create claim guide
export const createClaimGuide = mutation({
  args: {
    title: v.string(),
    claimType: claimTypeValidator,
    content: v.string(),
    steps: v.array(
      v.object({
        stepNumber: v.number(),
        title: v.string(),
        description: v.string(),
        requiredDocuments: v.optional(v.array(v.string())),
        tips: v.optional(v.string()),
      })
    ),
    requiredDocuments: v.array(v.string()),
    timeLimit: v.optional(v.string()),
    contactInfo: v.optional(
      v.object({
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
    faqs: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        })
      )
    ),
    isActive: v.boolean(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('insuranceClaimGuides', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
