/**
 * Charging Station Service - Convex Implementation
 * Search and management operations for EV charging stations
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Station type
export type StationType = 'public' | 'private' | 'destination' | 'highway';

// Station status
export type StationStatus = 'operational' | 'maintenance' | 'offline' | 'coming_soon';

// Charger type
export type ChargerType = 'ac_slow' | 'ac_fast' | 'dc_fast' | 'dc_superfast';

// Amenity type
export type AmenityType =
  | 'restroom'
  | 'convenience_store'
  | 'restaurant'
  | 'wifi'
  | 'lounge'
  | 'car_wash'
  | 'covered'
  | 'lighting'
  | 'security';

// Payment method
export type PaymentMethod = 'app' | 'wechat' | 'alipay' | 'card' | 'membership';

// Valid types for runtime validation
const VALID_STATION_TYPES: readonly StationType[] = [
  'public',
  'private',
  'destination',
  'highway',
] as const;

const VALID_STATION_STATUSES: readonly StationStatus[] = [
  'operational',
  'maintenance',
  'offline',
  'coming_soon',
] as const;

const VALID_CHARGER_TYPES: readonly ChargerType[] = [
  'ac_slow',
  'ac_fast',
  'dc_fast',
  'dc_superfast',
] as const;

/**
 * Validates if a string is a valid station type
 */
function isValidStationType(value: string | undefined): value is StationType {
  if (!value) return false;
  return VALID_STATION_TYPES.includes(value as StationType);
}

/**
 * Validates if a string is a valid station status
 */
function isValidStationStatus(value: string | undefined): value is StationStatus {
  if (!value) return false;
  return VALID_STATION_STATUSES.includes(value as StationStatus);
}

/**
 * Validates if a string is a valid charger type
 */
function isValidChargerType(value: string | undefined): value is ChargerType {
  if (!value) return false;
  return VALID_CHARGER_TYPES.includes(value as ChargerType);
}

/**
 * Safely converts a type string to StationType or undefined
 */
function toStationType(value: string | undefined): StationType | undefined {
  return isValidStationType(value) ? value : undefined;
}

/**
 * Safely converts a status string to StationStatus or undefined
 */
function toStationStatus(value: string | undefined): StationStatus | undefined {
  return isValidStationStatus(value) ? value : undefined;
}

/**
 * Safely converts a charger type string to ChargerType or undefined
 */
function toChargerType(value: string | undefined): ChargerType | undefined {
  return isValidChargerType(value) ? value : undefined;
}

// Charger type info
export interface ChargerTypeInfo {
  type: ChargerType;
  powerKw: number;
  count: number;
  available: number;
  connectorType?: string;
}

// Pricing info
export interface PricingInfo {
  electricityPrice?: number;
  serviceFee?: number;
  parkingFee?: number;
  peakPrice?: number;
  valleyPrice?: number;
  flatPrice?: number;
  pricingNotes?: string;
}

// Response interfaces
export interface ChargingStation {
  id: string;
  externalId?: string;
  name: string;
  nameEn?: string;
  operatorName?: string;
  operatorId?: string;
  address: string;
  cityId?: string;
  latitude: number;
  longitude: number;
  stationType: StationType;
  totalPorts: number;
  availablePorts: number;
  chargerTypes: ChargerTypeInfo[];
  pricingInfo?: PricingInfo;
  operatingHours?: string;
  is24Hours: boolean;
  amenities?: AmenityType[];
  status: StationStatus;
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  imageUrls?: string[];
  source: string;
  sourceUrl?: string;
  paymentMethods?: PaymentMethod[];
  supportedBrands?: string[];
  crawledAt: Date;
  updatedAt: Date;
  lastStatusUpdate: Date;
  distance?: number; // For nearby queries
}

export interface ChargingStationReview {
  id: string;
  stationId: string;
  userId?: string;
  authorName?: string;
  content: string;
  rating: number;
  chargerType?: string;
  chargingDuration?: number;
  energyCharged?: number;
  totalCost?: number;
  vehicleModel?: string;
  visitDate?: string;
  pros?: string[];
  cons?: string[];
  imageUrls?: string[];
  isVerified: boolean;
  createdAt: Date;
}

export interface ChargingStationStats {
  total: number;
  byStatus: {
    operational: number;
    maintenance: number;
    offline: number;
  };
  byType: {
    public: number;
    private: number;
    destination: number;
    highway: number;
  };
  byChargerType: {
    ac_slow: number;
    ac_fast: number;
    dc_fast: number;
    dc_superfast: number;
  };
  totalPorts: number;
  availablePorts: number;
  utilizationRate: number;
  topOperators: Array<{ name: string; count: number }>;
}

// Query interfaces
export interface NearbyStationsQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  stationType?: StationType;
  status?: StationStatus;
  hasAvailablePorts?: boolean;
  chargerType?: ChargerType;
  limit?: number;
}

/**
 * Charging Station Service
 */
export const ChargingStationService = {
  /**
   * List charging stations with optional filters
   */
  async list(
    cityId?: string,
    stationType?: string,
    status?: string,
    limit?: number,
    offset?: number,
    _accessToken?: string
  ): Promise<{ data: ChargingStation[]; total: number; limit: number; offset: number }> {
    const validType = toStationType(stationType);
    const validStatus = toStationStatus(status);

    const result = await convex.query(api.chargingStations.list, {
      cityId: cityId ? (cityId as Id<'cities'>) : undefined,
      stationType: validType,
      status: validStatus,
      limit,
      offset,
    });

    return {
      data: result.data.map(toChargingStation),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  },

  /**
   * Get charging station by ID
   */
  async getById(id: string, _accessToken?: string): Promise<ChargingStation> {
    const station = await convex.query(api.chargingStations.getById, {
      id: id as Id<'chargingStations'>,
    });

    if (!station) {
      throw new NotFoundError('Charging station not found');
    }

    return toChargingStation(station);
  },

  /**
   * Get nearby charging stations
   */
  async getNearby(
    query: NearbyStationsQuery,
    _accessToken?: string
  ): Promise<ChargingStation[]> {
    const validType = toStationType(query.stationType);
    const validStatus = toStationStatus(query.status);
    const validChargerType = toChargerType(query.chargerType);

    const stations = await convex.query(api.chargingStations.getNearby, {
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      stationType: validType,
      status: validStatus,
      hasAvailablePorts: query.hasAvailablePorts,
      chargerType: validChargerType,
      limit: query.limit,
    });

    return stations.map((station: any) => ({
      ...toChargingStation(station),
      distance: station.distance,
    }));
  },

  /**
   * Search charging stations by name or operator
   */
  async search(
    searchQuery: string,
    cityId?: string,
    stationType?: string,
    status?: string,
    limit?: number,
    _accessToken?: string
  ): Promise<ChargingStation[]> {
    const validType = toStationType(stationType);
    const validStatus = toStationStatus(status);

    const stations = await convex.query(api.chargingStations.search, {
      query: searchQuery,
      cityId: cityId ? (cityId as Id<'cities'>) : undefined,
      stationType: validType,
      status: validStatus,
      limit,
    });

    return stations.map(toChargingStation);
  },

  /**
   * Get charging stations by operator
   */
  async getByOperator(
    operatorName: string,
    limit?: number,
    _accessToken?: string
  ): Promise<ChargingStation[]> {
    const stations = await convex.query(api.chargingStations.getByOperator, {
      operatorName,
      limit,
    });

    return stations.map(toChargingStation);
  },

  /**
   * Get station statistics
   */
  async getStats(cityId?: string, _accessToken?: string): Promise<ChargingStationStats> {
    const stats = await convex.query(api.chargingStations.getStats, {
      cityId: cityId ? (cityId as Id<'cities'>) : undefined,
    });

    return stats;
  },

  /**
   * Update station availability (real-time status update)
   */
  async updateAvailability(
    id: string,
    availablePorts: number,
    chargerTypes?: ChargerTypeInfo[],
    status?: StationStatus,
    _accessToken?: string
  ): Promise<ChargingStation | null> {
    const station = await convex.mutation(api.chargingStations.updateAvailability, {
      id: id as Id<'chargingStations'>,
      availablePorts,
      chargerTypes,
      status,
    });

    return station ? toChargingStation(station) : null;
  },

  /**
   * Get reviews for a charging station
   */
  async getReviews(
    stationId: string,
    limit?: number,
    offset?: number,
    _accessToken?: string
  ): Promise<{ data: ChargingStationReview[]; total: number; limit: number; offset: number }> {
    const result = await convex.query(api.chargingStations.getReviews, {
      stationId: stationId as Id<'chargingStations'>,
      limit,
      offset,
    });

    return {
      data: result.data.map(toChargingStationReview),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  },

  /**
   * Add a review
   */
  async addReview(
    data: {
      stationId: string;
      userId?: string;
      authorName?: string;
      content: string;
      rating: number;
      chargerType?: string;
      chargingDuration?: number;
      energyCharged?: number;
      totalCost?: number;
      vehicleModel?: string;
      visitDate?: string;
      pros?: string[];
      cons?: string[];
      imageUrls?: string[];
    },
    _accessToken?: string
  ): Promise<string> {
    const id = await convex.mutation(api.chargingStations.addReview, {
      ...data,
      stationId: data.stationId as Id<'chargingStations'>,
    });

    return id;
  },

  /**
   * Get user's favorite charging stations
   */
  async getUserFavorites(
    userId: string,
    limit?: number,
    _accessToken?: string
  ): Promise<ChargingStation[]> {
    const stations = await convex.query(api.chargingStations.getUserFavorites, {
      userId,
      limit,
    });

    return stations
      .filter((s: any) => s !== null)
      .map((s: any) => ({
        ...toChargingStation(s),
        favoriteId: s.favoriteId,
        notes: s.notes,
        addedAt: s.addedAt ? new Date(s.addedAt) : undefined,
      }));
  },

  /**
   * Add station to favorites
   */
  async addToFavorites(
    userId: string,
    stationId: string,
    notes?: string,
    _accessToken?: string
  ): Promise<string> {
    const id = await convex.mutation(api.chargingStations.addToFavorites, {
      userId,
      stationId: stationId as Id<'chargingStations'>,
      notes,
    });

    return id;
  },

  /**
   * Remove station from favorites
   */
  async removeFromFavorites(
    userId: string,
    stationId: string,
    _accessToken?: string
  ): Promise<void> {
    await convex.mutation(api.chargingStations.removeFromFavorites, {
      userId,
      stationId: stationId as Id<'chargingStations'>,
    });
  },

  /**
   * Check if station is in favorites
   */
  async isFavorite(
    userId: string,
    stationId: string,
    _accessToken?: string
  ): Promise<boolean> {
    return await convex.query(api.chargingStations.isFavorite, {
      userId,
      stationId: stationId as Id<'chargingStations'>,
    });
  },
};

// Helper functions to convert Convex documents to API responses
function toChargingStation(row: Doc<'chargingStations'>): ChargingStation {
  return {
    id: row._id,
    externalId: row.externalId,
    name: row.name,
    nameEn: row.nameEn,
    operatorName: row.operatorName,
    operatorId: row.operatorId,
    address: row.address,
    cityId: row.cityId,
    latitude: row.latitude,
    longitude: row.longitude,
    stationType: row.stationType,
    totalPorts: row.totalPorts,
    availablePorts: row.availablePorts,
    chargerTypes: row.chargerTypes,
    pricingInfo: row.pricingInfo,
    operatingHours: row.operatingHours,
    is24Hours: row.is24Hours,
    amenities: row.amenities,
    status: row.status,
    rating: row.rating,
    ratingCount: row.ratingCount,
    reviewCount: row.reviewCount,
    phone: row.phone,
    website: row.website,
    imageUrls: row.imageUrls,
    source: row.source,
    sourceUrl: row.sourceUrl,
    paymentMethods: row.paymentMethods,
    supportedBrands: row.supportedBrands,
    crawledAt: new Date(row.crawledAt),
    updatedAt: new Date(row.updatedAt),
    lastStatusUpdate: new Date(row.lastStatusUpdate),
  };
}

function toChargingStationReview(row: Doc<'chargingStationReviews'>): ChargingStationReview {
  return {
    id: row._id,
    stationId: row.stationId,
    userId: row.userId,
    authorName: row.authorName,
    content: row.content,
    rating: row.rating,
    chargerType: row.chargerType,
    chargingDuration: row.chargingDuration,
    energyCharged: row.energyCharged,
    totalCost: row.totalCost,
    vehicleModel: row.vehicleModel,
    visitDate: row.visitDate,
    pros: row.pros,
    cons: row.cons,
    imageUrls: row.imageUrls,
    isVerified: row.isVerified,
    createdAt: new Date(row.createdAt),
  };
}
