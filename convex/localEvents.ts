/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Local Events - CRUD operations for destination events and festivals
 */

// Event type validator
const eventTypeValidator = v.union(
  v.literal('festival'),
  v.literal('concert'),
  v.literal('exhibition'),
  v.literal('sports'),
  v.literal('food'),
  v.literal('cultural'),
  v.literal('market'),
  v.literal('performance'),
  v.literal('religious'),
  v.literal('seasonal'),
  v.literal('local_custom'),
  v.literal('other')
);

// Event status validator
const eventStatusValidator = v.union(
  v.literal('upcoming'),
  v.literal('ongoing'),
  v.literal('ended'),
  v.literal('cancelled')
);

// ============================================
// Local Events Queries
// ============================================

/**
 * List events for a city with optional filters
 */
export const listByCity = query({
  args: {
    cityId: v.id('cities'),
    eventType: v.optional(eventTypeValidator),
    status: v.optional(eventStatusValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;

    const eventsQuery = ctx.db
      .query('localEvents')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId));

    const allEvents = await eventsQuery.collect();

    // Apply filters
    let filtered = allEvents;

    if (args.eventType) {
      filtered = filtered.filter((e) => e.eventType === args.eventType);
    }

    if (args.status) {
      filtered = filtered.filter((e) => e.status === args.status);
    }

    if (args.startDate) {
      filtered = filtered.filter((e) => e.startDate >= args.startDate!);
    }

    if (args.endDate) {
      filtered = filtered.filter((e) => e.endDate <= args.endDate!);
    }

    // Sort by start date
    filtered.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return { data, total };
  },
});

/**
 * List upcoming events for a city
 */
export const listUpcoming = query({
  args: {
    cityId: v.id('cities'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const today = new Date().toISOString().split('T')[0];

    const events = await ctx.db
      .query('localEvents')
      .withIndex('by_city_status', (q) =>
        q.eq('cityId', args.cityId).eq('status', 'upcoming')
      )
      .collect();

    // Filter events that haven't started yet and sort by start date
    const filtered = events
      .filter((e) => e.startDate >= today)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
      .slice(0, limit);

    return filtered;
  },
});

/**
 * List ongoing events for a city
 */
export const listOngoing = query({
  args: {
    cityId: v.id('cities'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const events = await ctx.db
      .query('localEvents')
      .withIndex('by_city_status', (q) =>
        q.eq('cityId', args.cityId).eq('status', 'ongoing')
      )
      .take(limit);

    return events;
  },
});

/**
 * List featured events for a city
 */
export const listFeatured = query({
  args: {
    cityId: v.id('cities'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    const allEvents = await ctx.db
      .query('localEvents')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect();

    const featured = allEvents
      .filter(
        (e) => e.isFeatured && e.status !== 'ended' && e.status !== 'cancelled'
      )
      .slice(0, limit);

    return featured;
  },
});

/**
 * Get events for a specific date range (calendar view)
 */
export const listByDateRange = query({
  args: {
    cityId: v.id('cities'),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query('localEvents')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect();

    // Filter events that overlap with the date range
    const filtered = events.filter((e) => {
      // Event overlaps if: event.start <= range.end AND event.end >= range.start
      return e.startDate <= args.endDate && e.endDate >= args.startDate;
    });

    // Sort by start date
    filtered.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return filtered;
  },
});

/**
 * Get event by ID
 */
export const getById = query({
  args: { id: v.id('localEvents') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    // Get city info
    const city = await ctx.db.get(event.cityId);

    return { ...event, city };
  },
});

/**
 * Search events by name or description
 */
export const search = query({
  args: {
    query: v.string(),
    cityId: v.optional(v.id('cities')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchLower = args.query.toLowerCase();

    let events;
    if (args.cityId) {
      events = await ctx.db
        .query('localEvents')
        .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
        .collect();
    } else {
      events = await ctx.db.query('localEvents').collect();
    }

    const filtered = events
      .filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.nameEn?.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower)
      )
      .slice(0, limit);

    return filtered;
  },
});

/**
 * Get recurring events (annual festivals)
 */
export const listRecurring = query({
  args: {
    cityId: v.id('cities'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const events = await ctx.db
      .query('localEvents')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect();

    const recurring = events.filter((e) => e.isRecurring).slice(0, limit);

    return recurring;
  },
});

// ============================================
// Local Events Mutations
// ============================================

/**
 * Create a new event
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    description: v.string(),
    descriptionEn: v.optional(v.string()),
    cityId: v.id('cities'),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    eventType: eventTypeValidator,
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isAllDay: v.boolean(),
    isRecurring: v.boolean(),
    recurrencePattern: v.optional(v.any()),
    isFree: v.boolean(),
    ticketPrice: v.optional(v.number()),
    ticketPriceMax: v.optional(v.number()),
    currency: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    requiresBooking: v.optional(v.boolean()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    highlights: v.optional(v.array(v.string())),
    tips: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    organizerName: v.optional(v.string()),
    organizerPhone: v.optional(v.string()),
    organizerEmail: v.optional(v.string()),
    officialWebsite: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Determine initial status
    let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
    if (args.startDate <= today && args.endDate >= today) {
      status = 'ongoing';
    } else if (args.endDate < today) {
      status = 'ended';
    }

    const eventId = await ctx.db.insert('localEvents', {
      ...args,
      status,
      viewCount: 0,
      saveCount: 0,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

/**
 * Update an event
 */
export const update = mutation({
  args: {
    id: v.id('localEvents'),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    venue: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    eventType: v.optional(eventTypeValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isAllDay: v.optional(v.boolean()),
    isRecurring: v.optional(v.boolean()),
    recurrencePattern: v.optional(v.any()),
    isFree: v.optional(v.boolean()),
    ticketPrice: v.optional(v.number()),
    ticketPriceMax: v.optional(v.number()),
    currency: v.optional(v.string()),
    ticketUrl: v.optional(v.string()),
    requiresBooking: v.optional(v.boolean()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    highlights: v.optional(v.array(v.string())),
    tips: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    organizerName: v.optional(v.string()),
    organizerPhone: v.optional(v.string()),
    organizerEmail: v.optional(v.string()),
    officialWebsite: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    isVerified: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Filter out undefined values
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

/**
 * Delete an event
 */
export const remove = mutation({
  args: { id: v.id('localEvents') },
  handler: async (ctx, args) => {
    // Delete associated favorites
    const favorites = await ctx.db
      .query('eventFavorites')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect();
    for (const fav of favorites) {
      await ctx.db.delete(fav._id);
    }

    // Delete associated reminders
    const reminders = await ctx.db
      .query('eventReminders')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // Delete associated reviews
    const reviews = await ctx.db
      .query('eventReviews')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect();
    for (const review of reviews) {
      // Delete review votes
      const votes = await ctx.db
        .query('eventReviewVotes')
        .withIndex('by_review', (q) => q.eq('reviewId', review._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }
      await ctx.db.delete(review._id);
    }

    // Delete the event
    await ctx.db.delete(args.id);
  },
});

/**
 * Increment view count
 */
export const incrementViewCount = mutation({
  args: { id: v.id('localEvents') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return;

    await ctx.db.patch(args.id, {
      viewCount: (event.viewCount || 0) + 1,
    });
  },
});

/**
 * Update event status based on dates
 */
export const updateEventStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Get all non-ended, non-cancelled events
    const events = await ctx.db.query('localEvents').collect();

    for (const event of events) {
      if (event.status === 'cancelled') continue;

      let newStatus = event.status;

      if (event.endDate < today) {
        newStatus = 'ended';
      } else if (event.startDate <= today && event.endDate >= today) {
        newStatus = 'ongoing';
      } else if (event.startDate > today) {
        newStatus = 'upcoming';
      }

      if (newStatus !== event.status) {
        await ctx.db.patch(event._id, {
          status: newStatus,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// ============================================
// Event Favorites
// ============================================

/**
 * Add event to favorites
 */
export const addFavorite = mutation({
  args: {
    userId: v.string(),
    eventId: v.id('localEvents'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query('eventFavorites')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Add to favorites
    const favoriteId = await ctx.db.insert('eventFavorites', {
      userId: args.userId,
      eventId: args.eventId,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Update save count on event
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        saveCount: (event.saveCount || 0) + 1,
      });
    }

    return favoriteId;
  },
});

/**
 * Remove event from favorites
 */
export const removeFavorite = mutation({
  args: {
    userId: v.string(),
    eventId: v.id('localEvents'),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('eventFavorites')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();

    if (!favorite) return;

    await ctx.db.delete(favorite._id);

    // Update save count on event
    const event = await ctx.db.get(args.eventId);
    if (event && event.saveCount > 0) {
      await ctx.db.patch(args.eventId, {
        saveCount: event.saveCount - 1,
      });
    }
  },
});

/**
 * Check if event is favorited by user
 */
export const isFavorited = query({
  args: {
    userId: v.string(),
    eventId: v.id('localEvents'),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('eventFavorites')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', args.userId).eq('eventId', args.eventId)
      )
      .first();

    return !!favorite;
  },
});

/**
 * List user's favorite events
 */
export const listFavorites = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;

    const favorites = await ctx.db
      .query('eventFavorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Sort by created at descending
    favorites.sort((a, b) => b.createdAt - a.createdAt);

    const total = favorites.length;
    const start = (page - 1) * pageSize;
    const paginated = favorites.slice(start, start + pageSize);

    // Fetch event details
    const events = await Promise.all(
      paginated.map(async (fav) => {
        const event = await ctx.db.get(fav.eventId);
        return event
          ? { ...event, favoriteNotes: fav.notes, favoritedAt: fav.createdAt }
          : null;
      })
    );

    return { data: events.filter(Boolean), total };
  },
});

// ============================================
// Event Reminders
// ============================================

/**
 * Create event reminder
 */
export const createReminder = mutation({
  args: {
    userId: v.string(),
    eventId: v.id('localEvents'),
    reminderType: v.union(
      v.literal('event_start'),
      v.literal('booking_open'),
      v.literal('custom')
    ),
    reminderTime: v.number(),
    minutesBefore: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const reminderId = await ctx.db.insert('eventReminders', {
      userId: args.userId,
      eventId: args.eventId,
      reminderType: args.reminderType,
      reminderTime: args.reminderTime,
      minutesBefore: args.minutesBefore,
      message: args.message,
      isTriggered: false,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    return reminderId;
  },
});

/**
 * Delete event reminder
 */
export const deleteReminder = mutation({
  args: { id: v.id('eventReminders') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * List user's event reminders
 */
export const listReminders = query({
  args: {
    userId: v.string(),
    includeTriggered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('eventReminders')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    let filtered = reminders;
    if (!args.includeTriggered) {
      filtered = reminders.filter((r) => !r.isTriggered);
    }

    // Sort by reminder time
    filtered.sort((a, b) => a.reminderTime - b.reminderTime);

    // Fetch event details
    const withEvents = await Promise.all(
      filtered.map(async (reminder) => {
        const event = await ctx.db.get(reminder.eventId);
        return { ...reminder, event };
      })
    );

    return withEvents;
  },
});

/**
 * Get pending reminders that should be triggered
 */
export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const reminders = await ctx.db
      .query('eventReminders')
      .withIndex('by_triggered', (q) => q.eq('isTriggered', false))
      .collect();

    // Filter reminders that should be triggered
    const pending = reminders.filter((r) => r.reminderTime <= now);

    // Fetch event details
    const withEvents = await Promise.all(
      pending.map(async (reminder) => {
        const event = await ctx.db.get(reminder.eventId);
        return { ...reminder, event };
      })
    );

    return withEvents;
  },
});

/**
 * Mark reminder as triggered
 */
export const markReminderTriggered = mutation({
  args: { id: v.id('eventReminders') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isTriggered: true,
      triggeredAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark reminder as read
 */
export const markReminderRead = mutation({
  args: { id: v.id('eventReminders') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isRead: true,
      readAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
