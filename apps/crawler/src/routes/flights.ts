/**
 * Flight Routes
 * API endpoints for flight information and booking management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getFlightService } from '../services/flight.service.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('FlightRoutes');

export const flightsRouter = new Hono();

// Validation schemas
const lookupFlightSchema = z.object({
  flightNumber: z.string().min(4).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createBookingSchema = z.object({
  flightNumber: z.string().min(4).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirmationCode: z.string().min(5).max(10),
  passengerName: z.string().min(1).max(100),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  seatNumber: z.string().max(5).optional(),
  passengerEmail: z.string().email().optional(),
  passengerPhone: z.string().max(20).optional(),
  itineraryId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const parseEmailSchema = z.object({
  emailContent: z.string().min(50).max(50000),
});

const linkItinerarySchema = z.object({
  bookingId: z.string(),
  itineraryId: z.string(),
});

const listBookingsSchema = z.object({
  upcoming: z.coerce.boolean().optional(),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'checked_in', 'boarded', 'completed']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * GET /api/flights/lookup
 * Look up flight information by flight number and date
 */
flightsRouter.get(
  '/lookup',
  zValidator('query', lookupFlightSchema),
  async (c) => {
    const { flightNumber, date } = c.req.valid('query');
    const service = getFlightService();

    logger.info('Looking up flight', { flightNumber, date });

    const flightInfo = await service.lookupFlight(flightNumber, date);

    if (!flightInfo) {
      return c.json(
        {
          success: false,
          error: 'Flight not found',
          message: `Could not find flight ${flightNumber} on ${date}`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: flightInfo,
    });
  }
);

/**
 * GET /api/flights/status
 * Get current flight status
 */
flightsRouter.get(
  '/status',
  zValidator('query', lookupFlightSchema),
  async (c) => {
    const { flightNumber, date } = c.req.valid('query');
    const service = getFlightService();

    logger.info('Getting flight status', { flightNumber, date });

    const status = await service.getFlightStatus(flightNumber, date);

    if (!status) {
      return c.json(
        {
          success: false,
          error: 'Flight not found',
          message: `Could not find flight ${flightNumber} on ${date}`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: status,
    });
  }
);

/**
 * POST /api/flights/bookings
 * Create a new flight booking manually
 */
flightsRouter.post(
  '/bookings',
  zValidator('json', createBookingSchema),
  async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        401
      );
    }

    const body = c.req.valid('json');
    const service = getFlightService();

    logger.info('Creating manual booking', {
      userId,
      flightNumber: body.flightNumber,
      date: body.date,
    });

    const result = await service.createManualBooking(
      userId,
      body.flightNumber,
      body.date,
      body.confirmationCode,
      body.passengerName,
      {
        cabinClass: body.cabinClass,
        seatNumber: body.seatNumber,
        passengerEmail: body.passengerEmail,
        passengerPhone: body.passengerPhone,
        itineraryId: body.itineraryId,
        notes: body.notes,
      }
    );

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'Booking failed',
          message: 'Could not create booking. Please check the flight details.',
        },
        400
      );
    }

    return c.json({
      success: true,
      data: {
        bookingId: result.bookingId,
        flightInfo: result.flightInfo,
      },
    });
  }
);

/**
 * POST /api/flights/bookings/parse-email
 * Parse flight booking from email content
 */
flightsRouter.post(
  '/bookings/parse-email',
  zValidator('json', parseEmailSchema),
  async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        401
      );
    }

    const { emailContent } = c.req.valid('json');
    const service = getFlightService();

    logger.info('Parsing booking from email', { userId });

    // First, just parse without creating
    const parsed = service.parseBookingEmail(emailContent);

    if (!parsed) {
      return c.json(
        {
          success: false,
          error: 'Parse failed',
          message: 'Could not extract flight booking information from the email. Please ensure the email contains flight number and confirmation code.',
        },
        400
      );
    }

    return c.json({
      success: true,
      data: {
        parsed,
        message: 'Email parsed successfully. Call /bookings/import-email to create the booking.',
      },
    });
  }
);

/**
 * POST /api/flights/bookings/import-email
 * Import flight booking from email content (parse and create)
 */
flightsRouter.post(
  '/bookings/import-email',
  zValidator('json', parseEmailSchema),
  async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        401
      );
    }

    const { emailContent } = c.req.valid('json');
    const service = getFlightService();

    logger.info('Importing booking from email', { userId });

    const result = await service.createBookingFromEmail(userId, emailContent);

    if (!result) {
      return c.json(
        {
          success: false,
          error: 'Import failed',
          message: 'Could not import flight booking from the email. Please check the email content or try manual entry.',
        },
        400
      );
    }

    return c.json({
      success: true,
      data: {
        bookingId: result.bookingId,
        flightInfo: result.flightInfo,
      },
    });
  }
);

/**
 * GET /api/flights/bookings
 * List user's flight bookings
 */
flightsRouter.get(
  '/bookings',
  zValidator('query', listBookingsSchema),
  async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        401
      );
    }

    const query = c.req.valid('query');
    const service = getFlightService();

    logger.info('Listing bookings', { userId, ...query });

    const result = await service.getUserBookings(userId, {
      upcoming: query.upcoming,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    });
  }
);

/**
 * POST /api/flights/bookings/link-itinerary
 * Link a booking to an itinerary
 */
flightsRouter.post(
  '/bookings/link-itinerary',
  zValidator('json', linkItinerarySchema),
  async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        401
      );
    }

    const { bookingId, itineraryId } = c.req.valid('json');
    const service = getFlightService();

    logger.info('Linking booking to itinerary', {
      userId,
      bookingId,
      itineraryId,
    });

    const success = await service.linkBookingToItinerary(
      bookingId,
      itineraryId,
      userId
    );

    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Link failed',
          message: 'Could not link booking to itinerary. Please check the IDs.',
        },
        400
      );
    }

    return c.json({
      success: true,
      message: 'Booking linked to itinerary successfully',
    });
  }
);

/**
 * GET /api/flights/cache-stats
 * Get flight service cache statistics (for debugging)
 */
flightsRouter.get('/cache-stats', async (c) => {
  const service = getFlightService();
  const stats = service.getCacheStats();

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * POST /api/flights/clear-cache
 * Clear flight service cache (for debugging)
 */
flightsRouter.post('/clear-cache', async (c) => {
  const service = getFlightService();
  service.clearCache();

  logger.info('Flight cache cleared');

  return c.json({
    success: true,
    message: 'Cache cleared successfully',
  });
});

export default flightsRouter;
