/**
 * Itinerary Version Service - Convex Implementation
 * Version history management for travel itineraries
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface CreateVersionInput {
  versionNote?: string;
}

export interface UpdateVersionNoteInput {
  versionNote: string;
}

export interface RestoreVersionInput {
  createBackup?: boolean;
}

export interface CleanupVersionsInput {
  keepCount?: number;
}

/**
 * Itinerary Version service for version history operations
 */
export const ItineraryVersionService = {
  /**
   * List version history for an itinerary
   */
  async list(
    itineraryId: string,
    userId: string,
    page: number,
    pageSize: number,
    _accessToken: string
  ) {
    const result = await convex.query(api.itineraryVersions.listByItinerary, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      page,
      pageSize,
    });

    return result;
  },

  /**
   * Get a specific version with full snapshot
   */
  async getById(versionId: string, userId: string, _accessToken: string) {
    const version = await convex.query(api.itineraryVersions.getById, {
      versionId: versionId as Id<'itineraryVersions'>,
      userId,
    });

    if (!version) {
      throw new NotFoundError('Version not found');
    }

    return version;
  },

  /**
   * Compare two versions
   */
  async compare(
    versionId1: string,
    versionId2: string,
    userId: string,
    _accessToken: string
  ) {
    const comparison = await convex.query(api.itineraryVersions.compare, {
      versionId1: versionId1 as Id<'itineraryVersions'>,
      versionId2: versionId2 as Id<'itineraryVersions'>,
      userId,
    });

    return comparison;
  },

  /**
   * Create a new version (snapshot current state)
   */
  async create(
    itineraryId: string,
    userId: string,
    input: CreateVersionInput,
    _accessToken: string
  ) {
    const result = await convex.mutation(api.itineraryVersions.create, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      versionNote: input.versionNote,
    });

    return result;
  },

  /**
   * Update version note
   */
  async updateNote(
    versionId: string,
    userId: string,
    input: UpdateVersionNoteInput,
    _accessToken: string
  ) {
    const result = await convex.mutation(api.itineraryVersions.updateNote, {
      versionId: versionId as Id<'itineraryVersions'>,
      userId,
      versionNote: input.versionNote,
    });

    return result;
  },

  /**
   * Restore itinerary to a specific version
   */
  async restore(
    versionId: string,
    userId: string,
    input: RestoreVersionInput,
    _accessToken: string
  ) {
    const result = await convex.mutation(api.itineraryVersions.restore, {
      versionId: versionId as Id<'itineraryVersions'>,
      userId,
      createBackup: input.createBackup,
    });

    return result;
  },

  /**
   * Delete a specific version
   */
  async delete(versionId: string, userId: string, _accessToken: string) {
    const result = await convex.mutation(api.itineraryVersions.remove, {
      versionId: versionId as Id<'itineraryVersions'>,
      userId,
    });

    return result;
  },

  /**
   * Clean up old versions
   */
  async cleanup(
    itineraryId: string,
    userId: string,
    input: CleanupVersionsInput,
    _accessToken: string
  ) {
    const result = await convex.mutation(api.itineraryVersions.cleanup, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      keepCount: input.keepCount,
    });

    return result;
  },

  /**
   * Get version count for an itinerary
   */
  async getVersionCount(
    itineraryId: string,
    userId: string,
    _accessToken: string
  ) {
    const result = await convex.query(api.itineraryVersions.getVersionCount, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
    });

    return result;
  },
};
