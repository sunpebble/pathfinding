import { z } from 'zod';

/**
 * Transport mode enum schema
 */
export const TransportModeSchema = z.enum([
  'walking',
  'driving',
  'transit',
  'cycling',
  'taxi',
]);

/**
 * Time format regex (HH:mm)
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Itinerary item creation input schema
 */
export const CreateItineraryItemSchema = z
  .object({
    poiId: z.string().uuid('Invalid POI ID').optional(),
    orderIndex: z.number().int().min(0).optional(),
    startTime: z
      .string()
      .regex(timeRegex, 'Start time must be in HH:mm format')
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, 'End time must be in HH:mm format')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Notes must be 1000 characters or less')
      .optional(),
    transportMode: TransportModeSchema.optional().default('walking'),
    transportMinutes: z.number().int().min(0).max(1440).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * Itinerary item update input schema
 */
export const UpdateItineraryItemSchema = z
  .object({
    poiId: z.string().uuid('Invalid POI ID').optional(),
    orderIndex: z.number().int().min(0).optional(),
    startTime: z
      .string()
      .regex(timeRegex, 'Start time must be in HH:mm format')
      .optional()
      .nullable(),
    endTime: z
      .string()
      .regex(timeRegex, 'End time must be in HH:mm format')
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(1000, 'Notes must be 1000 characters or less')
      .optional(),
    transportMode: TransportModeSchema.optional(),
    transportMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

/**
 * Reorder items request schema
 */
export const ReorderItemsSchema = z.object({
  itemIds: z
    .array(z.string().uuid('Invalid item ID'))
    .min(1, 'At least one item ID required'),
});

// Infer types from schemas
export type CreateItineraryItemInput = z.infer<
  typeof CreateItineraryItemSchema
>;
export type UpdateItineraryItemInput = z.infer<
  typeof UpdateItineraryItemSchema
>;
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>;
