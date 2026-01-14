import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  FlightLookupSchema,
  FlightSearchByRouteSchema,
  CreateFlightBookingSchema,
  UpdateFlightBookingSchema,
  FlightBookingsListQuerySchema,
  LinkItinerarySchema,
  CheckInSchema,
} from '../models/flight';
import { FlightService } from '../services/flightService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Public routes (no auth required) - for flight lookup
export const publicFlightRoutes = new Hono();

/**
 * GET /flights/lookup - Lookup flight by number and date
 * No authentication required - public flight data
 */
publicFlightRoutes.get(
  '/lookup',
  zValidator('query', FlightLookupSchema),
  async (c) => {
    const { flightNumber, date } = c.req.valid('query');

    const flight = await FlightService.lookupFlight(flightNumber, date);

    if (!flight) {
      return c.json(
        {
          success: false,
          error: 'Flight not found',
          message: `No flight found for ${flightNumber} on ${date}`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: flight,
    });
  }
);

/**
 * GET /flights/search - Search flights by route
 * No authentication required - public flight data
 */
publicFlightRoutes.get(
  '/search',
  zValidator('query', FlightSearchByRouteSchema),
  async (c) => {
    const query = c.req.valid('query');

    const { data, total } = await FlightService.searchByRoute(
      query.departureAirport,
      query.arrivalAirport,
      query.date,
      query.page,
      query.pageSize
    );

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

// Protected routes (auth required) - for booking management
export const flightRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /flights/bookings - List user's flight bookings
 */
flightRoutes.get(
  '/bookings',
  zValidator('query', FlightBookingsListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const { data, total } = await FlightService.listBookings(userId, query);

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /flights/bookings/:id - Get a specific booking
 */
flightRoutes.get('/bookings/:id', async (c) => {
  const userId = c.get('userId');
  const bookingId = c.req.param('id');

  const booking = await FlightService.getBookingById(bookingId, userId);

  return c.json({
    success: true,
    data: booking,
  });
});

/**
 * GET /flights/itinerary/:itineraryId/bookings - Get bookings for an itinerary
 */
flightRoutes.get('/itinerary/:itineraryId/bookings', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('itineraryId');

  const bookings = await FlightService.getBookingsByItinerary(
    itineraryId,
    userId
  );

  return c.json({
    success: true,
    data: bookings,
  });
});

/**
 * POST /flights/bookings - Create a new flight booking
 */
flightRoutes.post(
  '/bookings',
  zValidator('json', CreateFlightBookingSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    const { bookingId, flightInfo } = await FlightService.createBooking(
      userId,
      input
    );

    return c.json(
      {
        success: true,
        data: {
          bookingId,
          flightInfo,
        },
        message: 'Flight booking created successfully',
      },
      201
    );
  }
);

/**
 * PATCH /flights/bookings/:id - Update a flight booking
 */
flightRoutes.patch(
  '/bookings/:id',
  zValidator('json', UpdateFlightBookingSchema),
  async (c) => {
    const userId = c.get('userId');
    const bookingId = c.req.param('id');
    const input = c.req.valid('json');

    const booking = await FlightService.updateBooking(bookingId, userId, input);

    return c.json({
      success: true,
      data: booking,
    });
  }
);

/**
 * DELETE /flights/bookings/:id - Delete a flight booking
 */
flightRoutes.delete('/bookings/:id', async (c) => {
  const userId = c.get('userId');
  const bookingId = c.req.param('id');

  await FlightService.deleteBooking(bookingId, userId);

  return c.json({
    success: true,
    message: 'Booking deleted successfully',
  });
});

/**
 * POST /flights/bookings/:id/link - Link booking to an itinerary
 */
flightRoutes.post(
  '/bookings/:id/link',
  zValidator('json', LinkItinerarySchema),
  async (c) => {
    const userId = c.get('userId');
    const bookingId = c.req.param('id');
    const { itineraryId } = c.req.valid('json');

    const booking = await FlightService.linkToItinerary(
      bookingId,
      itineraryId,
      userId
    );

    return c.json({
      success: true,
      data: booking,
      message: 'Booking linked to itinerary successfully',
    });
  }
);

/**
 * POST /flights/bookings/:id/unlink - Unlink booking from itinerary
 */
flightRoutes.post('/bookings/:id/unlink', async (c) => {
  const userId = c.get('userId');
  const bookingId = c.req.param('id');

  const booking = await FlightService.unlinkFromItinerary(bookingId, userId);

  return c.json({
    success: true,
    data: booking,
    message: 'Booking unlinked from itinerary successfully',
  });
});

/**
 * POST /flights/bookings/:id/check-in - Check in for a flight
 */
flightRoutes.post(
  '/bookings/:id/check-in',
  zValidator('json', CheckInSchema),
  async (c) => {
    const userId = c.get('userId');
    const bookingId = c.req.param('id');
    const input = c.req.valid('json');

    const booking = await FlightService.checkIn(bookingId, userId, input);

    return c.json({
      success: true,
      data: booking,
      message: 'Check-in completed successfully',
    });
  }
);

/**
 * GET /flights/upcoming - Get user's upcoming flights
 */
flightRoutes.get(
  '/upcoming',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(20).optional().default(5),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { limit } = c.req.valid('query');

    const { data } = await FlightService.listBookings(userId, {
      upcoming: true,
      page: 1,
      pageSize: limit,
    });

    return c.json({
      success: true,
      data,
    });
  }
);

/**
 * GET /flights/status/:bookingId - Get flight status for a booking
 */
flightRoutes.get('/status/:bookingId', async (c) => {
  const userId = c.get('userId');
  const bookingId = c.req.param('bookingId');

  const booking = await FlightService.getBookingById(bookingId, userId);

  if (!booking.flight) {
    return c.json(
      {
        success: false,
        error: 'Flight information not available',
      },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      status: booking.flight.status,
      estimatedDeparture: booking.flight.estimatedDeparture,
      estimatedArrival: booking.flight.estimatedArrival,
      gate: booking.flight.departureGate,
      delayReason: booking.flight.delayReason,
    },
  });
});
