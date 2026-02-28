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
      .withIndex('by_email', q => q.eq('email', identity.email!))
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
            bio: profile.bio,
            followersCount: profile.followersCount ?? 0,
            followingCount: profile.followingCount ?? 0,
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
    // ⚡ Bolt: Using 'by_email' index instead of .filter() full table scan
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_email', q => q.eq('email', args.userId))
      .first();

    if (!profile) {
      return null;
    }

    return {
      id: args.userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      followersCount: profile.followersCount ?? 0,
      followingCount: profile.followingCount ?? 0,
    };
  },
});

// Get user profile with follow status (for viewing other users' profiles)
export const getUserProfile = query({
  args: {
    userId: v.string(),
    currentUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Query profiles table
    // ⚡ Bolt: Using 'by_email' index instead of .filter() full table scan
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_email', q => q.eq('email', args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // Check follow status if currentUserId is provided
    let isFollowing = false;
    let isFollowedBy = false;

    if (args.currentUserId && args.currentUserId !== args.userId) {
      const currentUserFollows = await ctx.db
        .query('userFollows')
        .withIndex('by_follower_following', q =>
          q.eq('followerId', args.currentUserId!).eq('followingId', args.userId))
        .first();
      isFollowing = currentUserFollows !== null;

      const targetUserFollows = await ctx.db
        .query('userFollows')
        .withIndex('by_follower_following', q =>
          q.eq('followerId', args.userId).eq('followingId', args.currentUserId!))
        .first();
      isFollowedBy = targetUserFollows !== null;
    }

    return {
      id: args.userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      followersCount: profile.followersCount ?? 0,
      followingCount: profile.followingCount ?? 0,
      isFollowing,
      isFollowedBy,
      isMutual: isFollowing && isFollowedBy,
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
    bio: v.optional(v.string()),
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
      .withIndex('by_email', q => q.eq('email', identity.email!))
      .first();

    const data: {
      email: string;
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
    } = {
      email: identity.email!,
    };

    if (args.displayName !== undefined) {
      data.displayName = args.displayName;
    }
    if (args.avatarUrl !== undefined) {
      data.avatarUrl = args.avatarUrl;
    }
    if (args.bio !== undefined) {
      data.bio = args.bio;
    }

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    else {
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
      .withIndex('by_email', q => q.eq('email', identity.email!))
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
