/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * SOS Alerts - Emergency alert management
 * Handles SOS alerts sent by users during emergencies
 */

// List SOS alerts for a user
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query('sosAlerts')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    // Sort by most recent first
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    return alerts;
  },
});

// Get a single SOS alert by ID
export const getById = query({
  args: { id: v.id('sosAlerts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get active (unresolved) SOS alerts for a user
export const getActiveAlerts = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query('sosAlerts')
      .withIndex('by_user_status', q =>
        q.eq('userId', args.userId).eq('status', 'sent'))
      .collect();

    return alerts;
  },
});

// Create a new SOS alert
export const create = mutation({
  args: {
    userId: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    locationName: v.optional(v.string()),
    accuracy: v.optional(v.number()),
    alertType: v.union(
      v.literal('emergency'),
      v.literal('medical'),
      v.literal('safety'),
      v.literal('other'),
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all SOS contacts for the user
    const sosContacts = await ctx.db
      .query('emergencyContacts')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    const contactsToNotify = sosContacts
      .filter(c => c.notifyOnSos)
      .map(c => c._id);

    const alertId = await ctx.db.insert('sosAlerts', {
      userId: args.userId,
      latitude: args.latitude,
      longitude: args.longitude,
      locationName: args.locationName,
      accuracy: args.accuracy,
      alertType: args.alertType,
      message: args.message,
      status: 'sent',
      notifiedContacts: contactsToNotify,
      createdAt: now,
    });

    return await ctx.db.get(alertId);
  },
});

// Update SOS alert status
export const updateStatus = mutation({
  args: {
    id: v.id('sosAlerts'),
    status: v.union(
      v.literal('sent'),
      v.literal('received'),
      v.literal('resolved'),
      v.literal('cancelled'),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('SOS alert not found');
    }

    const updates: Record<string, unknown> = { status: args.status };

    if (args.status === 'resolved' || args.status === 'cancelled') {
      updates.resolvedAt = Date.now();
    }

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

// Resolve an SOS alert
export const resolve = mutation({
  args: {
    id: v.id('sosAlerts'),
    resolvedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('SOS alert not found');
    }

    await ctx.db.patch(args.id, {
      status: 'resolved',
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
    });

    return await ctx.db.get(args.id);
  },
});

// Cancel an SOS alert
export const cancel = mutation({
  args: { id: v.id('sosAlerts') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('SOS alert not found');
    }

    await ctx.db.patch(args.id, {
      status: 'cancelled',
      resolvedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Get SOS alert with contact details
export const getWithContacts = query({
  args: { id: v.id('sosAlerts') },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.id);
    if (!alert) {
      return null;
    }

    // Get contact details for notified contacts
    const contacts = await Promise.all(
      alert.notifiedContacts.map(async (contactId) => {
        const contact = await ctx.db.get(contactId);
        return contact
          ? {
              id: contact._id,
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              relationship: contact.relationship,
            }
          : null;
      }),
    );

    return {
      ...alert,
      contactDetails: contacts.filter(Boolean),
    };
  },
});

// Get SOS alert with full emergency info (contacts + emergency services)
export const getWithEmergencyInfo = query({
  args: {
    id: v.id('sosAlerts'),
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.id);
    if (!alert) {
      return null;
    }

    // Get contact details for notified contacts
    const contacts = await Promise.all(
      alert.notifiedContacts.map(async (contactId) => {
        const contact = await ctx.db.get(contactId);
        return contact
          ? {
              id: contact._id,
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              email: contact.email,
              relationship: contact.relationship,
            }
          : null;
      }),
    );

    // Get emergency services for the country if provided
    let emergencyServices = null;
    if (args.countryCode) {
      emergencyServices = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country', q => q.eq('countryCode', args.countryCode!))
        .filter(q => q.eq(q.field('cityName'), undefined))
        .first();
    }

    return {
      ...alert,
      contactDetails: contacts.filter(Boolean),
      emergencyServices,
    };
  },
});

// Update SOS alert location (for continuous tracking)
export const updateLocation = mutation({
  args: {
    id: v.id('sosAlerts'),
    latitude: v.number(),
    longitude: v.number(),
    accuracy: v.optional(v.number()),
    locationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('SOS alert not found');
    }

    // Only update if alert is still active
    if (existing.status !== 'sent' && existing.status !== 'received') {
      throw new Error('Cannot update location for resolved/cancelled alert');
    }

    await ctx.db.patch(args.id, {
      latitude: args.latitude,
      longitude: args.longitude,
      accuracy: args.accuracy,
      locationName: args.locationName,
    });

    return await ctx.db.get(args.id);
  },
});

// Get recent SOS alerts (for admin/monitoring)
export const getRecentAlerts = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('sent'),
        v.literal('received'),
        v.literal('resolved'),
        v.literal('cancelled'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let alerts;
    if (args.status) {
      alerts = await ctx.db
        .query('sosAlerts')
        .withIndex('by_status', q => q.eq('status', args.status!))
        .collect();
    }
    else {
      alerts = await ctx.db.query('sosAlerts').collect();
    }

    // Sort by most recent first
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    return alerts.slice(0, limit);
  },
});

// Add message to SOS alert
export const addMessage = mutation({
  args: {
    id: v.id('sosAlerts'),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('SOS alert not found');
    }

    await ctx.db.patch(args.id, {
      message: args.message,
    });

    return await ctx.db.get(args.id);
  },
});
