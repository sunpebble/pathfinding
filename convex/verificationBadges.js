import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Verification Badges - User certification management
 * Includes travel expert, local guide, and official account badges
 */
// Badge type validator
const badgeTypeValidator = v.union(v.literal('travel_expert'), v.literal('local_guide'), v.literal('official_account'));
// Application status validator
const applicationStatusValidator = v.union(v.literal('pending'), v.literal('under_review'), v.literal('approved'), v.literal('rejected'), v.literal('cancelled'));
// ID type validator
const idTypeValidator = v.union(v.literal('id_card'), v.literal('passport'), v.literal('business_license'));
// Supporting material type validator
const materialTypeValidator = v.union(v.literal('id_photo'), v.literal('work_proof'), v.literal('portfolio'), v.literal('certificate'), v.literal('other'));
// Badge display names
const BADGE_DISPLAY_NAMES = {
    travel_expert: '旅行达人',
    local_guide: '本地向导',
    official_account: '官方账号',
};
// Badge colors
const BADGE_COLORS = {
    travel_expert: '#FF6B6B',
    local_guide: '#4ECDC4',
    official_account: '#45B7D1',
};
// ============================================
// Badge Queries
// ============================================
// Get all active badges for a user
export const getUserBadges = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const badges = await ctx.db
            .query('verificationBadges')
            .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
            .collect();
        // Filter out expired badges
        const now = Date.now();
        return badges.filter((badge) => !badge.expiresAt || badge.expiresAt > now);
    },
});
// Get a specific badge by ID
export const getBadgeById = query({
    args: { id: v.id('verificationBadges') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Check if user has a specific badge type
export const hasBadge = query({
    args: {
        userId: v.string(),
        badgeType: badgeTypeValidator,
    },
    handler: async (ctx, args) => {
        const badge = await ctx.db
            .query('verificationBadges')
            .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('badgeType', args.badgeType))
            .first();
        if (!badge || !badge.isActive) {
            return false;
        }
        // Check expiration
        if (badge.expiresAt && badge.expiresAt < Date.now()) {
            return false;
        }
        return true;
    },
});
// Get all badges of a specific type (admin)
export const listBadgesByType = query({
    args: {
        badgeType: badgeTypeValidator,
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        return await ctx.db
            .query('verificationBadges')
            .withIndex('by_type', (q) => q.eq('badgeType', args.badgeType))
            .take(limit);
    },
});
// ============================================
// Badge Mutations
// ============================================
// Create a new badge (internal - called when application is approved)
export const createBadge = mutation({
    args: {
        userId: v.string(),
        badgeType: badgeTypeValidator,
        description: v.optional(v.string()),
        iconUrl: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        verifiedBy: v.optional(v.string()),
        metadata: v.optional(v.object({
            travelExpertLevel: v.optional(v.number()),
            specialties: v.optional(v.array(v.string())),
            totalGuides: v.optional(v.number()),
            totalLikes: v.optional(v.number()),
            localCity: v.optional(v.string()),
            localCityId: v.optional(v.id('cities')),
            yearsOfResidence: v.optional(v.number()),
            languages: v.optional(v.array(v.string())),
            organizationName: v.optional(v.string()),
            organizationType: v.optional(v.string()),
            officialWebsite: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        // Check if user already has this badge type
        const existing = await ctx.db
            .query('verificationBadges')
            .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('badgeType', args.badgeType))
            .first();
        if (existing && existing.isActive) {
            throw new Error('用户已拥有此类型的认证徽章');
        }
        const now = Date.now();
        const badgeId = await ctx.db.insert('verificationBadges', {
            userId: args.userId,
            badgeType: args.badgeType,
            displayName: BADGE_DISPLAY_NAMES[args.badgeType],
            description: args.description,
            iconUrl: args.iconUrl,
            color: BADGE_COLORS[args.badgeType],
            verifiedAt: now,
            expiresAt: args.expiresAt,
            verifiedBy: args.verifiedBy,
            isActive: true,
            metadata: args.metadata,
            createdAt: now,
            updatedAt: now,
        });
        return badgeId;
    },
});
// Revoke a badge
export const revokeBadge = mutation({
    args: {
        badgeId: v.id('verificationBadges'),
        reason: v.string(),
        revokedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const badge = await ctx.db.get(args.badgeId);
        if (!badge) {
            throw new Error('徽章不存在');
        }
        if (!badge.isActive) {
            throw new Error('徽章已被撤销');
        }
        const now = Date.now();
        await ctx.db.patch(args.badgeId, {
            isActive: false,
            revokedAt: now,
            revokedReason: args.reason,
            updatedAt: now,
        });
    },
});
// Reactivate a revoked badge
export const reactivateBadge = mutation({
    args: {
        badgeId: v.id('verificationBadges'),
        newExpiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const badge = await ctx.db.get(args.badgeId);
        if (!badge) {
            throw new Error('徽章不存在');
        }
        const now = Date.now();
        await ctx.db.patch(args.badgeId, {
            isActive: true,
            revokedAt: undefined,
            revokedReason: undefined,
            expiresAt: args.newExpiresAt,
            updatedAt: now,
        });
    },
});
// Update badge metadata
export const updateBadgeMetadata = mutation({
    args: {
        badgeId: v.id('verificationBadges'),
        metadata: v.object({
            travelExpertLevel: v.optional(v.number()),
            specialties: v.optional(v.array(v.string())),
            totalGuides: v.optional(v.number()),
            totalLikes: v.optional(v.number()),
            localCity: v.optional(v.string()),
            localCityId: v.optional(v.id('cities')),
            yearsOfResidence: v.optional(v.number()),
            languages: v.optional(v.array(v.string())),
            organizationName: v.optional(v.string()),
            organizationType: v.optional(v.string()),
            officialWebsite: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const badge = await ctx.db.get(args.badgeId);
        if (!badge) {
            throw new Error('徽章不存在');
        }
        await ctx.db.patch(args.badgeId, {
            metadata: args.metadata,
            updatedAt: Date.now(),
        });
    },
});
// ============================================
// Application Queries
// ============================================
// Get user's applications
export const getUserApplications = query({
    args: {
        userId: v.string(),
        status: v.optional(applicationStatusValidator),
    },
    handler: async (ctx, args) => {
        if (args.status) {
            return await ctx.db
                .query('verificationApplications')
                .withIndex('by_user_status', (q) => q.eq('userId', args.userId).eq('status', args.status))
                .collect();
        }
        return await ctx.db
            .query('verificationApplications')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
    },
});
// Get application by ID
export const getApplicationById = query({
    args: { id: v.id('verificationApplications') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// List pending applications (admin)
export const listPendingApplications = query({
    args: {
        badgeType: v.optional(badgeTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        let applications;
        if (args.badgeType) {
            applications = await ctx.db
                .query('verificationApplications')
                .withIndex('by_type', (q) => q.eq('badgeType', args.badgeType))
                .filter((q) => q.or(q.eq(q.field('status'), 'pending'), q.eq(q.field('status'), 'under_review')))
                .take(limit);
        }
        else {
            applications = await ctx.db
                .query('verificationApplications')
                .withIndex('by_status', (q) => q.eq('status', 'pending'))
                .take(limit);
            // Also get under_review
            const underReview = await ctx.db
                .query('verificationApplications')
                .withIndex('by_status', (q) => q.eq('status', 'under_review'))
                .take(limit);
            applications = [...applications, ...underReview].slice(0, limit);
        }
        return applications;
    },
});
// ============================================
// Application Mutations
// ============================================
// Submit a new application
export const submitApplication = mutation({
    args: {
        userId: v.string(),
        badgeType: badgeTypeValidator,
        realName: v.string(),
        idType: idTypeValidator,
        idNumber: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        applicationReason: v.string(),
        supportingMaterials: v.optional(v.array(v.object({
            type: materialTypeValidator,
            url: v.string(),
            description: v.optional(v.string()),
        }))),
        applicationData: v.optional(v.object({
            travelExperience: v.optional(v.string()),
            socialMediaLinks: v.optional(v.array(v.string())),
            publishedGuideIds: v.optional(v.array(v.string())),
            localCity: v.optional(v.string()),
            residenceProof: v.optional(v.string()),
            yearsOfResidence: v.optional(v.number()),
            localKnowledge: v.optional(v.string()),
            languages: v.optional(v.array(v.string())),
            organizationName: v.optional(v.string()),
            organizationType: v.optional(v.string()),
            businessLicenseUrl: v.optional(v.string()),
            authorizationLetterUrl: v.optional(v.string()),
            officialWebsite: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        // Check if user already has an active badge of this type
        const existingBadge = await ctx.db
            .query('verificationBadges')
            .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('badgeType', args.badgeType))
            .first();
        if (existingBadge && existingBadge.isActive) {
            throw new Error('您已拥有此类型的认证徽章');
        }
        // Check if user has a pending application
        const existingApplication = await ctx.db
            .query('verificationApplications')
            .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('badgeType', args.badgeType))
            .filter((q) => q.or(q.eq(q.field('status'), 'pending'), q.eq(q.field('status'), 'under_review')))
            .first();
        if (existingApplication) {
            throw new Error('您已有一个待审核的申请');
        }
        const now = Date.now();
        const applicationId = await ctx.db.insert('verificationApplications', {
            userId: args.userId,
            badgeType: args.badgeType,
            status: 'pending',
            realName: args.realName,
            idType: args.idType,
            idNumber: args.idNumber,
            phone: args.phone,
            email: args.email,
            applicationReason: args.applicationReason,
            supportingMaterials: args.supportingMaterials,
            applicationData: args.applicationData,
            createdAt: now,
            updatedAt: now,
        });
        return applicationId;
    },
});
// Cancel an application
export const cancelApplication = mutation({
    args: {
        applicationId: v.id('verificationApplications'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.userId !== args.userId) {
            throw new Error('无权取消此申请');
        }
        if (application.status !== 'pending') {
            throw new Error('只能取消待审核的申请');
        }
        await ctx.db.patch(args.applicationId, {
            status: 'cancelled',
            updatedAt: Date.now(),
        });
    },
});
// Start reviewing an application (admin)
export const startReview = mutation({
    args: {
        applicationId: v.id('verificationApplications'),
        reviewerId: v.string(),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.status !== 'pending') {
            throw new Error('申请已被处理');
        }
        await ctx.db.patch(args.applicationId, {
            status: 'under_review',
            reviewedBy: args.reviewerId,
            updatedAt: Date.now(),
        });
    },
});
// Approve an application (admin)
export const approveApplication = mutation({
    args: {
        applicationId: v.id('verificationApplications'),
        reviewerId: v.string(),
        reviewNotes: v.optional(v.string()),
        expiresInDays: v.optional(v.number()),
        metadata: v.optional(v.object({
            travelExpertLevel: v.optional(v.number()),
            specialties: v.optional(v.array(v.string())),
            totalGuides: v.optional(v.number()),
            totalLikes: v.optional(v.number()),
            localCity: v.optional(v.string()),
            localCityId: v.optional(v.id('cities')),
            yearsOfResidence: v.optional(v.number()),
            languages: v.optional(v.array(v.string())),
            organizationName: v.optional(v.string()),
            organizationType: v.optional(v.string()),
            officialWebsite: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.status === 'approved') {
            throw new Error('申请已通过');
        }
        if (application.status === 'cancelled') {
            throw new Error('申请已被取消');
        }
        const now = Date.now();
        // Calculate expiration if specified
        let expiresAt;
        if (args.expiresInDays) {
            expiresAt = now + args.expiresInDays * 24 * 60 * 60 * 1000;
        }
        // Build metadata from application data and admin input
        const finalMetadata = {
            ...args.metadata,
        };
        // Merge application data for specific badge types
        if (application.badgeType === 'local_guide' &&
            application.applicationData) {
            finalMetadata.localCity =
                args.metadata?.localCity || application.applicationData.localCity;
            finalMetadata.yearsOfResidence =
                args.metadata?.yearsOfResidence ||
                    application.applicationData.yearsOfResidence;
            finalMetadata.languages =
                args.metadata?.languages || application.applicationData.languages;
        }
        if (application.badgeType === 'official_account' &&
            application.applicationData) {
            finalMetadata.organizationName =
                args.metadata?.organizationName ||
                    application.applicationData.organizationName;
            finalMetadata.organizationType =
                args.metadata?.organizationType ||
                    application.applicationData.organizationType;
            finalMetadata.officialWebsite =
                args.metadata?.officialWebsite ||
                    application.applicationData.officialWebsite;
        }
        // Create the badge
        const badgeId = await ctx.db.insert('verificationBadges', {
            userId: application.userId,
            badgeType: application.badgeType,
            displayName: BADGE_DISPLAY_NAMES[application.badgeType],
            color: BADGE_COLORS[application.badgeType],
            verifiedAt: now,
            expiresAt,
            verifiedBy: args.reviewerId,
            isActive: true,
            metadata: finalMetadata,
            createdAt: now,
            updatedAt: now,
        });
        // Update application
        await ctx.db.patch(args.applicationId, {
            status: 'approved',
            reviewedBy: args.reviewerId,
            reviewedAt: now,
            reviewNotes: args.reviewNotes,
            badgeId,
            updatedAt: now,
        });
        return badgeId;
    },
});
// Reject an application (admin)
export const rejectApplication = mutation({
    args: {
        applicationId: v.id('verificationApplications'),
        reviewerId: v.string(),
        rejectionReason: v.string(),
        reviewNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const application = await ctx.db.get(args.applicationId);
        if (!application) {
            throw new Error('申请不存在');
        }
        if (application.status === 'approved') {
            throw new Error('申请已通过，无法拒绝');
        }
        if (application.status === 'cancelled') {
            throw new Error('申请已被取消');
        }
        const now = Date.now();
        await ctx.db.patch(args.applicationId, {
            status: 'rejected',
            reviewedBy: args.reviewerId,
            reviewedAt: now,
            rejectionReason: args.rejectionReason,
            reviewNotes: args.reviewNotes,
            updatedAt: now,
        });
    },
});
// ============================================
// Statistics Queries
// ============================================
// Get badge statistics (admin)
export const getBadgeStatistics = query({
    args: {},
    handler: async (ctx) => {
        const allBadges = await ctx.db.query('verificationBadges').collect();
        const stats = {
            total: allBadges.length,
            active: 0,
            expired: 0,
            revoked: 0,
            byType: {
                travel_expert: 0,
                local_guide: 0,
                official_account: 0,
            },
        };
        const now = Date.now();
        for (const badge of allBadges) {
            if (!badge.isActive) {
                stats.revoked++;
            }
            else if (badge.expiresAt && badge.expiresAt < now) {
                stats.expired++;
            }
            else {
                stats.active++;
                stats.byType[badge.badgeType]++;
            }
        }
        return stats;
    },
});
// Get application statistics (admin)
export const getApplicationStatistics = query({
    args: {},
    handler: async (ctx) => {
        const allApplications = await ctx.db
            .query('verificationApplications')
            .collect();
        const stats = {
            total: allApplications.length,
            pending: 0,
            under_review: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
            byType: {
                travel_expert: 0,
                local_guide: 0,
                official_account: 0,
            },
        };
        for (const app of allApplications) {
            stats[app.status]++;
            if (app.status === 'pending' || app.status === 'under_review') {
                stats.byType[app.badgeType]++;
            }
        }
        return stats;
    },
});
