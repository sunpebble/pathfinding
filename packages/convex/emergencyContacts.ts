/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Emergency Contacts - Personal emergency contact management
 * Allows users to store and manage their emergency contacts
 */

// List all emergency contacts for a user
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query('emergencyContacts')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Sort by primary first, then by name
    contacts.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });

    return contacts;
  },
});

// Get a single emergency contact by ID
export const getById = query({
  args: { id: v.id('emergencyContacts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get primary emergency contact for a user
export const getPrimary = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query('emergencyContacts')
      .withIndex('by_user_primary', (q) =>
        q.eq('userId', args.userId).eq('isPrimary', true)
      )
      .first();

    return contacts;
  },
});

// Get contacts that should be notified on SOS
export const getSosContacts = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query('emergencyContacts')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return contacts.filter((c) => c.notifyOnSos);
  },
});

// Create a new emergency contact
export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    relationship: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    isPrimary: v.boolean(),
    notifyOnSos: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If this is set as primary, unset other primary contacts
    if (args.isPrimary) {
      const existingPrimary = await ctx.db
        .query('emergencyContacts')
        .withIndex('by_user_primary', (q) =>
          q.eq('userId', args.userId).eq('isPrimary', true)
        )
        .collect();

      for (const contact of existingPrimary) {
        await ctx.db.patch(contact._id, { isPrimary: false, updatedAt: now });
      }
    }

    return await ctx.db.insert('emergencyContacts', {
      userId: args.userId,
      name: args.name,
      relationship: args.relationship,
      phoneNumber: args.phoneNumber,
      email: args.email,
      isPrimary: args.isPrimary,
      notifyOnSos: args.notifyOnSos,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an emergency contact
export const update = mutation({
  args: {
    id: v.id('emergencyContacts'),
    name: v.optional(v.string()),
    relationship: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notifyOnSos: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);

    if (!existing) {
      throw new Error('Emergency contact not found');
    }

    const now = Date.now();

    // If setting as primary, unset other primary contacts
    if (updates.isPrimary === true) {
      const existingPrimary = await ctx.db
        .query('emergencyContacts')
        .withIndex('by_user_primary', (q) =>
          q.eq('userId', existing.userId).eq('isPrimary', true)
        )
        .collect();

      for (const contact of existingPrimary) {
        if (contact._id !== id) {
          await ctx.db.patch(contact._id, { isPrimary: false, updatedAt: now });
        }
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, updatedAt: now });
    return await ctx.db.get(id);
  },
});

// Delete an emergency contact
export const remove = mutation({
  args: { id: v.id('emergencyContacts') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Set a contact as primary
export const setPrimary = mutation({
  args: {
    id: v.id('emergencyContacts'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Unset all other primary contacts for this user
    const existingPrimary = await ctx.db
      .query('emergencyContacts')
      .withIndex('by_user_primary', (q) =>
        q.eq('userId', args.userId).eq('isPrimary', true)
      )
      .collect();

    for (const contact of existingPrimary) {
      await ctx.db.patch(contact._id, { isPrimary: false, updatedAt: now });
    }

    // Set the new primary
    await ctx.db.patch(args.id, { isPrimary: true, updatedAt: now });
    return await ctx.db.get(args.id);
  },
});
