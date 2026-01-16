/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityFeed from '../activityFeed.js';
import type * as auth from '../auth.js';
import type * as budgets from '../budgets.js';
import type * as chargingStations from '../chargingStations.js';
import type * as chat from '../chat.js';
import type * as cities from '../cities.js';
import type * as collaboratorPresence from '../collaboratorPresence.js';
import type * as crawlJobs from '../crawlJobs.js';
import type * as crons from '../crons.js';
import type * as dataQualityReports from '../dataQualityReports.js';
import type * as editOperations from '../editOperations.js';
import type * as emergencyContacts from '../emergencyContacts.js';
import type * as emergencyServices from '../emergencyServices.js';
import type * as expenseSplitting from '../expenseSplitting.js';
import type * as favoriteCollections from '../favoriteCollections.js';
import type * as favoriteSimCards from '../favoriteSimCards.js';
import type * as flights from '../flights.js';
import type * as foodRecommendations from '../foodRecommendations.js';
import type * as healthAdvisories from '../healthAdvisories.js';
import type * as hiddenGems from '../hiddenGems.js';
import type * as hotelBookings from '../hotelBookings.js';
import type * as http from '../http.js';
import type * as insurance from '../insurance.js';
import type * as itineraries from '../itineraries.js';
import type * as itineraryCollaborators from '../itineraryCollaborators.js';
import type * as itineraryComments from '../itineraryComments.js';
import type * as itineraryDrafts from '../itineraryDrafts.js';
import type * as itineraryFavorites from '../itineraryFavorites.js';
import type * as itineraryItems from '../itineraryItems.js';
import type * as itineraryLikes from '../itineraryLikes.js';
import type * as itineraryTemplates from '../itineraryTemplates.js';
import type * as itineraryVersions from '../itineraryVersions.js';
import type * as localEvents from '../localEvents.js';
import type * as luggage from '../luggage.js';
import type * as medicalFacilities from '../medicalFacilities.js';
import type * as messaging from '../messaging.js';
import type * as noteComments from '../noteComments.js';
import type * as noteLikes from '../noteLikes.js';
import type * as notifications from '../notifications.js';
import type * as packingLists from '../packingLists.js';
import type * as phoneAuth from '../phoneAuth.js';
import type * as poiBusinessHours from '../poiBusinessHours.js';
import type * as poiPhotos from '../poiPhotos.js';
import type * as poiQA from '../poiQA.js';
import type * as poiTickets from '../poiTickets.js';
import type * as pois from '../pois.js';
import type * as rawCrawlRecords from '../rawCrawlRecords.js';
import type * as recommendedMedications from '../recommendedMedications.js';
import type * as reminders from '../reminders.js';
import type * as safety from '../safety.js';
import type * as search from '../search.js';
import type * as shareEvents from '../shareEvents.js';
import type * as simCardReviews from '../simCardReviews.js';
import type * as simCards from '../simCards.js';
import type * as sms from '../sms.js';
import type * as sosAlerts from '../sosAlerts.js';
import type * as ticketReminders from '../ticketReminders.js';
import type * as timezones from '../timezones.js';
import type * as tippingGuides from '../tippingGuides.js';
import type * as trainingDatasets from '../trainingDatasets.js';
import type * as translations from '../translations.js';
import type * as travelFootprints from '../travelFootprints.js';
import type * as travelGuides from '../travelGuides.js';
import type * as travelInsurance from '../travelInsurance.js';
import type * as travelNotes from '../travelNotes.js';
import type * as travelPartners from '../travelPartners.js';
import type * as travelStats from '../travelStats.js';
import type * as userFollows from '../userFollows.js';
import type * as userHealthChecklists from '../userHealthChecklists.js';
import type * as userPreferences from '../userPreferences.js';
import type * as users from '../users.js';
import type * as vaccineRequirements from '../vaccineRequirements.js';
import type * as verificationBadges from '../verificationBadges.js';
import type * as visaRequirements from '../visaRequirements.js';
import type * as weatherCache from '../weatherCache.js';
import type * as wifiCredentials from '../wifiCredentials.js';
import type * as wifiReviews from '../wifiReviews.js';
import type * as wifiSpots from '../wifiSpots.js';
import type * as yearlyReviews from '../yearlyReviews.js';

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';

declare const fullApi: ApiFromModules<{
  activityFeed: typeof activityFeed;
  auth: typeof auth;
  budgets: typeof budgets;
  chargingStations: typeof chargingStations;
  chat: typeof chat;
  cities: typeof cities;
  collaboratorPresence: typeof collaboratorPresence;
  crawlJobs: typeof crawlJobs;
  crons: typeof crons;
  dataQualityReports: typeof dataQualityReports;
  editOperations: typeof editOperations;
  emergencyContacts: typeof emergencyContacts;
  emergencyServices: typeof emergencyServices;
  expenseSplitting: typeof expenseSplitting;
  favoriteCollections: typeof favoriteCollections;
  favoriteSimCards: typeof favoriteSimCards;
  flights: typeof flights;
  foodRecommendations: typeof foodRecommendations;
  healthAdvisories: typeof healthAdvisories;
  hiddenGems: typeof hiddenGems;
  hotelBookings: typeof hotelBookings;
  http: typeof http;
  insurance: typeof insurance;
  itineraries: typeof itineraries;
  itineraryCollaborators: typeof itineraryCollaborators;
  itineraryComments: typeof itineraryComments;
  itineraryDrafts: typeof itineraryDrafts;
  itineraryFavorites: typeof itineraryFavorites;
  itineraryItems: typeof itineraryItems;
  itineraryLikes: typeof itineraryLikes;
  itineraryTemplates: typeof itineraryTemplates;
  itineraryVersions: typeof itineraryVersions;
  localEvents: typeof localEvents;
  luggage: typeof luggage;
  medicalFacilities: typeof medicalFacilities;
  messaging: typeof messaging;
  noteComments: typeof noteComments;
  noteLikes: typeof noteLikes;
  notifications: typeof notifications;
  packingLists: typeof packingLists;
  phoneAuth: typeof phoneAuth;
  poiBusinessHours: typeof poiBusinessHours;
  poiPhotos: typeof poiPhotos;
  poiQA: typeof poiQA;
  poiTickets: typeof poiTickets;
  pois: typeof pois;
  rawCrawlRecords: typeof rawCrawlRecords;
  recommendedMedications: typeof recommendedMedications;
  reminders: typeof reminders;
  safety: typeof safety;
  search: typeof search;
  shareEvents: typeof shareEvents;
  simCardReviews: typeof simCardReviews;
  simCards: typeof simCards;
  sms: typeof sms;
  sosAlerts: typeof sosAlerts;
  ticketReminders: typeof ticketReminders;
  timezones: typeof timezones;
  tippingGuides: typeof tippingGuides;
  trainingDatasets: typeof trainingDatasets;
  translations: typeof translations;
  travelFootprints: typeof travelFootprints;
  travelGuides: typeof travelGuides;
  travelInsurance: typeof travelInsurance;
  travelNotes: typeof travelNotes;
  travelPartners: typeof travelPartners;
  travelStats: typeof travelStats;
  userFollows: typeof userFollows;
  userHealthChecklists: typeof userHealthChecklists;
  userPreferences: typeof userPreferences;
  users: typeof users;
  vaccineRequirements: typeof vaccineRequirements;
  verificationBadges: typeof verificationBadges;
  visaRequirements: typeof visaRequirements;
  weatherCache: typeof weatherCache;
  wifiCredentials: typeof wifiCredentials;
  wifiReviews: typeof wifiReviews;
  wifiSpots: typeof wifiSpots;
  yearlyReviews: typeof yearlyReviews;
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
