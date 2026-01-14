import { z } from 'zod';

/**
 * POI category enum schema
 */
export const PoiCategorySchema = z.enum([
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'other',
]);

/**
 * Popularity level schema
 */
export const PopularityLevelSchema = z.enum([
  'hidden',
  'emerging',
  'moderate',
  'popular',
  'crowded',
]);

/**
 * User submitted POI status schema
 */
export const UserSubmittedPoiStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'merged',
]);

/**
 * Hidden gems list query schema
 */
export const HiddenGemsListQuerySchema = z.object({
  cityId: z.string().optional(),
  category: PoiCategorySchema.optional(),
  popularityLevel: PopularityLevelSchema.optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  onlyLocalRecommended: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * Hidden gems search query schema
 */
export const HiddenGemsSearchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  cityId: z.string().optional(),
  category: PoiCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * Local recommendation object schema
 */
export const LocalRecommendationSchema = z.object({
  isLocalRecommended: z.boolean(),
  localTips: z.string().max(1000).optional(),
  bestTimeToVisit: z.string().max(200).optional(),
  localSecrets: z.array(z.string().max(500)).max(10).optional(),
  recommendedBy: z.string().max(100).optional(),
});

/**
 * Mark POI as hidden gem schema
 */
export const MarkAsHiddenGemSchema = z.object({
  hiddenGemScore: z.number().min(0).max(1).optional(),
  popularityLevel: PopularityLevelSchema.optional(),
  localRecommendation: LocalRecommendationSchema.optional(),
});

/**
 * Submit hidden gem schema
 */
export const SubmitHiddenGemSchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  category: PoiCategorySchema,
  cityId: z.string(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().min(10).max(2000),
  localTips: z.string().max(1000).optional(),
  bestTimeToVisit: z.string().max(200).optional(),
  priceRange: z.string().max(100).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  howDiscovered: z.string().max(500).optional(),
  localSecrets: z.array(z.string().max(500)).max(10).optional(),
  avoidTimes: z.string().max(200).optional(),
});

/**
 * User submitted POIs list query schema
 */
export const UserSubmittedPoisListQuerySchema = z.object({
  cityId: z.string().optional(),
  status: UserSubmittedPoiStatusSchema.optional(),
  userId: z.string().optional(),
  category: PoiCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * Vote on user submitted POI schema
 */
export const VoteOnPoiSchema = z.object({
  voteType: z.enum(['up', 'down']),
});

/**
 * Update user submitted POI status schema (for moderation)
 */
export const UpdatePoiStatusSchema = z.object({
  status: UserSubmittedPoiStatusSchema,
  moderatorNotes: z.string().max(1000).optional(),
});

/**
 * Rate hidden gem schema
 */
export const RateHiddenGemSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
  visitDate: z.string().optional(),
  wouldRecommend: z.boolean(),
});

/**
 * Hidden gem ratings query schema
 */
export const HiddenGemRatingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Export types
export type PoiCategory = z.infer<typeof PoiCategorySchema>;
export type PopularityLevel = z.infer<typeof PopularityLevelSchema>;
export type UserSubmittedPoiStatus = z.infer<typeof UserSubmittedPoiStatusSchema>;
export type HiddenGemsListQuery = z.infer<typeof HiddenGemsListQuerySchema>;
export type HiddenGemsSearchQuery = z.infer<typeof HiddenGemsSearchQuerySchema>;
export type SubmitHiddenGem = z.infer<typeof SubmitHiddenGemSchema>;
export type RateHiddenGem = z.infer<typeof RateHiddenGemSchema>;
