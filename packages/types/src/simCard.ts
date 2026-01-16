/**
 * SIM Card Types - International SIM card recommendations for travelers
 */

/**
 * SIM card type - Physical, eSIM, or WiFi device
 */
export type SimCardType = 'physical' | 'esim' | 'wifi_device';

/**
 * Coverage type - Single country, regional, or global
 */
export type SimCardCoverageType = 'single_country' | 'regional' | 'global';

/**
 * Signal quality rating for reviews
 */
export type SignalQuality = 'excellent' | 'good' | 'average' | 'poor' | 'very_poor';

/**
 * Review moderation status
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Vote type for reviews
 */
export type ReviewVoteType = 'helpful' | 'not_helpful';

/**
 * Data plan details
 */
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

/**
 * eSIM specific information
 */
export interface EsimInfo {
  supportsQrActivation: boolean;
  supportsAppActivation: boolean;
  activationInstructions?: string;
  compatibleDevices?: string[];
  requiresUnlockedPhone: boolean;
}

/**
 * Delivery option for physical SIM cards
 */
export interface DeliveryOption {
  method: string;
  estimatedDays?: number;
  fee?: number;
  description?: string;
}

/**
 * Physical SIM specific information
 */
export interface PhysicalSimInfo {
  simSize: string[];
  deliveryOptions?: DeliveryOption[];
  pickupLocations?: string[];
}

/**
 * SIM card product entity
 */
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
  createdAt: number;
  updatedAt: number;
}

/**
 * SIM card review entity
 */
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
  createdAt: number;
  updatedAt?: number;
}

/**
 * Review vote entity
 */
export interface SimCardReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  voteType: ReviewVoteType;
  createdAt: number;
}

/**
 * Favorite SIM card entity
 */
export interface FavoriteSimCard {
  id: string;
  userId: string;
  simCardId: string;
  notes?: string;
  createdAt: number;
}

/**
 * Favorite SIM card with details
 */
export interface FavoriteSimCardWithDetails extends FavoriteSimCard {
  simCard: SimCard | null;
}

/**
 * Create SIM card input
 */
export type CreateSimCardInput = Omit<SimCard, 'id' | 'rating' | 'reviewCount' | 'salesCount' | 'createdAt' | 'updatedAt'>;

/**
 * Update SIM card input
 */
export type UpdateSimCardInput = Partial<Omit<SimCard, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Create review input
 */
export type CreateSimCardReviewInput = Omit<SimCardReview, 'id' | 'helpfulCount' | 'reportCount' | 'isVerified' | 'purchaseVerified' | 'status' | 'createdAt' | 'updatedAt'>;

/**
 * Update review input
 */
export type UpdateSimCardReviewInput = Partial<Omit<SimCardReview, 'id' | 'simCardId' | 'userId' | 'helpfulCount' | 'reportCount' | 'isVerified' | 'purchaseVerified' | 'status' | 'createdAt' | 'updatedAt'>>;

/**
 * SIM card search filters
 */
export interface SimCardSearchFilters {
  destination?: string;
  cardType?: SimCardType;
  coverageType?: SimCardCoverageType;
  minData?: number;
  maxPrice?: number;
  minDays?: number;
  includesVoice?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * SIM card recommendation filters
 */
export interface SimCardRecommendationFilters {
  destination: string;
  tripDurationDays?: number;
  needsVoice?: boolean;
  preferEsim?: boolean;
  limit?: number;
}

/**
 * SIM card comparison result
 */
export interface SimCardComparison {
  cards: SimCard[];
  comparisonFields: {
    field: string;
    values: (string | number | boolean | undefined)[];
  }[];
}

/**
 * SIM card list response with pagination
 */
export interface SimCardListResponse {
  items: SimCard[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Review list response with pagination
 */
export interface SimCardReviewListResponse {
  items: SimCardReview[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
