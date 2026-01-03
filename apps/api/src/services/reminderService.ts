import type {
  CreateReminderInput,
  Reminder,
  UpdateReminderInput,
} from '../models/reminder.js';
import { getSupabaseClient } from '../lib/supabase.js';

/**
 * Map database row to Reminder type
 */
function mapReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    itemId: row.item_id as string,
    minutesBefore: row.minutes_before as number,
    scheduledAt: row.scheduled_at as string,
    sentAt: (row.sent_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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
    const supabase = getSupabaseClient();

    // Get the item to calculate scheduled time
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select(
        `
        id,
        start_time,
        itinerary_days!inner (
          date,
          itineraries!inner (
            user_id
          )
        )
      `
      )
      .eq('id', input.itemId)
      .single();

    if (itemError || !item) {
      throw new Error('Item not found');
    }

    // Verify ownership
    const itineraryUserId = (
      item.itinerary_days as unknown as {
        itineraries: { user_id: string };
      }
    ).itineraries.user_id;
    if (itineraryUserId !== userId) {
      throw new Error('Not authorized to set reminder for this item');
    }

    // Calculate scheduled time
    const dayDate = (item.itinerary_days as unknown as { date: string }).date;
    const startTime = item.start_time || '09:00';
    const itemDateTime = new Date(`${dayDate}T${startTime}`);
    const scheduledAt = new Date(
      itemDateTime.getTime() - input.minutesBefore * 60 * 1000
    );

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', input.itemId)
      .maybeSingle();

    if (existing) {
      // Update existing reminder
      const { data, error } = await supabase
        .from('reminders')
        .update({
          minutes_before: input.minutesBefore,
          scheduled_at: scheduledAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return mapReminder(data);
    }

    // Create new reminder
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: userId,
        item_id: input.itemId,
        minutes_before: input.minutesBefore,
        scheduled_at: scheduledAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return mapReminder(data);
  },

  /**
   * Update an existing reminder
   */
  async update(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput
  ): Promise<Reminder> {
    const supabase = getSupabaseClient();

    // Get existing reminder
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select(
        `
        *,
        itinerary_items (
          start_time,
          itinerary_days (
            date
          )
        )
      `
      )
      .eq('id', reminderId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !reminder) {
      throw new Error('Reminder not found');
    }

    // Calculate new scheduled time if minutesBefore changed
    let scheduledAt = reminder.scheduled_at;
    if (input.minutesBefore !== undefined) {
      const item = reminder.itinerary_items as unknown as {
        start_time: string;
        itinerary_days: { date: string };
      };
      const dayDate = item.itinerary_days.date;
      const startTime = item.start_time || '09:00';
      const itemDateTime = new Date(`${dayDate}T${startTime}`);
      scheduledAt = new Date(
        itemDateTime.getTime() - input.minutesBefore * 60 * 1000
      ).toISOString();
    }

    const { data, error } = await supabase
      .from('reminders')
      .update({
        minutes_before: input.minutesBefore ?? reminder.minutes_before,
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return mapReminder(data);
  },

  /**
   * Delete a reminder
   */
  async delete(userId: string, reminderId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Get reminder for an item
   */
  async getByItemId(userId: string, itemId: string): Promise<Reminder | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapReminder(data) : null;
  },

  /**
   * List all reminders for a user
   */
  async listForUser(userId: string): Promise<Reminder[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapReminder);
  },
};
