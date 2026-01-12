/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Itinerary Collaborators - Collaboration Management
 */

const roleValidator = v.union(
  v.literal('owner'),
  v.literal('editor'),
  v.literal('viewer')
);

// List collaborators for an itinerary
export const listCollaborators = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    const collaborators = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();

    return collaborators;
  },
});

// Get collaborator by itinerary and user
export const getCollaborator = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const collaborators = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    return collaborators;
  },
});

// List itineraries where user is a collaborator
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const collaborations = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Enrich with itinerary data
    const enriched = await Promise.all(
      collaborations.map(async (collab) => {
        const itinerary = await ctx.db.get(collab.itineraryId);
        if (!itinerary) return null;

        const city = await ctx.db.get(itinerary.cityId);

        return {
          ...collab,
          itinerary: {
            ...itinerary,
            cityName: city?.name,
          },
        };
      })
    );

    return enriched.filter((item) => item !== null);
  },
});

// Invite a collaborator to an itinerary
export const inviteCollaborator = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    role: roleValidator,
    invitedBy: v.string(), // User ID of the inviter
  },
  handler: async (ctx, args) => {
    // Check if itinerary exists
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) {
      throw new Error('Itinerary not found');
    }

    // Check if inviter has permission (must be owner or editor)
    const inviterCollab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.invitedBy)
      )
      .first();

    if (!inviterCollab || inviterCollab.role === 'viewer') {
      throw new Error('Insufficient permissions to invite collaborators');
    }

    // Check if user is already a collaborator
    const existingCollab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (existingCollab) {
      throw new Error('User is already a collaborator');
    }

    // Cannot invite as owner (only one owner per itinerary)
    if (args.role === 'owner') {
      throw new Error('Cannot invite another owner');
    }

    // Create collaborator record
    const collaboratorId = await ctx.db.insert('itineraryCollaborators', {
      userId: args.userId,
      itineraryId: args.itineraryId,
      role: args.role,
    });

    return collaboratorId;
  },
});

// Accept an invitation (placeholder for future invite system)
export const acceptInvite = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has a pending invitation
    const collab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (!collab) {
      throw new Error('No invitation found');
    }

    // In current implementation, invitations are auto-accepted
    // This function is a placeholder for future invite status tracking
    return collab._id;
  },
});

// Reject an invitation (placeholder for future invite system)
export const rejectInvite = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the collaboration record
    const collab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (!collab) {
      throw new Error('No invitation found');
    }

    // Remove the collaboration record
    await ctx.db.delete(collab._id);

    return { success: true };
  },
});

// Remove a collaborator from an itinerary
export const removeCollaborator = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    removedBy: v.string(), // User ID of the person removing
  },
  handler: async (ctx, args) => {
    // Check if remover has permission (must be owner)
    const removerCollab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.removedBy)
      )
      .first();

    if (!removerCollab || removerCollab.role !== 'owner') {
      throw new Error('Only the owner can remove collaborators');
    }

    // Find the collaborator to remove
    const collab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (!collab) {
      throw new Error('Collaborator not found');
    }

    // Cannot remove the owner
    if (collab.role === 'owner') {
      throw new Error('Cannot remove the owner');
    }

    // Remove the collaborator
    await ctx.db.delete(collab._id);

    return { success: true };
  },
});

// Update a collaborator's role
export const updateRole = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    newRole: roleValidator,
    updatedBy: v.string(), // User ID of the person updating
  },
  handler: async (ctx, args) => {
    // Check if updater has permission (must be owner)
    const updaterCollab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.updatedBy)
      )
      .first();

    if (!updaterCollab || updaterCollab.role !== 'owner') {
      throw new Error('Only the owner can update roles');
    }

    // Find the collaborator to update
    const collab = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary_user', (q) =>
        q.eq('itineraryId', args.itineraryId).eq('userId', args.userId)
      )
      .first();

    if (!collab) {
      throw new Error('Collaborator not found');
    }

    // Cannot change the owner's role
    if (collab.role === 'owner') {
      throw new Error('Cannot change the owner\'s role');
    }

    // Cannot promote to owner
    if (args.newRole === 'owner') {
      throw new Error('Cannot promote to owner');
    }

    // Update the role
    await ctx.db.patch(collab._id, {
      role: args.newRole,
    });

    return { success: true };
  },
});
