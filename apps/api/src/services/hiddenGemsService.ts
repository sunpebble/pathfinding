/**
 * Hidden Gems Service - Convex Implementation
 * Service for discovering and managing hidden gem POIs
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';
import type {
  HiddenGemsListQuery,
  HiddenGemsSearchQuery,
  PoiCategory,
  PopularityLevel,
  RateHiddenGem,
  SubmitHiddenGem,
  UserSubmittedPoiStatus,
} from '../models/hiddenGem';

// Valid categories for runtime validation
const VALID_POI_CATEGORIES: readonly PoiCategory[] = [
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'other',
] as const;

const VALID_POPULARITY_LEVELS: readonly PopularityLevel[] = [
  'hidden',
  'emerging',
  'moderate',
  'popular',
  'crowded',
] as const;

const VALID_STATUSES: readonly UserSubmittedPoiStatus[] = [
  'pending',
  'approved',
  'rejected',
  'merged',
] as const;

function isValidPoiCategory(value: string | undefined): value is PoiCategory {
  if (!value) return false;
  return VALID_POI_CATEGORIES.includes(value as PoiCategory);
}

function isValidPopularityLevel(
  value: string | undefined
): value is PopularityLevel {
  if (!value) return false;
  return VALID_POPULARITY_LEVELS.includes(value as PopularityLevel);
}

function isValidStatus(
  value: string | undefined
): value is UserSubmittedPoiStatus {
  if (!value) return false;
  return VALID_STATUSES.includes(value as UserSubmittedPoiStatus);
}

// Response interfaces
export interface HiddenGemPoi {
  id: string;
  name: string;
  nameEn?: string;
  category: PoiCategory;
  cityId: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  imageUrls?: string[];
  source: string;
  // Hidden gem specific fields
  isHiddenGem: boolean;
  hiddenGemScore?: number;
  hiddenGemRating?: number;
  hiddenGemRatingCount?: number;
  localRecommendation?: {
    isLocalRecommended: boolean;
    localTips?: string;
    bestTimeToVisit?: string;
    localSecrets?: string[];
    recommendedBy?: string;
  };
  popularityLevel?: PopularityLevel;
}

export interface UserSubmittedPoi {
  id: string;
  userId: string;
  name: string;
  nameEn?: string;
  category: PoiCategory;
  cityId: string;
  address?: string;
  latitude: number;
  longitude: number;
  description: string;
  localTips?: string;
  bestTimeToVisit?: string;
  priceRange?: string;
  imageUrls?: string[];
  howDiscovered?: string;
  localSecrets?: string[];
  avoidTimes?: string;
  status: UserSubmittedPoiStatus;
  moderatorNotes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  mergedPoiId?: string;
  upvotes: number;
  downvotes: number;
  viewCount: number;
  createdAt: number;
  updatedAt?: number;
}

export interface HiddenGemRating {
  id: string;
  poiId: string;
  userId: string;
  rating: number;
  review?: string;
  visitDate?: string;
  wouldRecommend: boolean;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Hidden Gems Service
 */
export const HiddenGemsService = {
  /**
   * List hidden gem POIs with filters
   */
  async listHiddenGems(
    query: HiddenGemsListQuery,
    _accessToken: string
  ): Promise<HiddenGemPoi[]> {
    const pois = await convex.query(api.hiddenGems.listHiddenGems, {
      cityId: query.cityId as Id<'cities'> | undefined,
      category: isValidPoiCategory(query.category) ? query.category : undefined,
      popularityLevel: isValidPopularityLevel(query.popularityLevel)
        ? query.popularityLevel
        : undefined,
      minHiddenGemRating: query.minRating,
      onlyLocalRecommended: query.onlyLocalRecommended,
      limit: query.limit,
    });

    return pois.map(toHiddenGemPoi);
  },

  /**
   * Get hidden gems by popularity level
   */
  async getByPopularityLevel(
    popularityLevel: PopularityLevel,
    cityId: string | undefined,
    limit: number,
    _accessToken: string
  ): Promise<HiddenGemPoi[]> {
    const pois = await convex.query(api.hiddenGems.getByPopularityLevel, {
      popularityLevel,
      cityId: cityId as Id<'cities'> | undefined,
      limit,
    });

    return pois.map(toHiddenGemPoi);
  },

  /**
   * Get local recommended POIs
   */
  async getLocalRecommendations(
    cityId: string,
    category: PoiCategory | undefined,
    limit: number,
    _accessToken: string
  ): Promise<HiddenGemPoi[]> {
    const pois = await convex.query(api.hiddenGems.getLocalRecommendations, {
      cityId: cityId as Id<'cities'>,
      category: isValidPoiCategory(category) ? category : undefined,
      limit,
    });

    return pois.map(toHiddenGemPoi);
  },

  /**
   * Search hidden gems
   */
  async searchHiddenGems(
    query: HiddenGemsSearchQuery,
    _accessToken: string
  ): Promise<HiddenGemPoi[]> {
    const pois = await convex.query(api.hiddenGems.searchHiddenGems, {
      query: query.query,
      cityId: query.cityId as Id<'cities'> | undefined,
      category: isValidPoiCategory(query.category) ? query.category : undefined,
      limit: query.limit,
    });

    return pois.map(toHiddenGemPoi);
  },

  /**
   * Mark a POI as hidden gem
   */
  async markAsHiddenGem(
    poiId: string,
    data: {
      hiddenGemScore?: number;
      popularityLevel?: PopularityLevel;
      localRecommendation?: {
        isLocalRecommended: boolean;
        localTips?: string;
        bestTimeToVisit?: string;
        localSecrets?: string[];
        recommendedBy?: string;
      };
    },
    _accessToken: string
  ): Promise<HiddenGemPoi> {
    const poi = await convex.mutation(api.hiddenGems.markAsHiddenGem, {
      poiId: poiId as Id<'pois'>,
      hiddenGemScore: data.hiddenGemScore,
      popularityLevel: isValidPopularityLevel(data.popularityLevel)
        ? data.popularityLevel
        : undefined,
      localRecommendation: data.localRecommendation,
    });

    if (!poi) {
      throw new NotFoundError('POI not found');
    }

    return toHiddenGemPoi(poi);
  },

  /**
   * Submit a new hidden gem
   */
  async submitHiddenGem(
    userId: string,
    data: SubmitHiddenGem,
    _accessToken: string
  ): Promise<string> {
    const id = await convex.mutation(api.hiddenGems.submitHiddenGem, {
      userId,
      name: data.name,
      nameEn: data.nameEn,
      category: data.category,
      cityId: data.cityId as Id<'cities'>,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      localTips: data.localTips,
      bestTimeToVisit: data.bestTimeToVisit,
      priceRange: data.priceRange,
      imageUrls: data.imageUrls,
      howDiscovered: data.howDiscovered,
      localSecrets: data.localSecrets,
      avoidTimes: data.avoidTimes,
    });

    return id;
  },

  /**
   * List user submitted POIs
   */
  async listUserSubmittedPois(
    query: {
      cityId?: string;
      status?: UserSubmittedPoiStatus;
      userId?: string;
      category?: PoiCategory;
      limit?: number;
    },
    _accessToken: string
  ): Promise<UserSubmittedPoi[]> {
    const pois = await convex.query(api.hiddenGems.listUserSubmittedPois, {
      cityId: query.cityId as Id<'cities'> | undefined,
      status: isValidStatus(query.status) ? query.status : undefined,
      userId: query.userId,
      category: isValidPoiCategory(query.category) ? query.category : undefined,
      limit: query.limit,
    });

    return pois.map(toUserSubmittedPoi);
  },

  /**
   * Get user submitted POI by ID
   */
  async getUserSubmittedPoiById(
    id: string,
    _accessToken: string
  ): Promise<UserSubmittedPoi> {
    const poi = await convex.query(api.hiddenGems.getUserSubmittedPoiById, {
      id: id as Id<'userSubmittedPois'>,
    });

    if (!poi) {
      throw new NotFoundError('User submitted POI not found');
    }

    // Increment view count
    await convex.mutation(api.hiddenGems.incrementViewCount, {
      poiId: id as Id<'userSubmittedPois'>,
    });

    return toUserSubmittedPoi(poi);
  },

  /**
   * Vote on user submitted POI
   */
  async voteOnUserSubmittedPoi(
    poiId: string,
    userId: string,
    voteType: 'up' | 'down',
    _accessToken: string
  ): Promise<{ action: string; voteType: string }> {
    return await convex.mutation(api.hiddenGems.voteOnUserSubmittedPoi, {
      poiId: poiId as Id<'userSubmittedPois'>,
      userId,
      voteType,
    });
  },

  /**
   * Update user submitted POI status (moderation)
   */
  async updateUserSubmittedPoiStatus(
    poiId: string,
    status: UserSubmittedPoiStatus,
    reviewedBy: string,
    moderatorNotes?: string,
    _accessToken?: string
  ): Promise<UserSubmittedPoi> {
    const poi = await convex.mutation(
      api.hiddenGems.updateUserSubmittedPoiStatus,
      {
        poiId: poiId as Id<'userSubmittedPois'>,
        status,
        reviewedBy,
        moderatorNotes,
      }
    );

    if (!poi) {
      throw new NotFoundError('User submitted POI not found');
    }

    return toUserSubmittedPoi(poi);
  },

  /**
   * Rate a hidden gem
   */
  async rateHiddenGem(
    poiId: string,
    userId: string,
    data: RateHiddenGem,
    _accessToken: string
  ): Promise<string> {
    return await convex.mutation(api.hiddenGems.rateHiddenGem, {
      poiId: poiId as Id<'pois'>,
      userId,
      rating: data.rating,
      review: data.review,
      visitDate: data.visitDate,
      wouldRecommend: data.wouldRecommend,
    });
  },

  /**
   * Get ratings for a hidden gem
   */
  async getHiddenGemRatings(
    poiId: string,
    limit: number,
    _accessToken: string
  ): Promise<HiddenGemRating[]> {
    const ratings = await convex.query(api.hiddenGems.getHiddenGemRatings, {
      poiId: poiId as Id<'pois'>,
      limit,
    });

    return ratings.map(toHiddenGemRating);
  },

  /**
   * Get user's rating for a POI
   */
  async getUserRating(
    poiId: string,
    userId: string,
    _accessToken: string
  ): Promise<HiddenGemRating | null> {
    const rating = await convex.query(api.hiddenGems.getUserRating, {
      poiId: poiId as Id<'pois'>,
      userId,
    });

    return rating ? toHiddenGemRating(rating) : null;
  },

  /**
   * Delete a rating
   */
  async deleteRating(
    ratingId: string,
    userId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.hiddenGems.deleteRating, {
      ratingId: ratingId as Id<'hiddenGemRatings'>,
      userId,
    });
  },
};

// Helper functions to convert Convex documents to API responses
function toHiddenGemPoi(doc: Doc<'pois'>): HiddenGemPoi {
  return {
    id: doc._id,
    name: doc.name,
    nameEn: doc.nameEn,
    category: doc.category,
    cityId: doc.cityId,
    address: doc.address,
    latitude: doc.latitude,
    longitude: doc.longitude,
    rating: doc.rating,
    ratingCount: doc.ratingCount,
    priceLevel: doc.priceLevel,
    imageUrls: doc.imageUrls,
    source: doc.source,
    isHiddenGem: doc.isHiddenGem ?? false,
    hiddenGemScore: doc.hiddenGemScore,
    hiddenGemRating: doc.hiddenGemRating,
    hiddenGemRatingCount: doc.hiddenGemRatingCount,
    localRecommendation: doc.localRecommendation,
    popularityLevel: doc.popularityLevel,
  };
}

function toUserSubmittedPoi(doc: Doc<'userSubmittedPois'>): UserSubmittedPoi {
  return {
    id: doc._id,
    userId: doc.userId,
    name: doc.name,
    nameEn: doc.nameEn,
    category: doc.category,
    cityId: doc.cityId,
    address: doc.address,
    latitude: doc.latitude,
    longitude: doc.longitude,
    description: doc.description,
    localTips: doc.localTips,
    bestTimeToVisit: doc.bestTimeToVisit,
    priceRange: doc.priceRange,
    imageUrls: doc.imageUrls,
    howDiscovered: doc.howDiscovered,
    localSecrets: doc.localSecrets,
    avoidTimes: doc.avoidTimes,
    status: doc.status,
    moderatorNotes: doc.moderatorNotes,
    reviewedBy: doc.reviewedBy,
    reviewedAt: doc.reviewedAt,
    mergedPoiId: doc.mergedPoiId,
    upvotes: doc.upvotes,
    downvotes: doc.downvotes,
    viewCount: doc.viewCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toHiddenGemRating(doc: Doc<'hiddenGemRatings'>): HiddenGemRating {
  return {
    id: doc._id,
    poiId: doc.poiId,
    userId: doc.userId,
    rating: doc.rating,
    review: doc.review,
    visitDate: doc.visitDate,
    wouldRecommend: doc.wouldRecommend,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
