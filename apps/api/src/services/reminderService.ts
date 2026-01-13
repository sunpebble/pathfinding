/**
 * Reminder Service - Convex Implementation
 * Managing item reminders and notifications
 */

import type { Doc, Id  } from '../lib/convex';
import { api, convex } from '../lib/convex';

// Types
export interface Reminder {
  id: string;
  userId: string;
  itineraryId: string;
  itemId?: string;
  reminderTime: number;
  message: string;
  isTriggered: boolean;
  triggeredAt?: number;
}

export interface CreateReminderInput {
  itemId: string;
  minutesBefore: number;
}

export interface UpdateReminderInput {
  minutesBefore?: number;
}

function mapReminder(row: Doc<'reminders'>): Reminder {
  return {
    id: row._id,
    userId: row.userId,
    itineraryId: row.itineraryId,
    itemId: row.itemId,
    reminderTime: row.reminderTime,
    message: row.message,
    isTriggered: row.isTriggered,
    triggeredAt: row.triggeredAt,
  };
}

/**
 * Reminder service for managing item reminders
 */
export const reminderService = {
  /**
   * Schedule a new reminder for an itinerary item
   */
  async schedule(
    userId: string,
    input: CreateReminderInput
  ): Promise<Reminder> {
    // Get the item to find itinerary and calculate scheduled time
    const item = await convex.query(api.itineraryItems.getById, {
      id: input.itemId as Id<'itineraryItems'>,
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Get the day to find the itinerary
    const day = await convex.query(api.itineraryDays.getById, {
      id: item.dayId,
    });

    if (!day) {
      throw new Error('Day not found');
    }

    // Calculate scheduled time
    const _startTime = item.startTime || '09:00';
    // For now, use a simple calculation - in production would need proper date handling
    const reminderTime = Date.now() + input.minutesBefore * 60 * 1000;

    // Check if reminder already exists
    const existing = await convex.query(api.reminders.getByItemId, {
      userId,
      itemId: input.itemId as Id<'itineraryItems'>,
    });

    if (existing) {
      // Update existing reminder
      const updated = await convex.mutation(api.reminders.update, {
        id: existing._id,
        reminderTime,
        message: `Reminder: ${input.minutesBefore} minutes before`,
      });
      return mapReminder(updated);
    }

    // Create new reminder
    const reminderId = await convex.mutation(api.reminders.create, {
      userId,
      itineraryId: day.itineraryId,
      itemId: input.itemId as Id<'itineraryItems'>,
      reminderTime,
      message: `Reminder: ${input.minutesBefore} minutes before`,
    });

    const reminder = await convex.query(api.reminders.getById, {
      id: reminderId,
    });

    return mapReminder(reminder);
  },

  /**
   * Update an existing reminder
   */
  async update(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput
  ): Promise<Reminder> {
    const existing = await convex.query(api.reminders.getById, {
      id: reminderId as Id<'reminders'>,
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Reminder not found');
    }

    let reminderTime = existing.reminderTime;
    if (input.minutesBefore !== undefined) {
      // Recalculate reminder time
      reminderTime = Date.now() + input.minutesBefore * 60 * 1000;
    }

    const updated = await convex.mutation(api.reminders.update, {
      id: reminderId as Id<'reminders'>,
      reminderTime,
    });

    return mapReminder(updated);
  },

  /**
   * Delete a reminder
   */
  async delete(userId: string, reminderId: string): Promise<void> {
    const existing = await convex.query(api.reminders.getById, {
      id: reminderId as Id<'reminders'>,
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Reminder not found');
    }

    await convex.mutation(api.reminders.remove, {
      id: reminderId as Id<'reminders'>,
    });
  },

  /**
   * Get reminder for an item
   */
  async getByItemId(userId: string, itemId: string): Promise<Reminder | null> {
    const reminder = await convex.query(api.reminders.getByItemId, {
      userId,
      itemId: itemId as Id<'itineraryItems'>,
    });

    return reminder ? mapReminder(reminder) : null;
  },

  /**
   * List all reminders for a user
   */
  async listForUser(userId: string): Promise<Reminder[]> {
    const reminders = await convex.query(api.reminders.listByUser, {
      userId,
    });

    return reminders.map(mapReminder);
  },
};
