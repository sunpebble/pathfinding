/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from '../auth.js';
import type * as cities from '../cities.js';
import type * as crawlJobs from '../crawlJobs.js';
import type * as http from '../http.js';
import type * as itineraries from '../itineraries.js';
import type * as itineraryItems from '../itineraryItems.js';
import type * as pois from '../pois.js';
import type * as rawCrawlRecords from '../rawCrawlRecords.js';
import type * as reminders from '../reminders.js';
import type * as travelGuides from '../travelGuides.js';

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cities: typeof cities;
  crawlJobs: typeof crawlJobs;
  http: typeof http;
  itineraries: typeof itineraries;
  itineraryItems: typeof itineraryItems;
  pois: typeof pois;
  rawCrawlRecords: typeof rawCrawlRecords;
  reminders: typeof reminders;
  travelGuides: typeof travelGuides;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>;

export declare const components: {};
