import { z } from 'zod';

/**
 * Flight status enum schema
 */
export const FlightStatusSchema = z.enum([
  'scheduled',
  'delayed',
  'boarding',
  'departed',
  'in_air',
  'landed',
  'arrived',
  'cancelled',
  'diverted',
]);

/**
 * Booking status enum schema
 */
export const BookingStatusSchema = z.enum([
  'confirmed',
  'pending',
  'cancelled',
  'checked_in',
  'boarded',
  'completed',
]);

/**
 * Cabin class enum schema
 */
export const CabinClassSchema = z.enum([
  'economy',
  'premium_economy',
  'business',
  'first',
]);

/**
 * Flight lookup schema - for searching flights by number and date
 */
export const FlightLookupSchema = z.object({
  flightNumber: z
    .string()
    .min(2, 'Flight number is required')
    .max(10, 'Flight number too long')
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

/**
 * Flight search by route schema
 */
export const FlightSearchByRouteSchema = z.object({
  departureAirport: z
    .string()
    .length(3, 'Airport code must be 3 characters')
    .transform((val) => val.toUpperCase()),
  arrivalAirport: z
    .string()
    .length(3, 'Airport code must be 3 characters')
    .transform((val) => val.toUpperCase()),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * Create flight booking schema
 */
export const CreateFlightBookingSchema = z.object({
  flightNumber: z
    .string()
    .min(2, 'Flight number is required')
    .max(10, 'Flight number too long')
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  confirmationCode: z
    .string()
    .min(1, 'Confirmation code is required')
    .max(20, 'Confirmation code too long')
    .transform((val) => val.toUpperCase()),
  passengerName: z
    .string()
    .min(1, 'Passenger name is required')
    .max(100, 'Passenger name too long'),
  passengerEmail: z.string().email().optional(),
  passengerPhone: z.string().max(20).optional(),
  seatNumber: z.string().max(5).optional(),
  cabinClass: CabinClassSchema.optional().default('economy'),
  ticketNumber: z.string().max(20).optional(),
  mealPreference: z.string().max(50).optional(),
  specialRequests: z.string().max(500).optional(),
  baggageAllowance: z.string().max(50).optional(),
  frequentFlyerNumber: z.string().max(20).optional(),
  itineraryId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Update flight booking schema
 */
export const UpdateFlightBookingSchema = z.object({
  seatNumber: z.string().max(5).optional(),
  cabinClass: CabinClassSchema.optional(),
  status: BookingStatusSchema.optional(),
  mealPreference: z.string().max(50).optional(),
  specialRequests: z.string().max(500).optional(),
  frequentFlyerNumber: z.string().max(20).optional(),
  itineraryId: z.string().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Flight bookings list query schema
 */
export const FlightBookingsListQuerySchema = z.object({
  status: BookingStatusSchema.optional(),
  upcoming: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  itineraryId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * Link booking to itinerary schema
 */
export const LinkItinerarySchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
});

/**
 * Check-in schema
 */
export const CheckInSchema = z.object({
  seatNumber: z.string().max(5).optional(),
  boardingGroup: z.string().max(10).optional(),
  boardingPosition: z.number().int().positive().optional(),
});

/**
 * Parse email booking schema
 */
export const ParseEmailBookingSchema = z.object({
  emailContent: z.string().min(1, 'Email content is required'),
});

/**
 * Create flight info schema (for manual flight creation or API import)
 */
export const CreateFlightInfoSchema = z.object({
  flightNumber: z
    .string()
    .min(2)
    .max(10)
    .transform((val) => val.toUpperCase().replace(/\s/g, '')),
  airline: z.string().min(1).max(100),
  airlineCode: z
    .string()
    .min(2)
    .max(3)
    .transform((val) => val.toUpperCase()),
  departureAirport: z
    .string()
    .length(3)
    .transform((val) => val.toUpperCase()),
  departureAirportName: z.string().max(100).optional(),
  departureCity: z.string().max(50).optional(),
  departureTerminal: z.string().max(10).optional(),
  departureGate: z.string().max(10).optional(),
  arrivalAirport: z
    .string()
    .length(3)
    .transform((val) => val.toUpperCase()),
  arrivalAirportName: z.string().max(100).optional(),
  arrivalCity: z.string().max(50).optional(),
  arrivalTerminal: z.string().max(10).optional(),
  arrivalGate: z.string().max(10).optional(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  scheduledDeparture: z.number().int().positive(),
  scheduledArrival: z.number().int().positive(),
  estimatedDeparture: z.number().int().positive().optional(),
  estimatedArrival: z.number().int().positive().optional(),
  status: FlightStatusSchema.optional().default('scheduled'),
  aircraftType: z.string().max(50).optional(),
  duration: z.number().int().positive().optional(),
  distance: z.number().int().positive().optional(),
  codeshares: z.array(z.string()).optional(),
});

// Infer types from schemas
export type FlightLookup = z.infer<typeof FlightLookupSchema>;
export type FlightSearchByRoute = z.infer<typeof FlightSearchByRouteSchema>;
export type CreateFlightBooking = z.infer<typeof CreateFlightBookingSchema>;
export type UpdateFlightBooking = z.infer<typeof UpdateFlightBookingSchema>;
export type FlightBookingsListQuery = z.infer<typeof FlightBookingsListQuerySchema>;
export type LinkItinerary = z.infer<typeof LinkItinerarySchema>;
export type CheckIn = z.infer<typeof CheckInSchema>;
export type ParseEmailBooking = z.infer<typeof ParseEmailBookingSchema>;
export type CreateFlightInfo = z.infer<typeof CreateFlightInfoSchema>;
export type FlightStatus = z.infer<typeof FlightStatusSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type CabinClass = z.infer<typeof CabinClassSchema>;
