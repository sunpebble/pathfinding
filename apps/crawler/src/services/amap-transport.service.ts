/**
 * AMap Transport Service
 * Uses AMap's Direction APIs for multi-modal route planning
 * Supports walking, cycling, driving, transit, and taxi routes
 */

import type {
  Coordinate,
  TransitPassRecommendation,
  TransitStep,
  TransportComparison,
  TransportMode,
  TransportRoute,
} from '@pathfinding/types';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('AmapTransport');

// AMap API Configuration
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';
const AMAP_V5_URL = 'https://restapi.amap.com/v5';
const REQUEST_DELAY_MS = 350; // Rate limit: ~3 requests/second

/**
 * AMap Walking Route Response
 */
interface AmapWalkingResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  route: {
    origin: string;
    destination: string;
    paths: Array<{
      distance: string;
      duration: string;
      steps: Array<{
        instruction: string;
        road: string;
        distance: string;
        duration: string;
        polyline: string;
      }>;
    }>;
  };
}

/**
 * AMap Driving Route Response
 */
interface AmapDrivingResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  route: {
    origin: string;
    destination: string;
    taxi_cost: string;
    paths: Array<{
      distance: string;
      duration: string;
      strategy: string;
      tolls: string;
      toll_distance: string;
      traffic_lights: string;
      steps: Array<{
        instruction: string;
        road: string;
        distance: string;
        duration: string;
        polyline: string;
        tmcs?: Array<{
          status: string;
          distance: string;
        }>;
      }>;
    }>;
  };
}

/**
 * AMap Bicycling Route Response
 */
interface AmapBicyclingResponse {
  status: string;
  info: string;
  infocode: string;
  data: {
    origin: string;
    destination: string;
    paths: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        instruction: string;
        road: string;
        distance: number;
        duration: number;
        polyline: string;
      }>;
    }>;
  };
}

/**
 * AMap Transit Route Response
 */
interface AmapTransitResponse {
  status: string;
  info: string;
  infocode: string;
  count: string;
  route: {
    origin: string;
    destination: string;
    distance: string;
    taxi_cost: string;
    transits: Array<{
      cost: string;
      duration: string;
      nightflag: string;
      walking_distance: string;
      segments: Array<{
        walking?: {
          origin: string;
          destination: string;
          distance: string;
          duration: string;
          steps: Array<{
            instruction: string;
            distance: string;
            duration: string;
          }>;
        };
        bus?: {
          buslines: Array<{
            name: string;
            type: string;
            distance: string;
            duration: string;
            departure_stop: { name: string };
            arrival_stop: { name: string };
            via_num: string;
            via_stops: Array<{ name: string }>;
          }>;
        };
        railway?: {
          name: string;
          trip: string;
          distance: string;
          time: string;
          departure_stop: { name: string };
          arrival_stop: { name: string };
        };
      }>;
    }>;
  };
}

/**
 * City code mapping for AMap API
 */
const CITY_CODES: Record<string, string> = {
  北京: '110000',
  上海: '310000',
  广州: '440100',
  深圳: '440300',
  杭州: '330100',
  成都: '510100',
  西安: '610100',
  南京: '320100',
  武汉: '420100',
  重庆: '500000',
  苏州: '320500',
  天津: '120000',
  厦门: '350200',
  青岛: '370200',
  大连: '210200',
  三亚: '460200',
  丽江: '530700',
  桂林: '450300',
  昆明: '530100',
  拉萨: '540100',
};

/**
 * Transit pass information by city
 */
const CITY_TRANSIT_PASSES: Record<string, TransitPassRecommendation[]> = {
  北京: [
    {
      name: 'Beijing Transportation Card',
      nameZh: '北京一卡通',
      type: 'stored_value',
      price: 20,
      currency: 'CNY',
      coverage: ['subway', 'bus'],
      benefits: ['40% discount on bus', '20% discount on subway after 100 trips/month'],
      purchaseLocations: ['Subway stations', 'Convenience stores'],
      recommended: true,
      recommendationReason: 'Essential for public transit in Beijing',
    },
    {
      name: 'Beijing 24-Hour Pass',
      nameZh: '北京地铁24小时票',
      type: 'day_pass',
      price: 20,
      currency: 'CNY',
      validDays: 1,
      coverage: ['subway'],
      benefits: ['Unlimited subway rides for 24 hours'],
      purchaseLocations: ['Subway station service centers'],
      recommended: false,
    },
  ],
  上海: [
    {
      name: 'Shanghai Public Transportation Card',
      nameZh: '上海公共交通卡',
      type: 'stored_value',
      price: 20,
      currency: 'CNY',
      coverage: ['subway', 'bus', 'ferry', 'taxi'],
      benefits: ['Transfer discounts within 2 hours'],
      purchaseLocations: ['Subway stations', 'Convenience stores'],
      recommended: true,
      recommendationReason: 'Best value for multi-day visits',
    },
    {
      name: 'Shanghai Metro 1-Day Pass',
      nameZh: '上海地铁一日票',
      type: 'day_pass',
      price: 18,
      currency: 'CNY',
      validDays: 1,
      coverage: ['subway'],
      benefits: ['Unlimited subway rides'],
      purchaseLocations: ['Subway station service centers'],
      recommended: false,
    },
    {
      name: 'Shanghai Metro 3-Day Pass',
      nameZh: '上海地铁三日票',
      type: 'multi_day_pass',
      price: 45,
      currency: 'CNY',
      validDays: 3,
      coverage: ['subway'],
      benefits: ['Unlimited subway rides for 3 days'],
      purchaseLocations: ['Subway station service centers'],
      recommended: true,
      recommendationReason: 'Recommended for tourists staying 3+ days',
    },
  ],
  广州: [
    {
      name: 'Yangcheng Tong Card',
      nameZh: '羊城通',
      type: 'stored_value',
      price: 30,
      currency: 'CNY',
      coverage: ['subway', 'bus', 'BRT', 'ferry'],
      benefits: ['15 trips/month get 40% discount on subsequent trips'],
      purchaseLocations: ['Subway stations', 'Convenience stores'],
      recommended: true,
      recommendationReason: 'Works across Guangzhou and nearby cities',
    },
  ],
  杭州: [
    {
      name: 'Hangzhou Public Transportation Card',
      nameZh: '杭州通',
      type: 'stored_value',
      price: 20,
      currency: 'CNY',
      coverage: ['subway', 'bus', 'bike sharing'],
      benefits: ['10% discount on subway', '50% discount on bus'],
      purchaseLocations: ['Subway stations', 'Service centers'],
      recommended: true,
      recommendationReason: 'Great value with significant discounts',
    },
  ],
  成都: [
    {
      name: 'Tianfu Tong Card',
      nameZh: '天府通',
      type: 'stored_value',
      price: 25,
      currency: 'CNY',
      coverage: ['subway', 'bus'],
      benefits: ['Bus rides at ¥1.8', 'Transfer discounts'],
      purchaseLocations: ['Subway stations', 'Tianfu Tong service centers'],
      recommended: true,
      recommendationReason: 'Essential for Chengdu public transit',
    },
  ],
  西安: [
    {
      name: "Xi'an Chang'an Tong",
      nameZh: '长安通',
      type: 'stored_value',
      price: 18,
      currency: 'CNY',
      coverage: ['subway', 'bus'],
      benefits: ['50% discount on bus', '10% discount on subway'],
      purchaseLocations: ['Subway stations', 'Bus terminals'],
      recommended: true,
      recommendationReason: 'Best value for exploring Xi\'an',
    },
  ],
};

/**
 * Taxi fare estimation parameters by city
 */
const CITY_TAXI_RATES: Record<string, { baseFare: number; baseDistance: number; perKm: number; nightSurcharge: number }> = {
  北京: { baseFare: 13, baseDistance: 3, perKm: 2.3, nightSurcharge: 0.2 },
  上海: { baseFare: 14, baseDistance: 3, perKm: 2.5, nightSurcharge: 0.3 },
  广州: { baseFare: 12, baseDistance: 2.5, perKm: 2.6, nightSurcharge: 0.2 },
  深圳: { baseFare: 10, baseDistance: 2, perKm: 2.4, nightSurcharge: 0.3 },
  杭州: { baseFare: 11, baseDistance: 3, perKm: 2.5, nightSurcharge: 0.2 },
  成都: { baseFare: 9, baseDistance: 2, perKm: 1.9, nightSurcharge: 0.2 },
  西安: { baseFare: 9, baseDistance: 3, perKm: 2.1, nightSurcharge: 0.2 },
  default: { baseFare: 10, baseDistance: 3, perKm: 2.0, nightSurcharge: 0.2 },
};

/**
 * Shared bike rental rates
 */
const BIKE_RATES = {
  first30Min: 1.5,
  per30MinAfter: 1.5,
  deposit: 0, // Most apps don't require deposit with Alipay/WeChat credit score
};

/**
 * AMap Transport Service
 */
export class AmapTransportService {
  private lastRequestTime = 0;
  private apiKey: string;

  constructor() {
    const apiKey = process.env.AMAP_API_KEY;
    if (!apiKey) {
      throw new Error('AMAP_API_KEY environment variable is required');
    }
    this.apiKey = apiKey.split(',')[0].trim(); // Use first key
  }

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
   * Format coordinates for AMap API (lng,lat format)
   */
  private formatCoord(coord: Coordinate): string {
    return `${coord.longitude},${coord.latitude}`;
  }

  /**
   * Get walking route
   */
  async getWalkingRoute(
    origin: Coordinate,
    destination: Coordinate
  ): Promise<TransportRoute | null> {
    await this.throttle();

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        origin: this.formatCoord(origin),
        destination: this.formatCoord(destination),
        output: 'json',
      });

      const response = await fetch(
        `${AMAP_BASE_URL}/direction/walking?${params.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        logger.error('Walking route API error', null, { status: response.status });
        return null;
      }

      const data = (await response.json()) as AmapWalkingResponse;

      if (data.status !== '1' || !data.route?.paths?.length) {
        logger.warn('No walking route found', { info: data.info });
        return null;
      }

      const path = data.route.paths[0];
      const distance = parseInt(path.distance, 10);
      const duration = parseInt(path.duration, 10);

      return {
        mode: 'walking',
        distance,
        duration,
        cost: 0,
        steps: path.steps.map((step) => ({
          mode: 'walking' as TransportMode,
          instruction: step.instruction,
          distance: parseInt(step.distance, 10),
          duration: parseInt(step.duration, 10),
          polyline: step.polyline,
        })),
      };
    } catch (error) {
      logger.error('Walking route error', error as Error);
      return null;
    }
  }

  /**
   * Get cycling route
   */
  async getCyclingRoute(
    origin: Coordinate,
    destination: Coordinate
  ): Promise<TransportRoute | null> {
    await this.throttle();

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        origin: this.formatCoord(origin),
        destination: this.formatCoord(destination),
      });

      const response = await fetch(
        `${AMAP_V5_URL}/direction/bicycling?${params.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        logger.error('Cycling route API error', null, { status: response.status });
        return null;
      }

      const data = (await response.json()) as AmapBicyclingResponse;

      if (!data.data?.paths?.length) {
        logger.warn('No cycling route found');
        return null;
      }

      const path = data.data.paths[0];
      const duration = path.duration;

      // Calculate bike rental cost
      const costMinutes = Math.ceil(duration / 60);
      const cost =
        costMinutes <= 30
          ? BIKE_RATES.first30Min
          : BIKE_RATES.first30Min +
            Math.ceil((costMinutes - 30) / 30) * BIKE_RATES.per30MinAfter;

      return {
        mode: 'cycling',
        distance: path.distance,
        duration: path.duration,
        cost,
        costRange: { min: 0, max: cost }, // 0 if user has own bike
        steps: path.steps.map((step) => ({
          mode: 'cycling' as TransportMode,
          instruction: step.instruction,
          distance: step.distance,
          duration: step.duration,
          polyline: step.polyline,
        })),
      };
    } catch (error) {
      logger.error('Cycling route error', error as Error);
      return null;
    }
  }

  /**
   * Get driving route with taxi cost estimation
   */
  async getDrivingRoute(
    origin: Coordinate,
    destination: Coordinate,
    city?: string
  ): Promise<{ driving: TransportRoute | null; taxi: TransportRoute | null }> {
    await this.throttle();

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        origin: this.formatCoord(origin),
        destination: this.formatCoord(destination),
        extensions: 'all',
        output: 'json',
      });

      const response = await fetch(
        `${AMAP_BASE_URL}/direction/driving?${params.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        logger.error('Driving route API error', null, { status: response.status });
        return { driving: null, taxi: null };
      }

      const data = (await response.json()) as AmapDrivingResponse;

      if (data.status !== '1' || !data.route?.paths?.length) {
        logger.warn('No driving route found', { info: data.info });
        return { driving: null, taxi: null };
      }

      const path = data.route.paths[0];
      const distance = parseInt(path.distance, 10);
      const duration = parseInt(path.duration, 10);
      const tolls = parseFloat(path.tolls) || 0;

      // Determine traffic condition from TMC data
      let trafficCondition: 'smooth' | 'slow' | 'congested' = 'smooth';
      let congestedCount = 0;
      let slowCount = 0;
      let totalSegments = 0;

      for (const step of path.steps) {
        if (step.tmcs) {
          for (const tmc of step.tmcs) {
            totalSegments++;
            if (tmc.status === '拥堵' || tmc.status === '严重拥堵') {
              congestedCount++;
            } else if (tmc.status === '缓行') {
              slowCount++;
            }
          }
        }
      }

      if (totalSegments > 0) {
        const congestedRatio = congestedCount / totalSegments;
        const slowRatio = slowCount / totalSegments;
        if (congestedRatio > 0.3) {
          trafficCondition = 'congested';
        } else if (congestedRatio > 0.1 || slowRatio > 0.3) {
          trafficCondition = 'slow';
        }
      }

      // Driving route (self-driving)
      const drivingRoute: TransportRoute = {
        mode: 'driving',
        distance,
        duration,
        cost: tolls, // Only toll cost for driving
        trafficCondition,
        steps: path.steps.map((step) => ({
          mode: 'driving' as TransportMode,
          instruction: step.instruction,
          distance: parseInt(step.distance, 10),
          duration: parseInt(step.duration, 10),
          polyline: step.polyline,
        })),
      };

      // Taxi route (uses same path but with fare calculation)
      const taxiCostFromApi = parseFloat(data.route.taxi_cost) || 0;
      let taxiCost = taxiCostFromApi;

      // If API doesn't return taxi cost, calculate it
      if (!taxiCost) {
        const rates = CITY_TAXI_RATES[city || ''] || CITY_TAXI_RATES.default;
        const distanceKm = distance / 1000;
        if (distanceKm <= rates.baseDistance) {
          taxiCost = rates.baseFare;
        } else {
          taxiCost =
            rates.baseFare + (distanceKm - rates.baseDistance) * rates.perKm;
        }
        // Add fuel surcharge (typically ¥1-3)
        taxiCost += 1;
      }

      const taxiRoute: TransportRoute = {
        mode: 'taxi',
        distance,
        duration: Math.round(duration * 0.9), // Taxi slightly faster (no parking)
        cost: Math.round(taxiCost),
        costRange: {
          min: Math.round(taxiCost * 0.9),
          max: Math.round(taxiCost * 1.3), // Traffic/surge pricing
        },
        trafficCondition,
      };

      return { driving: drivingRoute, taxi: taxiRoute };
    } catch (error) {
      logger.error('Driving route error', error as Error);
      return { driving: null, taxi: null };
    }
  }

  /**
   * Get public transit route
   */
  async getTransitRoute(
    origin: Coordinate,
    destination: Coordinate,
    city: string
  ): Promise<TransportRoute | null> {
    await this.throttle();

    try {
      const cityCode = CITY_CODES[city] || CITY_CODES[city.replace('市', '')] || city;

      const params = new URLSearchParams({
        key: this.apiKey,
        origin: this.formatCoord(origin),
        destination: this.formatCoord(destination),
        city: cityCode,
        cityd: cityCode, // Destination city (same for intra-city)
        strategy: '0', // Least time
        extensions: 'all',
        output: 'json',
      });

      const response = await fetch(
        `${AMAP_BASE_URL}/direction/transit/integrated?${params.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        logger.error('Transit route API error', null, { status: response.status });
        return null;
      }

      const data = (await response.json()) as AmapTransitResponse;

      if (data.status !== '1' || !data.route?.transits?.length) {
        logger.warn('No transit route found', { info: data.info });
        return null;
      }

      // Get the best transit option (first one, sorted by strategy)
      const transit = data.route.transits[0];
      const duration = parseInt(transit.duration, 10);
      const cost = parseFloat(transit.cost) || 0;
      const walkingDistance = parseInt(transit.walking_distance, 10) || 0;

      // Parse segments into steps
      const steps: TransitStep[] = [];
      let transfers = 0;
      let hasSubway = false;
      let hasBus = false;

      for (const segment of transit.segments) {
        // Walking step
        if (segment.walking) {
          steps.push({
            mode: 'walking',
            instruction: segment.walking.steps
              .map((s) => s.instruction)
              .join(', '),
            distance: parseInt(segment.walking.distance, 10),
            duration: parseInt(segment.walking.duration, 10),
          });
        }

        // Bus/Subway step
        if (segment.bus?.buslines?.length) {
          const line = segment.bus.buslines[0];
          const isSubway =
            line.type.includes('地铁') || line.name.includes('号线');

          if (isSubway) hasSubway = true;
          else hasBus = true;

          if (steps.length > 0 && steps[steps.length - 1].mode !== 'walking') {
            transfers++;
          }

          steps.push({
            mode: isSubway ? 'subway' : 'bus',
            instruction: `乘坐${line.name}`,
            distance: parseInt(line.distance, 10),
            duration: parseInt(line.duration, 10),
            lineName: line.name,
            departureStop: line.departure_stop?.name,
            arrivalStop: line.arrival_stop?.name,
            stopCount: parseInt(line.via_num, 10) || 0,
          });
        }

        // Railway step
        if (segment.railway) {
          transfers++;
          steps.push({
            mode: 'transit',
            instruction: `乘坐${segment.railway.name} ${segment.railway.trip}`,
            distance: parseInt(segment.railway.distance, 10) || 0,
            duration: parseInt(segment.railway.time, 10) * 60 || 0,
            lineName: segment.railway.name,
            departureStop: segment.railway.departure_stop?.name,
            arrivalStop: segment.railway.arrival_stop?.name,
          });
        }
      }

      // Determine mode based on what transit types are used
      let mode: TransportMode = 'transit';
      if (hasSubway && !hasBus) mode = 'subway';
      else if (hasBus && !hasSubway) mode = 'bus';

      return {
        mode,
        distance: parseInt(data.route.distance, 10),
        duration,
        cost,
        steps,
        walkingDistance,
        transfers,
      };
    } catch (error) {
      logger.error('Transit route error', error as Error);
      return null;
    }
  }

  /**
   * Get all transport options for a route
   */
  async compareRoutes(
    origin: Coordinate,
    destination: Coordinate,
    originName?: string,
    destinationName?: string,
    city?: string
  ): Promise<TransportComparison> {
    const routes: TransportRoute[] = [];

    // Fetch all routes in parallel
    const [walkingRoute, cyclingRoute, drivingResult, transitRoute] =
      await Promise.all([
        this.getWalkingRoute(origin, destination),
        this.getCyclingRoute(origin, destination),
        this.getDrivingRoute(origin, destination, city),
        city ? this.getTransitRoute(origin, destination, city) : null,
      ]);

    if (walkingRoute) routes.push(walkingRoute);
    if (cyclingRoute) routes.push(cyclingRoute);
    if (transitRoute) routes.push(transitRoute);
    if (drivingResult.taxi) routes.push(drivingResult.taxi);
    if (drivingResult.driving) routes.push(drivingResult.driving);

    // Determine recommendation
    const { recommended, recommendationReason } = this.getRecommendation(routes);

    return {
      origin,
      destination,
      originName,
      destinationName,
      routes,
      recommended,
      recommendationReason,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get recommendation based on routes
   */
  private getRecommendation(routes: TransportRoute[]): {
    recommended?: TransportMode;
    recommendationReason?: string;
  } {
    if (routes.length === 0) {
      return {};
    }

    // Find walking route
    const walking = routes.find((r) => r.mode === 'walking');
    const cycling = routes.find((r) => r.mode === 'cycling');
    const transit = routes.find(
      (r) => r.mode === 'transit' || r.mode === 'subway' || r.mode === 'bus'
    );
    const taxi = routes.find((r) => r.mode === 'taxi');

    // Short distance: prefer walking
    if (walking && walking.distance < 1000 && walking.duration < 900) {
      return {
        recommended: 'walking',
        recommendationReason: '距离较近，步行即可到达',
      };
    }

    // Medium distance: prefer cycling or transit
    if (walking && walking.distance < 3000) {
      if (cycling) {
        return {
          recommended: 'cycling',
          recommendationReason: '距离适中，骑行方便快捷',
        };
      }
    }

    // Transit available and reasonable
    if (transit && transit.duration < 3600) {
      const walkingTime = walking?.duration || Infinity;
      const transitTime = transit.duration;

      // If transit is significantly faster than walking
      if (transitTime < walkingTime * 0.5) {
        return {
          recommended: transit.mode,
          recommendationReason:
            transit.transfers === 0
              ? '公共交通直达，方便快捷'
              : `公共交通换乘${transit.transfers}次，性价比高`,
        };
      }
    }

    // Long distance or no transit: taxi
    if (taxi && (!transit || transit.duration > 3600)) {
      return {
        recommended: 'taxi',
        recommendationReason: '距离较远，建议打车前往',
      };
    }

    // Default to fastest option
    const fastest = routes.reduce((a, b) =>
      a.duration < b.duration ? a : b
    );
    return {
      recommended: fastest.mode,
      recommendationReason: '推荐最快到达方式',
    };
  }

  /**
   * Get transit pass recommendations for a city
   */
  getTransitPasses(city: string): TransitPassRecommendation[] {
    return CITY_TRANSIT_PASSES[city] || CITY_TRANSIT_PASSES[city.replace('市', '')] || [];
  }

  /**
   * Get transit tips for a city
   */
  getTransitTips(city: string): string[] {
    const tips: string[] = [];

    // General tips
    tips.push('建议下载高德地图或百度地图App，实时查询公交地铁信息');
    tips.push('支付宝和微信支付可直接扫码乘车，无需购买实体卡');

    // City-specific tips
    const cityTips: Record<string, string[]> = {
      北京: [
        '地铁运营时间约5:00-23:30，高峰期人流量大',
        '机场快轨可直达首都机场T2/T3航站楼',
        '公交车前门上车刷卡，后门下车',
      ],
      上海: [
        '地铁运营时间约5:30-22:30，2号线可达浦东机场',
        '磁悬浮列车连接龙阳路站和浦东机场，8分钟直达',
        '轮渡是横跨黄浦江的特色交通方式',
      ],
      广州: [
        '地铁运营时间约6:00-23:30，可达白云机场',
        'APM线连接珠江新城和海心沙',
        'BRT快速公交覆盖主城区',
      ],
      杭州: [
        '地铁可达萧山机场和杭州东站',
        '公共自行车首小时免费，非常适合环西湖骑行',
        '西湖景区推荐步行或骑行游览',
      ],
      成都: [
        '地铁10号线直达双流机场',
        '熊猫基地可乘地铁3号线至熊猫大道站换乘公交',
        '宽窄巷子、春熙路等景点地铁直达',
      ],
      西安: [
        '地铁可达咸阳机场和西安北站',
        '机场城际铁路连接北客站和机场',
        '城墙景区推荐骑行或步行',
      ],
    };

    const citySpecificTips = cityTips[city] || cityTips[city.replace('市', '')] || [];
    tips.push(...citySpecificTips);

    return tips;
  }
}

// Singleton instance
let amapTransportServiceInstance: AmapTransportService | null = null;

export function getAmapTransportService(): AmapTransportService {
  if (!amapTransportServiceInstance) {
    amapTransportServiceInstance = new AmapTransportService();
  }
  return amapTransportServiceInstance;
}

export default AmapTransportService;
