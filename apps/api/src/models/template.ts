import { z } from 'zod';

/**
 * Template API Models - Zod Schemas for validation
 */

// POI type enum
export const PoiTypeSchema = z.enum([
  'attraction',
  'restaurant',
  'hotel',
  'transportation',
  'activity',
  'shopping',
]);

// Template visibility enum
export const TemplateVisibilitySchema = z.enum(['private', 'public', 'unlisted']);

// Template type enum
export const TemplateTypeSchema = z.enum(['preset', 'user']);

// Sort options
export const TemplateSortBySchema = z.enum(['popular', 'newest', 'most_used']);

// Template POI schema
export const TemplatePoiSchema = z.object({
  name: z.string().min(1),
  type: PoiTypeSchema,
  description: z.string().optional(),
  suggestedDuration: z.number().int().positive().optional(),
  suggestedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
});

// Template day schema
export const TemplateDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().optional(),
  pois: z.array(TemplatePoiSchema),
});

// Estimated budget schema
export const EstimatedBudgetSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  currency: z.string().length(3),
});

// ============================================
// Query Schemas
// ============================================

export const TemplateListQuerySchema = z.object({
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  sortBy: TemplateSortBySchema.optional().default('popular'),
});

export const TemplateSearchQuerySchema = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const UserTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const SavedTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ============================================
// Create/Update Schemas
// ============================================

export const CreateTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional(),
  categoryId: z.string(),
  daysCount: z.number().int().min(1).max(30),
  days: z.array(TemplateDaySchema).min(1),
  destinations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  estimatedBudget: EstimatedBudgetSchema.optional(),
  suitableFor: z.array(z.string()).optional(),
  bestSeasons: z.array(z.string()).optional(),
  visibility: TemplateVisibilitySchema.optional(),
});

export const UpdateTemplateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().optional(),
  daysCount: z.number().int().min(1).max(30).optional(),
  days: z.array(TemplateDaySchema).min(1).optional(),
  destinations: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  estimatedBudget: EstimatedBudgetSchema.optional().nullable(),
  suitableFor: z.array(z.string()).optional().nullable(),
  bestSeasons: z.array(z.string()).optional().nullable(),
  visibility: TemplateVisibilitySchema.optional(),
});

// Create itinerary from template
export const CreateFromTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  cityId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// Save itinerary as template
export const SaveAsTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  categoryId: z.string(),
  tags: z.array(z.string()).optional(),
  visibility: TemplateVisibilitySchema.optional(),
});

// ============================================
// Category Schemas
// ============================================

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  nameEn: z.string().max(50).optional(),
  icon: z.string().min(1),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  nameEn: z.string().max(50).optional().nullable(),
  icon: z.string().min(1).optional(),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// Type exports
// ============================================

export type TemplatePoi = z.infer<typeof TemplatePoiSchema>;
export type TemplateDay = z.infer<typeof TemplateDaySchema>;
export type EstimatedBudget = z.infer<typeof EstimatedBudgetSchema>;
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type CreateFromTemplateInput = z.infer<typeof CreateFromTemplateSchema>;
export type SaveAsTemplateInput = z.infer<typeof SaveAsTemplateSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
