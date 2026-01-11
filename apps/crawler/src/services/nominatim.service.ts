/**
 * Nominatim Geocoding Service
 * Uses OpenStreetMap's free geocoding API
 */

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Pathfinding/1.0 (travel planning app)';
const REQUEST_DELAY_MS = 1000; // Nominatim rate limit: 1 request/second

/**
 * NominatimService - Open-source geocoding using OpenStreetMap
 */
export class NominatimService {
  private lastRequestTime = 0;

  /**
   * Wait to respect rate limits
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, REQUEST_DELAY_MS - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Geocode a location by name and optional city
   */
  async geocode(
    query: string,
    city?: string
  ): Promise<GeocodedLocation | null> {
    await this.throttle();

    const searchQuery = city ? `${query}, ${city}, China` : `${query}, China`;

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        limit: '1',
        'accept-language': 'zh',
      });

      const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`Nominatim error: ${response.status}`);
        return null;
      }

      const results = (await response.json()) as NominatimResult[];

      if (results.length === 0) {
        return null;
      }

      const best = results[0];
      return {
        latitude: Number.parseFloat(best.lat),
        longitude: Number.parseFloat(best.lon),
        address: best.display_name,
        confidence: best.importance,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Batch geocode multiple POIs
   */
  async batchGeocode(
    pois: Array<{ name: string; city?: string }>
  ): Promise<Map<string, GeocodedLocation>> {
    const results = new Map<string, GeocodedLocation>();

    for (const poi of pois) {
      const location = await this.geocode(poi.name, poi.city);
      if (location) {
        results.set(poi.name, location);
      }
    }

    return results;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<{ address: string } | null> {
    await this.throttle();

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        'accept-language': 'zh',
      });

      const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return null;
      }

      const result = (await response.json()) as { display_name: string };
      return { address: result.display_name };
    } catch {
      return null;
    }
  }
}

// Singleton instance
let nominatimServiceInstance: NominatimService | null = null;

export function getNominatimService(): NominatimService {
  if (!nominatimServiceInstance) {
    nominatimServiceInstance = new NominatimService();
  }
  return nominatimServiceInstance;
}

export default NominatimService;
