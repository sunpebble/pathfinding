/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Users - Authentication and Profile Management
 * Handles user sessions and profile data using Convex Auth
 */

// Get current authenticated user with profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Look up profile by email
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', identity.email!))
      .first();

    return {
      id: identity.subject,
      email: identity.email,
      name: identity.name,
      pictureUrl: identity.pictureUrl,
      profile: profile
        ? {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }
        : null,
    };
  },
});

// Get user by ID (for looking up other users)
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Query profiles table - in Convex Auth, user data is spread across auth tables and profiles
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), args.userId))
      .first();

    if (!profile) {
      return null;
    }

    return {
      id: args.userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };
  },
});

// Check if user is authenticated (returns boolean)
export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity !== null;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if profile exists
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', identity.email!))
      .first();

    const data = {
      email: identity.email!,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
    };

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      // Create new profile
      return await ctx.db.insert('profiles', data);
    }
  },
});

// Get or create user profile (useful for first-time login)
export const getOrCreateProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if profile exists
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', identity.email!))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new profile with defaults from identity
    return await ctx.db.insert('profiles', {
      email: identity.email!,
      displayName: identity.name,
      avatarUrl: identity.pictureUrl,
    });
  },
});
