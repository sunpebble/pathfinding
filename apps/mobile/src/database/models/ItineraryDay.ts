import type Itinerary from './Itinerary';
import type ItineraryItem from './ItineraryItem';
import { Model } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  readonly,
  relation,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * ItineraryDay model for WatermelonDB
 */
export default class ItineraryDay extends Model {
  static table = 'itinerary_days';

  static associations = {
    itineraries: { type: 'belongs_to' as const, key: 'itinerary_id' },
    itinerary_items: { type: 'has_many' as const, foreignKey: 'day_id' },
  };

  @text('server_id') serverId!: string;
  @text('itinerary_id') itineraryId!: string;
  @field('day_number') dayNumber!: number;
  @field('date') dateTimestamp!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('itineraries', 'itinerary_id') itinerary!: Itinerary;
  @children('itinerary_items') items!: ItineraryItem[];

  /**
   * Get date as Date object
   */
  get dateObj(): Date {
    return new Date(this.dateTimestamp);
  }
}
