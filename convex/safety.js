/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Safety - Destination Safety Ratings, Alerts, and Danger Zones
 */
// ============================================
// Safety Ratings
// ============================================
// Get safety rating for a destination
export const getSafetyRating = query({
    args: {
        destinationName: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        cityId: v.optional(v.id('cities')),
    },
    handler: async (ctx, args) => {
        if (args.cityId) {
            return await ctx.db
                .query('safetyRatings')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .first();
        }
        if (args.destinationName) {
            return await ctx.db
                .query('safetyRatings')
                .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
                .first();
        }
        if (args.countryCode) {
            const ratings = await ctx.db
                .query('safetyRatings')
                .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
                .collect();
            return ratings[0] || null;
        }
        return null;
    },
});
// List safety ratings by country
export const listSafetyRatingsByCountry = query({
    args: {
        countryCode: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const ratings = await ctx.db
            .query('safetyRatings')
            .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
            .collect();
        return args.limit ? ratings.slice(0, args.limit) : ratings;
    },
});
// List safest destinations
export const listSafestDestinations = query({
    args: {
        minRating: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const allRatings = await ctx.db.query('safetyRatings').collect();
        let filtered = allRatings;
        if (args.minRating !== undefined) {
            filtered = allRatings.filter((r) => r.overallRating >= args.minRating);
        }
        // Sort by overall rating descending
        filtered.sort((a, b) => b.overallRating - a.overallRating);
        const limit = args.limit ?? 20;
        return filtered.slice(0, limit);
    },
});
// Create or update safety rating
export const upsertSafetyRating = mutation({
    args: {
        destinationName: v.string(),
        destinationNameEn: v.optional(v.string()),
        countryCode: v.string(),
        cityId: v.optional(v.id('cities')),
        overallRating: v.number(),
        crimeRating: v.number(),
        healthRating: v.number(),
        naturalDisasterRating: v.number(),
        transportRating: v.number(),
        womenSafetyRating: v.optional(v.number()),
        lgbtqSafetyRating: v.optional(v.number()),
        summary: v.string(),
        summaryEn: v.optional(v.string()),
        generalTips: v.array(v.string()),
        emergencyNumbers: v.optional(v.object({
            police: v.optional(v.string()),
            ambulance: v.optional(v.string()),
            fire: v.optional(v.string()),
            touristHotline: v.optional(v.string()),
        })),
        source: v.string(),
        sourceUrl: v.optional(v.string()),
        verifiedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // Check if rating exists
        const existing = await ctx.db
            .query('safetyRatings')
            .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
                lastVerifiedAt: now,
                updatedAt: now,
            });
            return existing._id;
        }
        return await ctx.db.insert('safetyRatings', {
            ...args,
            lastVerifiedAt: now,
            createdAt: now,
            updatedAt: now,
        });
    },
});
// ============================================
// Safety Alerts
// ============================================
const alertTypeValidator = v.union(v.literal('travel_advisory'), v.literal('health_warning'), v.literal('natural_disaster'), v.literal('civil_unrest'), v.literal('terrorism'), v.literal('crime_spike'), v.literal('scam_warning'), v.literal('other'));
const severityValidator = v.union(v.literal('info'), v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('critical'));
// Get active alerts for a destination
export const getActiveAlerts = query({
    args: {
        destinationName: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        cityId: v.optional(v.id('cities')),
        alertType: v.optional(alertTypeValidator),
        severity: v.optional(severityValidator),
    },
    handler: async (ctx, args) => {
        let alerts;
        if (args.destinationName) {
            alerts = await ctx.db
                .query('safetyAlerts')
                .withIndex('by_active_destination', (q) => q.eq('isActive', true).eq('destinationName', args.destinationName))
                .collect();
        }
        else if (args.countryCode) {
            const allActive = await ctx.db
                .query('safetyAlerts')
                .withIndex('by_active', (q) => q.eq('isActive', true))
                .collect();
            alerts = allActive.filter((a) => a.countryCode === args.countryCode);
        }
        else if (args.cityId) {
            const allActive = await ctx.db
                .query('safetyAlerts')
                .withIndex('by_active', (q) => q.eq('isActive', true))
                .collect();
            alerts = allActive.filter((a) => a.cityId === args.cityId);
        }
        else {
            alerts = await ctx.db
                .query('safetyAlerts')
                .withIndex('by_active', (q) => q.eq('isActive', true))
                .collect();
        }
        // Filter by type and severity if provided
        if (args.alertType) {
            alerts = alerts.filter((a) => a.alertType === args.alertType);
        }
        if (args.severity) {
            alerts = alerts.filter((a) => a.severity === args.severity);
        }
        // Sort by severity (critical first) then by start date
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        alerts.sort((a, b) => {
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0)
                return severityDiff;
            return b.startDate - a.startDate;
        });
        return alerts;
    },
});
// Get alert by ID
export const getAlertById = query({
    args: { id: v.id('safetyAlerts') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Create safety alert
export const createAlert = mutation({
    args: {
        destinationName: v.string(),
        countryCode: v.string(),
        cityId: v.optional(v.id('cities')),
        affectedAreas: v.optional(v.array(v.string())),
        alertType: alertTypeValidator,
        severity: severityValidator,
        title: v.string(),
        titleEn: v.optional(v.string()),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        recommendations: v.array(v.string()),
        avoidAreas: v.optional(v.array(v.string())),
        startDate: v.number(),
        endDate: v.optional(v.number()),
        source: v.string(),
        sourceUrl: v.optional(v.string()),
        officialAdvisoryLevel: v.optional(v.string()),
        createdBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('safetyAlerts', {
            ...args,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Update safety alert
export const updateAlert = mutation({
    args: {
        id: v.id('safetyAlerts'),
        title: v.optional(v.string()),
        titleEn: v.optional(v.string()),
        description: v.optional(v.string()),
        descriptionEn: v.optional(v.string()),
        severity: v.optional(severityValidator),
        recommendations: v.optional(v.array(v.string())),
        avoidAreas: v.optional(v.array(v.string())),
        endDate: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
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
// Deactivate alert
export const deactivateAlert = mutation({
    args: { id: v.id('safetyAlerts') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            isActive: false,
            updatedAt: Date.now(),
        });
    },
});
// ============================================
// Danger Zones
// ============================================
const dangerLevelValidator = v.union(v.literal('caution'), v.literal('avoid_night'), v.literal('avoid_alone'), v.literal('high_risk'), v.literal('no_go'));
const dangerTypeValidator = v.union(v.literal('crime'), v.literal('scam'), v.literal('traffic'), v.literal('natural_hazard'), v.literal('political'), v.literal('health'), v.literal('other'));
// Get danger zones for a destination
export const getDangerZones = query({
    args: {
        destinationName: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        cityId: v.optional(v.id('cities')),
        dangerLevel: v.optional(dangerLevelValidator),
        activeOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let zones;
        if (args.cityId) {
            zones = await ctx.db
                .query('dangerZones')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else if (args.destinationName) {
            zones = await ctx.db
                .query('dangerZones')
                .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
                .collect();
        }
        else if (args.countryCode) {
            zones = await ctx.db
                .query('dangerZones')
                .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
                .collect();
        }
        else {
            zones = await ctx.db.query('dangerZones').collect();
        }
        // Filter by active status
        if (args.activeOnly !== false) {
            zones = zones.filter((z) => z.isActive);
        }
        // Filter by danger level
        if (args.dangerLevel) {
            zones = zones.filter((z) => z.dangerLevel === args.dangerLevel);
        }
        // Sort by danger level (no_go first)
        const levelOrder = {
            no_go: 0,
            high_risk: 1,
            avoid_alone: 2,
            avoid_night: 3,
            caution: 4,
        };
        zones.sort((a, b) => levelOrder[a.dangerLevel] - levelOrder[b.dangerLevel]);
        return zones;
    },
});
// Get nearby danger zones
export const getNearbyDangerZones = query({
    args: {
        latitude: v.number(),
        longitude: v.number(),
        radiusKm: v.number(),
        activeOnly: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let zones = await ctx.db.query('dangerZones').collect();
        // Filter by active status
        if (args.activeOnly !== false) {
            zones = zones.filter((z) => z.isActive);
        }
        // Calculate distance and filter
        const zonesWithDistance = zones
            .map((zone) => ({
            ...zone,
            distance: calculateDistanceKm(args.latitude, args.longitude, zone.latitude, zone.longitude),
        }))
            .filter((zone) => zone.distance <= args.radiusKm)
            .sort((a, b) => a.distance - b.distance);
        return zonesWithDistance;
    },
});
// Create danger zone
export const createDangerZone = mutation({
    args: {
        destinationName: v.string(),
        countryCode: v.string(),
        cityId: v.optional(v.id('cities')),
        zoneName: v.string(),
        zoneNameEn: v.optional(v.string()),
        latitude: v.number(),
        longitude: v.number(),
        radiusMeters: v.optional(v.number()),
        polygon: v.optional(v.array(v.object({
            lat: v.number(),
            lng: v.number(),
        }))),
        dangerLevel: dangerLevelValidator,
        dangerTypes: v.array(dangerTypeValidator),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        precautions: v.array(v.string()),
        dangerousTimes: v.optional(v.object({
            allDay: v.boolean(),
            nightOnly: v.optional(v.boolean()),
            specificHours: v.optional(v.string()),
            specificDays: v.optional(v.array(v.string())),
        })),
        source: v.string(),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('dangerZones', {
            ...args,
            reportCount: 0,
            isVerified: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Update danger zone
export const updateDangerZone = mutation({
    args: {
        id: v.id('dangerZones'),
        zoneName: v.optional(v.string()),
        zoneNameEn: v.optional(v.string()),
        dangerLevel: v.optional(dangerLevelValidator),
        dangerTypes: v.optional(v.array(dangerTypeValidator)),
        description: v.optional(v.string()),
        descriptionEn: v.optional(v.string()),
        precautions: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
        isVerified: v.optional(v.boolean()),
        verifiedBy: v.optional(v.string()),
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
// ============================================
// Safety Incident Reports
// ============================================
const incidentTypeValidator = v.union(v.literal('theft'), v.literal('assault'), v.literal('scam'), v.literal('harassment'), v.literal('traffic_accident'), v.literal('natural_disaster'), v.literal('health_issue'), v.literal('police_issue'), v.literal('other'));
const incidentSeverityValidator = v.union(v.literal('minor'), v.literal('moderate'), v.literal('severe'), v.literal('critical'));
const incidentStatusValidator = v.union(v.literal('pending'), v.literal('verified'), v.literal('rejected'), v.literal('resolved'));
// Get incident reports for a destination
export const getIncidentReports = query({
    args: {
        destinationName: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        cityId: v.optional(v.id('cities')),
        incidentType: v.optional(incidentTypeValidator),
        status: v.optional(incidentStatusValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let reports;
        if (args.destinationName) {
            reports = await ctx.db
                .query('safetyIncidentReports')
                .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
                .collect();
        }
        else if (args.countryCode) {
            reports = await ctx.db
                .query('safetyIncidentReports')
                .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
                .collect();
        }
        else if (args.cityId) {
            reports = await ctx.db
                .query('safetyIncidentReports')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else {
            reports = await ctx.db.query('safetyIncidentReports').collect();
        }
        // Filter by type and status
        if (args.incidentType) {
            reports = reports.filter((r) => r.incidentType === args.incidentType);
        }
        if (args.status) {
            reports = reports.filter((r) => r.status === args.status);
        }
        else {
            // By default, only show verified reports
            reports = reports.filter((r) => r.status === 'verified');
        }
        // Sort by incident date descending
        reports.sort((a, b) => b.incidentDate - a.incidentDate);
        const limit = args.limit ?? 50;
        return reports.slice(0, limit);
    },
});
// Get user's incident reports
export const getUserIncidentReports = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const reports = await ctx.db
            .query('safetyIncidentReports')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        reports.sort((a, b) => b.createdAt - a.createdAt);
        const limit = args.limit ?? 20;
        return reports.slice(0, limit);
    },
});
// Create incident report
export const createIncidentReport = mutation({
    args: {
        userId: v.string(),
        isAnonymous: v.boolean(),
        destinationName: v.string(),
        countryCode: v.string(),
        cityId: v.optional(v.id('cities')),
        specificLocation: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        incidentType: incidentTypeValidator,
        severity: incidentSeverityValidator,
        title: v.string(),
        description: v.string(),
        incidentDate: v.number(),
        wasPoliceInvolved: v.optional(v.boolean()),
        wasResolved: v.optional(v.boolean()),
        resolutionNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('safetyIncidentReports', {
            ...args,
            status: 'pending',
            helpfulCount: 0,
            reportCount: 0,
            createdAt: now,
            updatedAt: now,
        });
    },
});
// Mark incident report as helpful
export const markReportHelpful = mutation({
    args: { id: v.id('safetyIncidentReports') },
    handler: async (ctx, args) => {
        const report = await ctx.db.get(args.id);
        if (!report)
            return;
        await ctx.db.patch(args.id, {
            helpfulCount: report.helpfulCount + 1,
        });
    },
});
// Moderate incident report (admin)
export const moderateIncidentReport = mutation({
    args: {
        id: v.id('safetyIncidentReports'),
        status: incidentStatusValidator,
        moderatorNotes: v.optional(v.string()),
        reviewedBy: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: args.status,
            moderatorNotes: args.moderatorNotes,
            reviewedBy: args.reviewedBy,
            reviewedAt: Date.now(),
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.id);
    },
});
// ============================================
// Comprehensive Safety Info
// ============================================
// Get complete safety information for a destination
export const getDestinationSafetyInfo = query({
    args: {
        destinationName: v.string(),
        countryCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get safety rating
        const rating = await ctx.db
            .query('safetyRatings')
            .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
            .first();
        // Get active alerts
        const alerts = await ctx.db
            .query('safetyAlerts')
            .withIndex('by_active_destination', (q) => q.eq('isActive', true).eq('destinationName', args.destinationName))
            .collect();
        // Get danger zones
        const dangerZones = await ctx.db
            .query('dangerZones')
            .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
            .collect();
        const activeDangerZones = dangerZones.filter((z) => z.isActive);
        // Get recent verified incident reports
        const allReports = await ctx.db
            .query('safetyIncidentReports')
            .withIndex('by_destination', (q) => q.eq('destinationName', args.destinationName))
            .collect();
        const recentReports = allReports
            .filter((r) => r.status === 'verified')
            .sort((a, b) => b.incidentDate - a.incidentDate)
            .slice(0, 10);
        return {
            rating,
            alerts,
            dangerZones: activeDangerZones,
            recentIncidents: recentReports,
            hasActiveAlerts: alerts.length > 0,
            hasCriticalAlerts: alerts.some((a) => a.severity === 'critical'),
            dangerZoneCount: activeDangerZones.length,
        };
    },
});
// Helper function for distance calculation (Haversine formula)
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
