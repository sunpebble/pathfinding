import { z } from 'zod';

/**
 * Luggage status enum schema
 */
export const LuggageStatusSchema = z.enum([
  'checked_in',
  'in_transit',
  'arrived',
  'claimed',
  'delayed',
  'lost',
  'found',
  'damaged',
]);

/**
 * Luggage size enum schema
 */
export const LuggageSizeSchema = z.enum([
  'cabin',
  'medium',
  'large',
  'oversized',
]);

/**
 * Luggage creation input schema
 */
export const CreateLuggageSchema = z.object({
  flightBookingId: z.string().optional(),
  itineraryId: z.string().optional(),
  tagNumber: z
    .string()
    .max(50, 'Tag number must be 50 characters or less')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be 200 characters or less'),
  color: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  size: LuggageSizeSchema.optional(),
  weight: z.number().min(0).max(100).optional(),
  dimensions: z.string().max(50).optional(),
  features: z.array(z.string().max(100)).max(10).optional(),
  tagPhotoUrl: z.string().url().optional(),
  luggagePhotoUrls: z.array(z.string().url()).max(10).optional(),
  status: LuggageStatusSchema.optional().default('checked_in'),
  airlineCode: z.string().max(10).optional(),
  airlineName: z.string().max(100).optional(),
  airlineTrackingUrl: z.string().url().optional(),
  airlineContactPhone: z.string().max(50).optional(),
  airlineContactEmail: z.string().email().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.number().int().min(0).max(1440).optional(), // Minutes before arrival
});

/**
 * Luggage update input schema
 */
export const UpdateLuggageSchema = z.object({
  flightBookingId: z.string().nullable().optional(),
  itineraryId: z.string().nullable().optional(),
  tagNumber: z.string().max(50).nullable().optional(),
  description: z.string().min(1).max(200).optional(),
  color: z.string().max(50).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  size: LuggageSizeSchema.nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  dimensions: z.string().max(50).nullable().optional(),
  features: z.array(z.string().max(100)).max(10).nullable().optional(),
  tagPhotoUrl: z.string().url().nullable().optional(),
  luggagePhotoUrls: z.array(z.string().url()).max(10).nullable().optional(),
  status: LuggageStatusSchema.optional(),
  lastKnownLocation: z.string().max(200).nullable().optional(),
  airlineCode: z.string().max(10).nullable().optional(),
  airlineName: z.string().max(100).nullable().optional(),
  airlineTrackingUrl: z.string().url().nullable().optional(),
  airlineContactPhone: z.string().max(50).nullable().optional(),
  airlineContactEmail: z.string().email().nullable().optional(),
  reminderEnabled: z.boolean().nullable().optional(),
  reminderTime: z.number().int().min(0).max(1440).nullable().optional(),
});

/**
 * Luggage list query schema
 */
export const LuggageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: LuggageStatusSchema.optional(),
  flightBookingId: z.string().optional(),
  itineraryId: z.string().optional(),
});

/**
 * Loss report input schema
 */
export const FileLossReportSchema = z.object({
  lossReportNumber: z.string().max(100).optional(),
  lossReportNotes: z.string().max(2000).optional(),
});

/**
 * Update status input schema
 */
export const UpdateStatusSchema = z.object({
  status: LuggageStatusSchema,
  lastKnownLocation: z.string().max(200).optional(),
});

/**
 * Link to flight booking schema
 */
export const LinkToFlightBookingSchema = z.object({
  flightBookingId: z.string(),
});

/**
 * Link to itinerary schema
 */
export const LinkToItinerarySchema = z.object({
  itineraryId: z.string(),
});

/**
 * Add photos schema
 */
export const AddPhotosSchema = z.object({
  photoUrls: z.array(z.string().url()).min(1).max(10),
});

/**
 * Set tag photo schema
 */
export const SetTagPhotoSchema = z.object({
  tagPhotoUrl: z.string().url(),
});

/**
 * Loss report template schema
 */
export const LossReportTemplateSchema = z.object({
  airlineCode: z.string().min(2).max(10),
  airlineName: z.string().min(1).max(100),
  airlineNameEn: z.string().max(100).optional(),
  baggageServicePhone: z.string().max(50).optional(),
  baggageServiceEmail: z.string().email().optional(),
  baggageServiceUrl: z.string().url().optional(),
  trackingUrl: z.string().url().optional(),
  reportInstructions: z.string().max(5000).optional(),
  reportInstructionsEn: z.string().max(5000).optional(),
  requiredDocuments: z.array(z.string().max(200)).max(20).optional(),
  compensationPolicy: z.string().max(2000).optional(),
  compensationPolicyEn: z.string().max(2000).optional(),
  maxCompensationAmount: z.number().min(0).optional(),
  claimDeadlineDays: z.number().int().min(1).max(365).optional(),
});

// Infer types from schemas
export type CreateLuggageInput = z.infer<typeof CreateLuggageSchema>;
export type UpdateLuggageInput = z.infer<typeof UpdateLuggageSchema>;
export type LuggageListQuery = z.infer<typeof LuggageListQuerySchema>;
export type LuggageStatus = z.infer<typeof LuggageStatusSchema>;
export type LuggageSize = z.infer<typeof LuggageSizeSchema>;
export type FileLossReportInput = z.infer<typeof FileLossReportSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type LossReportTemplateInput = z.infer<typeof LossReportTemplateSchema>;
