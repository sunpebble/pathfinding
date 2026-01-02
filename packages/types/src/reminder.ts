/**
 * Reminder entity - push notification schedule for itinerary items
 */
export interface Reminder {
  id: string;
  itemId: string;
  userId: string;
  minutesBefore: number;
  scheduledAt: Date;
  sentAt?: Date;
  createdAt: Date;
}

/**
 * Reminder input for creating a new reminder
 */
export interface CreateReminderInput {
  itemId: string;
  minutesBefore: number;
}

/**
 * Reminder update input for partial updates
 */
export interface UpdateReminderInput {
  minutesBefore?: number;
}

/**
 * Pending reminder for batch processing
 */
export interface PendingReminder {
  reminderId: string;
  itemId: string;
  userId: string;
  scheduledAt: Date;
  poiName: string;
  itineraryTitle: string;
}
