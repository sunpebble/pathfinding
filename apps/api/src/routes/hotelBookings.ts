import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  CreateHotelBookingSchema,
  HotelBookingListQuerySchema,
  HotelBookingStatusSchema,
  LinkToItinerarySchema,
  ParseEmailSchema,
  UpdateHotelBookingSchema,
} from '../models/hotelBooking';
import { HotelBookingService } from '../services/hotelBookingService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Protected routes (auth required)
export const hotelBookingsRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /hotel-bookings - List user's hotel bookings with pagination
 */
hotelBookingsRoutes.get(
  '/',
  zValidator('query', HotelBookingListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const { data, total } = await HotelBookingService.list(
      userId,
      query,
      accessToken
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

/**
 * GET /hotel-bookings/upcoming - Get upcoming hotel bookings
 */
hotelBookingsRoutes.get(
  '/upcoming',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(20).optional().default(5),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const { limit } = c.req.valid('query');

    const bookings = await HotelBookingService.getUpcoming(
      userId,
      limit,
      accessToken
    );

    return c.json({
      success: true,
      data: bookings,
    });
  }
);

/**
 * POST /hotel-bookings - Create a new hotel booking
 */
hotelBookingsRoutes.post(
  '/',
  zValidator('json', CreateHotelBookingSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const input = c.req.valid('json');

    const booking = await HotelBookingService.create(userId, input, accessToken);

    return c.json(
      {
        success: true,
        data: booking,
      },
      201
    );
  }
);

/**
 * POST /hotel-bookings/parse-email - Parse email content to create booking
 */
hotelBookingsRoutes.post(
  '/parse-email',
  zValidator('json', ParseEmailSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const { emailContent } = c.req.valid('json');

    const result = await HotelBookingService.parseEmail(
      userId,
      emailContent,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * GET /hotel-bookings/:id - Get hotel booking by ID
 */
hotelBookingsRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const bookingId = c.req.param('id');

  const booking = await HotelBookingService.getById(
    bookingId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: booking,
  });
});

/**
 * PATCH /hotel-bookings/:id - Update a hotel booking
 */
hotelBookingsRoutes.patch(
  '/:id',
  zValidator('json', UpdateHotelBookingSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const bookingId = c.req.param('id');
    const input = c.req.valid('json');

    const booking = await HotelBookingService.update(
      bookingId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: booking,
    });
  }
);

/**
 * DELETE /hotel-bookings/:id - Delete a hotel booking
 */
hotelBookingsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const bookingId = c.req.param('id');

  await HotelBookingService.delete(bookingId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /hotel-bookings/:id/link-itinerary - Link booking to an itinerary
 */
hotelBookingsRoutes.post(
  '/:id/link-itinerary',
  zValidator('json', LinkToItinerarySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const bookingId = c.req.param('id');
    const { itineraryId } = c.req.valid('json');

    const booking = await HotelBookingService.linkToItinerary(
      bookingId,
      userId,
      itineraryId,
      accessToken
    );

    return c.json({
      success: true,
      data: booking,
    });
  }
);

/**
 * POST /hotel-bookings/:id/unlink-itinerary - Unlink booking from itinerary
 */
hotelBookingsRoutes.post('/:id/unlink-itinerary', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const bookingId = c.req.param('id');

  const booking = await HotelBookingService.unlinkFromItinerary(
    bookingId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: booking,
  });
});

/**
 * PATCH /hotel-bookings/:id/status - Update booking status
 */
hotelBookingsRoutes.patch(
  '/:id/status',
  zValidator('json', z.object({ status: HotelBookingStatusSchema })),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const bookingId = c.req.param('id');
    const { status } = c.req.valid('json');

    const booking = await HotelBookingService.updateStatus(
      bookingId,
      userId,
      status,
      accessToken
    );

    return c.json({
      success: true,
      data: booking,
    });
  }
);
