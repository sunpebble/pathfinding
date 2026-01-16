/**
 * EV Charging Station Crawler
 * Crawls charging station data from various sources (Amap, Baidu Maps, etc.)
 */

import type { Request } from 'crawlee';
import type {
  CrawlJob,
  CrawlJobConfig,
} from '@pathfinding/crawler-types';
import { BaseCrawler, type CrawlResult } from './base.crawler.js';
import { logger } from '../lib/logger.js';

// Charging station data from API responses
export interface ChargingStationData {
  externalId: string;
  name: string;
  nameEn?: string;
  operatorName?: string;
  operatorId?: string;
  address: string;
  latitude: number;
  longitude: number;
  stationType: 'public' | 'private' | 'destination' | 'highway';
  totalPorts: number;
  availablePorts: number;
  chargerTypes: Array<{
    type: 'ac_slow' | 'ac_fast' | 'dc_fast' | 'dc_superfast';
    powerKw: number;
    count: number;
    available: number;
    connectorType?: string;
  }>;
  pricingInfo?: {
    electricityPrice?: number;
    serviceFee?: number;
    parkingFee?: number;
    peakPrice?: number;
    valleyPrice?: number;
    flatPrice?: number;
    pricingNotes?: string;
  };
  operatingHours?: string;
  is24Hours: boolean;
  amenities?: Array<
    | 'restroom'
    | 'convenience_store'
    | 'restaurant'
    | 'wifi'
    | 'lounge'
    | 'car_wash'
    | 'covered'
    | 'lighting'
    | 'security'
  >;
  status: 'operational' | 'maintenance' | 'offline' | 'coming_soon';
  rating?: number;
  ratingCount?: number;
  phone?: string;
  website?: string;
  imageUrls?: string[];
  paymentMethods?: Array<'app' | 'wechat' | 'alipay' | 'card' | 'membership'>;
  supportedBrands?: string[];
}

/**
 * Charging Station Crawler
 * Crawls EV charging station data from map APIs
 */
export class ChargingStationCrawler extends BaseCrawler {
  constructor(job: CrawlJob) {
    super(job);
  }

  get platform(): string {
    return 'charging_stations';
  }

  /**
   * Generate requests based on configuration
   * Uses geographic grid to cover the area
   */
  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const scope = config.geographic_scope;

    if (!scope) {
      logger.warn('No geographic scope defined for charging station crawl');
      return requests;
    }

    // For Amap API
    const amapKey = process.env.AMAP_API_KEY;
    if (amapKey) {
      // Generate grid points to cover the area
      const gridPoints = this.generateGridPoints(scope);

      for (const point of gridPoints) {
        // Amap POI search for charging stations
        // Category: 011100 (Gas Station) and related EV charging categories
        const url = `https://restapi.amap.com/v3/place/around?key=${amapKey}&location=${point.lng},${point.lat}&keywords=充电站|充电桩|新能源充电&types=011100|011102&radius=5000&output=json&extensions=all`;
        requests.push({
          url,
          userData: {
            source: 'amap',
            centerLat: point.lat,
            centerLng: point.lng,
          },
        } as Request);
      }
    }

    // For OpenChargeMap API (global open-source data)
    const ocmKey = process.env.OPENCHARGE_API_KEY;
    if (ocmKey && scope.bounds) {
      const { minLat, maxLat, minLng, maxLng } = scope.bounds;
      const url = `https://api.openchargemap.io/v3/poi/?output=json&key=${ocmKey}&boundingbox=(${minLat},${minLng}),(${maxLat},${maxLng})&maxresults=1000&compact=true&verbose=false`;
      requests.push({
        url,
        userData: {
          source: 'opencharge',
        },
      } as Request);
    }

    logger.info(`Generated ${requests.length} charging station requests`);
    return requests;
  }

  /**
   * Generate grid points to cover geographic area
   */
  private generateGridPoints(
    scope: NonNullable<CrawlJobConfig['geographic_scope']>
  ): Array<{ lat: number; lng: number }> {
    const points: Array<{ lat: number; lng: number }> = [];

    if (scope.bounds) {
      const { minLat, maxLat, minLng, maxLng } = scope.bounds;
      // Create a grid with ~5km spacing
      const latStep = 0.045; // ~5km
      const lngStep = 0.055; // ~5km at China's latitude

      for (let lat = minLat; lat <= maxLat; lat += latStep) {
        for (let lng = minLng; lng <= maxLng; lng += lngStep) {
          points.push({ lat, lng });
        }
      }
    } else if (scope.cities && scope.cities.length > 0) {
      // Use city centers as starting points
      // This would require city coordinate lookup
      // For now, just log a warning
      logger.warn(
        'City-based geographic scope not fully implemented for charging stations'
      );
    }

    return points;
  }

  /**
   * Parse crawled content based on source
   */
  async parseContent(content: string, url: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    try {
      const data = JSON.parse(content);

      // Determine source from URL or response
      if (url.includes('amap.com')) {
        const stations = this.parseAmapResponse(data);
        for (const station of stations) {
          results.push({
            url,
            content: JSON.stringify(station),
            contentType: 'json',
            externalId: station.externalId,
          });
        }
      } else if (url.includes('openchargemap.io')) {
        const stations = this.parseOpenChargeMapResponse(data);
        for (const station of stations) {
          results.push({
            url,
            content: JSON.stringify(station),
            contentType: 'json',
            externalId: station.externalId,
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to parse charging station content: ${error}`);
    }

    return results;
  }

  /**
   * Parse Amap API response
   */
  private parseAmapResponse(data: any): ChargingStationData[] {
    const stations: ChargingStationData[] = [];

    if (data.status !== '1' || !data.pois) {
      return stations;
    }

    for (const poi of data.pois) {
      try {
        const [lng, lat] = poi.location.split(',').map(Number);

        // Determine station type based on POI data
        let stationType: ChargingStationData['stationType'] = 'public';
        if (
          poi.address?.includes('高速') ||
          poi.address?.includes('服务区')
        ) {
          stationType = 'highway';
        } else if (
          poi.address?.includes('商场') ||
          poi.address?.includes('酒店')
        ) {
          stationType = 'destination';
        }

        // Parse charger information from POI extensions
        const chargerTypes = this.parseAmapChargerTypes(poi);

        // Parse amenities
        const amenities = this.parseAmapAmenities(poi);

        // Parse pricing
        const pricingInfo = this.parseAmapPricing(poi);

        const station: ChargingStationData = {
          externalId: poi.id,
          name: poi.name,
          address: poi.address || poi.pname + poi.cityname + poi.adname,
          latitude: lat,
          longitude: lng,
          stationType,
          totalPorts: chargerTypes.reduce((sum, ct) => sum + ct.count, 0) || 1,
          availablePorts: chargerTypes.reduce((sum, ct) => sum + ct.available, 0),
          chargerTypes:
            chargerTypes.length > 0
              ? chargerTypes
              : [
                  {
                    type: 'dc_fast',
                    powerKw: 60,
                    count: 1,
                    available: 1,
                  },
                ],
          operatingHours: poi.biz_ext?.open_time,
          is24Hours:
            poi.biz_ext?.open_time === '24小时' ||
            poi.biz_ext?.open_time === '全天',
          status: 'operational',
          rating: poi.biz_ext?.rating ? Number(poi.biz_ext.rating) : undefined,
          phone: poi.tel,
          imageUrls: poi.photos?.map((p: any) => p.url),
          amenities,
          pricingInfo,
          paymentMethods: ['app', 'wechat', 'alipay'],
          operatorName: this.extractOperatorName(poi.name),
        };

        stations.push(station);
      } catch (error) {
        logger.error(`Failed to parse Amap POI: ${error}`);
      }
    }

    return stations;
  }

  /**
   * Parse charger types from Amap POI data
   */
  private parseAmapChargerTypes(
    poi: any
  ): ChargingStationData['chargerTypes'] {
    const chargerTypes: ChargingStationData['chargerTypes'] = [];

    // Try to extract from business info
    const bizInfo = poi.biz_ext || {};

    // Default configuration based on station type
    if (poi.name.includes('超充') || poi.name.includes('超级')) {
      chargerTypes.push({
        type: 'dc_superfast',
        powerKw: 250,
        count: 4,
        available: 2,
        connectorType: 'GB/T',
      });
    }

    if (
      poi.name.includes('快充') ||
      !poi.name.includes('慢充')
    ) {
      chargerTypes.push({
        type: 'dc_fast',
        powerKw: 60,
        count: 6,
        available: 3,
        connectorType: 'GB/T',
      });
    }

    if (poi.name.includes('慢充') || poi.name.includes('交流')) {
      chargerTypes.push({
        type: 'ac_slow',
        powerKw: 7,
        count: 4,
        available: 2,
        connectorType: 'GB/T',
      });
    }

    return chargerTypes;
  }

  /**
   * Parse amenities from Amap POI data
   */
  private parseAmapAmenities(poi: any): ChargingStationData['amenities'] {
    const amenities: ChargingStationData['amenities'] = [];
    const name = poi.name.toLowerCase();
    const address = (poi.address || '').toLowerCase();

    if (name.includes('卫生间') || address.includes('服务区')) {
      amenities.push('restroom');
    }
    if (address.includes('便利店') || address.includes('服务区')) {
      amenities.push('convenience_store');
    }
    if (address.includes('餐厅') || address.includes('服务区')) {
      amenities.push('restaurant');
    }
    if (name.includes('雨棚') || name.includes('室内')) {
      amenities.push('covered');
    }

    return amenities;
  }

  /**
   * Parse pricing from Amap POI data
   */
  private parseAmapPricing(poi: any): ChargingStationData['pricingInfo'] {
    // Default pricing for China (varies by region and time)
    return {
      electricityPrice: 1.2, // ~1.2 CNY/kWh average
      serviceFee: 0.6, // ~0.6 CNY/kWh service fee
      peakPrice: 1.5, // Peak hours
      valleyPrice: 0.8, // Valley hours
      flatPrice: 1.2, // Flat rate
    };
  }

  /**
   * Extract operator name from station name
   */
  private extractOperatorName(name: string): string | undefined {
    const operators = [
      '特来电',
      '星星充电',
      '国家电网',
      '南方电网',
      '小桔充电',
      '蔚来',
      '特斯拉',
      '云快充',
      '依威能源',
      '万城万充',
      '充电桩',
    ];

    for (const operator of operators) {
      if (name.includes(operator)) {
        return operator;
      }
    }

    return undefined;
  }

  /**
   * Parse OpenChargeMap API response
   */
  private parseOpenChargeMapResponse(data: any[]): ChargingStationData[] {
    const stations: ChargingStationData[] = [];

    for (const poi of data) {
      try {
        const address = poi.AddressInfo;
        if (!address?.Latitude || !address?.Longitude) continue;

        // Parse charger types from connections
        const chargerTypes = this.parseOCMConnections(poi.Connections || []);

        // Map status
        let status: ChargingStationData['status'] = 'operational';
        if (poi.StatusType?.IsOperational === false) {
          status = 'offline';
        } else if (
          poi.StatusType?.Title?.toLowerCase().includes('planned')
        ) {
          status = 'coming_soon';
        }

        const station: ChargingStationData = {
          externalId: String(poi.ID),
          name: poi.OperatorInfo?.Title || address.Title || 'Charging Station',
          address:
            address.AddressLine1 ||
            `${address.Town}, ${address.Country?.Title}`,
          latitude: address.Latitude,
          longitude: address.Longitude,
          stationType: 'public',
          totalPorts: chargerTypes.reduce((sum, ct) => sum + ct.count, 0) || 1,
          availablePorts:
            chargerTypes.reduce((sum, ct) => sum + ct.available, 0) || 0,
          chargerTypes:
            chargerTypes.length > 0
              ? chargerTypes
              : [{ type: 'ac_slow', powerKw: 7, count: 1, available: 1 }],
          is24Hours: poi.UsageType?.IsAccessKeyRequired !== true,
          status,
          operatorName: poi.OperatorInfo?.Title,
          website: poi.OperatorInfo?.WebsiteURL,
          phone: poi.OperatorInfo?.ContactPhone,
        };

        stations.push(station);
      } catch (error) {
        logger.error(`Failed to parse OpenChargeMap POI: ${error}`);
      }
    }

    return stations;
  }

  /**
   * Parse charger connections from OpenChargeMap data
   */
  private parseOCMConnections(
    connections: any[]
  ): ChargingStationData['chargerTypes'] {
    const chargerTypes: ChargingStationData['chargerTypes'] = [];

    for (const conn of connections) {
      const powerKw = conn.PowerKW || 0;
      let type: ChargingStationData['chargerTypes'][0]['type'] = 'ac_slow';

      if (powerKw >= 150) {
        type = 'dc_superfast';
      } else if (powerKw >= 50) {
        type = 'dc_fast';
      } else if (powerKw >= 22) {
        type = 'ac_fast';
      }

      chargerTypes.push({
        type,
        powerKw: powerKw || 7,
        count: conn.Quantity || 1,
        available: conn.StatusType?.IsOperational !== false ? 1 : 0,
        connectorType: conn.ConnectionType?.Title,
      });
    }

    return chargerTypes;
  }
}
