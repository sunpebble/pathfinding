/**
 * SIM Card Service - Convex Implementation
 * International SIM card recommendations for travelers
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Local type definitions (matching Convex schema)
export type SimCardType = 'physical' | 'esim' | 'wifi_device';
export type SimCardCoverageType = 'single_country' | 'regional' | 'global';
export type SignalQuality = 'excellent' | 'good' | 'average' | 'poor' | 'very_poor';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type ReviewVoteType = 'helpful' | 'not_helpful';

export interface SimCardDataPlan {
  dataAmount: string;
  dataAmountBytes?: number;
  isUnlimited: boolean;
  throttledSpeedAfterLimit?: string;
  validityDays: number;
  price: number;
  originalPrice?: number;
  currency: string;
  pricePerDay?: number;
  pricePerGB?: number;
}

export interface EsimInfo {
  supportsQrActivation: boolean;
  supportsAppActivation: boolean;
  activationInstructions?: string;
  compatibleDevices?: string[];
  requiresUnlockedPhone: boolean;
}

export interface DeliveryOption {
  method: string;
  estimatedDays?: number;
  fee?: number;
  description?: string;
}

export interface PhysicalSimInfo {
  simSize: string[];
  deliveryOptions?: DeliveryOption[];
  pickupLocations?: string[];
}

export interface SimCard {
  id: string;
  name: string;
  nameEn?: string;
  provider: string;
  providerLogo?: string;
  cardType: SimCardType;
  destinations: string[];
  destinationNames?: string[];
  coverageType: SimCardCoverageType;
  regionName?: string;
  dataPlans: SimCardDataPlan[];
  networkType: string[];
  supportedCarriers?: string[];
  esimInfo?: EsimInfo;
  physicalSimInfo?: PhysicalSimInfo;
  includesVoice: boolean;
  voiceMinutes?: number;
  includesSms: boolean;
  smsCount?: number;
  localNumber?: boolean;
  features: string[];
  hotspotSupported: boolean;
  maxDevices?: number;
  purchaseUrl: string;
  purchasePlatforms?: string[];
  affiliateUrl?: string;
  rating?: number;
  reviewCount: number;
  salesCount?: number;
  isActive: boolean;
  isPromoted?: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimCardReview {
  id: string;
  simCardId: string;
  userId?: string;
  authorName?: string;
  overallRating: number;
  signalRating?: number;
  speedRating?: number;
  valueRating?: number;
  serviceRating?: number;
  title?: string;
  content: string;
  destination?: string;
  usageDuration?: number;
  actualDataUsed?: string;
  deviceUsed?: string;
  pros?: string[];
  cons?: string[];
  activationExperience?: string;
  signalQuality?: SignalQuality;
  speedTestResult?: string;
  wouldRecommend: boolean;
  imageUrls?: string[];
  helpfulCount: number;
  reportCount: number;
  isVerified: boolean;
  purchaseVerified: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SimCardReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  voteType: ReviewVoteType;
  createdAt: Date;
}

export interface FavoriteSimCard {
  id: string;
  userId: string;
  simCardId: string;
  notes?: string;
  createdAt: Date;
  simCard?: SimCard | null;
}

/**
 * SIM Card service for product recommendations and reviews
 */
export const SimCardService = {
  // ============================================
  // SIM Card Products
  // ============================================

  /**
   * List SIM card products with filters
   */
  async list(filters: {
    destination?: string;
    cardType?: SimCardType;
    coverageType?: SimCardCoverageType;
    minData?: number;
    maxPrice?: number;
    minDays?: number;
    includesVoice?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.list, filters);
    return results.map(toSimCard);
  },

  /**
   * Get SIM card by ID
   */
  async getById(id: string): Promise<SimCard> {
    const result = await convex.query(api.simCards.getById, {
      id: id as Id<'simCards'>,
    });

    if (!result) {
      throw new NotFoundError('SIM card not found');
    }

    return toSimCard(result);
  },

  /**
   * Get recommended SIM cards for a destination
   */
  async getRecommended(params: {
    destination: string;
    tripDurationDays?: number;
    needsVoice?: boolean;
    preferEsim?: boolean;
    limit?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.getRecommended, params);
    return results.map(toSimCard);
  },

  /**
   * Search SIM cards by name or provider
   */
  async search(params: {
    query: string;
    destination?: string;
    limit?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.search, params);
    return results.map(toSimCard);
  },

  /**
   * Compare SIM card products
   */
  async compare(ids: string[]): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.compare, {
      ids: ids as Id<'simCards'>[],
    });
    return results.map(toSimCard);
  },

  /**
   * Get popular SIM cards
   */
  async getPopular(params: {
    destination?: string;
    limit?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.getPopular, params);
    return results.map(toSimCard);
  },

  /**
   * Get SIM cards by region
   */
  async getByRegion(params: {
    region: string;
    limit?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.getByRegion, params);
    return results.map(toSimCard);
  },

  /**
   * Get eSIM products
   */
  async getEsimProducts(params: {
    destination?: string;
    limit?: number;
  }): Promise<SimCard[]> {
    const results = await convex.query(api.simCards.getEsimProducts, params);
    return results.map(toSimCard);
  },

  /**
   * Create a new SIM card product (admin)
   */
  async create(data: Omit<SimCard, 'id' | 'rating' | 'reviewCount' | 'salesCount' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = await convex.mutation(api.simCards.create, data);
    return id;
  },

  /**
   * Update a SIM card product (admin)
   */
  async update(id: string, data: Partial<Omit<SimCard, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SimCard> {
    const result = await convex.mutation(api.simCards.update, {
      id: id as Id<'simCards'>,
      ...data,
    });
    if (!result) {
      throw new NotFoundError('SIM card not found');
    }
    return toSimCard(result);
  },

  /**
   * Delete a SIM card product (admin)
   */
  async remove(id: string): Promise<void> {
    await convex.mutation(api.simCards.remove, {
      id: id as Id<'simCards'>,
    });
  },

  // ============================================
  // SIM Card Reviews
  // ============================================

  /**
   * List reviews for a SIM card
   */
  async listReviews(params: {
    simCardId: string;
    status?: ReviewStatus;
    limit?: number;
    offset?: number;
  }): Promise<SimCardReview[]> {
    const results = await convex.query(api.simCardReviews.listBySimCard, {
      simCardId: params.simCardId as Id<'simCards'>,
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    });
    return results.map(toSimCardReview);
  },

  /**
   * List reviews by a user
   */
  async listUserReviews(params: {
    userId: string;
    limit?: number;
  }): Promise<SimCardReview[]> {
    const results = await convex.query(api.simCardReviews.listByUser, params);
    return results.map(toSimCardReview);
  },

  /**
   * Get review by ID
   */
  async getReviewById(id: string): Promise<SimCardReview> {
    const result = await convex.query(api.simCardReviews.getById, {
      id: id as Id<'simCardReviews'>,
    });

    if (!result) {
      throw new NotFoundError('Review not found');
    }

    return toSimCardReview(result);
  },

  /**
   * Get user's review for a specific SIM card
   */
  async getUserReview(params: {
    userId: string;
    simCardId: string;
  }): Promise<SimCardReview | null> {
    const result = await convex.query(api.simCardReviews.getUserReview, {
      userId: params.userId,
      simCardId: params.simCardId as Id<'simCards'>,
    });
    return result ? toSimCardReview(result) : null;
  },

  /**
   * Get top reviews (most helpful)
   */
  async getTopReviews(params: {
    simCardId?: string;
    limit?: number;
  }): Promise<SimCardReview[]> {
    const results = await convex.query(api.simCardReviews.getTopReviews, {
      simCardId: params.simCardId ? params.simCardId as Id<'simCards'> : undefined,
      limit: params.limit,
    });
    return results.map(toSimCardReview);
  },

  /**
   * Create a new review
   */
  async createReview(data: {
    simCardId: string;
    userId?: string;
    authorName?: string;
    overallRating: number;
    signalRating?: number;
    speedRating?: number;
    valueRating?: number;
    serviceRating?: number;
    title?: string;
    content: string;
    destination?: string;
    usageDuration?: number;
    actualDataUsed?: string;
    deviceUsed?: string;
    pros?: string[];
    cons?: string[];
    activationExperience?: string;
    signalQuality?: SignalQuality;
    speedTestResult?: string;
    wouldRecommend: boolean;
    imageUrls?: string[];
  }): Promise<string> {
    const id = await convex.mutation(api.simCardReviews.create, {
      ...data,
      simCardId: data.simCardId as Id<'simCards'>,
    });
    return id;
  },

  /**
   * Update a review
   */
  async updateReview(id: string, data: Partial<{
    overallRating: number;
    signalRating: number;
    speedRating: number;
    valueRating: number;
    serviceRating: number;
    title: string;
    content: string;
    destination: string;
    usageDuration: number;
    actualDataUsed: string;
    deviceUsed: string;
    pros: string[];
    cons: string[];
    activationExperience: string;
    signalQuality: SignalQuality;
    speedTestResult: string;
    wouldRecommend: boolean;
    imageUrls: string[];
  }>): Promise<SimCardReview> {
    const result = await convex.mutation(api.simCardReviews.update, {
      id: id as Id<'simCardReviews'>,
      ...data,
    });
    if (!result) {
      throw new NotFoundError('Review not found');
    }
    return toSimCardReview(result);
  },

  /**
   * Update review status (admin/moderation)
   */
  async updateReviewStatus(id: string, status: ReviewStatus): Promise<SimCardReview> {
    const result = await convex.mutation(api.simCardReviews.updateStatus, {
      id: id as Id<'simCardReviews'>,
      status,
    });
    if (!result) {
      throw new NotFoundError('Review not found');
    }
    return toSimCardReview(result);
  },

  /**
   * Vote on a review
   */
  async voteOnReview(params: {
    reviewId: string;
    userId: string;
    voteType: ReviewVoteType;
  }): Promise<SimCardReview> {
    const result = await convex.mutation(api.simCardReviews.vote, {
      reviewId: params.reviewId as Id<'simCardReviews'>,
      userId: params.userId,
      voteType: params.voteType,
    });
    if (!result) {
      throw new NotFoundError('Review not found');
    }
    return toSimCardReview(result);
  },

  /**
   * Get user's vote for a review
   */
  async getUserVote(params: {
    reviewId: string;
    userId: string;
  }): Promise<SimCardReviewVote | null> {
    const result = await convex.query(api.simCardReviews.getUserVote, {
      reviewId: params.reviewId as Id<'simCardReviews'>,
      userId: params.userId,
    });
    return result ? toSimCardReviewVote(result) : null;
  },

  /**
   * Report a review
   */
  async reportReview(id: string): Promise<SimCardReview> {
    const result = await convex.mutation(api.simCardReviews.report, {
      id: id as Id<'simCardReviews'>,
    });
    if (!result) {
      throw new NotFoundError('Review not found');
    }
    return toSimCardReview(result);
  },

  /**
   * Delete a review
   */
  async removeReview(id: string): Promise<void> {
    await convex.mutation(api.simCardReviews.remove, {
      id: id as Id<'simCardReviews'>,
    });
  },

  // ============================================
  // Favorite SIM Cards
  // ============================================

  /**
   * List user's favorite SIM cards
   */
  async listFavorites(params: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<FavoriteSimCard[]> {
    const results = await convex.query(api.favoriteSimCards.listByUser, params);
    return results.map(toFavoriteSimCard);
  },

  /**
   * Check if a SIM card is favorited by user
   */
  async isFavorited(params: {
    userId: string;
    simCardId: string;
  }): Promise<boolean> {
    return await convex.query(api.favoriteSimCards.isFavorited, {
      userId: params.userId,
      simCardId: params.simCardId as Id<'simCards'>,
    });
  },

  /**
   * Add a SIM card to favorites
   */
  async addToFavorites(params: {
    userId: string;
    simCardId: string;
    notes?: string;
  }): Promise<string> {
    const id = await convex.mutation(api.favoriteSimCards.add, {
      userId: params.userId,
      simCardId: params.simCardId as Id<'simCards'>,
      notes: params.notes,
    });
    return id;
  },

  /**
   * Update favorite notes
   */
  async updateFavoriteNotes(id: string, notes?: string): Promise<FavoriteSimCard> {
    const result = await convex.mutation(api.favoriteSimCards.updateNotes, {
      id: id as Id<'favoriteSimCards'>,
      notes,
    });
    if (!result) {
      throw new NotFoundError('Favorite not found');
    }
    return toFavoriteSimCardBasic(result);
  },

  /**
   * Remove a SIM card from favorites
   */
  async removeFromFavorites(params: {
    userId: string;
    simCardId: string;
  }): Promise<void> {
    await convex.mutation(api.favoriteSimCards.remove, {
      userId: params.userId,
      simCardId: params.simCardId as Id<'simCards'>,
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(params: {
    userId: string;
    simCardId: string;
  }): Promise<{ isFavorited: boolean }> {
    return await convex.mutation(api.favoriteSimCards.toggle, {
      userId: params.userId,
      simCardId: params.simCardId as Id<'simCards'>,
    });
  },

  /**
   * Get favorite count for a SIM card
   */
  async getFavoriteCount(simCardId: string): Promise<number> {
    return await convex.query(api.favoriteSimCards.getFavoriteCount, {
      simCardId: simCardId as Id<'simCards'>,
    });
  },
};

// Helper functions to convert Convex documents to API responses

function toSimCard(row: Doc<'simCards'>): SimCard {
  return {
    id: row._id,
    name: row.name,
    nameEn: row.nameEn,
    provider: row.provider,
    providerLogo: row.providerLogo,
    cardType: row.cardType as SimCardType,
    destinations: row.destinations,
    destinationNames: row.destinationNames,
    coverageType: row.coverageType as SimCardCoverageType,
    regionName: row.regionName,
    dataPlans: row.dataPlans as SimCardDataPlan[],
    networkType: row.networkType,
    supportedCarriers: row.supportedCarriers,
    esimInfo: row.esimInfo as EsimInfo | undefined,
    physicalSimInfo: row.physicalSimInfo as PhysicalSimInfo | undefined,
    includesVoice: row.includesVoice,
    voiceMinutes: row.voiceMinutes,
    includesSms: row.includesSms,
    smsCount: row.smsCount,
    localNumber: row.localNumber,
    features: row.features,
    hotspotSupported: row.hotspotSupported,
    maxDevices: row.maxDevices,
    purchaseUrl: row.purchaseUrl,
    purchasePlatforms: row.purchasePlatforms,
    affiliateUrl: row.affiliateUrl,
    rating: row.rating,
    reviewCount: row.reviewCount,
    salesCount: row.salesCount,
    isActive: row.isActive,
    isPromoted: row.isPromoted,
    priority: row.priority,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toSimCardReview(row: Doc<'simCardReviews'>): SimCardReview {
  return {
    id: row._id,
    simCardId: row.simCardId,
    userId: row.userId,
    authorName: row.authorName,
    overallRating: row.overallRating,
    signalRating: row.signalRating,
    speedRating: row.speedRating,
    valueRating: row.valueRating,
    serviceRating: row.serviceRating,
    title: row.title,
    content: row.content,
    destination: row.destination,
    usageDuration: row.usageDuration,
    actualDataUsed: row.actualDataUsed,
    deviceUsed: row.deviceUsed,
    pros: row.pros,
    cons: row.cons,
    activationExperience: row.activationExperience,
    signalQuality: row.signalQuality as SignalQuality | undefined,
    speedTestResult: row.speedTestResult,
    wouldRecommend: row.wouldRecommend,
    imageUrls: row.imageUrls,
    helpfulCount: row.helpfulCount,
    reportCount: row.reportCount,
    isVerified: row.isVerified,
    purchaseVerified: row.purchaseVerified,
    status: row.status as ReviewStatus,
    createdAt: new Date(row.createdAt),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
  };
}

function toSimCardReviewVote(row: Doc<'simCardReviewVotes'>): SimCardReviewVote {
  return {
    id: row._id,
    reviewId: row.reviewId,
    userId: row.userId,
    voteType: row.voteType as ReviewVoteType,
    createdAt: new Date(row.createdAt),
  };
}

function toFavoriteSimCard(row: Doc<'favoriteSimCards'> & { simCard?: Doc<'simCards'> | null }): FavoriteSimCard {
  return {
    id: row._id,
    userId: row.userId,
    simCardId: row.simCardId,
    notes: row.notes,
    createdAt: new Date(row.createdAt),
    simCard: row.simCard ? toSimCard(row.simCard) : null,
  };
}

function toFavoriteSimCardBasic(row: Doc<'favoriteSimCards'>): FavoriteSimCard {
  return {
    id: row._id,
    userId: row.userId,
    simCardId: row.simCardId,
    notes: row.notes,
    createdAt: new Date(row.createdAt),
  };
}
