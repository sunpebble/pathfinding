import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

/**
 * POI (Point of Interest) model for WatermelonDB
 * Cached from server for offline access
 */
export default class Poi extends Model {
  static table = "pois";

  @text("server_id") serverId!: string;
  @text("name") name!: string;
  @text("name_en") nameEn!: string | null;
  @text("category") category!: string;
  @text("city_id") cityId!: string;
  @text("address") address!: string | null;
  @field("latitude") latitude!: number;
  @field("longitude") longitude!: number;
  @field("rating") rating!: number | null;
  @field("rating_count") ratingCount!: number;
  @field("price_level") priceLevel!: number | null;
  @text("business_hours") businessHoursJson!: string | null;
  @text("image_urls") imageUrlsJson!: string | null;

  /**
   * Get business hours as parsed object
   */
  get businessHours(): Record<string, { open: string; close: string }[]> | null {
    if (!this.businessHoursJson) return null;
    try {
      return JSON.parse(this.businessHoursJson);
    } catch {
      return null;
    }
  }

  /**
   * Get image URLs as array
   */
  get imageUrls(): string[] {
    if (!this.imageUrlsJson) return [];
    try {
      return JSON.parse(this.imageUrlsJson);
    } catch {
      return [];
    }
  }
}
