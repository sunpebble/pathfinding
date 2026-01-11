import type ItineraryItem from './ItineraryItem';
import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  readonly,
  relation,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Reminder model for WatermelonDB
 */
export default class Reminder extends Model {
  static table = 'reminders';

  static associations = {
    itinerary_items: { type: 'belongs_to' as const, key: 'item_id' },
  };

  @text('server_id') serverId!: string;
  @text('item_id') itemId!: string;
  @text('user_id') userId!: string;
  @field('minutes_before') minutesBefore!: number;
  @field('scheduled_at') scheduledAt!: number;
  @field('sent_at') sentAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;

  @relation('itinerary_items', 'item_id') item!: ItineraryItem;

  /**
   * Get scheduled time as Date object
   */
  get scheduledAtDate(): Date {
    return new Date(this.scheduledAt);
  }

  /**
   * Check if reminder has been sent
   */
  get isSent(): boolean {
    return this.sentAt !== null;
  }
}
