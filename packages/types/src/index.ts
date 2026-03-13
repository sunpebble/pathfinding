export * from './api';
export * from './astronomy';
export * from './auth';
export * from './blog';
export * from './city';
// @pathfinding/types - Shared TypeScript types
export * from './itinerary';
export {
  type BatchReorderRequest,
  type CreateItineraryItemInput,
  type ItineraryItem,
  type ReorderItemsRequest,
  type UpdateItineraryItemInput,
} from './itinerary-item';
export * from './itinerary-version';
export * from './poi';
export * from './reminder';
export * from './search';
export * from './simCard';
export * from './transport';
export * from './user';

/**
 * Standardized timestamp type used across the application.
 * TODO: Migrate all createdAt/updatedAt fields to use this type.
 * Currently some interfaces use `Date` (e.g., UserProfile, City),
 * some use `number` (e.g., Itinerary.createdAt, UserTimezoneSettings),
 * and some use `string`. This type alias is a stepping stone toward
 * a unified approach.
 */
export type Timestamp = Date;
