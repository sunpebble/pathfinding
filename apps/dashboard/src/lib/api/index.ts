/**
 * Dashboard API — barrel export
 *
 * Re-exports all API sub-modules so consumers can use a single
 * import path (`@/lib/api`) while the implementation is split
 * into focused deep modules.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export { getCurrentUser, signIn, signOut, signUp } from './auth';

// ---------------------------------------------------------------------------
// Crawler backend proxy (server-side only)
// ---------------------------------------------------------------------------
export {
  fetchBackendApi,
  getBackendApiBaseUrl,
  normalizeCrawlJob,
  normalizeTravelGuide,
} from './backend';

// ---------------------------------------------------------------------------
// Client-side authenticated API transport
// ---------------------------------------------------------------------------
export {
  ApiError,
  clearStoredAuthToken,
  createApiClient,
  getStoredAuthToken,
  setStoredAuthToken,
} from './client';

export type { ApiClient } from './client';

// ---------------------------------------------------------------------------
// Collaborators
// ---------------------------------------------------------------------------
export {
  getCollaborators,
  inviteCollaborator,
  removeCollaborator,
  updateCollaborator,
} from './collaborators';

export type { InviteCollaboratorRequest } from './collaborators';

// ---------------------------------------------------------------------------
// Crawler (client-side, via Next.js proxy routes)
// ---------------------------------------------------------------------------
export {
  cancelCrawlJob,
  createCrawlJob,
  getCrawlJob,
  getCrawlJobs,
  getGuideRecommendations,
  getHealth,
  getPOI,
  getPOIs,
  getSchedulerStatus,
  getTrainingDataset,
  getTrainingDatasets,
  getTravelGuide,
  getTravelGuides,
  getTrendingGuides,
  normalizePOIs,
  searchGuides,
  startCrawlJob,
  startScheduledTask,
  stopScheduledTask,
} from './crawler';

export type {
  CrawlJob,
  CreateCrawlJobInput,
  NormalizedPOI,
  PaginatedResponse,
  SchedulerStatus,
  TrainingDataset,
  TravelGuide,
} from './crawler';

// ---------------------------------------------------------------------------
// Itineraries
// ---------------------------------------------------------------------------
export {
  createItineraryItem,
  getItineraries,
  getItinerary,
  normalizeCollaboratorsResponse,
  normalizeItinerariesResponse,
  normalizeItineraryResponse,
  removeItineraryItem,
  reorderItineraryItems,
  updateItineraryItem,
} from './itineraries';

export type {
  CreateItineraryItemInput,
  ItineraryCollaborator,
  ItineraryCollaboratorUser,
  ItineraryDay,
  ItineraryDetail,
  ItineraryItem,
  ItineraryPoi,
  ItinerarySummary,
  UpdateItineraryItemInput,
} from './itineraries';

// ---------------------------------------------------------------------------
// POIs (authenticated)
// ---------------------------------------------------------------------------
export { getPoi, getPois, searchPois, updateGuidePoiCoordinates } from './pois';

export type { UpdateGuidePoiCoordinatesInput } from './pois';
