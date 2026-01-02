import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

/**
 * City model for WatermelonDB
 * Cached from server for offline access
 */
export default class City extends Model {
  static table = 'cities';

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('name_en') nameEn!: string | null;
  @text('timezone') timezone!: string;
  @text('country_code') countryCode!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
}
