/**
 * Business Hours Service - Convex Implementation
 * Manages POI business hours, holiday hours, and reminders
 */

import type { Id } from '../lib/convex';
import type { BusinessHours, BestVisitTime, HolidayHours, BusinessHoursReminder } from '../models/poi';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// ============================================
// Helper Types
// ============================================

interface OpenStatus {
  isOpen: boolean;
  nextOpenTime: string | null;
  nextCloseTime: string | null;
  currentDay: string;
  todayHours: Array<{ open: string; close: string }> | null;
  holidayInfo: {
    holidayName: string;
    holidayNameEn?: string;
    isClosed: boolean;
    hours?: Array<{ open: string; close: string }>;
    notes?: string;
  } | null;
}

interface PoiWithBusinessHours {
  poi: Record<string, unknown>;
  openStatus: OpenStatus;
  bestVisitTime: BestVisitTime | null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the day of week as a lowercase string
 */
function getDayOfWeek(date: Date): string {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[date.getDay()];
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time is within a time slot
 */
function isWithinTimeSlot(
  currentMinutes: number,
  slot: { open: string; close: string }
): boolean {
  const openMinutes = parseTimeToMinutes(slot.open);
  const closeMinutes = parseTimeToMinutes(slot.close);

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// ============================================
// Business Hours Service
// ============================================

export const businessHoursService = {
  /**
   * Get POI with business hours and open/closed status
   */
  async getPoiWithBusinessHours(
    poiId: string,
    timezone?: string
  ): Promise<PoiWithBusinessHours | null> {
    try {
      const result = await convex.query(api.poiBusinessHours.getPoiWithBusinessHours, {
        poiId: poiId as Id<'pois'>,
        timezone,
      });
      return result as PoiWithBusinessHours | null;
    } catch {
      return null;
    }
  },

  /**
   * Check if POI is open at a specific time
   */
  async checkOpenStatus(
    poiId: string,
    timestamp?: number,
    timezone?: string
  ): Promise<OpenStatus | null> {
    // If no timestamp provided, use current time
    const date = timestamp ? new Date(timestamp) : new Date();
    const dayOfWeek = getDayOfWeek(date);
    const currentMinutes = date.getHours() * 60 + date.getMinutes();

    // Get POI with business hours
    const result = await this.getPoiWithBusinessHours(poiId, timezone);
    if (!result) return null;

    return result.openStatus;
  },

  /**
   * Update business hours for a POI
   */
  async updateBusinessHours(
    poiId: string,
    businessHours: BusinessHours
  ): Promise<Record<string, unknown>> {
    const result = await convex.mutation(api.poiBusinessHours.updateBusinessHours, {
      poiId: poiId as Id<'pois'>,
      businessHours,
    });

    if (!result) {
      throw new NotFoundError('POI not found');
    }

    return result as Record<string, unknown>;
  },

  /**
   * Update best visit time for a POI
   */
  async updateBestVisitTime(
    poiId: string,
    bestVisitTime: BestVisitTime
  ): Promise<Record<string, unknown>> {
    const result = await convex.mutation(api.poiBusinessHours.updateBestVisitTime, {
      poiId: poiId as Id<'pois'>,
      bestVisitTime,
    });

    if (!result) {
      throw new NotFoundError('POI not found');
    }

    return result as Record<string, unknown>;
  },

  /**
   * Get holiday hours for a POI
   */
  async getHolidayHours(
    poiId: string,
    includeExpired = false
  ): Promise<Array<Record<string, unknown>>> {
    const result = await convex.query(api.poiBusinessHours.getHolidayHours, {
      poiId: poiId as Id<'pois'>,
      includeExpired,
    });

    return result as Array<Record<string, unknown>>;
  },

  /**
   * Create holiday hours for a POI
   */
  async createHolidayHours(
    poiId: string,
    holidayHours: HolidayHours
  ): Promise<{ id: string }> {
    const id = await convex.mutation(api.poiBusinessHours.createHolidayHours, {
      poiId: poiId as Id<'pois'>,
      ...holidayHours,
    });

    return { id };
  },

  /**
   * Update holiday hours
   */
  async updateHolidayHours(
    id: string,
    updates: Partial<HolidayHours>
  ): Promise<Record<string, unknown>> {
    const result = await convex.mutation(api.poiBusinessHours.updateHolidayHours, {
      id: id as Id<'poiHolidayHours'>,
      ...updates,
    });

    if (!result) {
      throw new NotFoundError('Holiday hours not found');
    }

    return result as Record<string, unknown>;
  },

  /**
   * Delete holiday hours
   */
  async deleteHolidayHours(id: string): Promise<void> {
    await convex.mutation(api.poiBusinessHours.deleteHolidayHours, {
      id: id as Id<'poiHolidayHours'>,
    });
  },

  /**
   * Get user's business hours reminders
   */
  async getUserReminders(
    userId: string,
    includeTriggered = false
  ): Promise<Array<Record<string, unknown>>> {
    const result = await convex.query(api.poiBusinessHours.getUserReminders, {
      userId,
      includeTriggered,
    });

    return result as Array<Record<string, unknown>>;
  },

  /**
   * Create a business hours reminder
   */
  async createReminder(
    userId: string,
    reminder: BusinessHoursReminder
  ): Promise<{ id: string }> {
    const id = await convex.mutation(api.poiBusinessHours.createReminder, {
      userId,
      poiId: reminder.poiId as Id<'pois'>,
      itineraryItemId: reminder.itineraryItemId as Id<'itineraryItems'> | undefined,
      reminderType: reminder.reminderType,
      minutesBefore: reminder.minutesBefore,
      scheduledTime: reminder.scheduledTime,
    });

    return { id };
  },

  /**
   * Delete a business hours reminder
   */
  async deleteReminder(userId: string, reminderId: string): Promise<void> {
    // First verify the reminder belongs to the user
    const reminders = await this.getUserReminders(userId, true);
    const reminder = reminders.find((r) => r._id === reminderId);

    if (!reminder) {
      throw new NotFoundError('Reminder not found');
    }

    await convex.mutation(api.poiBusinessHours.deleteReminder, {
      id: reminderId as Id<'poiBusinessHoursReminders'>,
    });
  },

  /**
   * Delete all reminders for a POI
   */
  async deletePoiReminders(userId: string, poiId: string): Promise<number> {
    const deletedCount = await convex.mutation(api.poiBusinessHours.deletePoiReminders, {
      userId,
      poiId: poiId as Id<'pois'>,
    });

    return deletedCount;
  },

  /**
   * Get business hours for multiple POIs
   */
  async getBatchBusinessHours(
    poiIds: string[]
  ): Promise<Array<{ poiId: string; businessHours: unknown; bestVisitTime: unknown }>> {
    const result = await convex.query(api.poiBusinessHours.getBatchPoiBusinessHours, {
      poiIds: poiIds as Id<'pois'>[],
    });

    return result as Array<{ poiId: string; businessHours: unknown; bestVisitTime: unknown }>;
  },
};
