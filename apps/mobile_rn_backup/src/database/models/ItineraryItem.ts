import type ItineraryDay from './ItineraryDay';
import type Poi from './Poi';
import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  readonly,
  relation,
  text,
} from '@nozbe/watermelondb/decorators';

type SyncStatusType = 'synced' | 'pending' | 'error';

/**
 * ItineraryItem model for WatermelonDB
 */
export default class ItineraryItem extends Model {
  static table = 'itinerary_items';

  static associations = {
    itinerary_days: { type: 'belongs_to' as const, key: 'day_id' },
    pois: { type: 'belongs_to' as const, key: 'poi_id' },
  };

  @text('remote_id') remoteId!: string | null;
  @text('server_id') serverId!: string;
  @text('day_id') dayId!: string;
  @text('poi_id') poiId!: string | null;
  @field('order_index') orderIndex!: number;
  @text('start_time') startTime!: string | null;
  @text('end_time') endTime!: string | null;
  @text('notes') notes!: string | null;
  @text('transport_mode') transportMode!: string;
  @field('transport_minutes') transportMinutes!: number | null;
  @text('sync_status') syncStatus!: SyncStatusType;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('itinerary_days', 'day_id') day!: ItineraryDay;
  @relation('pois', 'poi_id') poi!: Poi | null;
}

// Re-export for external use
export { ItineraryItem };
