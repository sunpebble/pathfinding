 
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';
import type * as auth from '../auth.js';
import type * as cities from '../cities.js';
import type * as crons from '../crons.js';
import type * as itineraries from '../itineraries.js';
import type * as itineraryItems from '../itineraryItems.js';
import type * as notifications from '../notifications.js';
import type * as pois from '../pois.js';
import type * as reminders from '../reminders.js';
import type * as sms from '../sms.js';
import type * as users from '../users.js';

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cities: typeof cities;
  crons: typeof crons;
  itineraries: typeof itineraries;
  itineraryItems: typeof itineraryItems;
  notifications: typeof notifications;
  pois: typeof pois;
  reminders: typeof reminders;
  sms: typeof sms;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'public'>
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, 'internal'>
>;
