/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Visa Requirements - Country visa requirements and user visa reminders
 */
// ============================================
// Visa Type Validators
// ============================================
const visaTypeValidator = v.union(v.literal('visa_free'), // 免签
v.literal('visa_on_arrival'), // 落地签
v.literal('e_visa'), // 电子签证
v.literal('standard_visa'), // 普通签证
v.literal('transit_visa'), // 过境签
v.literal('work_visa'), // 工作签证
v.literal('student_visa'), // 学生签证
v.literal('business_visa') // 商务签证
);
const difficultyLevelValidator = v.union(v.literal('very_easy'), // 非常容易（免签/落地签）
v.literal('easy'), // 容易（电子签）
v.literal('moderate'), // 中等
v.literal('difficult'), // 困难
v.literal('very_difficult') // 非常困难
);
const reminderStatusValidator = v.union(v.literal('pending'), // 待提醒
v.literal('sent'), // 已发送
v.literal('dismissed'), // 已忽略
v.literal('completed') // 已完成
);
// ============================================
// Visa Requirements Queries
// ============================================
// Get visa requirement by origin and destination countries
export const getVisaRequirement = query({
    args: {
        originCountryCode: v.string(),
        destinationCountryCode: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin_destination', (q) => q
            .eq('originCountryCode', args.originCountryCode)
            .eq('destinationCountryCode', args.destinationCountryCode))
            .first();
    },
});
// List visa requirements for origin country
export const listByOriginCountry = query({
    args: {
        originCountryCode: v.string(),
        visaType: v.optional(visaTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let requirements = await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin', (q) => q.eq('originCountryCode', args.originCountryCode))
            .collect();
        if (args.visaType) {
            requirements = requirements.filter((r) => r.visaType === args.visaType);
        }
        const limit = args.limit ?? 50;
        return requirements.slice(0, limit);
    },
});
// List visa-free destinations for a country
export const listVisaFreeDestinations = query({
    args: {
        originCountryCode: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const requirements = await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin', (q) => q.eq('originCountryCode', args.originCountryCode))
            .collect();
        const visaFree = requirements.filter((r) => r.visaType === 'visa_free' || r.visaType === 'visa_on_arrival');
        const limit = args.limit ?? 50;
        return visaFree.slice(0, limit);
    },
});
// List e-visa available destinations
export const listEVisaDestinations = query({
    args: {
        originCountryCode: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const requirements = await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin', (q) => q.eq('originCountryCode', args.originCountryCode))
            .collect();
        const eVisa = requirements.filter((r) => r.visaType === 'e_visa');
        const limit = args.limit ?? 50;
        return eVisa.slice(0, limit);
    },
});
// Search visa requirements by destination name
export const searchByDestination = query({
    args: {
        originCountryCode: v.string(),
        query: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const requirements = await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin', (q) => q.eq('originCountryCode', args.originCountryCode))
            .collect();
        const searchQuery = args.query.toLowerCase();
        const filtered = requirements.filter((r) => r.destinationCountryName.toLowerCase().includes(searchQuery) ||
            r.destinationCountryNameEn?.toLowerCase().includes(searchQuery) ||
            r.destinationCountryCode.toLowerCase().includes(searchQuery));
        const limit = args.limit ?? 20;
        return filtered.slice(0, limit);
    },
});
// Get visa requirement by ID
export const getById = query({
    args: { id: v.id('visaRequirements') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// ============================================
// Visa Requirements Mutations
// ============================================
// Create or update visa requirement
export const upsertVisaRequirement = mutation({
    args: {
        originCountryCode: v.string(),
        originCountryName: v.string(),
        originCountryNameEn: v.optional(v.string()),
        destinationCountryCode: v.string(),
        destinationCountryName: v.string(),
        destinationCountryNameEn: v.optional(v.string()),
        visaType: visaTypeValidator,
        visaTypeName: v.string(),
        visaTypeNameEn: v.optional(v.string()),
        difficultyLevel: difficultyLevelValidator,
        // Duration and validity
        maxStayDays: v.optional(v.number()),
        validityPeriod: v.optional(v.string()),
        entryType: v.optional(v.union(v.literal('single'), v.literal('multiple'), v.literal('dual'))),
        // Processing information
        processingTime: v.optional(v.string()),
        processingTimeMin: v.optional(v.number()),
        processingTimeMax: v.optional(v.number()),
        expressFee: v.optional(v.number()),
        expressProcessingTime: v.optional(v.string()),
        // Cost information
        visaFee: v.optional(v.number()),
        visaFeeCurrency: v.optional(v.string()),
        serviceFee: v.optional(v.number()),
        // Required documents
        requiredDocuments: v.array(v.object({
            name: v.string(),
            nameEn: v.optional(v.string()),
            description: v.optional(v.string()),
            isRequired: v.boolean(),
            notes: v.optional(v.string()),
        })),
        // Application methods
        applicationMethods: v.array(v.object({
            method: v.union(v.literal('online'), v.literal('embassy'), v.literal('consulate'), v.literal('visa_center'), v.literal('on_arrival')),
            name: v.string(),
            nameEn: v.optional(v.string()),
            url: v.optional(v.string()),
            address: v.optional(v.string()),
            phone: v.optional(v.string()),
            email: v.optional(v.string()),
            notes: v.optional(v.string()),
        })),
        // Entry requirements
        entryRequirements: v.optional(v.object({
            passportValidity: v.optional(v.string()),
            blankPages: v.optional(v.number()),
            onwardTicket: v.optional(v.boolean()),
            hotelBooking: v.optional(v.boolean()),
            financialProof: v.optional(v.string()),
            invitationLetter: v.optional(v.boolean()),
            travelInsurance: v.optional(v.boolean()),
            returnTicket: v.optional(v.boolean()),
            additionalRequirements: v.optional(v.array(v.string())),
        })),
        // Special notes
        specialNotes: v.optional(v.array(v.string())),
        warnings: v.optional(v.array(v.string())),
        // E-visa specific
        eVisaUrl: v.optional(v.string()),
        eVisaProcessingDays: v.optional(v.number()),
        // Visa on arrival specific
        voaPorts: v.optional(v.array(v.string())),
        voaFee: v.optional(v.number()),
        voaFeeCurrency: v.optional(v.string()),
        // Data source
        source: v.string(),
        sourceUrl: v.optional(v.string()),
        verifiedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // Check if requirement exists
        const existing = await ctx.db
            .query('visaRequirements')
            .withIndex('by_origin_destination', (q) => q
            .eq('originCountryCode', args.originCountryCode)
            .eq('destinationCountryCode', args.destinationCountryCode))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
                lastVerifiedAt: now,
                updatedAt: now,
            });
            return existing._id;
        }
        return await ctx.db.insert('visaRequirements', {
            ...args,
            lastVerifiedAt: now,
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Update visa requirement
export const updateVisaRequirement = mutation({
    args: {
        id: v.id('visaRequirements'),
        visaType: v.optional(visaTypeValidator),
        visaTypeName: v.optional(v.string()),
        visaTypeNameEn: v.optional(v.string()),
        difficultyLevel: v.optional(difficultyLevelValidator),
        maxStayDays: v.optional(v.number()),
        validityPeriod: v.optional(v.string()),
        processingTime: v.optional(v.string()),
        visaFee: v.optional(v.number()),
        requiredDocuments: v.optional(v.array(v.object({
            name: v.string(),
            nameEn: v.optional(v.string()),
            description: v.optional(v.string()),
            isRequired: v.boolean(),
            notes: v.optional(v.string()),
        }))),
        specialNotes: v.optional(v.array(v.string())),
        warnings: v.optional(v.array(v.string())),
        verifiedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            lastVerifiedAt: Date.now(),
            updatedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
// ============================================
// User Visa Reminders Queries
// ============================================
// Get user's visa reminders
export const getUserVisaReminders = query({
    args: {
        userId: v.string(),
        status: v.optional(reminderStatusValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let reminders = await ctx.db
            .query('userVisaReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        if (args.status) {
            reminders = reminders.filter((r) => r.status === args.status);
        }
        // Sort by reminder date
        reminders.sort((a, b) => a.reminderDate - b.reminderDate);
        const limit = args.limit ?? 20;
        return reminders.slice(0, limit);
    },
});
// Get upcoming visa reminders
export const getUpcomingReminders = query({
    args: {
        userId: v.string(),
        daysAhead: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const daysAhead = args.daysAhead ?? 30;
        const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;
        const reminders = await ctx.db
            .query('userVisaReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        return reminders.filter((r) => r.status === 'pending' &&
            r.reminderDate >= now &&
            r.reminderDate <= futureDate);
    },
});
// Get visa reminder by ID
export const getVisaReminderById = query({
    args: { id: v.id('userVisaReminders') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Get reminders for itinerary
export const getRemindersForItinerary = query({
    args: {
        itineraryId: v.id('itineraries'),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('userVisaReminders')
            .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
            .collect();
    },
});
// ============================================
// User Visa Reminders Mutations
// ============================================
// Create visa reminder
export const createVisaReminder = mutation({
    args: {
        userId: v.string(),
        itineraryId: v.optional(v.id('itineraries')),
        visaRequirementId: v.optional(v.id('visaRequirements')),
        destinationCountryCode: v.string(),
        destinationCountryName: v.string(),
        travelDate: v.number(),
        reminderDate: v.number(),
        visaType: visaTypeValidator,
        notes: v.optional(v.string()),
        checklist: v.optional(v.array(v.object({
            item: v.string(),
            isCompleted: v.boolean(),
            completedAt: v.optional(v.number()),
        }))),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('userVisaReminders', {
            ...args,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Update visa reminder status
export const updateVisaReminderStatus = mutation({
    args: {
        id: v.id('userVisaReminders'),
        status: reminderStatusValidator,
        sentAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, status, sentAt } = args;
        const updates = {
            status,
            updatedAt: Date.now(),
        };
        if (status === 'sent' && sentAt) {
            updates.sentAt = sentAt;
        }
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});
// Update visa reminder checklist
export const updateVisaReminderChecklist = mutation({
    args: {
        id: v.id('userVisaReminders'),
        checklist: v.array(v.object({
            item: v.string(),
            isCompleted: v.boolean(),
            completedAt: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            checklist: args.checklist,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.id);
    },
});
// Delete visa reminder
export const deleteVisaReminder = mutation({
    args: { id: v.id('userVisaReminders') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// ============================================
// Visa Application Tracking
// ============================================
// Get user's visa applications
export const getUserVisaApplications = query({
    args: {
        userId: v.string(),
        status: v.optional(v.union(v.literal('preparing'), v.literal('submitted'), v.literal('processing'), v.literal('approved'), v.literal('rejected'), v.literal('cancelled'))),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let applications = await ctx.db
            .query('visaApplications')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        if (args.status) {
            applications = applications.filter((a) => a.status === args.status);
        }
        // Sort by created date (newest first)
        applications.sort((a, b) => b.createdAt - a.createdAt);
        const limit = args.limit ?? 20;
        return applications.slice(0, limit);
    },
});
// Create visa application
export const createVisaApplication = mutation({
    args: {
        userId: v.string(),
        visaRequirementId: v.optional(v.id('visaRequirements')),
        itineraryId: v.optional(v.id('itineraries')),
        destinationCountryCode: v.string(),
        destinationCountryName: v.string(),
        visaType: visaTypeValidator,
        applicationMethod: v.union(v.literal('online'), v.literal('embassy'), v.literal('consulate'), v.literal('visa_center'), v.literal('on_arrival')),
        plannedTravelDate: v.number(),
        applicationDate: v.optional(v.number()),
        expectedResultDate: v.optional(v.number()),
        applicationNumber: v.optional(v.string()),
        notes: v.optional(v.string()),
        documents: v.optional(v.array(v.object({
            name: v.string(),
            status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
            notes: v.optional(v.string()),
        }))),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('visaApplications', {
            ...args,
            status: 'preparing',
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Update visa application
export const updateVisaApplication = mutation({
    args: {
        id: v.id('visaApplications'),
        status: v.optional(v.union(v.literal('preparing'), v.literal('submitted'), v.literal('processing'), v.literal('approved'), v.literal('rejected'), v.literal('cancelled'))),
        applicationDate: v.optional(v.number()),
        expectedResultDate: v.optional(v.number()),
        resultDate: v.optional(v.number()),
        applicationNumber: v.optional(v.string()),
        visaNumber: v.optional(v.string()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        notes: v.optional(v.string()),
        documents: v.optional(v.array(v.object({
            name: v.string(),
            status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
            notes: v.optional(v.string()),
        }))),
        rejectionReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
// Delete visa application
export const deleteVisaApplication = mutation({
    args: { id: v.id('visaApplications') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// Get visa application by ID
export const getVisaApplicationById = query({
    args: { id: v.id('visaApplications') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
