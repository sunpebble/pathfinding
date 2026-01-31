import { v } from 'convex/values';

/**
 * Deep link target for notification
 */
export const deepLinkTargetValidator = v.object({
  /** Screen/route to navigate to */
  screen: v.optional(v.string()),
  /** Route path */
  path: v.optional(v.string()),
  /** Tab to select */
  tab: v.optional(v.string()),
  /** ID of the resource */
  id: v.optional(v.string()),
});

/**
 * Itinerary-related notification data
 */
export const itineraryNotificationDataValidator = v.object({
  notificationType: v.literal('itinerary'),
  /** Itinerary ID */
  itineraryId: v.optional(v.string()),
  /** Itinerary title */
  itineraryTitle: v.optional(v.string()),
  /** Day number if specific to a day */
  dayNumber: v.optional(v.number()),
  /** Item ID if specific to an item */
  itemId: v.optional(v.string()),
  /** POI name if related to a POI */
  poiName: v.optional(v.string()),
  /** Start date of itinerary */
  startDate: v.optional(v.string()),
  /** City name */
  cityName: v.optional(v.string()),
  /** Deep link info */
  deepLink: v.optional(deepLinkTargetValidator),
});

/**
 * Social interaction notification data
 */
export const socialNotificationDataValidator = v.object({
  notificationType: v.literal('social'),
  /** Actor user ID */
  actorId: v.optional(v.string()),
  /** Actor display name */
  actorName: v.optional(v.string()),
  /** Actor avatar URL */
  actorAvatarUrl: v.optional(v.string()),
  /** Comment ID if applicable */
  commentId: v.optional(v.string()),
  /** Comment preview text */
  commentPreview: v.optional(v.string()),
  /** Target itinerary ID */
  itineraryId: v.optional(v.string()),
  /** Target itinerary title */
  itineraryTitle: v.optional(v.string()),
  /** Deep link info */
  deepLink: v.optional(deepLinkTargetValidator),
});

/**
 * Flight status notification data
 */
export const flightNotificationDataValidator = v.object({
  notificationType: v.literal('flight'),
  /** Flight number */
  flightNumber: v.optional(v.string()),
  /** Airline name */
  airline: v.optional(v.string()),
  /** Departure airport code */
  departureAirport: v.optional(v.string()),
  /** Arrival airport code */
  arrivalAirport: v.optional(v.string()),
  /** Scheduled departure time */
  scheduledDeparture: v.optional(v.number()),
  /** Actual/estimated departure time */
  actualDeparture: v.optional(v.number()),
  /** Gate information */
  gate: v.optional(v.string()),
  /** Terminal information */
  terminal: v.optional(v.string()),
  /** Flight status */
  status: v.optional(v.string()),
  /** Delay in minutes */
  delayMinutes: v.optional(v.number()),
  /** Deep link info */
  deepLink: v.optional(deepLinkTargetValidator),
});

/**
 * Weather alert notification data
 */
export const weatherNotificationDataValidator = v.object({
  notificationType: v.literal('weather'),
  /** City or location name */
  location: v.optional(v.string()),
  /** Weather condition */
  condition: v.optional(v.string()),
  /** Temperature */
  temperature: v.optional(v.number()),
  /** Temperature unit */
  temperatureUnit: v.optional(v.string()),
  /** Alert type */
  alertType: v.optional(v.string()),
  /** Alert severity */
  severity: v.optional(v.string()),
  /** Valid from timestamp */
  validFrom: v.optional(v.number()),
  /** Valid until timestamp */
  validUntil: v.optional(v.number()),
  /** Recommendations */
  recommendations: v.optional(v.array(v.string())),
  /** Deep link info */
  deepLink: v.optional(deepLinkTargetValidator),
});

/**
 * Generic notification data (for custom/other types)
 */
export const genericNotificationDataValidator = v.object({
  notificationType: v.optional(v.literal('generic')),
  /** Custom data payload */
  payload: v.optional(v.any()),
  /** Deep link info */
  deepLink: v.optional(deepLinkTargetValidator),
  /** Additional metadata */
  metadata: v.optional(v.record(v.string(), v.string())),
});

/**
 * Notification data validator (discriminated union)
 * Used for notifications.data and scheduledNotifications.data fields
 *
 * @example
 * data: notificationDataValidator
 */
export const notificationDataValidator = v.union(
  itineraryNotificationDataValidator,
  socialNotificationDataValidator,
  flightNotificationDataValidator,
  weatherNotificationDataValidator,
  genericNotificationDataValidator,
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Scheduled notification specific data
 * Extends base notification data with scheduling info
 */
export const scheduledNotificationDataValidator = v.union(
  v.object({
    /** Base notification data */
    notificationType: v.optional(v.string()),
    /** Related itinerary ID */
    itineraryId: v.optional(v.string()),
    /** Related flight booking ID */
    flightBookingId: v.optional(v.string()),
    /** Check-in URL for flights */
    checkInUrl: v.optional(v.string()),
    /** Weather location to check */
    weatherLocation: v.optional(v.string()),
    /** Destination city */
    cityName: v.optional(v.string()),
    /** Custom action to perform */
    action: v.optional(v.string()),
    /** Action parameters */
    actionParams: v.optional(v.record(v.string(), v.string())),
    /** Deep link for the notification */
    deepLink: v.optional(deepLinkTargetValidator),
    /** Retry configuration */
    retry: v.optional(
      v.object({
        maxRetries: v.optional(v.number()),
        retryDelayMs: v.optional(v.number()),
      }),
    ),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);
