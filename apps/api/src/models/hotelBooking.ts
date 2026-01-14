import { z } from 'zod';

/**
 * Hotel booking status enum schema
 */
export const HotelBookingStatusSchema = z.enum([
  'confirmed',
  'pending',
  'cancelled',
  'completed',
]);

/**
 * Hotel booking import source schema
 */
export const ImportSourceSchema = z.enum(['manual', 'email', 'import']);

/**
 * Hotel booking creation input schema
 */
export const CreateHotelBookingSchema = z
  .object({
    hotelName: z
      .string()
      .min(1, 'Hotel name is required')
      .max(200, 'Hotel name must be 200 characters or less'),
    itineraryId: z.string().optional(),
    address: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    checkInDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    checkOutDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    checkInTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format')
      .optional(),
    checkOutTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format')
      .optional(),
    roomType: z.string().max(100).optional(),
    roomCount: z.number().int().min(1).default(1),
    guestCount: z.number().int().min(1).optional(),
    totalPrice: z.number().min(0).optional(),
    currency: z.string().max(10).optional(),
    pricePerNight: z.number().min(0).optional(),
    confirmationNumber: z.string().max(100).optional(),
    bookingPlatform: z.string().max(100).optional(),
    bookingUrl: z.string().url().optional(),
    hotelPhone: z.string().max(50).optional(),
    hotelEmail: z.string().email().optional(),
    notes: z.string().max(2000).optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string().url()).optional(),
    status: HotelBookingStatusSchema.optional().default('confirmed'),
  })
  .refine((data) => new Date(data.checkInDate) < new Date(data.checkOutDate), {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  });

/**
 * Hotel booking update input schema
 */
export const UpdateHotelBookingSchema = z.object({
  hotelName: z.string().min(1).max(200).optional(),
  itineraryId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  checkInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkOutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  roomType: z.string().max(100).nullable().optional(),
  roomCount: z.number().int().min(1).optional(),
  guestCount: z.number().int().min(1).nullable().optional(),
  totalPrice: z.number().min(0).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  pricePerNight: z.number().min(0).nullable().optional(),
  confirmationNumber: z.string().max(100).nullable().optional(),
  bookingPlatform: z.string().max(100).nullable().optional(),
  bookingUrl: z.string().url().nullable().optional(),
  hotelPhone: z.string().max(50).nullable().optional(),
  hotelEmail: z.string().email().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  amenities: z.array(z.string()).nullable().optional(),
  images: z.array(z.string().url()).nullable().optional(),
  status: HotelBookingStatusSchema.optional(),
});

/**
 * Hotel booking list query schema
 */
export const HotelBookingListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: HotelBookingStatusSchema.optional(),
  itineraryId: z.string().optional(),
});

/**
 * Email parse input schema
 */
export const ParseEmailSchema = z.object({
  emailContent: z
    .string()
    .min(1, 'Email content is required')
    .max(50000, 'Email content too long'),
});

/**
 * Link to itinerary schema
 */
export const LinkToItinerarySchema = z.object({
  itineraryId: z.string(),
});

// Infer types from schemas
export type CreateHotelBookingInput = z.infer<typeof CreateHotelBookingSchema>;
export type UpdateHotelBookingInput = z.infer<typeof UpdateHotelBookingSchema>;
export type HotelBookingListQuery = z.infer<typeof HotelBookingListQuerySchema>;
export type HotelBookingStatus = z.infer<typeof HotelBookingStatusSchema>;
