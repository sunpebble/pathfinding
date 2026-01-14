import { z } from 'zod';

/**
 * SIM card type enum schema
 */
export const SimCardTypeSchema = z.enum(['physical', 'esim', 'wifi_device']);

/**
 * Coverage type enum schema
 */
export const SimCardCoverageTypeSchema = z.enum([
  'single_country',
  'regional',
  'global',
]);

/**
 * Signal quality enum schema
 */
export const SignalQualitySchema = z.enum([
  'excellent',
  'good',
  'average',
  'poor',
  'very_poor',
]);

/**
 * Review status enum schema
 */
export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

/**
 * Review vote type enum schema
 */
export const ReviewVoteTypeSchema = z.enum(['helpful', 'not_helpful']);

/**
 * SIM card list query schema
 */
export const SimCardListQuerySchema = z.object({
  destination: z.string().optional(),
  cardType: SimCardTypeSchema.optional(),
  coverageType: SimCardCoverageTypeSchema.optional(),
  minData: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minDays: z.coerce.number().int().min(1).optional(),
  includesVoice: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * SIM card recommendation query schema
 */
export const SimCardRecommendQuerySchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  tripDurationDays: z.coerce.number().int().min(1).max(365).optional(),
  needsVoice: z.coerce.boolean().optional(),
  preferEsim: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * SIM card search query schema
 */
export const SimCardSearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  destination: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * SIM card compare query schema
 */
export const SimCardCompareQuerySchema = z.object({
  ids: z.string().transform((val) => val.split(',')),
});

/**
 * SIM card region query schema
 */
export const SimCardRegionQuerySchema = z.object({
  region: z.string().min(1, 'Region is required'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * eSIM query schema
 */
export const EsimQuerySchema = z.object({
  destination: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Data plan schema
 */
export const DataPlanSchema = z.object({
  dataAmount: z.string().min(1),
  dataAmountBytes: z.number().int().min(0).optional(),
  isUnlimited: z.boolean(),
  throttledSpeedAfterLimit: z.string().optional(),
  validityDays: z.number().int().min(1),
  price: z.number().min(0),
  originalPrice: z.number().min(0).optional(),
  currency: z.string().min(1),
  pricePerDay: z.number().min(0).optional(),
  pricePerGB: z.number().min(0).optional(),
});

/**
 * eSIM info schema
 */
export const EsimInfoSchema = z.object({
  supportsQrActivation: z.boolean(),
  supportsAppActivation: z.boolean(),
  activationInstructions: z.string().optional(),
  compatibleDevices: z.array(z.string()).optional(),
  requiresUnlockedPhone: z.boolean(),
});

/**
 * Delivery option schema
 */
export const DeliveryOptionSchema = z.object({
  method: z.string().min(1),
  estimatedDays: z.number().int().min(0).optional(),
  fee: z.number().min(0).optional(),
  description: z.string().optional(),
});

/**
 * Physical SIM info schema
 */
export const PhysicalSimInfoSchema = z.object({
  simSize: z.array(z.string()).min(1),
  deliveryOptions: z.array(DeliveryOptionSchema).optional(),
  pickupLocations: z.array(z.string()).optional(),
});

/**
 * Create SIM card schema (admin)
 */
export const CreateSimCardSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEn: z.string().optional(),
  provider: z.string().min(1, 'Provider is required'),
  providerLogo: z.string().url().optional(),
  cardType: SimCardTypeSchema,
  destinations: z.array(z.string()).min(1, 'At least one destination required'),
  destinationNames: z.array(z.string()).optional(),
  coverageType: SimCardCoverageTypeSchema,
  regionName: z.string().optional(),
  dataPlans: z.array(DataPlanSchema).min(1, 'At least one data plan required'),
  networkType: z.array(z.string()).min(1, 'At least one network type required'),
  supportedCarriers: z.array(z.string()).optional(),
  esimInfo: EsimInfoSchema.optional(),
  physicalSimInfo: PhysicalSimInfoSchema.optional(),
  includesVoice: z.boolean(),
  voiceMinutes: z.number().int().min(0).optional(),
  includesSms: z.boolean(),
  smsCount: z.number().int().min(0).optional(),
  localNumber: z.boolean().optional(),
  features: z.array(z.string()),
  hotspotSupported: z.boolean(),
  maxDevices: z.number().int().min(1).optional(),
  purchaseUrl: z.string().url('Invalid purchase URL'),
  purchasePlatforms: z.array(z.string()).optional(),
  affiliateUrl: z.string().url().optional(),
  isPromoted: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
});

/**
 * Update SIM card schema (admin)
 */
export const UpdateSimCardSchema = CreateSimCardSchema.partial().extend({
  isActive: z.boolean().optional(),
});

/**
 * Review list query schema
 */
export const ReviewListQuerySchema = z.object({
  status: ReviewStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Create review schema
 */
export const CreateReviewSchema = z.object({
  authorName: z.string().optional(),
  overallRating: z.number().min(1).max(5),
  signalRating: z.number().min(1).max(5).optional(),
  speedRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  serviceRating: z.number().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  content: z.string().min(10, 'Review content must be at least 10 characters'),
  destination: z.string().optional(),
  usageDuration: z.number().int().min(1).optional(),
  actualDataUsed: z.string().optional(),
  deviceUsed: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  activationExperience: z.string().optional(),
  signalQuality: SignalQualitySchema.optional(),
  speedTestResult: z.string().optional(),
  wouldRecommend: z.boolean(),
  imageUrls: z.array(z.string().url()).optional(),
});

/**
 * Update review schema
 */
export const UpdateReviewSchema = CreateReviewSchema.partial();

/**
 * Update review status schema (admin)
 */
export const UpdateReviewStatusSchema = z.object({
  status: ReviewStatusSchema,
});

/**
 * Vote on review schema
 */
export const VoteOnReviewSchema = z.object({
  voteType: ReviewVoteTypeSchema,
});

/**
 * Add to favorites schema
 */
export const AddToFavoritesSchema = z.object({
  notes: z.string().max(500).optional(),
});

/**
 * Update favorite notes schema
 */
export const UpdateFavoriteNotesSchema = z.object({
  notes: z.string().max(500).optional(),
});

/**
 * Favorites list query schema
 */
export const FavoritesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Infer types from schemas
export type SimCardType = z.infer<typeof SimCardTypeSchema>;
export type SimCardCoverageType = z.infer<typeof SimCardCoverageTypeSchema>;
export type SignalQuality = z.infer<typeof SignalQualitySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ReviewVoteType = z.infer<typeof ReviewVoteTypeSchema>;
export type SimCardListQuery = z.infer<typeof SimCardListQuerySchema>;
export type SimCardRecommendQuery = z.infer<typeof SimCardRecommendQuerySchema>;
export type SimCardSearchQuery = z.infer<typeof SimCardSearchQuerySchema>;
export type CreateSimCard = z.infer<typeof CreateSimCardSchema>;
export type UpdateSimCard = z.infer<typeof UpdateSimCardSchema>;
export type CreateReview = z.infer<typeof CreateReviewSchema>;
export type UpdateReview = z.infer<typeof UpdateReviewSchema>;
export type VoteOnReview = z.infer<typeof VoteOnReviewSchema>;
