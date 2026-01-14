/**
 * Hotel Booking Service - Convex Implementation
 * CRUD operations for hotel bookings
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface CreateHotelBookingInput {
  hotelName: string;
  itineraryId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  roomCount: number;
  guestCount?: number;
  totalPrice?: number;
  currency?: string;
  pricePerNight?: number;
  confirmationNumber?: string;
  bookingPlatform?: string;
  bookingUrl?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  notes?: string;
  amenities?: string[];
  images?: string[];
  status?: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

export interface UpdateHotelBookingInput {
  hotelName?: string;
  itineraryId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  roomType?: string | null;
  roomCount?: number;
  guestCount?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
  pricePerNight?: number | null;
  confirmationNumber?: string | null;
  bookingPlatform?: string | null;
  bookingUrl?: string | null;
  hotelPhone?: string | null;
  hotelEmail?: string | null;
  notes?: string | null;
  amenities?: string[] | null;
  images?: string[] | null;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'completed';
}

export interface HotelBookingListQuery {
  page: number;
  pageSize: number;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  itineraryId?: string;
}

/**
 * Hotel Booking service for CRUD operations
 */
export const HotelBookingService = {
  /**
   * Create a new hotel booking
   */
  async create(
    userId: string,
    input: CreateHotelBookingInput,
    _accessToken: string
  ) {
    const bookingId = await convex.mutation(api.hotelBookings.create, {
      userId,
      hotelName: input.hotelName,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      roomType: input.roomType,
      roomCount: input.roomCount,
      guestCount: input.guestCount,
      totalPrice: input.totalPrice,
      currency: input.currency,
      pricePerNight: input.pricePerNight,
      confirmationNumber: input.confirmationNumber,
      bookingPlatform: input.bookingPlatform,
      bookingUrl: input.bookingUrl,
      hotelPhone: input.hotelPhone,
      hotelEmail: input.hotelEmail,
      notes: input.notes,
      amenities: input.amenities,
      images: input.images,
      importSource: 'manual',
      status: input.status,
    });

    // Fetch the created booking
    const booking = await convex.query(api.hotelBookings.getById, {
      id: bookingId,
    });

    return booking;
  },

  /**
   * List hotel bookings for a user with pagination
   */
  async list(userId: string, query: HotelBookingListQuery, _accessToken: string) {
    // If itineraryId is provided, list by itinerary
    if (query.itineraryId) {
      const bookings = await convex.query(api.hotelBookings.listByItinerary, {
        itineraryId: query.itineraryId as Id<'itineraries'>,
      });
      return { data: bookings, total: bookings.length };
    }

    // Otherwise list by user
    const result = await convex.query(api.hotelBookings.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });

    return result;
  },

  /**
   * Get a single hotel booking by ID
   */
  async getById(bookingId: string, userId: string, _accessToken: string) {
    const booking = await convex.query(api.hotelBookings.getById, {
      id: bookingId as Id<'hotelBookings'>,
    });

    if (!booking) {
      throw new NotFoundError('Hotel booking not found');
    }

    // Check ownership
    if (booking.userId !== userId) {
      throw new NotFoundError('Hotel booking not found');
    }

    return booking;
  },

  /**
   * Get upcoming hotel bookings for a user
   */
  async getUpcoming(userId: string, limit: number, _accessToken: string) {
    const bookings = await convex.query(api.hotelBookings.getUpcoming, {
      userId,
      limit,
    });

    return bookings;
  },

  /**
   * Update a hotel booking
   */
  async update(
    bookingId: string,
    userId: string,
    input: UpdateHotelBookingInput,
    _accessToken: string
  ) {
    // Clean up null values to undefined for Convex
    const cleanInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== null && value !== undefined) {
        cleanInput[key] = value;
      }
    }

    const updated = await convex.mutation(api.hotelBookings.update, {
      id: bookingId as Id<'hotelBookings'>,
      userId,
      ...cleanInput,
    } as any);

    return updated;
  },

  /**
   * Delete a hotel booking
   */
  async delete(bookingId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.hotelBookings.remove, {
      id: bookingId as Id<'hotelBookings'>,
      userId,
    });
  },

  /**
   * Link booking to an itinerary
   */
  async linkToItinerary(
    bookingId: string,
    userId: string,
    itineraryId: string,
    _accessToken: string
  ) {
    const booking = await convex.mutation(api.hotelBookings.linkToItinerary, {
      id: bookingId as Id<'hotelBookings'>,
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return booking;
  },

  /**
   * Unlink booking from itinerary
   */
  async unlinkFromItinerary(
    bookingId: string,
    userId: string,
    _accessToken: string
  ) {
    const booking = await convex.mutation(api.hotelBookings.unlinkFromItinerary, {
      id: bookingId as Id<'hotelBookings'>,
      userId,
    });

    return booking;
  },

  /**
   * Update booking status
   */
  async updateStatus(
    bookingId: string,
    userId: string,
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed',
    _accessToken: string
  ) {
    const booking = await convex.mutation(api.hotelBookings.updateStatus, {
      id: bookingId as Id<'hotelBookings'>,
      userId,
      status,
    });

    return booking;
  },

  /**
   * Parse email content to extract booking details
   */
  async parseEmail(userId: string, emailContent: string, _accessToken: string) {
    const result = await convex.mutation(api.hotelBookings.parseEmailContent, {
      userId,
      emailContent,
    });

    return result;
  },
};
