import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Reminder type
 */
export interface Reminder {
  id: string;
  userId: string;
  itemId: string;
  minutesBefore: number;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get authorization header with current session token
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Reminder service for managing item reminders
 */
export const reminderService = {
  /**
   * Schedule a reminder for an item
   */
  async schedule(itemId: string, minutesBefore: number): Promise<Reminder> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/items/${itemId}/reminders`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ minutesBefore }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to schedule reminder');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get reminder for an item
   */
  async getByItemId(itemId: string): Promise<Reminder | null> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/items/${itemId}/reminders`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get reminder');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Cancel (delete) reminder for an item
   */
  async cancel(itemId: string): Promise<void> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/items/${itemId}/reminders`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to cancel reminder');
    }
  },

  /**
   * List all user reminders
   */
  async list(): Promise<Reminder[]> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/reminders`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to list reminders');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Update a reminder
   */
  async update(reminderId: string, minutesBefore: number): Promise<Reminder> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/reminders/${reminderId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ minutesBefore }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update reminder');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Delete a reminder by ID
   */
  async delete(reminderId: string): Promise<void> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/reminders/${reminderId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete reminder');
    }
  },
};

export default reminderService;
