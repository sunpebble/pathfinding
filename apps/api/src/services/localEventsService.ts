/**
 * Local Events Service - Convex Implementation
 * CRUD operations for destination events and festivals
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export type EventType =
  | 'festival'
  | 'concert'
  | 'exhibition'
  | 'sports'
  | 'food'
  | 'cultural'
  | 'market'
  | 'performance'
  | 'religious'
  | 'seasonal'
  | 'local_custom'
  | 'other';

export type EventStatus = 'upcoming' | 'ongoing' | 'ended' | 'cancelled';

export type ReminderType = 'event_start' | 'booking_open' | 'custom';

export interface CreateEventInput {
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  cityId: string;
  venue?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  eventType: EventType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrencePattern?: Record<string, unknown>;
  isFree: boolean;
  ticketPrice?: number;
  ticketPriceMax?: number;
  currency?: string;
  ticketUrl?: string;
  requiresBooking?: boolean;
  coverImageUrl?: string;
  imageUrls?: string[];
  highlights?: string[];
  tips?: string[];
  tags?: string[];
  organizerName?: string;
  organizerPhone?: string;
  organizerEmail?: string;
  officialWebsite?: string;
  source?: string;
  sourceUrl?: string;
  externalId?: string;
}

export interface UpdateEventInput {
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  venue?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: Record<string, unknown>;
  isFree?: boolean;
  ticketPrice?: number;
  ticketPriceMax?: number;
  currency?: string;
  ticketUrl?: string;
  requiresBooking?: boolean;
  coverImageUrl?: string;
  imageUrls?: string[];
  highlights?: string[];
  tips?: string[];
  tags?: string[];
  organizerName?: string;
  organizerPhone?: string;
  organizerEmail?: string;
  officialWebsite?: string;
  status?: EventStatus;
  isVerified?: boolean;
  isFeatured?: boolean;
}

export interface EventListQuery {
  cityId: string;
  eventType?: EventType;
  status?: EventStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateReminderInput {
  eventId: string;
  reminderType: ReminderType;
  reminderTime: number;
  minutesBefore?: number;
  message?: string;
}

/**
 * Local Events service for CRUD operations
 */
export const LocalEventsService = {
  /**
   * List events for a city with optional filters
   */
  async listByCity(query: EventListQuery) {
    const result = await convex.query(api.localEvents.listByCity, {
      cityId: query.cityId as Id<'cities'>,
      eventType: query.eventType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    return result;
  },

  /**
   * List upcoming events for a city
   */
  async listUpcoming(cityId: string, limit?: number) {
    const events = await convex.query(api.localEvents.listUpcoming, {
      cityId: cityId as Id<'cities'>,
      limit,
    });

    return events;
  },

  /**
   * List ongoing events for a city
   */
  async listOngoing(cityId: string, limit?: number) {
    const events = await convex.query(api.localEvents.listOngoing, {
      cityId: cityId as Id<'cities'>,
      limit,
    });

    return events;
  },

  /**
   * List featured events for a city
   */
  async listFeatured(cityId: string, limit?: number) {
    const events = await convex.query(api.localEvents.listFeatured, {
      cityId: cityId as Id<'cities'>,
      limit,
    });

    return events;
  },

  /**
   * Get events for a date range (calendar view)
   */
  async listByDateRange(cityId: string, startDate: string, endDate: string) {
    const events = await convex.query(api.localEvents.listByDateRange, {
      cityId: cityId as Id<'cities'>,
      startDate,
      endDate,
    });

    return events;
  },

  /**
   * Get event by ID
   */
  async getById(eventId: string) {
    const event = await convex.query(api.localEvents.getById, {
      id: eventId as Id<'localEvents'>,
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return event;
  },

  /**
   * Search events
   */
  async search(query: string, cityId?: string, limit?: number) {
    const events = await convex.query(api.localEvents.search, {
      query,
      cityId: cityId as Id<'cities'> | undefined,
      limit,
    });

    return events;
  },

  /**
   * List recurring events (annual festivals)
   */
  async listRecurring(cityId: string, limit?: number) {
    const events = await convex.query(api.localEvents.listRecurring, {
      cityId: cityId as Id<'cities'>,
      limit,
    });

    return events;
  },

  /**
   * Create a new event
   */
  async create(input: CreateEventInput) {
    const eventId = await convex.mutation(api.localEvents.create, {
      ...input,
      cityId: input.cityId as Id<'cities'>,
    });

    return eventId;
  },

  /**
   * Update an event
   */
  async update(eventId: string, input: UpdateEventInput) {
    const updated = await convex.mutation(api.localEvents.update, {
      id: eventId as Id<'localEvents'>,
      ...input,
    });

    return updated;
  },

  /**
   * Delete an event
   */
  async delete(eventId: string) {
    await convex.mutation(api.localEvents.remove, {
      id: eventId as Id<'localEvents'>,
    });
  },

  /**
   * Increment view count
   */
  async incrementViewCount(eventId: string) {
    await convex.mutation(api.localEvents.incrementViewCount, {
      id: eventId as Id<'localEvents'>,
    });
  },

  // ============================================
  // Favorites
  // ============================================

  /**
   * Add event to favorites
   */
  async addFavorite(userId: string, eventId: string, notes?: string) {
    const favoriteId = await convex.mutation(api.localEvents.addFavorite, {
      userId,
      eventId: eventId as Id<'localEvents'>,
      notes,
    });

    return favoriteId;
  },

  /**
   * Remove event from favorites
   */
  async removeFavorite(userId: string, eventId: string) {
    await convex.mutation(api.localEvents.removeFavorite, {
      userId,
      eventId: eventId as Id<'localEvents'>,
    });
  },

  /**
   * Check if event is favorited
   */
  async isFavorited(userId: string, eventId: string) {
    const result = await convex.query(api.localEvents.isFavorited, {
      userId,
      eventId: eventId as Id<'localEvents'>,
    });

    return result;
  },

  /**
   * List user's favorite events
   */
  async listFavorites(userId: string, page?: number, pageSize?: number) {
    const result = await convex.query(api.localEvents.listFavorites, {
      userId,
      page,
      pageSize,
    });

    return result;
  },

  // ============================================
  // Reminders
  // ============================================

  /**
   * Create event reminder
   */
  async createReminder(userId: string, input: CreateReminderInput) {
    const reminderId = await convex.mutation(api.localEvents.createReminder, {
      userId,
      eventId: input.eventId as Id<'localEvents'>,
      reminderType: input.reminderType,
      reminderTime: input.reminderTime,
      minutesBefore: input.minutesBefore,
      message: input.message,
    });

    return reminderId;
  },

  /**
   * Delete event reminder
   */
  async deleteReminder(reminderId: string) {
    await convex.mutation(api.localEvents.deleteReminder, {
      id: reminderId as Id<'eventReminders'>,
    });
  },

  /**
   * List user's event reminders
   */
  async listReminders(userId: string, includeTriggered?: boolean) {
    const reminders = await convex.query(api.localEvents.listReminders, {
      userId,
      includeTriggered,
    });

    return reminders;
  },

  /**
   * Mark reminder as read
   */
  async markReminderRead(reminderId: string) {
    await convex.mutation(api.localEvents.markReminderRead, {
      id: reminderId as Id<'eventReminders'>,
    });
  },
};
