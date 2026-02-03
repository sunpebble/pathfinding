import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Travel Partners - Partner Request and Matching System
 * Handles travel partner finding, matching, and applications
 */

// Validators for common types
const travelStyleValidator = v.union(
  v.literal('adventure'),
  v.literal('relaxation'),
  v.literal('culture'),
  v.literal('food'),
  v.literal('nature'),
  v.literal('shopping'),
  v.literal('photography'),
  v.literal('budget'),
  v.literal('luxury'),
);

const ageRangeValidator = v.union(
  v.literal('18-25'),
  v.literal('26-35'),
  v.literal('36-45'),
  v.literal('46-55'),
  v.literal('55+'),
);

const genderValidator = v.union(
  v.literal('male'),
  v.literal('female'),
  v.literal('other'),
  v.literal('any'),
);

const requestStatusValidator = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('fulfilled'),
  v.literal('cancelled'),
  v.literal('expired'),
);

const applicationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('rejected'),
  v.literal('withdrawn'),
  v.literal('expired'),
);

const budgetRangeValidator = v.union(
  v.literal('budget'),
  v.literal('moderate'),
  v.literal('comfortable'),
  v.literal('luxury'),
);

// ============================================
// User Travel Preferences
// ============================================

/**
 * Get user's travel preferences
 */
export const getTravelPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userTravelPreferences')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();
  },
});

/**
 * Update or create user's travel preferences
 */
export const upsertTravelPreferences = mutation({
  args: {
    userId: v.string(),
    travelStyles: v.optional(v.array(travelStyleValidator)),
    preferredPace: v.optional(
      v.union(v.literal('slow'), v.literal('moderate'), v.literal('fast')),
    ),
    languages: v.optional(v.array(v.string())),
    ageRange: v.optional(ageRangeValidator),
    gender: v.optional(
      v.union(v.literal('male'), v.literal('female'), v.literal('other')),
    ),
    preferredPartnerGender: v.optional(genderValidator),
    bio: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    smokingPreference: v.optional(
      v.union(
        v.literal('smoker'),
        v.literal('non_smoker'),
        v.literal('no_preference'),
      ),
    ),
    accommodationPreference: v.optional(
      v.union(
        v.literal('hostel'),
        v.literal('budget_hotel'),
        v.literal('mid_range'),
        v.literal('luxury'),
        v.literal('no_preference'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTravelPreferences')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    const now = Date.now();
    const { userId, ...preferences } = args;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...preferences,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('userTravelPreferences', {
      userId,
      ...preferences,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================
// Travel Partner Requests
// ============================================

/**
 * List active partner requests with optional filters
 */
export const listRequests = query({
  args: {
    destination: v.optional(v.string()),
    cityId: v.optional(v.id('cities')),
    startDateFrom: v.optional(v.string()),
    startDateTo: v.optional(v.string()),
    travelStyles: v.optional(v.array(travelStyleValidator)),
    budgetRange: v.optional(budgetRangeValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get active requests
    let requests = await ctx.db
      .query('travelPartnerRequests')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .order('desc')
      .collect();

    // Apply filters
    if (args.destination) {
      const destLower = args.destination.toLowerCase();
      requests = requests.filter(r =>
        r.destination.toLowerCase().includes(destLower),
      );
    }

    if (args.cityId) {
      requests = requests.filter(r => r.destinationCityId === args.cityId);
    }

    if (args.startDateFrom) {
      requests = requests.filter(r => r.startDate >= args.startDateFrom!);
    }

    if (args.startDateTo) {
      requests = requests.filter(r => r.startDate <= args.startDateTo!);
    }

    if (args.budgetRange) {
      requests = requests.filter(r => r.budgetRange === args.budgetRange);
    }

    if (args.travelStyles && args.travelStyles.length > 0) {
      requests = requests.filter((r) => {
        if (!r.travelStyles)
          return false;
        return args.travelStyles!.some(style =>
          r.travelStyles!.includes(style),
        );
      });
    }

    const total = requests.length;
    const data = requests.slice(offset, offset + pageSize);

    // Enrich with user info and city data
    const enriched = await Promise.all(
      data.map(async (request) => {
        const city = request.destinationCityId
          ? await ctx.db.get(request.destinationCityId)
          : null;

        // Get user profile
        const profile = await ctx.db
          .query('profiles')
          .filter(q => q.eq(q.field('email'), request.userId))
          .first();

        // Get user trust score
        const trustScore = await ctx.db
          .query('userTrustScores')
          .withIndex('by_user', q => q.eq('userId', request.userId))
          .first();

        // Get user verifications count
        const verifications = await ctx.db
          .query('userVerifications')
          .withIndex('by_user', q => q.eq('userId', request.userId))
          .collect();
        const verifiedCount = verifications.filter(
          v => v.status === 'verified',
        ).length;

        return {
          ...request,
          cityName: city?.name,
          user: profile
            ? {
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                trustScore: trustScore?.overallScore ?? 0,
                badges: trustScore?.badges ?? [],
                verifiedCount,
              }
            : null,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Get a single partner request by ID
 */
export const getRequestById = query({
  args: { id: v.id('travelPartnerRequests') },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request)
      return null;

    const city = request.destinationCityId
      ? await ctx.db.get(request.destinationCityId)
      : null;

    // Get user profile
    const profile = await ctx.db
      .query('profiles')
      .filter(q => q.eq(q.field('email'), request.userId))
      .first();

    // Get user trust score
    const trustScore = await ctx.db
      .query('userTrustScores')
      .withIndex('by_user', q => q.eq('userId', request.userId))
      .first();

    // Get user verifications
    const verifications = await ctx.db
      .query('userVerifications')
      .withIndex('by_user', q => q.eq('userId', request.userId))
      .collect();

    // Get applications count
    const applications = await ctx.db
      .query('partnerMatchApplications')
      .withIndex('by_request', q => q.eq('requestId', args.id))
      .collect();

    // Get linked itinerary if exists
    const itinerary = request.itineraryId
      ? await ctx.db.get(request.itineraryId)
      : null;

    return {
      ...request,
      cityName: city?.name,
      user: profile
        ? {
            id: request.userId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
            trustScore: trustScore?.overallScore ?? 0,
            badges: trustScore?.badges ?? [],
            verifications: verifications.filter(v => v.status === 'verified'),
          }
        : null,
      applicationsCount: applications.length,
      pendingApplicationsCount: applications.filter(
        a => a.status === 'pending',
      ).length,
      itinerary: itinerary
        ? {
            id: itinerary._id,
            title: itinerary.title,
            startDate: itinerary.startDate,
            endDate: itinerary.endDate,
          }
        : null,
    };
  },
});

/**
 * List user's own partner requests
 */
export const listMyRequests = query({
  args: {
    userId: v.string(),
    status: v.optional(requestStatusValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let requests = await ctx.db
      .query('travelPartnerRequests')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    if (args.status) {
      requests = requests.filter(r => r.status === args.status);
    }

    const total = requests.length;
    const data = requests.slice(offset, offset + pageSize);

    // Enrich with city and application counts
    const enriched = await Promise.all(
      data.map(async (request) => {
        const city = request.destinationCityId
          ? await ctx.db.get(request.destinationCityId)
          : null;

        const applications = await ctx.db
          .query('partnerMatchApplications')
          .withIndex('by_request', q => q.eq('requestId', request._id))
          .collect();

        return {
          ...request,
          cityName: city?.name,
          applicationsCount: applications.length,
          pendingApplicationsCount: applications.filter(
            a => a.status === 'pending',
          ).length,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Create a new partner request
 */
export const createRequest = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    destination: v.string(),
    destinationCityId: v.optional(v.id('cities')),
    startDate: v.string(),
    endDate: v.string(),
    isFlexibleDates: v.optional(v.boolean()),
    currentGroupSize: v.optional(v.number()),
    maxGroupSize: v.number(),
    preferredGender: v.optional(genderValidator),
    preferredAgeRange: v.optional(v.array(ageRangeValidator)),
    travelStyles: v.optional(v.array(travelStyleValidator)),
    budgetRange: v.optional(budgetRangeValidator),
    estimatedBudget: v.optional(v.number()),
    itineraryId: v.optional(v.id('itineraries')),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert('travelPartnerRequests', {
      userId: args.userId,
      title: args.title,
      description: args.description,
      destination: args.destination,
      destinationCityId: args.destinationCityId,
      startDate: args.startDate,
      endDate: args.endDate,
      isFlexibleDates: args.isFlexibleDates ?? false,
      currentGroupSize: args.currentGroupSize ?? 1,
      maxGroupSize: args.maxGroupSize,
      preferredGender: args.preferredGender,
      preferredAgeRange: args.preferredAgeRange,
      travelStyles: args.travelStyles,
      budgetRange: args.budgetRange,
      estimatedBudget: args.estimatedBudget,
      itineraryId: args.itineraryId,
      coverImageUrl: args.coverImageUrl,
      imageUrls: args.imageUrls,
      status: 'active',
      viewCount: 0,
      applicationCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a partner request
 */
export const updateRequest = mutation({
  args: {
    id: v.id('travelPartnerRequests'),
    userId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    destination: v.optional(v.string()),
    destinationCityId: v.optional(v.id('cities')),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isFlexibleDates: v.optional(v.boolean()),
    maxGroupSize: v.optional(v.number()),
    preferredGender: v.optional(genderValidator),
    preferredAgeRange: v.optional(v.array(ageRangeValidator)),
    travelStyles: v.optional(v.array(travelStyleValidator)),
    budgetRange: v.optional(budgetRangeValidator),
    estimatedBudget: v.optional(v.number()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    status: v.optional(requestStatusValidator),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.userId !== args.userId) {
      throw new Error('You can only update your own requests');
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Delete a partner request
 */
export const deleteRequest = mutation({
  args: {
    id: v.id('travelPartnerRequests'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.userId !== args.userId) {
      throw new Error('You can only delete your own requests');
    }

    // Delete all related applications
    const applications = await ctx.db
      .query('partnerMatchApplications')
      .withIndex('by_request', q => q.eq('requestId', args.id))
      .collect();

    for (const app of applications) {
      await ctx.db.delete(app._id);
    }

    // Delete all related matches
    const matches = await ctx.db
      .query('partnerMatches')
      .withIndex('by_request', q => q.eq('requestId', args.id))
      .collect();

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    // Delete all saves
    const saves = await ctx.db
      .query('partnerRequestSaves')
      .withIndex('by_request', q => q.eq('requestId', args.id))
      .collect();

    for (const save of saves) {
      await ctx.db.delete(save._id);
    }

    // Delete the request
    await ctx.db.delete(args.id);
  },
});

/**
 * Increment view count for a request
 */
export const incrementViewCount = mutation({
  args: { id: v.id('travelPartnerRequests') },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (request) {
      await ctx.db.patch(args.id, {
        viewCount: request.viewCount + 1,
      });
    }
  },
});

// ============================================
// Partner Match Applications
// ============================================

/**
 * Apply to a partner request
 */
export const applyToRequest = mutation({
  args: {
    requestId: v.id('travelPartnerRequests'),
    applicantId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'active') {
      throw new Error('This request is no longer accepting applications');
    }

    if (request.userId === args.applicantId) {
      throw new Error('You cannot apply to your own request');
    }

    // Check if already applied
    const existing = await ctx.db
      .query('partnerMatchApplications')
      .withIndex('by_request', q => q.eq('requestId', args.requestId))
      .collect();

    const alreadyApplied = existing.find(
      a => a.applicantId === args.applicantId && a.status !== 'withdrawn',
    );
    if (alreadyApplied) {
      throw new Error('You have already applied to this request');
    }

    // Calculate match score
    const matchScore = await calculateMatchScore(
      ctx,
      args.applicantId,
      request,
    );

    const now = Date.now();
    const applicationId = await ctx.db.insert('partnerMatchApplications', {
      requestId: args.requestId,
      applicantId: args.applicantId,
      requestOwnerId: request.userId,
      message: args.message,
      matchScore: matchScore.overall,
      matchFactors: matchScore.factors,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Update request application count
    await ctx.db.patch(args.requestId, {
      applicationCount: request.applicationCount + 1,
    });

    return applicationId;
  },
});

/**
 * Calculate match score between applicant and request
 */
async function calculateMatchScore(
  ctx: QueryCtx | MutationCtx,
  applicantId: string,
  request: {
    preferredAgeRange?: string[];
    preferredGender?: string;
    travelStyles?: string[];
    budgetRange?: string;
  },
) {
  // Get applicant's preferences
  const applicantPrefs = await ctx.db
    .query('userTravelPreferences')
    .withIndex('by_user', q => q.eq('userId', applicantId))
    .first();

  const factors: {
    styleMatch?: number;
    ageMatch?: number;
    budgetMatch?: number;
    languageMatch?: number;
    interestMatch?: number;
  } = {};

  let totalScore = 0;
  let factorCount = 0;

  // Travel style match
  if (request.travelStyles && applicantPrefs?.travelStyles) {
    const matchingStyles = request.travelStyles.filter(style =>
      applicantPrefs.travelStyles!.includes(
        style as typeof applicantPrefs.travelStyles extends
        | (infer T)[]
        | undefined
          ? T
          : never,
      ),
    );
    factors.styleMatch = Math.round(
      (matchingStyles.length
        / Math.max(
          request.travelStyles.length,
          applicantPrefs.travelStyles.length,
        ))
        * 100,
    );
    totalScore += factors.styleMatch;
    factorCount++;
  }

  // Age range match
  if (request.preferredAgeRange && applicantPrefs?.ageRange) {
    factors.ageMatch = request.preferredAgeRange.includes(
      applicantPrefs.ageRange,
    )
      ? 100
      : 50;
    totalScore += factors.ageMatch;
    factorCount++;
  }

  // Budget match (simplified)
  if (request.budgetRange && applicantPrefs?.accommodationPreference) {
    const budgetMap: Record<string, string[]> = {
      budget: ['hostel', 'budget_hotel'],
      moderate: ['budget_hotel', 'mid_range'],
      comfortable: ['mid_range', 'luxury'],
      luxury: ['luxury'],
    };
    const compatibleAccommodations = budgetMap[request.budgetRange] || [];
    factors.budgetMatch = compatibleAccommodations.includes(
      applicantPrefs.accommodationPreference,
    )
      ? 100
      : 60;
    totalScore += factors.budgetMatch;
    factorCount++;
  }

  // Calculate overall score
  const overall = factorCount > 0 ? Math.round(totalScore / factorCount) : 70;

  return { overall, factors };
}

/**
 * List applications for a request (for request owner)
 */
export const listApplications = query({
  args: {
    requestId: v.id('travelPartnerRequests'),
    userId: v.string(),
    status: v.optional(applicationStatusValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.userId !== args.userId) {
      throw new Error('Only the request owner can view applications');
    }

    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let applications = await ctx.db
      .query('partnerMatchApplications')
      .withIndex('by_request', q => q.eq('requestId', args.requestId))
      .order('desc')
      .collect();

    if (args.status) {
      applications = applications.filter(a => a.status === args.status);
    }

    const total = applications.length;
    const data = applications.slice(offset, offset + pageSize);

    // Enrich with applicant info
    const enriched = await Promise.all(
      data.map(async (app) => {
        const profile = await ctx.db
          .query('profiles')
          .filter(q => q.eq(q.field('email'), app.applicantId))
          .first();

        const trustScore = await ctx.db
          .query('userTrustScores')
          .withIndex('by_user', q => q.eq('userId', app.applicantId))
          .first();

        const verifications = await ctx.db
          .query('userVerifications')
          .withIndex('by_user', q => q.eq('userId', app.applicantId))
          .collect();

        const prefs = await ctx.db
          .query('userTravelPreferences')
          .withIndex('by_user', q => q.eq('userId', app.applicantId))
          .first();

        return {
          ...app,
          applicant: profile
            ? {
                id: app.applicantId,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                bio: profile.bio,
                trustScore: trustScore?.overallScore ?? 0,
                badges: trustScore?.badges ?? [],
                verifications: verifications.filter(
                  v => v.status === 'verified',
                ),
                preferences: prefs,
              }
            : null,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * List user's own applications
 */
export const listMyApplications = query({
  args: {
    userId: v.string(),
    status: v.optional(applicationStatusValidator),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let applications = await ctx.db
      .query('partnerMatchApplications')
      .withIndex('by_applicant', q => q.eq('applicantId', args.userId))
      .order('desc')
      .collect();

    if (args.status) {
      applications = applications.filter(a => a.status === args.status);
    }

    const total = applications.length;
    const data = applications.slice(offset, offset + pageSize);

    // Enrich with request info
    const enriched = await Promise.all(
      data.map(async (app) => {
        const request = await ctx.db.get(app.requestId);
        const city = request?.destinationCityId
          ? await ctx.db.get(request.destinationCityId)
          : null;

        return {
          ...app,
          request: request
            ? {
                id: request._id,
                title: request.title,
                destination: request.destination,
                cityName: city?.name,
                startDate: request.startDate,
                endDate: request.endDate,
                status: request.status,
              }
            : null,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Accept an application
 */
export const acceptApplication = mutation({
  args: {
    applicationId: v.id('partnerMatchApplications'),
    userId: v.string(),
    responseMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.requestOwnerId !== args.userId) {
      throw new Error('Only the request owner can accept applications');
    }

    if (application.status !== 'pending') {
      throw new Error('This application has already been processed');
    }

    const request = await ctx.db.get(application.requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const now = Date.now();

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: 'accepted',
      responseMessage: args.responseMessage,
      respondedAt: now,
      updatedAt: now,
    });

    // Create a match record
    const matchId = await ctx.db.insert('partnerMatches', {
      requestId: application.requestId,
      applicationId: args.applicationId,
      requestOwnerId: args.userId,
      partnerId: application.applicantId,
      matchScore: application.matchScore ?? 0,
      matchedAt: now,
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Update request current group size
    await ctx.db.patch(application.requestId, {
      currentGroupSize: request.currentGroupSize + 1,
      updatedAt: now,
    });

    // If group is full, update request status
    if (request.currentGroupSize + 1 >= request.maxGroupSize) {
      await ctx.db.patch(application.requestId, {
        status: 'fulfilled',
      });
    }

    return matchId;
  },
});

/**
 * Reject an application
 */
export const rejectApplication = mutation({
  args: {
    applicationId: v.id('partnerMatchApplications'),
    userId: v.string(),
    responseMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.requestOwnerId !== args.userId) {
      throw new Error('Only the request owner can reject applications');
    }

    if (application.status !== 'pending') {
      throw new Error('This application has already been processed');
    }

    const now = Date.now();
    await ctx.db.patch(args.applicationId, {
      status: 'rejected',
      responseMessage: args.responseMessage,
      respondedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Withdraw an application
 */
export const withdrawApplication = mutation({
  args: {
    applicationId: v.id('partnerMatchApplications'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.applicantId !== args.userId) {
      throw new Error('You can only withdraw your own applications');
    }

    if (application.status !== 'pending') {
      throw new Error('This application can no longer be withdrawn');
    }

    await ctx.db.patch(args.applicationId, {
      status: 'withdrawn',
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Partner Matches
// ============================================

/**
 * List user's matches (as owner or partner)
 */
export const listMatches = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal('active'),
        v.literal('completed'),
        v.literal('cancelled'),
      ),
    ),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get matches where user is owner
    const ownerMatches = await ctx.db
      .query('partnerMatches')
      .withIndex('by_owner', q => q.eq('requestOwnerId', args.userId))
      .collect();

    // Get matches where user is partner
    const partnerMatches = await ctx.db
      .query('partnerMatches')
      .withIndex('by_partner', q => q.eq('partnerId', args.userId))
      .collect();

    // Combine and deduplicate
    let allMatches = [
      ...ownerMatches.map(m => ({ ...m, userRole: 'owner' as const })),
      ...partnerMatches.map(m => ({ ...m, userRole: 'partner' as const })),
    ];

    if (args.status) {
      allMatches = allMatches.filter(m => m.status === args.status);
    }

    // Sort by createdAt descending
    allMatches.sort((a, b) => b.createdAt - a.createdAt);

    const total = allMatches.length;
    const data = allMatches.slice(offset, offset + pageSize);

    // Enrich with partner info
    const enriched = await Promise.all(
      data.map(async (match) => {
        const otherUserId
          = match.userRole === 'owner' ? match.partnerId : match.requestOwnerId;

        const profile = await ctx.db
          .query('profiles')
          .filter(q => q.eq(q.field('email'), otherUserId))
          .first();

        const request = await ctx.db.get(match.requestId);

        return {
          ...match,
          otherUser: profile
            ? {
                id: otherUserId,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              }
            : null,
          request: request
            ? {
                title: request.title,
                coverImageUrl: request.coverImageUrl,
              }
            : null,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Submit feedback for a match
 */
export const submitMatchFeedback = mutation({
  args: {
    matchId: v.id('partnerMatches'),
    userId: v.string(),
    rating: v.number(),
    review: v.optional(v.string()),
    wouldTravelAgain: v.boolean(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const now = Date.now();
    const feedback = {
      rating: args.rating,
      review: args.review,
      wouldTravelAgain: args.wouldTravelAgain,
      createdAt: now,
    };

    if (match.requestOwnerId === args.userId) {
      await ctx.db.patch(args.matchId, {
        ownerFeedback: feedback,
        updatedAt: now,
      });
    }
    else if (match.partnerId === args.userId) {
      await ctx.db.patch(args.matchId, {
        partnerFeedback: feedback,
        updatedAt: now,
      });
    }
    else {
      throw new Error('You are not part of this match');
    }

    // If both feedbacks are submitted, mark as completed
    const updatedMatch = await ctx.db.get(args.matchId);
    if (updatedMatch?.ownerFeedback && updatedMatch?.partnerFeedback) {
      await ctx.db.patch(args.matchId, {
        status: 'completed',
      });
    }

    // Update trust scores for both users
    await updateTrustScore(ctx, match.requestOwnerId);
    await updateTrustScore(ctx, match.partnerId);
  },
});

/**
 * Update user's trust score based on their activity and feedback
 */
async function updateTrustScore(ctx: MutationCtx, userId: string) {
  // Get all verifications
  const verifications = await ctx.db
    .query('userVerifications')
    .withIndex('by_user', q => q.eq('userId', userId))
    .collect();
  const verifiedCount = verifications.filter(
    v => v.status === 'verified',
  ).length;
  const verificationScore = Math.min(verifiedCount * 15, 30);

  // Get all matches for feedback
  const ownerMatches = await ctx.db
    .query('partnerMatches')
    .withIndex('by_owner', q => q.eq('requestOwnerId', userId))
    .collect();
  const partnerMatches = await ctx.db
    .query('partnerMatches')
    .withIndex('by_partner', q => q.eq('partnerId', userId))
    .collect();

  const allMatches = [...ownerMatches, ...partnerMatches];
  const completedMatches = allMatches.filter(m => m.status === 'completed');
  const cancelledMatches = allMatches.filter(m => m.status === 'cancelled');

  // Calculate ratings received
  const ratings: number[] = [];
  for (const match of completedMatches) {
    if (match.requestOwnerId === userId && match.partnerFeedback) {
      ratings.push(match.partnerFeedback.rating);
    }
    else if (match.partnerId === userId && match.ownerFeedback) {
      ratings.push(match.ownerFeedback.rating);
    }
  }

  const averageRating
    = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;
  const feedbackScore = Math.round((averageRating / 5) * 30);

  // Activity score based on completed matches
  const activityScore = Math.min(completedMatches.length * 5, 20);

  // Response score (placeholder - would need to track response times)
  const responseScore = 15;

  // Calculate overall score
  const overallScore
    = verificationScore + feedbackScore + activityScore + responseScore;

  // Determine badges
  const badges: string[] = [];
  if (verifiedCount > 0)
    badges.push('verified_identity');
  if (completedMatches.length >= 5)
    badges.push('experienced');
  if (averageRating >= 4.5 && ratings.length >= 3)
    badges.push('top_rated');
  if (overallScore >= 70)
    badges.push('trusted_traveler');

  const now = Date.now();

  // Check if trust score exists
  const existing = await ctx.db
    .query('userTrustScores')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      overallScore,
      verificationScore,
      activityScore,
      feedbackScore,
      responseScore,
      totalTrips: completedMatches.length,
      successfulMatches: completedMatches.length,
      cancelledMatches: cancelledMatches.length,
      averageRating: averageRating > 0 ? averageRating : undefined,
      totalRatings: ratings.length,
      badges: badges as ('verified_identity' | 'experienced' | 'top_rated' | 'trusted_traveler')[],
      lastCalculatedAt: now,
      updatedAt: now,
    });
  }
  else {
    await ctx.db.insert('userTrustScores', {
      userId,
      overallScore,
      verificationScore,
      activityScore,
      feedbackScore,
      responseScore,
      totalTrips: completedMatches.length,
      successfulMatches: completedMatches.length,
      cancelledMatches: cancelledMatches.length,
      averageRating: averageRating > 0 ? averageRating : undefined,
      totalRatings: ratings.length,
      badges: badges as ('verified_identity' | 'experienced' | 'top_rated' | 'trusted_traveler')[],
      lastCalculatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ============================================
// Request Saves (Favorites)
// ============================================

/**
 * Save/unsave a partner request
 */
export const toggleSaveRequest = mutation({
  args: {
    requestId: v.id('travelPartnerRequests'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('partnerRequestSaves')
      .withIndex('by_user_request', q =>
        q.eq('userId', args.userId).eq('requestId', args.requestId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert('partnerRequestSaves', {
      userId: args.userId,
      requestId: args.requestId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

/**
 * List user's saved requests
 */
export const listSavedRequests = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const saves = await ctx.db
      .query('partnerRequestSaves')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const total = saves.length;
    const data = saves.slice(offset, offset + pageSize);

    // Enrich with request data
    const enriched = await Promise.all(
      data.map(async (save) => {
        const request = await ctx.db.get(save.requestId);
        if (!request)
          return null;

        const city = request.destinationCityId
          ? await ctx.db.get(request.destinationCityId)
          : null;

        const profile = await ctx.db
          .query('profiles')
          .filter(q => q.eq(q.field('email'), request.userId))
          .first();

        return {
          ...save,
          request: {
            ...request,
            cityName: city?.name,
            user: profile
              ? {
                  displayName: profile.displayName,
                  avatarUrl: profile.avatarUrl,
                }
              : null,
          },
        };
      }),
    );

    return {
      data: enriched.filter(e => e !== null),
      total,
    };
  },
});

/**
 * Check if a request is saved by user
 */
export const isRequestSaved = query({
  args: {
    requestId: v.id('travelPartnerRequests'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('partnerRequestSaves')
      .withIndex('by_user_request', q =>
        q.eq('userId', args.userId).eq('requestId', args.requestId))
      .first();

    return existing !== null;
  },
});

// ============================================
// User Verifications
// ============================================

/**
 * Get user's verifications
 */
export const getUserVerifications = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userVerifications')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();
  },
});

/**
 * Submit a verification request
 */
export const submitVerification = mutation({
  args: {
    userId: v.string(),
    verificationType: v.union(
      v.literal('identity'),
      v.literal('phone'),
      v.literal('email'),
      v.literal('social'),
      v.literal('travel_history'),
      v.literal('reference'),
    ),
    verificationData: v.optional(v.string()),
    verificationMethod: v.optional(v.string()),
    socialPlatform: v.optional(v.string()),
    socialId: v.optional(v.string()),
    referenceUserId: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if verification already exists
    const existing = await ctx.db
      .query('userVerifications')
      .withIndex('by_user_type', q =>
        q
          .eq('userId', args.userId)
          .eq('verificationType', args.verificationType))
      .first();

    if (existing && existing.status === 'verified') {
      throw new Error('This verification type is already verified');
    }

    const now = Date.now();
    const { userId, verificationType, ...data } = args;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...data,
        status: 'pending',
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('userVerifications', {
      userId,
      verificationType,
      ...data,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get user's trust score
 */
export const getUserTrustScore = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userTrustScores')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();
  },
});
