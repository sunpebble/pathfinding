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
export { getPois } from './pois';
