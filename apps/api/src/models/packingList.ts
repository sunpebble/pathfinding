import { z } from 'zod';

/**
 * Trip type enum schema
 */
export const TripTypeSchema = z.enum([
  'leisure',
  'business',
  'adventure',
  'beach',
  'ski',
  'city',
  'hiking',
  'other',
]);

/**
 * Packing item category enum schema
 */
export const PackingCategorySchema = z.enum([
  'clothing',
  'toiletries',
  'electronics',
  'documents',
  'medicine',
  'accessories',
  'gear',
  'snacks',
  'other',
]);

/**
 * Suggestion source enum schema
 */
export const SuggestedBySchema = z.enum([
  'user',
  'weather',
  'activity',
  'template',
  'ai',
]);

/**
 * Weather info schema
 */
export const WeatherInfoSchema = z.object({
  avgTemp: z.number().optional(),
  condition: z.string().optional(),
  humidity: z.number().optional(),
  fetchedAt: z.number().optional(),
});

/**
 * Packing list creation input schema
 */
export const CreatePackingListSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  itineraryId: z.string().optional(),
  destination: z.string().max(200).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  tripType: TripTypeSchema.optional(),
  templateId: z.string().optional(),
});

/**
 * Packing list update input schema
 */
export const UpdatePackingListSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .optional(),
  destination: z.string().max(200).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  tripType: TripTypeSchema.optional().nullable(),
  isPublic: z.boolean().optional(),
  weatherInfo: WeatherInfoSchema.optional().nullable(),
});

/**
 * Packing list query schema
 */
export const PackingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Add packing item input schema
 */
export const AddPackingItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(200, 'Item name must be 200 characters or less'),
  category: PackingCategorySchema,
  quantity: z.number().int().positive().optional().default(1),
  isEssential: z.boolean().optional().default(false),
  suggestedBy: SuggestedBySchema.optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Update packing item input schema
 */
export const UpdatePackingItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: PackingCategorySchema.optional(),
  quantity: z.number().int().positive().optional(),
  isEssential: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Bulk add items schema
 */
export const BulkAddItemsSchema = z.object({
  items: z.array(AddPackingItemSchema).min(1).max(100),
});

/**
 * Create template from list schema
 */
export const CreateTemplateFromListSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(200, 'Template name must be 200 characters or less'),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional().default(false),
});

/**
 * Template query schema
 */
export const TemplateQuerySchema = z.object({
  tripType: TripTypeSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Infer types from schemas
export type TripType = z.infer<typeof TripTypeSchema>;
export type PackingCategory = z.infer<typeof PackingCategorySchema>;
export type SuggestedBy = z.infer<typeof SuggestedBySchema>;
export type WeatherInfo = z.infer<typeof WeatherInfoSchema>;
export type CreatePackingListInput = z.infer<typeof CreatePackingListSchema>;
export type UpdatePackingListInput = z.infer<typeof UpdatePackingListSchema>;
export type PackingListQuery = z.infer<typeof PackingListQuerySchema>;
export type AddPackingItemInput = z.infer<typeof AddPackingItemSchema>;
export type UpdatePackingItemInput = z.infer<typeof UpdatePackingItemSchema>;
export type BulkAddItemsInput = z.infer<typeof BulkAddItemsSchema>;
export type CreateTemplateFromListInput = z.infer<typeof CreateTemplateFromListSchema>;
export type TemplateQuery = z.infer<typeof TemplateQuerySchema>;
