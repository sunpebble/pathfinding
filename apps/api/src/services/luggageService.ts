/**
 * Luggage Service - Convex Implementation
 * CRUD operations for luggage tracking
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface CreateLuggageInput {
  flightBookingId?: string;
  itineraryId?: string;
  tagNumber?: string;
  description: string;
  color?: string;
  brand?: string;
  size?: 'cabin' | 'medium' | 'large' | 'oversized';
  weight?: number;
  dimensions?: string;
  features?: string[];
  tagPhotoUrl?: string;
  luggagePhotoUrls?: string[];
  status?: LuggageStatus;
  airlineCode?: string;
  airlineName?: string;
  airlineTrackingUrl?: string;
  airlineContactPhone?: string;
  airlineContactEmail?: string;
  reminderEnabled?: boolean;
  reminderTime?: number;
}

export interface UpdateLuggageInput {
  flightBookingId?: string | null;
  itineraryId?: string | null;
  tagNumber?: string | null;
  description?: string;
  color?: string | null;
  brand?: string | null;
  size?: 'cabin' | 'medium' | 'large' | 'oversized' | null;
  weight?: number | null;
  dimensions?: string | null;
  features?: string[] | null;
  tagPhotoUrl?: string | null;
  luggagePhotoUrls?: string[] | null;
  status?: LuggageStatus;
  lastKnownLocation?: string | null;
  airlineCode?: string | null;
  airlineName?: string | null;
  airlineTrackingUrl?: string | null;
  airlineContactPhone?: string | null;
  airlineContactEmail?: string | null;
  reminderEnabled?: boolean | null;
  reminderTime?: number | null;
}

export interface LuggageListQuery {
  page: number;
  pageSize: number;
  status?: LuggageStatus;
  flightBookingId?: string;
  itineraryId?: string;
}

export type LuggageStatus =
  | 'checked_in'
  | 'in_transit'
  | 'arrived'
  | 'claimed'
  | 'delayed'
  | 'lost'
  | 'found'
  | 'damaged';

/**
 * Luggage service for CRUD operations
 */
export const LuggageService = {
  /**
   * Create a new luggage entry
   */
  async create(
    userId: string,
    input: CreateLuggageInput,
    _accessToken: string
  ) {
    const luggageId = await convex.mutation(api.luggage.create, {
      userId,
      flightBookingId: input.flightBookingId as Id<'flightBookings'> | undefined,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      tagNumber: input.tagNumber,
      description: input.description,
      color: input.color,
      brand: input.brand,
      size: input.size,
      weight: input.weight,
      dimensions: input.dimensions,
      features: input.features,
      tagPhotoUrl: input.tagPhotoUrl,
      luggagePhotoUrls: input.luggagePhotoUrls,
      status: input.status,
      airlineCode: input.airlineCode,
      airlineName: input.airlineName,
      airlineTrackingUrl: input.airlineTrackingUrl,
      airlineContactPhone: input.airlineContactPhone,
      airlineContactEmail: input.airlineContactEmail,
      reminderEnabled: input.reminderEnabled,
      reminderTime: input.reminderTime,
    });

    // Fetch the created luggage
    const luggage = await convex.query(api.luggage.getById, {
      id: luggageId,
    });

    return luggage;
  },

  /**
   * List luggage for a user with pagination
   */
  async list(userId: string, query: LuggageListQuery, _accessToken: string) {
    const result = await convex.query(api.luggage.list, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      flightBookingId: query.flightBookingId as Id<'flightBookings'> | undefined,
      itineraryId: query.itineraryId as Id<'itineraries'> | undefined,
    });

    return result;
  },

  /**
   * Get a single luggage entry by ID
   */
  async getById(luggageId: string, userId: string, _accessToken: string) {
    const luggage = await convex.query(api.luggage.getById, {
      id: luggageId as Id<'luggage'>,
    });

    if (!luggage) {
      throw new NotFoundError('Luggage not found');
    }

    // Check ownership
    if (luggage.userId !== userId) {
      throw new NotFoundError('Luggage not found');
    }

    return luggage;
  },

  /**
   * Get active luggage for a user
   */
  async getActive(userId: string, limit: number, _accessToken: string) {
    const luggage = await convex.query(api.luggage.getActive, {
      userId,
      limit,
    });

    return luggage;
  },

  /**
   * Get luggage by flight booking
   */
  async getByFlightBooking(
    flightBookingId: string,
    userId: string,
    _accessToken: string
  ) {
    const luggage = await convex.query(api.luggage.getByFlightBooking, {
      flightBookingId: flightBookingId as Id<'flightBookings'>,
      userId,
    });

    return luggage;
  },

  /**
   * Get luggage by itinerary
   */
  async getByItinerary(
    itineraryId: string,
    userId: string,
    _accessToken: string
  ) {
    const luggage = await convex.query(api.luggage.getByItinerary, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
    });

    return luggage;
  },

  /**
   * Get luggage statistics
   */
  async getStats(userId: string, _accessToken: string) {
    const stats = await convex.query(api.luggage.getStats, {
      userId,
    });

    return stats;
  },

  /**
   * Update a luggage entry
   */
  async update(
    luggageId: string,
    userId: string,
    input: UpdateLuggageInput,
    _accessToken: string
  ) {
    // Clean up null values to undefined for Convex
    const cleanInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== null && value !== undefined) {
        cleanInput[key] = value;
      }
    }

    const updated = await convex.mutation(api.luggage.update, {
      id: luggageId as Id<'luggage'>,
      userId,
      ...cleanInput,
    } as any);

    return updated;
  },

  /**
   * Update luggage status
   */
  async updateStatus(
    luggageId: string,
    userId: string,
    status: LuggageStatus,
    lastKnownLocation?: string,
    _accessToken?: string
  ) {
    const updated = await convex.mutation(api.luggage.updateStatus, {
      id: luggageId as Id<'luggage'>,
      userId,
      status,
      lastKnownLocation,
    });

    return updated;
  },

  /**
   * File a loss report
   */
  async fileLossReport(
    luggageId: string,
    userId: string,
    lossReportNumber?: string,
    lossReportNotes?: string,
    _accessToken?: string
  ) {
    const updated = await convex.mutation(api.luggage.fileLossReport, {
      id: luggageId as Id<'luggage'>,
      userId,
      lossReportNumber,
      lossReportNotes,
    });

    return updated;
  },

  /**
   * Mark luggage as found
   */
  async markAsFound(
    luggageId: string,
    userId: string,
    lastKnownLocation?: string,
    _accessToken?: string
  ) {
    const updated = await convex.mutation(api.luggage.markAsFound, {
      id: luggageId as Id<'luggage'>,
      userId,
      lastKnownLocation,
    });

    return updated;
  },

  /**
   * Mark luggage as claimed
   */
  async markAsClaimed(
    luggageId: string,
    userId: string,
    _accessToken?: string
  ) {
    const updated = await convex.mutation(api.luggage.markAsClaimed, {
      id: luggageId as Id<'luggage'>,
      userId,
    });

    return updated;
  },

  /**
   * Link luggage to a flight booking
   */
  async linkToFlightBooking(
    luggageId: string,
    userId: string,
    flightBookingId: string,
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.linkToFlightBooking, {
      id: luggageId as Id<'luggage'>,
      flightBookingId: flightBookingId as Id<'flightBookings'>,
      userId,
    });

    return updated;
  },

  /**
   * Unlink luggage from flight booking
   */
  async unlinkFromFlightBooking(
    luggageId: string,
    userId: string,
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.unlinkFromFlightBooking, {
      id: luggageId as Id<'luggage'>,
      userId,
    });

    return updated;
  },

  /**
   * Link luggage to itinerary
   */
  async linkToItinerary(
    luggageId: string,
    userId: string,
    itineraryId: string,
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.linkToItinerary, {
      id: luggageId as Id<'luggage'>,
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
    });

    return updated;
  },

  /**
   * Unlink luggage from itinerary
   */
  async unlinkFromItinerary(
    luggageId: string,
    userId: string,
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.unlinkFromItinerary, {
      id: luggageId as Id<'luggage'>,
      userId,
    });

    return updated;
  },

  /**
   * Delete a luggage entry
   */
  async delete(luggageId: string, userId: string, _accessToken: string) {
    await convex.mutation(api.luggage.remove, {
      id: luggageId as Id<'luggage'>,
      userId,
    });
  },

  /**
   * Add photos to luggage
   */
  async addPhotos(
    luggageId: string,
    userId: string,
    photoUrls: string[],
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.addPhotos, {
      id: luggageId as Id<'luggage'>,
      userId,
      photoUrls,
    });

    return updated;
  },

  /**
   * Set tag photo
   */
  async setTagPhoto(
    luggageId: string,
    userId: string,
    tagPhotoUrl: string,
    _accessToken: string
  ) {
    const updated = await convex.mutation(api.luggage.setTagPhoto, {
      id: luggageId as Id<'luggage'>,
      userId,
      tagPhotoUrl,
    });

    return updated;
  },

  /**
   * Get loss report template by airline code
   */
  async getLossReportTemplate(airlineCode: string, _accessToken?: string) {
    const template = await convex.query(api.luggage.getLossReportTemplate, {
      airlineCode,
    });

    return template;
  },

  /**
   * List all loss report templates
   */
  async listLossReportTemplates(_accessToken?: string) {
    const templates = await convex.query(api.luggage.listLossReportTemplates, {});

    return templates;
  },
};
