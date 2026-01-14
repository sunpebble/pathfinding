/**
 * WiFi Service - Convex Implementation
 * Search and management operations for WiFi spots, credentials, and reviews
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// WiFi spot type
export type WifiSpotType =
  | 'hotel'
  | 'restaurant'
  | 'cafe'
  | 'airport'
  | 'train_station'
  | 'shopping_mall'
  | 'library'
  | 'coworking'
  | 'public'
  | 'other';

// Security type for credentials
export type SecurityType = 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'unknown';

// Valid WiFi spot types for runtime validation
const VALID_WIFI_SPOT_TYPES: readonly WifiSpotType[] = [
  'hotel',
  'restaurant',
  'cafe',
  'airport',
  'train_station',
  'shopping_mall',
  'library',
  'coworking',
  'public',
  'other',
] as const;

/**
 * Validates if a string is a valid WiFi spot type
 */
function isValidWifiSpotType(value: string | undefined): value is WifiSpotType {
  if (!value) return false;
  return VALID_WIFI_SPOT_TYPES.includes(value as WifiSpotType);
}

/**
 * Safely converts a type string to WifiSpotType or undefined
 */
function toWifiSpotType(value: string | undefined): WifiSpotType | undefined {
  return isValidWifiSpotType(value) ? value : undefined;
}

// Response interfaces
export interface WifiSpot {
  id: string;
  name: string;
  nameEn?: string;
  type: WifiSpotType;
  cityId: string;
  address?: string;
  latitude: number;
  longitude: number;
  ssid?: string;
  requiresPassword: boolean;
  isFree: boolean;
  speedMbps?: number;
  openingHours?: string;
  averageRating: number;
  ratingCount: number;
  description?: string;
  imageUrls?: string[];
  poiId?: string;
  isVerified: boolean;
  submittedBy: string;
  createdAt: Date;
  updatedAt: Date;
  distance?: number; // For nearby queries
}

export interface WifiCredential {
  id: string;
  userId: string;
  wifiSpotId?: string;
  name: string;
  ssid: string;
  password: string;
  securityType?: SecurityType;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isShared: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WifiReview {
  id: string;
  userId: string;
  wifiSpotId: string;
  speedRating: number;
  stabilityRating: number;
  easeOfAccessRating: number;
  overallRating: number;
  comment?: string;
  speedTestResult?: number;
  connectionTime?: string;
  deviceType?: string;
  visitDate?: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Query interfaces
export interface WifiSpotSearchQuery {
  cityId?: string;
  type?: WifiSpotType;
  query?: string;
  limit?: number;
}

export interface NearbyWifiQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  type?: WifiSpotType;
  limit?: number;
}

/**
 * WiFi Spots Service
 */
export const WifiSpotService = {
  /**
   * List WiFi spots with optional filters
   */
  async list(
    cityId?: string,
    type?: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiSpot[]> {
    const validType = toWifiSpotType(type);
    const spots = await convex.query(api.wifiSpots.list, {
      cityId: cityId ? (cityId as Id<'cities'>) : undefined,
      type: validType,
      limit,
    });

    return spots.map(toWifiSpot);
  },

  /**
   * Get WiFi spot by ID
   */
  async getById(id: string, _accessToken?: string): Promise<WifiSpot> {
    const spot = await convex.query(api.wifiSpots.getById, {
      id: id as Id<'wifiSpots'>,
    });

    if (!spot) {
      throw new NotFoundError('WiFi spot not found');
    }

    return toWifiSpot(spot);
  },

  /**
   * Get nearby WiFi spots
   */
  async getNearby(
    query: NearbyWifiQuery,
    _accessToken?: string
  ): Promise<WifiSpot[]> {
    const validType = toWifiSpotType(query.type);
    const spots = await convex.query(api.wifiSpots.getNearby, {
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      type: validType,
      limit: query.limit,
    });

    return spots.map((spot: any) => ({
      ...toWifiSpot(spot),
      distance: spot.distance,
    }));
  },

  /**
   * Search WiFi spots by name or location
   */
  async search(
    searchQuery: string,
    cityId?: string,
    type?: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiSpot[]> {
    const validType = toWifiSpotType(type);
    const spots = await convex.query(api.wifiSpots.search, {
      query: searchQuery,
      cityId: cityId ? (cityId as Id<'cities'>) : undefined,
      type: validType,
      limit,
    });

    return spots.map(toWifiSpot);
  },

  /**
   * Create a new WiFi spot
   */
  async create(
    data: {
      name: string;
      nameEn?: string;
      type: WifiSpotType;
      cityId: string;
      address?: string;
      latitude: number;
      longitude: number;
      ssid?: string;
      requiresPassword: boolean;
      isFree: boolean;
      speedMbps?: number;
      openingHours?: string;
      description?: string;
      imageUrls?: string[];
      poiId?: string;
      submittedBy: string;
    },
    _accessToken?: string
  ): Promise<string> {
    const id = await convex.mutation(api.wifiSpots.create, {
      ...data,
      cityId: data.cityId as Id<'cities'>,
      poiId: data.poiId ? (data.poiId as Id<'pois'>) : undefined,
    });

    return id;
  },

  /**
   * Update a WiFi spot
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      nameEn: string;
      type: WifiSpotType;
      address: string;
      latitude: number;
      longitude: number;
      ssid: string;
      requiresPassword: boolean;
      isFree: boolean;
      speedMbps: number;
      openingHours: string;
      description: string;
      imageUrls: string[];
    }>,
    _accessToken?: string
  ): Promise<WifiSpot | null> {
    const spot = await convex.mutation(api.wifiSpots.update, {
      id: id as Id<'wifiSpots'>,
      ...data,
    });

    return spot ? toWifiSpot(spot) : null;
  },

  /**
   * Verify a WiFi spot (admin action)
   */
  async verify(
    id: string,
    verifiedBy: string,
    _accessToken?: string
  ): Promise<WifiSpot | null> {
    const spot = await convex.mutation(api.wifiSpots.verify, {
      id: id as Id<'wifiSpots'>,
      verifiedBy,
    });

    return spot ? toWifiSpot(spot) : null;
  },

  /**
   * Delete a WiFi spot
   */
  async remove(id: string, _accessToken?: string): Promise<void> {
    await convex.mutation(api.wifiSpots.remove, {
      id: id as Id<'wifiSpots'>,
    });
  },
};

/**
 * WiFi Credentials Service
 */
export const WifiCredentialService = {
  /**
   * List user's saved WiFi credentials
   */
  async listByUser(
    userId: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiCredential[]> {
    const credentials = await convex.query(api.wifiCredentials.listByUser, {
      userId,
      limit,
    });

    return credentials.map(toWifiCredential);
  },

  /**
   * Get credentials for a specific WiFi spot
   */
  async getBySpot(
    userId: string,
    wifiSpotId: string,
    _accessToken?: string
  ): Promise<WifiCredential | null> {
    const credential = await convex.query(api.wifiCredentials.getBySpot, {
      userId,
      wifiSpotId: wifiSpotId as Id<'wifiSpots'>,
    });

    return credential ? toWifiCredential(credential) : null;
  },

  /**
   * Get credential by ID
   */
  async getById(id: string, _accessToken?: string): Promise<WifiCredential> {
    const credential = await convex.query(api.wifiCredentials.getById, {
      id: id as Id<'wifiCredentials'>,
    });

    if (!credential) {
      throw new NotFoundError('WiFi credential not found');
    }

    return toWifiCredential(credential);
  },

  /**
   * Search user's credentials
   */
  async search(
    userId: string,
    query: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiCredential[]> {
    const credentials = await convex.query(api.wifiCredentials.search, {
      userId,
      query,
      limit,
    });

    return credentials.map(toWifiCredential);
  },

  /**
   * Get shared credentials for a WiFi spot (community passwords)
   */
  async getSharedBySpot(
    wifiSpotId: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiCredential[]> {
    const credentials = await convex.query(api.wifiCredentials.getSharedBySpot, {
      wifiSpotId: wifiSpotId as Id<'wifiSpots'>,
      limit,
    });

    return credentials.map(toWifiCredential);
  },

  /**
   * Create a new WiFi credential
   */
  async create(
    data: {
      userId: string;
      wifiSpotId?: string;
      name: string;
      ssid: string;
      password: string;
      securityType?: SecurityType;
      locationName?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      isShared?: boolean;
    },
    _accessToken?: string
  ): Promise<string> {
    const id = await convex.mutation(api.wifiCredentials.create, {
      ...data,
      wifiSpotId: data.wifiSpotId
        ? (data.wifiSpotId as Id<'wifiSpots'>)
        : undefined,
    });

    return id;
  },

  /**
   * Update a WiFi credential
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      ssid: string;
      password: string;
      securityType: SecurityType;
      locationName: string;
      latitude: number;
      longitude: number;
      notes: string;
      isShared: boolean;
    }>,
    _accessToken?: string
  ): Promise<WifiCredential | null> {
    const credential = await convex.mutation(api.wifiCredentials.update, {
      id: id as Id<'wifiCredentials'>,
      ...data,
    });

    return credential ? toWifiCredential(credential) : null;
  },

  /**
   * Mark credential as recently used
   */
  async markUsed(id: string, _accessToken?: string): Promise<WifiCredential | null> {
    const credential = await convex.mutation(api.wifiCredentials.markUsed, {
      id: id as Id<'wifiCredentials'>,
    });

    return credential ? toWifiCredential(credential) : null;
  },

  /**
   * Delete a WiFi credential
   */
  async remove(id: string, _accessToken?: string): Promise<void> {
    await convex.mutation(api.wifiCredentials.remove, {
      id: id as Id<'wifiCredentials'>,
    });
  },
};

/**
 * WiFi Reviews Service
 */
export const WifiReviewService = {
  /**
   * List reviews for a WiFi spot
   */
  async listBySpot(
    wifiSpotId: string,
    limit?: number,
    offset?: number,
    _accessToken?: string
  ): Promise<WifiReview[]> {
    const reviews = await convex.query(api.wifiReviews.listBySpot, {
      wifiSpotId: wifiSpotId as Id<'wifiSpots'>,
      limit,
      offset,
    });

    return reviews.map(toWifiReview);
  },

  /**
   * List reviews by a user
   */
  async listByUser(
    userId: string,
    limit?: number,
    _accessToken?: string
  ): Promise<WifiReview[]> {
    const reviews = await convex.query(api.wifiReviews.listByUser, {
      userId,
      limit,
    });

    return reviews.map(toWifiReview);
  },

  /**
   * Get review by ID
   */
  async getById(id: string, _accessToken?: string): Promise<WifiReview> {
    const review = await convex.query(api.wifiReviews.getById, {
      id: id as Id<'wifiReviews'>,
    });

    if (!review) {
      throw new NotFoundError('WiFi review not found');
    }

    return toWifiReview(review);
  },

  /**
   * Get user's review for a specific spot
   */
  async getUserReview(
    userId: string,
    wifiSpotId: string,
    _accessToken?: string
  ): Promise<WifiReview | null> {
    const review = await convex.query(api.wifiReviews.getUserReview, {
      userId,
      wifiSpotId: wifiSpotId as Id<'wifiSpots'>,
    });

    return review ? toWifiReview(review) : null;
  },

  /**
   * Create or update a review
   */
  async create(
    data: {
      userId: string;
      wifiSpotId: string;
      speedRating: number;
      stabilityRating: number;
      easeOfAccessRating: number;
      overallRating: number;
      comment?: string;
      speedTestResult?: number;
      connectionTime?: string;
      deviceType?: string;
      visitDate?: string;
    },
    _accessToken?: string
  ): Promise<string> {
    const id = await convex.mutation(api.wifiReviews.create, {
      ...data,
      wifiSpotId: data.wifiSpotId as Id<'wifiSpots'>,
    });

    return id;
  },

  /**
   * Update a review
   */
  async update(
    id: string,
    data: Partial<{
      speedRating: number;
      stabilityRating: number;
      easeOfAccessRating: number;
      overallRating: number;
      comment: string;
      speedTestResult: number;
    }>,
    _accessToken?: string
  ): Promise<WifiReview | null> {
    const review = await convex.mutation(api.wifiReviews.update, {
      id: id as Id<'wifiReviews'>,
      ...data,
    });

    return review ? toWifiReview(review) : null;
  },

  /**
   * Mark a review as helpful (toggle)
   */
  async markHelpful(
    id: string,
    userId: string,
    _accessToken?: string
  ): Promise<WifiReview | null> {
    const review = await convex.mutation(api.wifiReviews.markHelpful, {
      id: id as Id<'wifiReviews'>,
      userId,
    });

    return review ? toWifiReview(review) : null;
  },

  /**
   * Delete a review
   */
  async remove(id: string, _accessToken?: string): Promise<void> {
    await convex.mutation(api.wifiReviews.remove, {
      id: id as Id<'wifiReviews'>,
    });
  },
};

// Helper functions to convert Convex documents to API responses
function toWifiSpot(row: Doc<'wifiSpots'>): WifiSpot {
  return {
    id: row._id,
    name: row.name,
    nameEn: row.nameEn,
    type: row.type,
    cityId: row.cityId,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    ssid: row.ssid,
    requiresPassword: row.requiresPassword,
    isFree: row.isFree,
    speedMbps: row.speedMbps,
    openingHours: row.openingHours,
    averageRating: row.averageRating,
    ratingCount: row.ratingCount,
    description: row.description,
    imageUrls: row.imageUrls,
    poiId: row.poiId,
    isVerified: row.isVerified,
    submittedBy: row.submittedBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toWifiCredential(row: Doc<'wifiCredentials'>): WifiCredential {
  return {
    id: row._id,
    userId: row.userId,
    wifiSpotId: row.wifiSpotId,
    name: row.name,
    ssid: row.ssid,
    password: row.password,
    securityType: row.securityType,
    locationName: row.locationName,
    latitude: row.latitude,
    longitude: row.longitude,
    notes: row.notes,
    isShared: row.isShared,
    lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toWifiReview(row: Doc<'wifiReviews'>): WifiReview {
  return {
    id: row._id,
    userId: row.userId,
    wifiSpotId: row.wifiSpotId,
    speedRating: row.speedRating,
    stabilityRating: row.stabilityRating,
    easeOfAccessRating: row.easeOfAccessRating,
    overallRating: row.overallRating,
    comment: row.comment,
    speedTestResult: row.speedTestResult,
    connectionTime: row.connectionTime,
    deviceType: row.deviceType,
    visitDate: row.visitDate,
    helpfulCount: row.helpfulCount,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
