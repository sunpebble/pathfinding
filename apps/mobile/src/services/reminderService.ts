/**
 * Reminder Service - Convex-based implementation
 *
 * This service provides direct access to Convex reminder functions.
 * For React components, prefer using Convex hooks (useQuery, useMutation) directly.
 */

import type { Id } from '../../../../convex/_generated/dataModel';
import { convex } from '@/providers/ConvexProvider';
import { api } from '../../../../convex/_generated/api';

/**
 * Reminder service for mobile app using Convex
 *
 * Note: For reactive UI updates, use Convex hooks directly in components:
 * - useQuery(api.reminders.listByUser, { userId })
 * - useMutation(api.reminders.create)
 * - useMutation(api.reminders.update)
 * - useMutation(api.reminders.remove)
 */
export const reminderService = {
  /**
   * List all user reminders
   */
  async list(userId: Id<'users'>) {
    return convex.query(api.reminders.listByUser, { userId });
  },

  /**
   * Create a reminder for an item
   */
  async create(
    itemId: Id<'itineraryItems'>,
    userId: Id<'users'>,
    minutesBefore: number
  ) {
    return convex.mutation(api.reminders.create, {
      itemId,
      userId,
      minutesBefore,
    });
  },

  /**
   * Update a reminder
   */
  async update(
    reminderId: Id<'reminders'>,
    userId: Id<'users'>,
    minutesBefore: number
  ) {
    return convex.mutation(api.reminders.update, {
      id: reminderId,
      userId,
      minutesBefore,
    });
  },

  /**
   * Delete a reminder by ID
   */
  async remove(reminderId: Id<'reminders'>, userId: Id<'users'>) {
    return convex.mutation(api.reminders.remove, {
      id: reminderId,
      userId,
    });
  },
};

// Re-export the API for use with Convex hooks
export { api };

export default reminderService;
