/**
 * Ticket Service - Convex Implementation
 * Manages POI ticket information and reminders
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';
import type {
  CreateTicketInput,
  CreateTicketReminderInput,
  PoiTicket,
  TicketPriceRange,
  TicketReminder,
  UpdateTicketInput,
  UpdateTicketReminderInput,
} from '../models/ticket';

/**
 * Convert Convex ticket document to API response format
 */
function toPoiTicket(doc: Doc<'poiTickets'>): PoiTicket {
  return {
    id: doc._id,
    poiId: doc.poiId,
    ticketName: doc.ticketName,
    ticketType: doc.ticketType,
    price: doc.price,
    originalPrice: doc.originalPrice,
    currency: doc.currency ?? 'CNY',
    discountInfo: doc.discountInfo,
    discountPercentage: doc.discountPercentage,
    eligibilityRequirements: doc.eligibilityRequirements,
    ageRange: doc.ageRange,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    validDays: doc.validDays,
    purchaseUrl: doc.purchaseUrl,
    purchasePlatform: doc.purchasePlatform,
    requiresReservation: doc.requiresReservation,
    reservationUrl: doc.reservationUrl,
    reservationTips: doc.reservationTips,
    advanceBookingDays: doc.advanceBookingDays,
    usageInstructions: doc.usageInstructions,
    includedServices: doc.includedServices,
    excludedServices: doc.excludedServices,
    isActive: doc.isActive,
    stockStatus: doc.stockStatus,
    sortOrder: doc.sortOrder,
    isRecommended: doc.isRecommended,
    source: doc.source,
    lastSyncedAt: doc.lastSyncedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert Convex reminder document to API response format
 */
function toTicketReminder(doc: Doc<'ticketReminders'>): TicketReminder {
  return {
    id: doc._id,
    userId: doc.userId,
    poiId: doc.poiId,
    ticketId: doc.ticketId,
    itineraryId: doc.itineraryId,
    reminderType: doc.reminderType,
    reminderTime: doc.reminderTime,
    message: doc.message,
    isTriggered: doc.isTriggered,
    triggeredAt: doc.triggeredAt,
    isRead: doc.isRead,
    readAt: doc.readAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Ticket Service for POI ticket information
 */
export const TicketService = {
  // ============================================
  // POI Tickets
  // ============================================

  /**
   * List tickets for a POI
   */
  async listByPoi(
    poiId: string,
    activeOnly: boolean = true,
    _accessToken: string
  ): Promise<PoiTicket[]> {
    const tickets = await convex.query(api.poiTickets.listByPoi, {
      poiId: poiId as Id<'pois'>,
      activeOnly,
    });
    return tickets.map(toPoiTicket);
  },

  /**
   * Get a ticket by ID
   */
  async getTicketById(ticketId: string, _accessToken: string): Promise<PoiTicket> {
    const ticket = await convex.query(api.poiTickets.getById, {
      id: ticketId as Id<'poiTickets'>,
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    return toPoiTicket(ticket);
  },

  /**
   * Get ticket price range for a POI
   */
  async getPriceRange(
    poiId: string,
    _accessToken: string
  ): Promise<TicketPriceRange | null> {
    return await convex.query(api.poiTickets.getPriceRange, {
      poiId: poiId as Id<'pois'>,
    });
  },

  /**
   * Get recommended tickets for a POI
   */
  async getRecommended(
    poiId: string,
    limit: number = 5,
    _accessToken: string
  ): Promise<PoiTicket[]> {
    const tickets = await convex.query(api.poiTickets.getRecommended, {
      poiId: poiId as Id<'pois'>,
      limit,
    });
    return tickets.map(toPoiTicket);
  },

  /**
   * Create a new ticket
   */
  async createTicket(
    poiId: string,
    input: CreateTicketInput,
    _accessToken: string
  ): Promise<PoiTicket> {
    const ticketId = await convex.mutation(api.poiTickets.create, {
      poiId: poiId as Id<'pois'>,
      ...input,
    });

    const ticket = await convex.query(api.poiTickets.getById, {
      id: ticketId,
    });

    if (!ticket) {
      throw new Error('Failed to create ticket');
    }

    return toPoiTicket(ticket);
  },

  /**
   * Update a ticket
   */
  async updateTicket(
    ticketId: string,
    input: UpdateTicketInput,
    _accessToken: string
  ): Promise<PoiTicket> {
    const updated = await convex.mutation(api.poiTickets.update, {
      id: ticketId as Id<'poiTickets'>,
      ...input,
    });

    if (!updated) {
      throw new NotFoundError('Ticket not found');
    }

    return toPoiTicket(updated);
  },

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId: string, _accessToken: string): Promise<void> {
    await convex.mutation(api.poiTickets.remove, {
      id: ticketId as Id<'poiTickets'>,
    });
  },

  /**
   * Bulk create tickets for a POI
   */
  async bulkCreateTickets(
    poiId: string,
    tickets: CreateTicketInput[],
    _accessToken: string
  ): Promise<string[]> {
    const ids = await convex.mutation(api.poiTickets.bulkCreate, {
      poiId: poiId as Id<'pois'>,
      tickets: tickets.map((t) => ({
        ...t,
        requiresReservation: t.requiresReservation ?? false,
      })),
    });
    return ids;
  },

  // ============================================
  // Ticket Reminders
  // ============================================

  /**
   * List reminders for a user
   */
  async listUserReminders(
    userId: string,
    includeTriggered: boolean = false,
    limit: number = 50,
    _accessToken: string
  ): Promise<TicketReminder[]> {
    const reminders = await convex.query(api.ticketReminders.listByUser, {
      userId,
      includeTriggered,
      limit,
    });
    return reminders.map(toTicketReminder);
  },

  /**
   * Get a reminder by ID
   */
  async getReminderById(
    reminderId: string,
    _accessToken: string
  ): Promise<TicketReminder> {
    const reminder = await convex.query(api.ticketReminders.getById, {
      id: reminderId as Id<'ticketReminders'>,
    });

    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    return toTicketReminder(reminder);
  },

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(
    userId: string,
    days: number = 7,
    _accessToken: string
  ): Promise<TicketReminder[]> {
    const reminders = await convex.query(api.ticketReminders.getUpcoming, {
      userId,
      days,
    });
    return reminders.map(toTicketReminder);
  },

  /**
   * Get unread reminder count for a user
   */
  async getUnreadCount(userId: string, _accessToken: string): Promise<number> {
    return await convex.query(api.ticketReminders.getUnreadCount, {
      userId,
    });
  },

  /**
   * Create a new reminder
   */
  async createReminder(
    userId: string,
    input: CreateTicketReminderInput,
    _accessToken: string
  ): Promise<TicketReminder> {
    const reminderId = await convex.mutation(api.ticketReminders.create, {
      userId,
      poiId: input.poiId as Id<'pois'>,
      ticketId: input.ticketId as Id<'poiTickets'> | undefined,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      reminderType: input.reminderType,
      reminderTime: input.reminderTime,
      message: input.message,
    });

    const reminder = await convex.query(api.ticketReminders.getById, {
      id: reminderId,
    });

    if (!reminder) {
      throw new Error('Failed to create reminder');
    }

    return toTicketReminder(reminder);
  },

  /**
   * Update a reminder
   */
  async updateReminder(
    reminderId: string,
    input: UpdateTicketReminderInput,
    _accessToken: string
  ): Promise<TicketReminder> {
    const updated = await convex.mutation(api.ticketReminders.update, {
      id: reminderId as Id<'ticketReminders'>,
      ...input,
    });

    if (!updated) {
      throw new NotFoundError('Reminder not found');
    }

    return toTicketReminder(updated);
  },

  /**
   * Mark a reminder as read
   */
  async markReminderRead(
    reminderId: string,
    _accessToken: string
  ): Promise<TicketReminder> {
    const updated = await convex.mutation(api.ticketReminders.markRead, {
      id: reminderId as Id<'ticketReminders'>,
    });

    if (!updated) {
      throw new NotFoundError('Reminder not found');
    }

    return toTicketReminder(updated);
  },

  /**
   * Mark all reminders as read for a user
   */
  async markAllRemindersRead(
    userId: string,
    _accessToken: string
  ): Promise<number> {
    return await convex.mutation(api.ticketReminders.markAllRead, {
      userId,
    });
  },

  /**
   * Delete a reminder
   */
  async deleteReminder(
    reminderId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.ticketReminders.remove, {
      id: reminderId as Id<'ticketReminders'>,
    });
  },
};
