import type ItineraryDay from './ItineraryDay';
import { Model } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Itinerary model for WatermelonDB
 */
export default class Itinerary extends Model {
  static table = 'itineraries';

  static associations = {
    itinerary_days: { type: 'has_many' as const, foreignKey: 'itinerary_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('title') title!: string;
  @text('city_id') cityId!: string;
  @field('start_date') startDate!: number;
  @field('end_date') endDate!: number;
  @text('visibility') visibility!: string;
  @text('cover_image_url') coverImageUrl!: string | null;
  @text('copied_from_id') copiedFromId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('itinerary_days') days!: ItineraryDay[];

  /**
   * Get start date as Date object
   */
  get startDateObj(): Date {
    return new Date(this.startDate);
  }

  /**
   * Get end date as Date object
   */
  get endDateObj(): Date {
    return new Date(this.endDate);
  }

  /**
   * Get number of days in itinerary
   */
  get daysCount(): number {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }
}
