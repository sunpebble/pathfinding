import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Pathfinding Database Schema
 * Using Convex for data storage
 * Includes Convex Auth tables
 */
export default defineSchema({
  // Include auth tables (users, sessions, accounts, etc.)
  ...authTables,

  // ============================================
  // Users / Profiles (extends auth users)
  // ============================================
  profiles: defineTable({
    // Using Convex Auth, the user ID will be handled by the auth system
    email: v.string(),
    phone: v.optional(v.string()), // For phone login
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    expoPushToken: v.optional(v.string()), // For push notifications
    // Follow statistics (denormalized for performance)
    followersCount: v.optional(v.number()),
    followingCount: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_phone', ['phone']),

  // ============================================
  // User Follows (social relationships)
  // ============================================
  userFollows: defineTable({
    followerId: v.string(), // Auth user ID of the follower
    followingId: v.string(), // Auth user ID of the user being followed
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_follower', ['followerId'])
    .index('by_following', ['followingId'])
    .index('by_follower_following', ['followerId', 'followingId']),

  // ============================================
  // Activity Feed
  // ============================================
  activityFeed: defineTable({
    // Activity metadata
    actorId: v.string(), // Auth user ID who performed the action
    actorName: v.optional(v.string()), // Denormalized for performance
    actorAvatarUrl: v.optional(v.string()), // Denormalized for performance

    // Activity type
    activityType: v.union(
      v.literal('new_itinerary'), // Created a new itinerary
      v.literal('update_itinerary'), // Updated an itinerary
      v.literal('like_itinerary'), // Liked an itinerary
      v.literal('comment_itinerary'), // Commented on an itinerary
      v.literal('copy_itinerary'), // Copied an itinerary
      v.literal('follow_user') // Followed another user
    ),

    // Target resource
    targetType: v.union(v.literal('itinerary'), v.literal('user')),
    targetId: v.string(), // ID of the target (itinerary ID or user ID)

    // Denormalized target info for performance
    targetTitle: v.optional(v.string()), // Itinerary title
    targetCoverImageUrl: v.optional(v.string()), // Itinerary cover image
    targetUserName: v.optional(v.string()), // For follow activities
    targetCityName: v.optional(v.string()), // City name for itinerary

    // Engagement metrics (for trending/recommended)
    likesCount: v.number(),
    commentsCount: v.number(),

    // Visibility
    visibility: v.union(
      v.literal('public'), // Anyone can see
      v.literal('followers') // Only followers can see
    ),

    // Timestamps
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.optional(v.number()),
  })
    .index('by_actor', ['actorId'])
    .index('by_target', ['targetType', 'targetId'])
    .index('by_type', ['activityType'])
    .index('by_visibility', ['visibility'])
    .index('by_visibility_created', ['visibility', 'createdAt'])
    .index('by_created', ['createdAt'])
    .index('by_actor_created', ['actorId', 'createdAt']),

  // ============================================
  // Reference Data
  // ============================================
  cities: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    timezone: v.string(), // IANA timezone identifier (e.g., "Asia/Shanghai", "America/New_York")
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    // Extended timezone information
    utcOffset: v.optional(v.number()), // Standard UTC offset in minutes (e.g., 480 for +08:00)
    dstOffset: v.optional(v.number()), // DST UTC offset in minutes (if applicable)
    observesDst: v.optional(v.boolean()), // Whether the city observes daylight saving time
  })
    .index('by_name', ['name'])
    .index('by_country', ['countryCode'])
    .index('by_timezone', ['timezone']),

  // ============================================
  // City Encyclopedia (City Information Wiki)
  // ============================================
  cityEncyclopedia: defineTable({
    cityId: v.id('cities'),
    // Basic Information
    basicInfo: v.optional(
      v.object({
        population: v.optional(v.number()),
        populationYear: v.optional(v.number()),
        area: v.optional(v.number()), // in square kilometers
        elevation: v.optional(v.number()), // in meters
        climate: v.optional(v.string()),
        climateEn: v.optional(v.string()),
        motto: v.optional(v.string()),
        mottoEn: v.optional(v.string()),
        nicknames: v.optional(v.array(v.string())),
        nicknamesEn: v.optional(v.array(v.string())),
      })
    ),
    // History and Culture
    history: v.optional(
      v.object({
        foundedYear: v.optional(v.number()),
        historicalNames: v.optional(v.array(v.string())),
        briefHistory: v.string(),
        briefHistoryEn: v.optional(v.string()),
        culturalHighlights: v.array(v.string()),
        culturalHighlightsEn: v.optional(v.array(v.string())),
        famousFor: v.array(v.string()),
        famousForEn: v.optional(v.array(v.string())),
        worldHeritageSites: v.optional(v.array(v.string())),
      })
    ),
    // Best Travel Time
    bestTravelTime: v.optional(
      v.object({
        seasons: v.array(
          v.union(
            v.literal('spring'),
            v.literal('summer'),
            v.literal('autumn'),
            v.literal('winter'),
            v.literal('all_year')
          )
        ),
        months: v.array(v.number()), // 1-12
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        weatherNotes: v.optional(v.string()),
        crowdLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
        ),
        priceLevel: v.optional(
          v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
        ),
      })
    ),
    // Local Customs and Taboos
    customs: v.array(
      v.object({
        category: v.union(
          v.literal('etiquette'),
          v.literal('religion'),
          v.literal('dining'),
          v.literal('dress'),
          v.literal('gift'),
          v.literal('gesture'),
          v.literal('general')
        ),
        title: v.string(),
        titleEn: v.optional(v.string()),
        description: v.string(),
        descriptionEn: v.optional(v.string()),
        isTaboo: v.boolean(),
        importance: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
      })
    ),
    // Practical Information
    practicalInfo: v.optional(
      v.object({
        voltage: v.string(),
        plugType: v.array(v.string()),
        currency: v.string(),
        currencySymbol: v.string(),
        currencyNameLocal: v.string(),
        currencyNameEn: v.string(),
        tippingCustom: v.string(),
        tippingCustomEn: v.optional(v.string()),
        waterSafety: v.union(
          v.literal('safe'),
          v.literal('boil'),
          v.literal('bottled')
        ),
        waterSafetyNote: v.optional(v.string()),
        visaRequired: v.optional(v.boolean()),
        visaNote: v.optional(v.string()),
        languageOfficial: v.array(v.string()),
        languageCommon: v.array(v.string()),
        emergencyNumber: v.string(),
        ambulanceNumber: v.string(),
        fireNumber: v.string(),
        touristHotline: v.optional(v.string()),
      })
    ),
    // Metadata
    sources: v.optional(v.array(v.string())),
    lastUpdatedAt: v.number(),
    createdAt: v.number(),
  }).index('by_city', ['cityId']),

  // ============================================
  // User Timezone Settings
  // ============================================
  userTimezoneSettings: defineTable({
    userId: v.string(), // Auth user ID
    homeTimezone: v.string(), // User's home timezone (IANA identifier)
    homeCityId: v.optional(v.id('cities')), // Optional reference to home city
    displayFormat: v.union(v.literal('12h'), v.literal('24h')), // Time display format
    showSeconds: v.boolean(),
    autoDetect: v.boolean(), // Auto-detect timezone from device
    savedClocks: v.array(
      v.object({
        cityId: v.id('cities'),
        label: v.optional(v.string()), // Custom label (e.g., "Office", "Parents")
        sortOrder: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // ============================================
  // Points of Interest (POIs)
  // ============================================
  pois: defineTable({
    externalId: v.optional(v.string()),
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: v.union(
      v.literal('attraction'),
      v.literal('restaurant'),
      v.literal('hotel'),
      v.literal('shopping'),
      v.literal('other')
    ),
    cityId: v.id('cities'),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    rating: v.optional(v.number()),
    ratingCount: v.number(),
    priceLevel: v.optional(v.number()),
    businessHours: v.optional(
      v.object({
        monday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        tuesday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        wednesday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        thursday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        friday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        saturday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        sunday: v.optional(
          v.array(v.object({ open: v.string(), close: v.string() }))
        ),
        timezone: v.optional(v.string()), // IANA timezone identifier
        notes: v.optional(v.string()), // Additional notes about hours
      })
    ),
    bestVisitTime: v.optional(
      v.object({
        recommendedTime: v.optional(v.string()), // e.g., "09:00-11:00"
        reason: v.optional(v.string()), // Why this time is recommended
        avoidTimes: v.optional(v.array(v.string())), // Times to avoid
        peakHours: v.optional(v.array(v.string())), // Peak crowd hours
        seasonalNotes: v.optional(v.string()), // Seasonal considerations
      })
    ),
    phone: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    source: v.string(),

    // Hidden Gem fields
    isHiddenGem: v.optional(v.boolean()), // Whether this is a hidden gem (off-the-beaten-path)
    hiddenGemScore: v.optional(v.number()), // 0-1 score indicating how "hidden" the POI is
    hiddenGemRating: v.optional(v.number()), // User-rated score for hidden gems (1-5)
    hiddenGemRatingCount: v.optional(v.number()), // Number of ratings for hidden gem score
    localRecommendation: v.optional(
      v.object({
        isLocalRecommended: v.boolean(), // Whether recommended by locals
        localTips: v.optional(v.string()), // Tips from locals
        bestTimeToVisit: v.optional(v.string()), // Best time recommended by locals
        localSecrets: v.optional(v.array(v.string())), // Local secrets/tips
        recommendedBy: v.optional(v.string()), // Who recommended (e.g., "local guide", "resident")
      })
    ),
    popularityLevel: v.optional(
      v.union(
        v.literal('hidden'), // Very few visitors know about it
        v.literal('emerging'), // Starting to gain popularity
        v.literal('moderate'), // Well-known locally but not to tourists
        v.literal('popular'), // Popular among tourists
        v.literal('crowded') // Very crowded, mainstream tourist spot
      )
    ),

    // Food-specific fields (for restaurant POIs)
    cuisineType: v.optional(v.string()), // e.g., "川菜", "粤菜", "日料"
    isLocalFavorite: v.optional(v.boolean()), // Whether this is a local favorite
    signatureDishes: v.optional(v.array(v.string())), // Signature dishes
    dietaryOptions: v.optional(v.array(v.string())), // e.g., "vegetarian", "halal"
    averagePrice: v.optional(v.number()), // Average price per person
  })
    .index('by_city', ['cityId'])
    .index('by_category', ['category'])
    .index('by_city_category', ['cityId', 'category'])
    .index('by_external_source', ['externalId', 'source'])
    .index('by_hidden_gem', ['isHiddenGem'])
    .index('by_city_hidden_gem', ['cityId', 'isHiddenGem'])
    .index('by_popularity_level', ['popularityLevel']),

  // ============================================
  // User Submitted POIs (Hidden Gems)
  // ============================================
  userSubmittedPois: defineTable({
    // Submitter info
    userId: v.string(), // Auth user ID who submitted

    // POI basic info
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: v.union(
      v.literal('attraction'),
      v.literal('restaurant'),
      v.literal('hotel'),
      v.literal('shopping'),
      v.literal('other')
    ),
    cityId: v.id('cities'),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),

    // User-provided details
    description: v.string(), // Why this is a hidden gem
    localTips: v.optional(v.string()), // Tips for visitors
    bestTimeToVisit: v.optional(v.string()),
    priceRange: v.optional(v.string()), // e.g., "免费", "50-100元"
    imageUrls: v.optional(v.array(v.string())),

    // Hidden gem specific
    howDiscovered: v.optional(v.string()), // How the user discovered this place
    localSecrets: v.optional(v.array(v.string())), // Insider tips
    avoidTimes: v.optional(v.string()), // Times to avoid

    // Moderation
    status: v.union(
      v.literal('pending'), // Awaiting review
      v.literal('approved'), // Approved and visible
      v.literal('rejected'), // Rejected by moderator
      v.literal('merged') // Merged into main POI table
    ),
    moderatorNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    // If merged, reference to the main POI
    mergedPoiId: v.optional(v.id('pois')),

    // Engagement
    upvotes: v.number(),
    downvotes: v.number(),
    viewCount: v.number(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_city', ['cityId'])
    .index('by_status', ['status'])
    .index('by_city_status', ['cityId', 'status'])
    .index('by_category', ['category'])
    .index('by_created', ['createdAt']),

  // ============================================
  // User Submitted POI Votes
  // ============================================
  userSubmittedPoiVotes: defineTable({
    poiId: v.id('userSubmittedPois'),
    userId: v.string(),
    voteType: v.union(v.literal('up'), v.literal('down')),
    createdAt: v.number(),
  })
    .index('by_poi', ['poiId'])
    .index('by_user', ['userId'])
    .index('by_poi_user', ['poiId', 'userId']),

  // ============================================
  // Hidden Gem Ratings
  // ============================================
  hiddenGemRatings: defineTable({
    poiId: v.id('pois'), // Reference to main POI
    userId: v.string(),
    rating: v.number(), // 1-5 rating
    review: v.optional(v.string()), // Optional review text
    visitDate: v.optional(v.string()), // When they visited
    wouldRecommend: v.boolean(), // Would recommend to others
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_poi', ['poiId'])
    .index('by_user', ['userId'])
    .index('by_poi_user', ['poiId', 'userId'])
    .index('by_rating', ['rating']),

  // ============================================
  // POI Holiday Hours
  // ============================================
  poiHolidayHours: defineTable({
    poiId: v.id('pois'),
    holidayName: v.string(), // e.g., "春节", "国庆节"
    holidayNameEn: v.optional(v.string()), // e.g., "Chinese New Year"
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    isClosed: v.boolean(), // Whether closed during this holiday
    hours: v.optional(
      v.array(
        v.object({
          open: v.string(), // HH:MM format
          close: v.string(), // HH:MM format
        })
      )
    ), // Special hours if not closed
    notes: v.optional(v.string()), // Additional notes
    isRecurring: v.boolean(), // Whether this repeats yearly
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_poi', ['poiId'])
    .index('by_poi_dates', ['poiId', 'startDate', 'endDate'])
    .index('by_dates', ['startDate', 'endDate']),

  // ============================================
  // POI Business Hours Reminders
  // ============================================
  poiBusinessHoursReminders: defineTable({
    userId: v.string(), // Auth user ID
    poiId: v.id('pois'),
    itineraryItemId: v.optional(v.id('itineraryItems')), // Optional link to itinerary item
    reminderType: v.union(
      v.literal('opening'), // Remind when POI opens
      v.literal('closing'), // Remind before POI closes
      v.literal('best_time') // Remind at best visit time
    ),
    minutesBefore: v.number(), // Minutes before the event to trigger reminder
    scheduledTime: v.number(), // Unix timestamp when reminder should trigger
    isTriggered: v.boolean(), // Whether reminder has been sent
    triggeredAt: v.optional(v.number()), // When reminder was triggered
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_poi', ['poiId'])
    .index('by_user_poi', ['userId', 'poiId'])
    .index('by_scheduled_time', ['scheduledTime'])
    .index('by_itinerary_item', ['itineraryItemId']),

  // ============================================
  // Itineraries (Travel Plans)
  // ============================================
  itineraries: defineTable({
    userId: v.string(), // Auth user ID
    title: v.string(),
    cityId: v.id('cities'),
    startDate: v.string(), // ISO date string YYYY-MM-DD
    endDate: v.string(),
    visibility: v.union(
      v.literal('private'),
      v.literal('team'),
      v.literal('public')
    ),
    coverImageUrl: v.optional(v.string()),
    copiedFromId: v.optional(v.id('itineraries')),
  })
    .index('by_user', ['userId'])
    .index('by_visibility', ['visibility'])
    .index('by_city', ['cityId'])
    .index('by_visibility_city', ['visibility', 'cityId'])
    .index('by_user_visibility', ['userId', 'visibility']),

  // ============================================
  // Itinerary Collaborators
  // ============================================
  itineraryCollaborators: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.id('itineraries'),
    role: v.union(v.literal('owner'), v.literal('editor'), v.literal('viewer')),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_user', ['userId'])
    .index('by_itinerary_user', ['itineraryId', 'userId']),

  // ============================================
  // Collaborator Presence (Real-time)
  // ============================================
  collaboratorPresence: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.id('itineraries'),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    color: v.string(), // Assigned color for cursor/selection display
    lastActiveAt: v.number(), // Unix timestamp
    isOnline: v.boolean(),
    // Current editing context
    currentDayId: v.optional(v.id('itineraryDays')),
    currentItemId: v.optional(v.id('itineraryItems')),
    cursorPosition: v.optional(
      v.object({
        field: v.string(), // Which field is being edited
        offset: v.optional(v.number()), // Cursor position in text
      })
    ),
    // Selection state for conflict detection
    selectedElements: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal('day'), v.literal('item'), v.literal('poi')),
          id: v.string(),
        })
      )
    ),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_user', ['userId'])
    .index('by_itinerary_user', ['itineraryId', 'userId'])
    .index('by_itinerary_online', ['itineraryId', 'isOnline']),

  // ============================================
  // Edit Operations (for conflict resolution)
  // ============================================
  editOperations: defineTable({
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    operationType: v.union(
      v.literal('create'),
      v.literal('update'),
      v.literal('delete'),
      v.literal('reorder')
    ),
    targetType: v.union(
      v.literal('itinerary'),
      v.literal('day'),
      v.literal('item')
    ),
    targetId: v.string(),
    changes: v.any(), // The actual changes made
    timestamp: v.number(),
    version: v.number(), // For optimistic concurrency control
    status: v.union(
      v.literal('pending'),
      v.literal('applied'),
      v.literal('conflicted'),
      v.literal('rejected')
    ),
    conflictResolution: v.optional(
      v.object({
        resolvedBy: v.string(), // userId
        resolvedAt: v.number(),
        resolution: v.union(
          v.literal('accept_mine'),
          v.literal('accept_theirs'),
          v.literal('merge')
        ),
      })
    ),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_itinerary_timestamp', ['itineraryId', 'timestamp'])
    .index('by_itinerary_status', ['itineraryId', 'status']),

  // ============================================
  // Itinerary Copy History
  // ============================================
  itineraryCopyHistory: defineTable({
    originalItineraryId: v.id('itineraries'), // Source itinerary
    copiedItineraryId: v.id('itineraries'), // New copied itinerary
    userId: v.string(), // User who performed the copy
    copyType: v.union(
      v.literal('full'), // Full copy of all days
      v.literal('partial') // Partial copy of selected days
    ),
    selectedDays: v.optional(v.array(v.number())), // Day numbers if partial copy
    originalStartDate: v.string(), // Original itinerary start date
    newStartDate: v.string(), // New itinerary start date
    dateOffset: v.number(), // Number of days offset
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_original', ['originalItineraryId'])
    .index('by_copied', ['copiedItineraryId'])
    .index('by_user_created', ['userId', 'createdAt']),

  // ============================================
  // Itinerary Days
  // ============================================
  itineraryDays: defineTable({
    itineraryId: v.id('itineraries'),
    dayNumber: v.number(),
    date: v.string(), // ISO date string YYYY-MM-DD
  }).index('by_itinerary', ['itineraryId']),

  // ============================================
  // Itinerary Items (POIs within a day)
  // ============================================
  itineraryItems: defineTable({
    dayId: v.id('itineraryDays'),
    poiId: v.id('pois'),
    orderIndex: v.number(),
    startTime: v.optional(v.string()), // HH:MM format
    endTime: v.optional(v.string()),
    transportMode: v.union(
      v.literal('walking'),
      v.literal('driving'),
      v.literal('transit'),
      v.literal('cycling'),
      v.literal('taxi')
    ),
    notes: v.optional(v.string()),
  }).index('by_day', ['dayId']),

  // ============================================
  // Reminders
  // ============================================
  reminders: defineTable({
    userId: v.string(),
    itineraryId: v.id('itineraries'),
    itemId: v.optional(v.id('itineraryItems')),
    reminderTime: v.number(), // Unix timestamp
    message: v.string(),
    isTriggered: v.boolean(),
    triggeredAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_reminder_time', ['reminderTime']),

  // ============================================
  // Crawl Jobs (Data Collection)
  // ============================================
  crawlJobs: defineTable({
    name: v.string(),
    platform: v.string(), // 'amap', 'baidu', 'openstreetmap', etc.
    jobType: v.string(), // 'full', 'incremental'
    config: v.any(), // JSONB equivalent - contains geographic_scope, categories, etc.
    scheduleCron: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
    status: v.string(), // 'pending', 'running', 'completed', 'failed', 'cancelled'
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    statistics: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()), // Number of retry attempts
    lastFailureAt: v.optional(v.number()), // Timestamp of last failure
    lastFailureReason: v.optional(v.string()), // Reason for last failure
  })
    .index('by_status', ['status'])
    .index('by_platform', ['platform']),

  // ============================================
  // Raw Crawl Records
  // ============================================
  rawCrawlRecords: defineTable({
    jobId: v.id('crawlJobs'),
    sourceUrl: v.string(),
    rawData: v.any(),
    crawledAt: v.number(),
    processingStatus: v.string(), // 'pending', 'processed', 'failed'
  })
    .index('by_job', ['jobId'])
    .index('by_job_status', ['jobId', 'processingStatus'])
    .index('by_status', ['processingStatus']),

  // ============================================
  // Normalized POIs (from crawl data)
  // ============================================
  normalizedPois: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: v.string(),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    priceLevel: v.optional(v.number()),
    businessHours: v.optional(v.any()),
    phone: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    normalizedAt: v.number(),
    confidence: v.number(), // 0-1 confidence score
    sourceMappingId: v.optional(v.id('poiSourceMappings')),
  })
    .index('by_category', ['category'])
    .index('by_confidence', ['confidence'])
    .index('by_category_confidence', ['category', 'confidence']),

  // ============================================
  // POI Tickets (门票信息)
  // ============================================
  poiTickets: defineTable({
    poiId: v.id('pois'), // 关联的景点
    // 基本门票信息
    ticketName: v.string(), // 门票名称，如 "成人票"、"学生票"
    ticketType: v.union(
      v.literal('adult'), // 成人票
      v.literal('student'), // 学生票
      v.literal('senior'), // 老人票
      v.literal('child'), // 儿童票
      v.literal('group'), // 团体票
      v.literal('family'), // 家庭票
      v.literal('vip'), // VIP票
      v.literal('free'), // 免费
      v.literal('other') // 其他
    ),
    // 价格信息
    price: v.number(), // 价格（人民币）
    originalPrice: v.optional(v.number()), // 原价（如果有折扣）
    currency: v.optional(v.string()), // 货币代码，默认 CNY
    // 优惠信息
    discountInfo: v.optional(v.string()), // 优惠说明
    discountPercentage: v.optional(v.number()), // 折扣百分比 (0-100)
    // 适用条件
    eligibilityRequirements: v.optional(v.string()), // 适用条件说明，如 "需出示学生证"
    ageRange: v.optional(
      v.object({
        minAge: v.optional(v.number()), // 最小年龄
        maxAge: v.optional(v.number()), // 最大年龄
      })
    ),
    // 有效期
    validFrom: v.optional(v.number()), // 开始生效时间 (Unix timestamp)
    validUntil: v.optional(v.number()), // 结束时间 (Unix timestamp)
    validDays: v.optional(v.number()), // 购买后有效天数
    // 购票信息
    purchaseUrl: v.optional(v.string()), // 购票链接
    purchasePlatform: v.optional(v.string()), // 购票平台，如 "携程"、"美团"、"官网"
    // 预约信息
    requiresReservation: v.boolean(), // 是否需要预约
    reservationUrl: v.optional(v.string()), // 预约链接
    reservationTips: v.optional(v.string()), // 预约提示
    advanceBookingDays: v.optional(v.number()), // 建议提前预约天数
    // 使用说明
    usageInstructions: v.optional(v.string()), // 使用说明
    includedServices: v.optional(v.array(v.string())), // 包含服务，如 ["景区入园", "导游讲解"]
    excludedServices: v.optional(v.array(v.string())), // 不包含服务
    // 状态
    isActive: v.boolean(), // 是否在售
    stockStatus: v.optional(
      v.union(
        v.literal('in_stock'), // 有票
        v.literal('low_stock'), // 少量
        v.literal('sold_out'), // 售罄
        v.literal('unknown') // 未知
      )
    ),
    // 排序和展示
    sortOrder: v.number(), // 排序顺序
    isRecommended: v.optional(v.boolean()), // 是否推荐
    // 数据来源
    source: v.optional(v.string()), // 数据来源
    lastSyncedAt: v.optional(v.number()), // 最后同步时间
    // 时间戳
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_poi', ['poiId'])
    .index('by_poi_type', ['poiId', 'ticketType'])
    .index('by_active', ['isActive'])
    .index('by_poi_active', ['poiId', 'isActive']),

  // ============================================
  // Ticket Reminders (门票预约提醒)
  // ============================================
  ticketReminders: defineTable({
    userId: v.string(), // 用户ID
    poiId: v.id('pois'), // 景点ID
    ticketId: v.optional(v.id('poiTickets')), // 关联的门票（可选）
    itineraryId: v.optional(v.id('itineraries')), // 关联的行程（可选）
    // 提醒信息
    reminderType: v.union(
      v.literal('reservation_open'), // 开放预约提醒
      v.literal('booking_reminder'), // 购票提醒
      v.literal('visit_reminder'), // 参观提醒
      v.literal('price_drop'), // 降价提醒
      v.literal('stock_available') // 有票提醒
    ),
    reminderTime: v.number(), // 提醒时间 (Unix timestamp)
    message: v.optional(v.string()), // 自定义提醒消息
    // 状态
    isTriggered: v.boolean(), // 是否已触发
    triggeredAt: v.optional(v.number()), // 触发时间
    isRead: v.boolean(), // 是否已读
    readAt: v.optional(v.number()), // 阅读时间
    // 时间戳
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_poi', ['poiId'])
    .index('by_user_poi', ['userId', 'poiId'])
    .index('by_reminder_time', ['reminderTime'])
    .index('by_triggered', ['isTriggered']),

  // ============================================
  // POI Source Mappings
  // ============================================
  poiSourceMappings: defineTable({
    normalizedPoiId: v.id('normalizedPois'),
    sourcePlatform: v.string(),
    sourceExternalId: v.string(),
    rawRecordId: v.optional(v.id('rawCrawlRecords')),
  })
    .index('by_normalized_poi', ['normalizedPoiId'])
    .index('by_source', ['sourcePlatform', 'sourceExternalId']),

  // ============================================
  // POI Reviews
  // ============================================
  poiReviews: defineTable({
    poiId: v.id('pois'),
    sourceId: v.optional(v.string()),
    authorName: v.optional(v.string()),
    content: v.string(),
    rating: v.optional(v.number()),
    visitDate: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    crawledAt: v.number(),
  })
    .index('by_poi', ['poiId'])
    .index('by_rating', ['rating']),

  // ============================================
  // Training Datasets
  // ============================================
  trainingDatasets: defineTable({
    name: v.string(),
    version: v.string(),
    generationParams: v.any(), // Geographic scope, time range, etc.
    statistics: v.optional(v.any()), // Total records, category distribution
    outputFormats: v.array(v.string()), // ['json', 'csv', 'parquet']
    storagePaths: v.any(),
    status: v.string(),
    generatedAt: v.optional(v.number()),
  })
    .index('by_name', ['name'])
    .index('by_version', ['version'])
    .index('by_status', ['status']),

  // ============================================
  // Data Quality Reports
  // ============================================
  dataQualityReports: defineTable({
    datasetId: v.optional(v.id('trainingDatasets')),
    reportType: v.string(),
    metrics: v.any(),
    issues: v.optional(v.array(v.any())),
    generatedAt: v.number(),
  }).index('by_dataset', ['datasetId']),

  // ============================================
  // Travel Guides (Crawled Content)
  // ============================================
  travelGuides: defineTable({
    sourcePlatform: v.union(
      v.literal('xiaohongshu'),
      v.literal('weibo'),
      v.literal('ctrip'),
      v.literal('douyin'),
      v.literal('tripadvisor'),
      v.literal('qunar'),
      v.literal('tongcheng'),
      v.literal('mafengwo'),
      v.literal('qyer')
    ),
    sourceExternalId: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.string()),
    destinations: v.array(v.string()),
    tags: v.array(v.string()),
    likesCount: v.number(),
    savesCount: v.number(),
    commentsCount: v.number(),
    viewsCount: v.number(),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    publishedAt: v.optional(v.number()),
    crawledAt: v.number(),
    qualityScore: v.number(), // 0-1
    contentHash: v.optional(v.string()),

    // AI Enrichment Status (for LangGraph pipeline)
    enrichmentStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      )
    ),
    enrichmentError: v.optional(v.string()),
    enrichmentStartedAt: v.optional(v.number()),

    // AI Enhanced Fields
    aiProcessedAt: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
    aiTips: v.optional(v.array(v.string())),
    aiBestTime: v.optional(v.string()),
    aiDuration: v.optional(v.string()),
    aiBudget: v.optional(v.string()),

    // Day-based Itinerary Structure
    aiDays: v.optional(
      v.array(
        v.object({
          dayNumber: v.number(),
          theme: v.optional(v.string()),
          pois: v.array(
            v.object({
              name: v.string(),
              type: v.string(),
              description: v.optional(v.string()),
              latitude: v.number(),
              longitude: v.number(),
              address: v.optional(v.string()),

              // Enhanced POI metadata
              duration: v.optional(v.string()), // 推荐停留时长，如 "1-2小时"
              priceInfo: v.optional(v.string()), // 门票/人均消费，如 "免费" "人均80元"
              openingHours: v.optional(v.string()), // 营业时间，如 "09:00-18:00"
              tips: v.optional(v.string()), // 针对该POI的特别提示
              rating: v.optional(v.number()), // 1-5 评分
              highlights: v.optional(v.array(v.string())), // 亮点/特色，如餐厅特色菜

              // Transportation to next POI
              transportToNext: v.optional(
                v.object({
                  mode: v.optional(v.string()), // walking, driving, transit, taxi
                  duration: v.optional(v.string()), // 如 "步行10分钟"
                  distance: v.optional(v.string()), // 如 "800米"
                  notes: v.optional(v.string()), // 交通备注
                })
              ),

              // Geocoding metadata (for enhanced geocoding accuracy)
              geocodeConfidence: v.optional(v.number()), // 0-1 confidence score
              geocodeSource: v.optional(v.string()), // 'amap', 'nominatim', 'overpass', 'consensus', 'manual'
              isManuallyVerified: v.optional(v.boolean()), // true if manually corrected
              verifiedAt: v.optional(v.number()), // Unix timestamp of verification
              verifiedBy: v.optional(v.string()), // User ID who verified
            })
          ),
        })
      )
    ),

    // Geocoding aggregate metrics for this guide
    geocodingMetrics: v.optional(
      v.object({
        totalPois: v.number(),
        averageConfidence: v.number(), // 0-1
        lowConfidenceCount: v.number(), // POIs with confidence < 0.5
        manuallyVerifiedCount: v.number(),
        sourceDistribution: v.optional(
          v.object({
            amap: v.optional(v.number()),
            nominatim: v.optional(v.number()),
            overpass: v.optional(v.number()),
            consensus: v.optional(v.number()),
            manual: v.optional(v.number()),
          })
        ),
        lastUpdated: v.optional(v.number()), // Unix timestamp
      })
    ),
  })
    .index('by_platform', ['sourcePlatform'])
    .index('by_platform_external', ['sourcePlatform', 'sourceExternalId'])
    .index('by_quality', ['qualityScore'])
    .index('by_destinations', ['destinations'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['destinations', 'aiProcessedAt'],
    })
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['destinations', 'aiProcessedAt'],
    }),

  // ============================================
  // Itinerary Comments
  // ============================================
  itineraryComments: defineTable({
    itineraryId: v.id('itineraries'),
    userId: v.string(), // Auth user ID
    parentId: v.optional(v.id('itineraryComments')), // For nested replies
    content: v.string(),
    likesCount: v.number(),
    repliesCount: v.number(),
    isEdited: v.boolean(),
    isDeleted: v.boolean(), // Soft delete for replies to remain visible
    reportCount: v.number(),
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.optional(v.number()),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_user', ['userId'])
    .index('by_parent', ['parentId'])
    .index('by_itinerary_created', ['itineraryId', 'createdAt']),

  // ============================================
  // Guide Comments (for Travel Guides / BlogPosts)
  // ============================================
  guideComments: defineTable({
    guideId: v.string(), // Travel guide ID (string, can be from travelGuides table)
    userId: v.string(), // Auth user ID
    parentId: v.optional(v.string()), // For nested replies (string ID)
    content: v.string(),
    likesCount: v.number(),
    repliesCount: v.number(),
    isEdited: v.boolean(),
    isDeleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_guide', ['guideId'])
    .index('by_user', ['userId'])
    .index('by_parent', ['parentId'])
    .index('by_guide_created', ['guideId', 'createdAt']),

  // ============================================
  // Guide Comment Likes
  // ============================================
  guideCommentLikes: defineTable({
    commentId: v.id('guideComments'),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_comment', ['commentId'])
    .index('by_user', ['userId'])
    .index('by_comment_user', ['commentId', 'userId']),

  // ============================================
  // Comment Likes
  // ============================================
  commentLikes: defineTable({
    commentId: v.id('itineraryComments'),
    userId: v.string(), // Auth user ID
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_comment', ['commentId'])
    .index('by_user', ['userId'])
    .index('by_comment_user', ['commentId', 'userId']),

  // ============================================
  // Comment Reports
  // ============================================
  commentReports: defineTable({
    commentId: v.id('itineraryComments'),
    userId: v.string(), // Auth user ID
    reason: v.union(
      v.literal('spam'),
      v.literal('harassment'),
      v.literal('inappropriate'),
      v.literal('misinformation'),
      v.literal('other')
    ),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('resolved'),
      v.literal('dismissed')
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
  })
    .index('by_comment', ['commentId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_comment_user', ['commentId', 'userId']),

  // ============================================
  // Notifications
  // ============================================
  notifications: defineTable({
    userId: v.string(), // Recipient user ID
    type: v.union(
      v.literal('comment'),
      v.literal('reply'),
      v.literal('like'),
      v.literal('mention'),
      v.literal('new_follower'),
      v.literal('following_itinerary'),
      // Push notification types
      v.literal('itinerary_reminder'), // Itinerary start reminder
      v.literal('flight_status'), // Flight status update
      v.literal('weather_alert'), // Weather warning for destination
      v.literal('social_interaction') // Generic social notification
    ),
    referenceType: v.union(
      v.literal('itinerary'),
      v.literal('comment'),
      v.literal('user'),
      v.literal('flight'),
      v.literal('weather')
    ),
    referenceId: v.string(), // ID of the itinerary, comment, user, or flight
    actorId: v.optional(v.string()), // User who triggered the notification (optional for system notifications)
    message: v.string(),
    title: v.optional(v.string()), // Notification title for push
    body: v.optional(v.string()), // Notification body for push
    data: v.optional(v.any()), // Additional data payload for deep linking
    isRead: v.boolean(),
    isPushSent: v.optional(v.boolean()), // Whether push notification was sent
    pushSentAt: v.optional(v.number()), // When push was sent
    priority: v.optional(
      v.union(v.literal('low'), v.literal('normal'), v.literal('high'))
    ),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_read', ['userId', 'isRead'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_type', ['type'])
    .index('by_push_pending', ['isPushSent']),

  // ============================================
  // Push Notification Tokens (Device Registration)
  // ============================================
  pushTokens: defineTable({
    userId: v.string(), // Auth user ID
    token: v.string(), // APNs device token
    platform: v.union(v.literal('ios'), v.literal('android')),
    deviceId: v.optional(v.string()), // Unique device identifier
    deviceName: v.optional(v.string()), // Device name for display
    appVersion: v.optional(v.string()), // App version
    osVersion: v.optional(v.string()), // OS version
    isActive: v.boolean(), // Whether this token is still valid
    lastUsedAt: v.number(), // Last time this token was used
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token'])
    .index('by_user_active', ['userId', 'isActive']),

  // ============================================
  // Notification Settings (User Preferences)
  // ============================================
  notificationSettings: defineTable({
    userId: v.string(), // Auth user ID
    // Global settings
    pushEnabled: v.boolean(), // Master toggle for push notifications
    emailEnabled: v.optional(v.boolean()), // Email notifications
    inAppEnabled: v.boolean(), // In-app notifications
    // Quiet hours
    quietHoursEnabled: v.optional(v.boolean()),
    quietHoursStart: v.optional(v.string()), // HH:MM format
    quietHoursEnd: v.optional(v.string()), // HH:MM format
    timezone: v.optional(v.string()), // User's timezone
    // Category-specific settings
    itineraryReminders: v.object({
      enabled: v.boolean(),
      advanceHours: v.number(), // Hours before departure to remind
    }),
    flightAlerts: v.object({
      enabled: v.boolean(),
      statusChanges: v.boolean(), // Delay, cancellation, gate changes
      checkInReminders: v.boolean(),
      boardingReminders: v.boolean(),
    }),
    weatherAlerts: v.object({
      enabled: v.boolean(),
      severeOnly: v.boolean(), // Only severe weather warnings
    }),
    socialNotifications: v.object({
      enabled: v.boolean(),
      comments: v.boolean(),
      likes: v.boolean(),
      follows: v.boolean(),
      mentions: v.boolean(),
    }),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // ============================================
  // Scheduled Notifications (for background processing)
  // ============================================
  scheduledNotifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal('itinerary_reminder'),
      v.literal('flight_checkin'),
      v.literal('flight_boarding'),
      v.literal('weather_check'),
      v.literal('custom')
    ),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    scheduledFor: v.number(), // Unix timestamp when to send
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()), // Additional payload
    status: v.union(
      v.literal('pending'),
      v.literal('sent'),
      v.literal('cancelled'),
      v.literal('failed')
    ),
    sentAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_scheduled', ['scheduledFor'])
    .index('by_status_scheduled', ['status', 'scheduledFor']),

  // ============================================
  // Itinerary Likes
  // ============================================
  itineraryLikes: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.id('itineraries'),
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_user_itinerary', ['userId', 'itineraryId']),

  // ============================================
  // Favorite Collections (Folders)
  // ============================================
  favoriteCollections: defineTable({
    userId: v.string(), // Auth user ID
    name: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isDefault: v.boolean(), // Default collection for quick saves
    sortOrder: v.number(), // For custom ordering
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_user_default', ['userId', 'isDefault'])
    .index('by_user_sort', ['userId', 'sortOrder']),

  // ============================================
  // Itinerary Favorites
  // ============================================
  itineraryFavorites: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.id('itineraries'),
    collectionId: v.optional(v.id('favoriteCollections')),
    notes: v.optional(v.string()), // User notes about this favorite
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_collection', ['collectionId'])
    .index('by_user_itinerary', ['userId', 'itineraryId'])
    .index('by_user_collection', ['userId', 'collectionId']),

  // ============================================
  // Conversations (Private Messaging)
  // ============================================
  conversations: defineTable({
    // Array of exactly two participant user IDs (sorted for consistency)
    participantIds: v.array(v.string()),
    // Last message preview for conversation list
    lastMessageText: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()), // Unix timestamp
    lastMessageSenderId: v.optional(v.string()),
  }).index('by_last_message', ['lastMessageAt']),

  // ============================================
  // Messages
  // ============================================
  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.string(), // Auth user ID
    content: v.string(),
    messageType: v.union(
      v.literal('text'),
      v.literal('image'),
      v.literal('itinerary_share')
    ),
    // Optional reference for shared content
    sharedItineraryId: v.optional(v.id('itineraries')),
    sharedImageUrl: v.optional(v.string()),
    // Timestamps
    sentAt: v.number(), // Unix timestamp
    isDeleted: v.optional(v.boolean()),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_conversation_time', ['conversationId', 'sentAt'])
    .index('by_sender', ['senderId']),

  // ============================================
  // Message Read Status
  // ============================================
  messageReadStatus: defineTable({
    conversationId: v.id('conversations'),
    userId: v.string(), // Auth user ID
    lastReadAt: v.number(), // Unix timestamp of last read
    lastReadMessageId: v.optional(v.id('messages')),
  })
    .index('by_conversation_user', ['conversationId', 'userId'])
    .index('by_user', ['userId']),

  // ============================================
  // Hotel Bookings
  // ============================================
  hotelBookings: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.optional(v.id('itineraries')), // Link to itinerary (optional)

    // Basic hotel information
    hotelName: v.string(),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    // Booking details
    checkInDate: v.string(), // ISO date string YYYY-MM-DD
    checkOutDate: v.string(), // ISO date string YYYY-MM-DD
    checkInTime: v.optional(v.string()), // HH:MM format
    checkOutTime: v.optional(v.string()), // HH:MM format

    // Room details
    roomType: v.optional(v.string()), // e.g., "大床房", "双床房", "豪华套房"
    roomCount: v.number(), // Number of rooms
    guestCount: v.optional(v.number()), // Number of guests

    // Price information
    totalPrice: v.optional(v.number()),
    currency: v.optional(v.string()), // e.g., "CNY", "USD"
    pricePerNight: v.optional(v.number()),

    // Confirmation details
    confirmationNumber: v.optional(v.string()),
    bookingPlatform: v.optional(v.string()), // e.g., "携程", "Booking.com", "Agoda"
    bookingUrl: v.optional(v.string()),

    // Contact information
    hotelPhone: v.optional(v.string()),
    hotelEmail: v.optional(v.string()),

    // Additional info
    notes: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())), // e.g., ["免费WiFi", "早餐", "停车场"]
    images: v.optional(v.array(v.string())),

    // Import source (for email parsing)
    importSource: v.optional(
      v.union(v.literal('manual'), v.literal('email'), v.literal('import'))
    ),
    rawEmailContent: v.optional(v.string()), // Original email content if imported

    // Status
    status: v.optional(
      v.union(
        v.literal('confirmed'),
        v.literal('pending'),
        v.literal('cancelled'),
        v.literal('completed')
      )
    ),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_user_dates', ['userId', 'checkInDate'])
    .index('by_status', ['status']),

  // ============================================
  // Expense Categories (Reference Data)
  // ============================================
  expenseCategories: defineTable({
    name: v.string(), // 分类名称：交通、住宿、餐饮、门票、购物、其他
    nameEn: v.string(), // English name
    icon: v.string(), // SF Symbol name
    color: v.string(), // Hex color code
    sortOrder: v.number(), // Display order
    isSystem: v.boolean(), // System default vs user-created
  }).index('by_sort_order', ['sortOrder']),

  // ============================================
  // Itinerary Budgets
  // ============================================
  itineraryBudgets: defineTable({
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    totalBudget: v.number(), // Total budget in CNY
    currency: v.string(), // Currency code, e.g., "CNY"
    categoryBudgets: v.array(
      v.object({
        categoryId: v.id('expenseCategories'),
        amount: v.number(),
      })
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.number(),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_user', ['userId']),

  // ============================================
  // Expenses (Actual Spending)
  // ============================================
  expenses: defineTable({
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    categoryId: v.id('expenseCategories'),
    amount: v.number(), // Amount in CNY
    currency: v.string(), // Currency code
    description: v.string(), // What was purchased
    date: v.string(), // ISO date string YYYY-MM-DD
    time: v.optional(v.string()), // HH:MM format
    poiId: v.optional(v.id('pois')), // Related POI if any
    dayNumber: v.optional(v.number()), // Day number in itinerary
    paymentMethod: v.optional(v.string()), // 支付方式：现金、微信、支付宝、信用卡等
    receiptImageUrl: v.optional(v.string()), // Receipt photo
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_user', ['userId'])
    .index('by_category', ['categoryId'])
    .index('by_itinerary_category', ['itineraryId', 'categoryId'])
    .index('by_date', ['date']),

  // ============================================
  // Calendar Sync
  // ============================================
  calendarSyncs: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.optional(v.id('itineraries')),
    savedItineraryLocalId: v.optional(v.string()), // Local SavedItinerary UUID (for iOS local storage)
    calendarProvider: v.union(v.literal('apple'), v.literal('google')),
    calendarId: v.optional(v.string()), // External calendar ID from provider
    calendarEventIds: v.optional(v.array(v.string())), // Event IDs created in the calendar
    syncStatus: v.union(
      v.literal('pending'),
      v.literal('synced'),
      v.literal('failed'),
      v.literal('deleted')
    ),
    lastSyncedAt: v.optional(v.number()), // Unix timestamp
    syncError: v.optional(v.string()),
    // Sync configuration
    enableReminders: v.boolean(),
    reminderMinutesBefore: v.optional(v.number()), // Default reminder time
    syncAllDays: v.boolean(), // Sync all days or specific days
    syncedDayNumbers: v.optional(v.array(v.number())), // If not syncAllDays, which days
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_local_itinerary', ['savedItineraryLocalId'])
    .index('by_user_itinerary', ['userId', 'itineraryId'])
    .index('by_user_local_itinerary', ['userId', 'savedItineraryLocalId'])
    .index('by_status', ['syncStatus']),

  // ============================================
  // Guide Recommendations
  // ============================================
  guideRecommendations: defineTable({
    userId: v.string(),
    guideId: v.id('travelGuides'),
    score: v.number(), // 0-1
    reason: v.optional(v.string()),
    isDismissed: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_guide', ['userId', 'guideId'])
    .index('by_score', ['score']),

  // ============================================
  // Visited Cities (Travel Footprints)
  // ============================================
  visitedCities: defineTable({
    userId: v.string(), // Auth user ID
    cityName: v.string(),
    cityNameEn: v.optional(v.string()),
    countryCode: v.string(), // ISO 3166-1 alpha-2
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    visitedAt: v.number(), // First visit timestamp
    firstVisitedAt: v.optional(v.number()),
    lastVisitedAt: v.optional(v.number()),
    visitCount: v.optional(v.number()), // Number of visits
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    rating: v.optional(v.number()), // 1-5 rating
    travelGuideId: v.optional(v.id('travelGuides')),
    itineraryId: v.optional(v.id('itineraries')),
    createdAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_city', ['userId', 'cityName'])
    .index('by_user_country', ['userId', 'countryCode'])
    .index('by_country', ['countryCode']),

  // ============================================
  // Visited Countries (Aggregated)
  // ============================================
  visitedCountries: defineTable({
    userId: v.string(), // Auth user ID
    countryCode: v.string(), // ISO 3166-1 alpha-2
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    citiesCount: v.number(), // Number of cities visited in this country
    firstVisitedAt: v.number(),
    lastVisitedAt: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_country', ['userId', 'countryCode'])
    .index('by_country', ['countryCode']),

  // ============================================
  // Travel Statistics
  // ============================================
  travelStats: defineTable({
    userId: v.string(), // Auth user ID
    totalCities: v.number(),
    totalCountries: v.number(),
    totalTrips: v.number(),
    totalDistance: v.number(), // km
    totalDays: v.optional(v.number()), // Total days traveled
    totalExpenses: v.optional(v.number()), // Total expenses in default currency
    mostVisitedCity: v.optional(
      v.object({
        name: v.string(),
        count: v.number(),
      })
    ),
    mostVisitedCountry: v.optional(
      v.object({
        name: v.string(),
        count: v.number(),
      })
    ),
    firstTripDate: v.optional(v.number()),
    lastTripDate: v.optional(v.number()),
    goalCities: v.optional(v.number()), // Target number of cities
    goalCountries: v.optional(v.number()), // Target number of countries
    nextGoalCity: v.optional(
      v.object({
        cityName: v.string(),
        countryCode: v.string(),
        countryName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        plannedDate: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    yearlyStats: v.optional(v.any()), // { "2024": { cities: 5, countries: 2 } }
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // ============================================
  // Insurance Products (保险产品)
  // ============================================
  insuranceProducts: defineTable({
    // Basic product info
    name: v.string(),
    nameEn: v.optional(v.string()),
    provider: v.string(), // Insurance company name
    providerLogo: v.optional(v.string()),

    // Product type
    type: v.union(
      v.literal('comprehensive'), // 综合旅行险
      v.literal('medical'), // 医疗险
      v.literal('accident'), // 意外险
      v.literal('flight_delay'), // 航班延误险
      v.literal('luggage'), // 行李险
      v.literal('cancellation'), // 取消险
      v.literal('emergency_evacuation') // 紧急救援险
    ),

    // Coverage details
    coverageAmount: v.number(), // Maximum coverage in CNY
    coverageDetails: v.array(
      v.object({
        item: v.string(), // Coverage item name
        amount: v.number(), // Coverage amount in CNY
        description: v.optional(v.string()),
      })
    ),

    // Pricing
    pricePerDay: v.number(), // Price per day in CNY
    minDays: v.number(), // Minimum coverage days
    maxDays: v.number(), // Maximum coverage days

    // Applicable regions
    applicableRegions: v.array(v.string()), // Country codes or region names
    domesticOnly: v.boolean(), // Only for domestic travel

    // Risk level coverage
    riskLevelCoverage: v.array(
      v.union(
        v.literal('low'), // Safe destinations
        v.literal('medium'), // Standard destinations
        v.literal('high'), // Adventure/high-risk activities
        v.literal('extreme') // Extreme sports/war zones
      )
    ),

    // Features
    features: v.array(v.string()), // Key features like "24小时救援", "中文客服"
    exclusions: v.optional(v.array(v.string())), // What's not covered

    // Rating and reviews
    rating: v.optional(v.number()), // 1-5
    reviewCount: v.number(),

    // Purchase info
    purchaseUrl: v.string(), // External purchase link
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),

    // Status
    isActive: v.boolean(),
    priority: v.number(), // For sorting recommendations

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_type', ['type'])
    .index('by_provider', ['provider'])
    .index('by_active', ['isActive'])
    .index('by_domestic', ['domesticOnly'])
    .index('by_priority', ['priority']),

  // ============================================
  // User Insurance (用户购买的保险)
  // ============================================
  userInsurance: defineTable({
    userId: v.string(), // Auth user ID
    productId: v.id('insuranceProducts'),
    itineraryId: v.optional(v.id('itineraries')), // Optional linked itinerary

    // Coverage period
    startDate: v.string(), // ISO date string YYYY-MM-DD
    endDate: v.string(),
    coverageDays: v.number(),

    // Destinations
    destinations: v.array(v.string()), // Country/city names

    // Insured persons
    insuredPersons: v.array(
      v.object({
        name: v.string(),
        idType: v.union(
          v.literal('id_card'), // 身份证
          v.literal('passport'), // 护照
          v.literal('other')
        ),
        idNumber: v.string(),
        phone: v.optional(v.string()),
        relationship: v.union(
          v.literal('self'), // 本人
          v.literal('spouse'), // 配偶
          v.literal('child'), // 子女
          v.literal('parent'), // 父母
          v.literal('other')
        ),
      })
    ),

    // Order details
    orderNumber: v.optional(v.string()), // Insurance company order number
    policyNumber: v.optional(v.string()), // Policy number
    totalPrice: v.number(), // Total price paid in CNY
    paymentStatus: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('refunded'),
      v.literal('failed')
    ),

    // Status
    status: v.union(
      v.literal('pending'), // Waiting for coverage to start
      v.literal('active'), // Currently covered
      v.literal('expired'), // Coverage ended
      v.literal('cancelled'), // User cancelled
      v.literal('claimed') // Claim filed
    ),

    // Claim info
    claimHistory: v.optional(
      v.array(
        v.object({
          claimId: v.string(),
          claimDate: v.number(), // Unix timestamp
          claimType: v.string(),
          claimAmount: v.number(),
          status: v.union(
            v.literal('submitted'),
            v.literal('processing'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('paid')
          ),
          notes: v.optional(v.string()),
        })
      )
    ),

    // Notes
    notes: v.optional(v.string()),

    // Timestamps
    purchasedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_product', ['productId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status']),

  // ============================================
  // Destination Risk Profiles (目的地风险等级)
  // ============================================
  destinationRiskProfiles: defineTable({
    destination: v.string(), // Country or region name
    destinationCode: v.optional(v.string()), // Country code like CN, JP, US
    riskLevel: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('extreme')
    ),
    riskFactors: v.array(v.string()), // Risk factors description
    recommendedInsuranceTypes: v.array(
      v.union(
        v.literal('comprehensive'),
        v.literal('medical'),
        v.literal('accident'),
        v.literal('flight_delay'),
        v.literal('luggage'),
        v.literal('cancellation'),
        v.literal('emergency_evacuation')
      )
    ),
    travelAdvisory: v.optional(v.string()), // Travel advisory notes
    lastUpdated: v.number(),
  })
    .index('by_destination', ['destination'])
    .index('by_code', ['destinationCode'])
    .index('by_risk_level', ['riskLevel']),

  // ============================================
  // Insurance Claim Guides (理赔指南)
  // ============================================
  insuranceClaimGuides: defineTable({
    title: v.string(),
    claimType: v.union(
      v.literal('medical'), // 医疗理赔
      v.literal('accident'), // 意外理赔
      v.literal('flight_delay'), // 航班延误理赔
      v.literal('luggage_loss'), // 行李丢失理赔
      v.literal('trip_cancellation'), // 行程取消理赔
      v.literal('emergency_evacuation'), // 紧急救援理赔
      v.literal('other')
    ),
    content: v.string(), // Markdown content
    steps: v.array(
      v.object({
        stepNumber: v.number(),
        title: v.string(),
        description: v.string(),
        requiredDocuments: v.optional(v.array(v.string())),
        tips: v.optional(v.string()),
      })
    ),
    requiredDocuments: v.array(v.string()), // Required documents list
    timeLimit: v.optional(v.string()), // Time limit for filing claim
    contactInfo: v.optional(
      v.object({
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),
    faqs: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        })
      )
    ),
    isActive: v.boolean(),
    priority: v.number(), // For sorting
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_claim_type', ['claimType'])
    .index('by_active', ['isActive'])
    .index('by_priority', ['priority']),

  // ============================================
  // Chat Sessions (AI Travel Assistant)
  // ============================================
  chatSessions: defineTable({
    userId: v.string(), // Auth user ID
    title: v.string(), // Session title (auto-generated or user-defined)
    itineraryId: v.optional(v.id('itineraries')), // Optional linked itinerary
    guideId: v.optional(v.id('travelGuides')), // Optional linked travel guide
    context: v.optional(v.string()), // Additional context (destination, preferences)
    messageCount: v.number(),
    lastMessageAt: v.number(), // Unix timestamp
    isArchived: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_archived', ['userId', 'isArchived'])
    .index('by_user_last_message', ['userId', 'lastMessageAt'])
    .index('by_itinerary', ['itineraryId']),

  // ============================================
  // Chat Messages
  // ============================================
  chatMessages: defineTable({
    sessionId: v.id('chatSessions'),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    // Structured data for rich responses
    metadata: v.optional(
      v.object({
        // POI recommendations
        pois: v.optional(
          v.array(
            v.object({
              name: v.string(),
              type: v.string(),
              description: v.optional(v.string()),
              latitude: v.optional(v.number()),
              longitude: v.optional(v.number()),
              address: v.optional(v.string()),
              rating: v.optional(v.number()),
              priceInfo: v.optional(v.string()),
            })
          )
        ),
        // Itinerary modification suggestions
        itineraryChanges: v.optional(
          v.array(
            v.object({
              action: v.string(), // 'add', 'remove', 'reorder', 'modify'
              dayNumber: v.optional(v.number()),
              poiName: v.optional(v.string()),
              details: v.optional(v.string()),
            })
          )
        ),
        // Quick action buttons
        quickActions: v.optional(
          v.array(
            v.object({
              label: v.string(),
              action: v.string(), // 'search_poi', 'modify_itinerary', 'get_tips', etc.
              payload: v.optional(v.string()),
            })
          )
        ),
        // Source references
        sources: v.optional(v.array(v.string())),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_created', ['sessionId', 'createdAt']),

  // ============================================
  // Tipping Guides (小费指南)
  // ============================================
  tippingGuides: defineTable({
    countryCode: v.string(), // ISO 3166-1 alpha-2 code (e.g., 'US', 'JP', 'CN')
    countryName: v.string(), // Display name in Chinese (e.g., '美国', '日本')
    countryNameEn: v.optional(v.string()), // English name (e.g., 'United States')
    currency: v.string(), // Currency code (e.g., 'USD', 'JPY')
    currencySymbol: v.string(), // Currency symbol (e.g., '$', '¥')
    tippingCulture: v.union(
      v.literal('expected'), // 小费是社会规范，几乎必须
      v.literal('appreciated'), // 小费受欢迎但非必须
      v.literal('optional'), // 可给可不给
      v.literal('not_expected'), // 不期待小费
      v.literal('offensive') // 给小费可能被视为冒犯
    ),
    cultureSummary: v.string(), // 小费文化简要说明
    scenarios: v.array(
      v.object({
        type: v.union(
          v.literal('restaurant'), // 餐厅
          v.literal('hotel'), // 酒店
          v.literal('taxi'), // 出租车
          v.literal('bar'), // 酒吧
          v.literal('spa'), // 水疗/按摩
          v.literal('tour'), // 旅游向导
          v.literal('delivery'), // 外卖/快递
          v.literal('hairdresser'), // 理发店
          v.literal('other') // 其他
        ),
        typeName: v.string(), // 场景中文名称 (e.g., '餐厅')
        minPercentage: v.number(), // 最低小费百分比
        maxPercentage: v.number(), // 最高小费百分比
        suggestedPercentage: v.number(), // 建议小费百分比
        fixedAmount: v.optional(v.number()), // 固定金额（适用于某些场景）
        notes: v.optional(v.string()), // 特别说明
      })
    ),
    tips: v.optional(v.array(v.string())), // 小费相关的旅行提示
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_country_code', ['countryCode'])
    .index('by_tipping_culture', ['tippingCulture']),

  // ============================================
  // Travel Blog Posts
  // ============================================
  travelBlogPosts: defineTable({
    sourcePlatform: v.string(),
    sourceExternalId: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    authorName: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    crawledAt: v.number(),
  })
    .index('by_platform', ['sourcePlatform'])
    .index('by_platform_external', ['sourcePlatform', 'sourceExternalId']),

  // ============================================
  // Emergency Contacts (Personal contacts)
  // ============================================
  emergencyContacts: defineTable({
    userId: v.string(), // Auth user ID
    name: v.string(), // Contact name
    relationship: v.string(), // e.g., "spouse", "parent", "friend", "other"
    phoneNumber: v.string(), // Phone number (international format)
    email: v.optional(v.string()), // Optional email
    isPrimary: v.boolean(), // Is this the primary emergency contact
    notifyOnSos: v.boolean(), // Should be notified on SOS
    notes: v.optional(v.string()), // Additional notes
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_user_primary', ['userId', 'isPrimary']),

  // ============================================
  // Emergency Services (By country/city)
  // ============================================
  emergencyServices: defineTable({
    countryCode: v.string(), // ISO 3166-1 alpha-2 (e.g., "CN", "JP", "US")
    countryName: v.string(), // Country name in Chinese
    countryNameEn: v.optional(v.string()), // Country name in English
    cityName: v.optional(v.string()), // Optional city name for city-specific numbers
    // Emergency numbers
    policeNumber: v.string(), // Police emergency number
    ambulanceNumber: v.string(), // Medical emergency number
    fireNumber: v.string(), // Fire emergency number
    generalEmergencyNumber: v.optional(v.string()), // General emergency (if different)
    // Embassy/Consulate info
    embassyPhone: v.optional(v.string()), // Chinese embassy phone
    embassyAddress: v.optional(v.string()), // Embassy address
    embassyWebsite: v.optional(v.string()), // Embassy website
    consulateInfo: v.optional(
      v.array(
        v.object({
          city: v.string(),
          phone: v.string(),
          address: v.optional(v.string()),
        })
      )
    ), // List of consulates
    // Additional services
    touristPoliceNumber: v.optional(v.string()), // Tourist police if available
    coastGuardNumber: v.optional(v.string()), // Coast guard
    roadAssistanceNumber: v.optional(v.string()), // Road assistance
    poisonControlNumber: v.optional(v.string()), // Poison control
    // Metadata
    notes: v.optional(v.string()), // Important notes for travelers
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_country', ['countryCode'])
    .index('by_country_city', ['countryCode', 'cityName']),

  // ============================================
  // Travel Insurance (User's insurance info)
  // ============================================
  travelInsurance: defineTable({
    userId: v.string(), // Auth user ID
    providerName: v.string(), // Insurance company name
    policyNumber: v.string(), // Policy number
    // Coverage dates
    startDate: v.string(), // ISO date YYYY-MM-DD
    endDate: v.string(), // ISO date YYYY-MM-DD
    // Contact information
    emergencyHotline: v.string(), // 24h emergency hotline
    claimsPhone: v.optional(v.string()), // Claims department phone
    email: v.optional(v.string()), // Contact email
    website: v.optional(v.string()), // Provider website
    // Coverage details
    coverageType: v.string(), // e.g., "comprehensive", "medical_only", "trip_cancellation"
    coverageAmount: v.optional(v.string()), // Coverage amount description
    medicalCoverage: v.optional(v.string()), // Medical coverage amount
    evacuationCoverage: v.optional(v.string()), // Medical evacuation coverage
    // Documents
    policyDocumentUrl: v.optional(v.string()), // URL to policy document
    insuranceCardUrl: v.optional(v.string()), // URL to insurance card image
    // Additional info
    coveredRegions: v.optional(v.array(v.string())), // List of covered regions/countries
    exclusions: v.optional(v.string()), // Important exclusions to note
    notes: v.optional(v.string()), // User notes
    isActive: v.boolean(), // Is this insurance currently active
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.number(), // Unix timestamp
  })
    .index('by_user', ['userId'])
    .index('by_user_active', ['userId', 'isActive']),

  // ============================================
  // SOS Alerts (Emergency alerts sent by users)
  // ============================================
  sosAlerts: defineTable({
    userId: v.string(), // Auth user ID
    // Location at time of SOS
    latitude: v.number(),
    longitude: v.number(),
    locationName: v.optional(v.string()), // Reverse geocoded location name
    accuracy: v.optional(v.number()), // Location accuracy in meters
    // Alert details
    alertType: v.union(
      v.literal('emergency'),
      v.literal('medical'),
      v.literal('safety'),
      v.literal('other')
    ),
    message: v.optional(v.string()), // Optional user message
    // Status tracking
    status: v.union(
      v.literal('sent'),
      v.literal('received'),
      v.literal('resolved'),
      v.literal('cancelled')
    ),
    // Notifications
    notifiedContacts: v.array(v.id('emergencyContacts')), // Contacts who were notified
    // Timestamps
    createdAt: v.number(), // When alert was created
    resolvedAt: v.optional(v.number()), // When alert was resolved
    resolvedBy: v.optional(v.string()), // Who resolved the alert
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_status', ['status']),

  // ============================================
  // Safety Ratings (Destination Safety Levels)
  // ============================================
  safetyRatings: defineTable({
    // Location identification
    destinationName: v.string(), // e.g., "Paris", "Tokyo"
    destinationNameEn: v.optional(v.string()),
    countryCode: v.string(), // ISO 3166-1 alpha-2
    cityId: v.optional(v.id('cities')), // Link to cities table if available

    // Overall safety rating (1-5 scale)
    overallRating: v.number(), // 1=Very Dangerous, 2=Dangerous, 3=Moderate, 4=Safe, 5=Very Safe

    // Category ratings (1-5 scale)
    crimeRating: v.number(), // Personal safety from crime
    healthRating: v.number(), // Healthcare and disease risks
    naturalDisasterRating: v.number(), // Earthquake, flood, etc.
    transportRating: v.number(), // Road and transport safety
    womenSafetyRating: v.optional(v.number()), // Safety for solo female travelers
    lgbtqSafetyRating: v.optional(v.number()), // Safety for LGBTQ+ travelers

    // Descriptive information
    summary: v.string(), // Brief safety summary
    summaryEn: v.optional(v.string()),
    generalTips: v.array(v.string()), // General safety tips
    emergencyNumbers: v.optional(
      v.object({
        police: v.optional(v.string()),
        ambulance: v.optional(v.string()),
        fire: v.optional(v.string()),
        touristHotline: v.optional(v.string()),
      })
    ),

    // Data source and metadata
    source: v.string(), // 'official', 'user_contributed', 'ai_generated'
    sourceUrl: v.optional(v.string()),
    lastVerifiedAt: v.number(), // Unix timestamp
    verifiedBy: v.optional(v.string()), // Admin user ID

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_destination', ['destinationName'])
    .index('by_country', ['countryCode'])
    .index('by_city', ['cityId'])
    .index('by_overall_rating', ['overallRating']),

  // ============================================
  // Safety Alerts (Travel Warnings)
  // ============================================
  safetyAlerts: defineTable({
    // Location
    destinationName: v.string(),
    countryCode: v.string(),
    cityId: v.optional(v.id('cities')),
    affectedAreas: v.optional(v.array(v.string())), // Specific areas affected

    // Alert details
    alertType: v.union(
      v.literal('travel_advisory'), // Government travel advisory
      v.literal('health_warning'), // Disease outbreak, health emergency
      v.literal('natural_disaster'), // Earthquake, typhoon, flood
      v.literal('civil_unrest'), // Protests, political instability
      v.literal('terrorism'), // Terrorism threat
      v.literal('crime_spike'), // Increased crime activity
      v.literal('scam_warning'), // Tourist scam alerts
      v.literal('other')
    ),

    // Severity levels
    severity: v.union(
      v.literal('info'), // Informational
      v.literal('low'), // Exercise normal precautions
      v.literal('medium'), // Exercise increased caution
      v.literal('high'), // Reconsider travel
      v.literal('critical') // Do not travel
    ),

    // Content
    title: v.string(),
    titleEn: v.optional(v.string()),
    description: v.string(),
    descriptionEn: v.optional(v.string()),
    recommendations: v.array(v.string()), // What to do
    avoidAreas: v.optional(v.array(v.string())), // Areas to avoid

    // Validity period
    startDate: v.number(), // Unix timestamp when alert becomes active
    endDate: v.optional(v.number()), // Unix timestamp when alert expires (null = ongoing)
    isActive: v.boolean(),

    // Source information
    source: v.string(), // 'government', 'embassy', 'news', 'user_report', 'ai'
    sourceUrl: v.optional(v.string()),
    officialAdvisoryLevel: v.optional(v.string()), // e.g., "Level 2: Exercise Increased Caution"

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()), // Admin/user ID
  })
    .index('by_destination', ['destinationName'])
    .index('by_country', ['countryCode'])
    .index('by_city', ['cityId'])
    .index('by_type', ['alertType'])
    .index('by_severity', ['severity'])
    .index('by_active', ['isActive'])
    .index('by_active_destination', ['isActive', 'destinationName']),

  // ============================================
  // Danger Zones (Specific Dangerous Areas)
  // ============================================
  dangerZones: defineTable({
    // Location
    destinationName: v.string(),
    countryCode: v.string(),
    cityId: v.optional(v.id('cities')),

    // Zone details
    zoneName: v.string(), // e.g., "Red Light District", "Border Area"
    zoneNameEn: v.optional(v.string()),

    // Geographic boundaries (polygon or center point with radius)
    latitude: v.number(),
    longitude: v.number(),
    radiusMeters: v.optional(v.number()), // For circular zones
    polygon: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        })
      )
    ), // For complex shapes

    // Danger classification
    dangerLevel: v.union(
      v.literal('caution'), // Be careful
      v.literal('avoid_night'), // Avoid at night
      v.literal('avoid_alone'), // Don't go alone
      v.literal('high_risk'), // High risk area
      v.literal('no_go') // Do not enter
    ),

    dangerTypes: v.array(
      v.union(
        v.literal('crime'),
        v.literal('scam'),
        v.literal('traffic'),
        v.literal('natural_hazard'),
        v.literal('political'),
        v.literal('health'),
        v.literal('other')
      )
    ),

    // Description
    description: v.string(),
    descriptionEn: v.optional(v.string()),
    precautions: v.array(v.string()), // Safety precautions for this area

    // Timing (some areas are only dangerous at certain times)
    dangerousTimes: v.optional(
      v.object({
        allDay: v.boolean(),
        nightOnly: v.optional(v.boolean()), // After dark
        specificHours: v.optional(v.string()), // e.g., "22:00-06:00"
        specificDays: v.optional(v.array(v.string())), // e.g., ["Friday", "Saturday"]
      })
    ),

    // Source and verification
    source: v.string(), // 'official', 'local_knowledge', 'user_report', 'news'
    reportCount: v.number(), // Number of user reports
    lastReportedAt: v.optional(v.number()),
    isVerified: v.boolean(),
    verifiedBy: v.optional(v.string()),

    // Status
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_destination', ['destinationName'])
    .index('by_country', ['countryCode'])
    .index('by_city', ['cityId'])
    .index('by_danger_level', ['dangerLevel'])
    .index('by_active', ['isActive'])
    .index('by_location', ['latitude', 'longitude']),

  // ============================================
  // WiFi Spots (Public WiFi Hotspots)
  // ============================================
  wifiSpots: defineTable({
    // Basic Information
    name: v.string(),
    nameEn: v.optional(v.string()),
    type: v.union(
      v.literal('hotel'),
      v.literal('restaurant'),
      v.literal('cafe'),
      v.literal('airport'),
      v.literal('train_station'),
      v.literal('shopping_mall'),
      v.literal('library'),
      v.literal('coworking'),
      v.literal('public'),
      v.literal('other')
    ),

    // Location
    cityId: v.id('cities'),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),

    // WiFi Details
    ssid: v.optional(v.string()),
    requiresPassword: v.boolean(),
    isFree: v.boolean(),
    speedMbps: v.optional(v.number()), // Average speed in Mbps
    openingHours: v.optional(v.string()), // When WiFi is available

    // Quality Metrics (aggregated from reviews)
    averageRating: v.number(), // 1-5 scale
    ratingCount: v.number(),

    // Content
    description: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),

    // Related POI (if this WiFi is at a known POI)
    poiId: v.optional(v.id('pois')),

    // Moderation
    isVerified: v.boolean(),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    submittedBy: v.string(), // User who submitted this spot

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_city', ['cityId'])
    .index('by_type', ['type'])
    .index('by_city_type', ['cityId', 'type'])
    .index('by_poi', ['poiId'])
    .index('by_verified', ['isVerified'])
    .index('by_rating', ['averageRating']),

  // ============================================
  // WiFi Credentials (User-saved WiFi passwords)
  // ============================================
  wifiCredentials: defineTable({
    userId: v.string(), // Auth user ID

    // Link to WiFi spot (optional - can be standalone)
    wifiSpotId: v.optional(v.id('wifiSpots')),

    // WiFi Details
    name: v.string(), // User-friendly name
    ssid: v.string(),
    password: v.string(), // Encrypted in production
    securityType: v.optional(
      v.union(
        v.literal('open'),
        v.literal('wep'),
        v.literal('wpa'),
        v.literal('wpa2'),
        v.literal('wpa3'),
        v.literal('unknown')
      )
    ),

    // Location (for standalone credentials not linked to a spot)
    locationName: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    // User notes
    notes: v.optional(v.string()),

    // Sharing settings
    isShared: v.boolean(), // Whether to share with community

    // Usage tracking
    lastUsedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_spot', ['userId', 'wifiSpotId'])
    .index('by_spot_shared', ['wifiSpotId', 'isShared']),

  // ============================================
  // WiFi Reviews (User quality ratings)
  // ============================================
  wifiReviews: defineTable({
    userId: v.string(), // Auth user ID
    wifiSpotId: v.id('wifiSpots'),

    // Quality ratings (1-5 scale)
    speedRating: v.number(),
    stabilityRating: v.number(),
    easeOfAccessRating: v.number(), // How easy to connect
    overallRating: v.number(),

    // Optional details
    comment: v.optional(v.string()),
    speedTestResult: v.optional(v.number()), // Actual speed in Mbps
    connectionTime: v.optional(v.string()), // How long they used it
    deviceType: v.optional(v.string()), // Phone, laptop, etc.
    visitDate: v.optional(v.string()), // When they visited

    // Engagement
    helpfulCount: v.number(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_spot', ['wifiSpotId'])
    .index('by_user', ['userId'])
    .index('by_user_spot', ['userId', 'wifiSpotId'])
    .index('by_rating', ['overallRating']),

  // ============================================
  // WiFi Review Helpful (Tracks who found reviews helpful)
  // ============================================
  wifiReviewHelpful: defineTable({
    reviewId: v.id('wifiReviews'),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_review', ['reviewId'])
    .index('by_user', ['userId'])
    .index('by_review_user', ['reviewId', 'userId']),

  // ============================================
  // Safety Incident Reports (User Reports)
  // ============================================
  safetyIncidentReports: defineTable({
    // Reporter
    userId: v.string(), // Auth user ID
    isAnonymous: v.boolean(),

    // Location
    destinationName: v.string(),
    countryCode: v.string(),
    cityId: v.optional(v.id('cities')),
    specificLocation: v.optional(v.string()), // Address or landmark
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    // Incident details
    incidentType: v.union(
      v.literal('theft'),
      v.literal('assault'),
      v.literal('scam'),
      v.literal('harassment'),
      v.literal('traffic_accident'),
      v.literal('natural_disaster'),
      v.literal('health_issue'),
      v.literal('police_issue'),
      v.literal('other')
    ),

    severity: v.union(
      v.literal('minor'), // Inconvenience
      v.literal('moderate'), // Significant impact
      v.literal('severe'), // Serious harm
      v.literal('critical') // Life-threatening
    ),

    // Content
    title: v.string(),
    description: v.string(),
    incidentDate: v.number(), // When the incident occurred

    // Outcome
    wasPoliceInvolved: v.optional(v.boolean()),
    wasResolved: v.optional(v.boolean()),
    resolutionNotes: v.optional(v.string()),

    // Moderation
    status: v.union(
      v.literal('pending'), // Awaiting review
      v.literal('verified'), // Verified by admin
      v.literal('rejected'), // Rejected as invalid
      v.literal('resolved') // Issue has been resolved
    ),
    moderatorNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    // Engagement
    helpfulCount: v.number(), // Users who found this helpful
    reportCount: v.number(), // Users who reported this as inappropriate

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_destination', ['destinationName'])
    .index('by_country', ['countryCode'])
    .index('by_city', ['cityId'])
    .index('by_type', ['incidentType'])
    .index('by_status', ['status'])
    .index('by_date', ['incidentDate']),

  // ============================================
  // EV Charging Stations (电动车充电站)
  // ============================================
  chargingStations: defineTable({
    // Basic Information
    externalId: v.optional(v.string()), // External platform ID
    name: v.string(),
    nameEn: v.optional(v.string()),
    operatorName: v.optional(v.string()), // 运营商名称 (e.g., 特来电, 星星充电, 国家电网)
    operatorId: v.optional(v.string()),

    // Location
    address: v.string(),
    cityId: v.optional(v.id('cities')),
    latitude: v.number(),
    longitude: v.number(),

    // Station Details
    stationType: v.union(
      v.literal('public'), // 公共充电站
      v.literal('private'), // 私人充电站
      v.literal('destination'), // 目的地充电站 (商场、酒店等)
      v.literal('highway') // 高速服务区充电站
    ),
    totalPorts: v.number(), // 总充电桩数量
    availablePorts: v.number(), // 可用充电桩数量

    // Charger Types
    chargerTypes: v.array(
      v.object({
        type: v.union(
          v.literal('ac_slow'), // 交流慢充 (7kW)
          v.literal('ac_fast'), // 交流快充 (22kW)
          v.literal('dc_fast'), // 直流快充 (50-150kW)
          v.literal('dc_superfast') // 直流超快充 (150kW+)
        ),
        powerKw: v.number(), // 功率 (kW)
        count: v.number(), // 该类型数量
        available: v.number(), // 该类型可用数量
        connectorType: v.optional(v.string()), // 接口类型 (GB/T, CCS, CHAdeMO, Tesla)
      })
    ),

    // Pricing
    pricingInfo: v.optional(
      v.object({
        electricityPrice: v.optional(v.number()), // 电费 (元/kWh)
        serviceFee: v.optional(v.number()), // 服务费 (元/kWh)
        parkingFee: v.optional(v.number()), // 停车费 (元/小时)
        peakPrice: v.optional(v.number()), // 峰时电价
        valleyPrice: v.optional(v.number()), // 谷时电价
        flatPrice: v.optional(v.number()), // 平时电价
        pricingNotes: v.optional(v.string()), // 价格说明
      })
    ),

    // Operating Hours
    operatingHours: v.optional(v.string()), // 营业时间 (e.g., "24小时" or "08:00-22:00")
    is24Hours: v.boolean(),

    // Amenities
    amenities: v.optional(
      v.array(
        v.union(
          v.literal('restroom'), // 卫生间
          v.literal('convenience_store'), // 便利店
          v.literal('restaurant'), // 餐厅
          v.literal('wifi'), // WiFi
          v.literal('lounge'), // 休息室
          v.literal('car_wash'), // 洗车
          v.literal('covered'), // 有顶棚
          v.literal('lighting'), // 照明
          v.literal('security') // 安保
        )
      )
    ),

    // Status
    status: v.union(
      v.literal('operational'), // 正常运营
      v.literal('maintenance'), // 维护中
      v.literal('offline'), // 离线
      v.literal('coming_soon') // 即将开放
    ),
    lastStatusUpdate: v.optional(v.number()), // 状态更新时间

    // Ratings & Reviews
    rating: v.optional(v.number()), // 1-5 评分
    ratingCount: v.optional(v.number()),
    reviewCount: v.optional(v.number()),

    // Contact
    phone: v.optional(v.string()),
    website: v.optional(v.string()),

    // Images
    imageUrls: v.optional(v.array(v.string())),

    // Data Source
    source: v.string(), // 数据来源 (amap, baidu, evstation, etc.)
    sourceUrl: v.optional(v.string()),
    crawledAt: v.number(),
    updatedAt: v.optional(v.number()),

    // Payment Methods
    paymentMethods: v.optional(
      v.array(
        v.union(
          v.literal('app'), // APP支付
          v.literal('wechat'), // 微信支付
          v.literal('alipay'), // 支付宝
          v.literal('card'), // 刷卡
          v.literal('membership') // 会员卡
        )
      )
    ),

    // Supported Vehicle Brands (if applicable)
    supportedBrands: v.optional(v.array(v.string())), // 支持的车型品牌
  })
    .index('by_city', ['cityId'])
    .index('by_status', ['status'])
    .index('by_operator', ['operatorName'])
    .index('by_type', ['stationType'])
    .index('by_source', ['source'])
    .index('by_external', ['externalId', 'source'])
    .index('by_city_status', ['cityId', 'status']),

  // ============================================
  // Charging Station Reviews
  // ============================================
  chargingStationReviews: defineTable({
    stationId: v.id('chargingStations'),
    userId: v.optional(v.string()), // Auth user ID (optional for crawled reviews)
    authorName: v.optional(v.string()),
    content: v.string(),
    rating: v.number(), // 1-5
    chargerType: v.optional(v.string()), // 使用的充电桩类型
    chargingDuration: v.optional(v.number()), // 充电时长 (分钟)
    energyCharged: v.optional(v.number()), // 充电量 (kWh)
    totalCost: v.optional(v.number()), // 总费用 (元)
    vehicleModel: v.optional(v.string()), // 车型
    visitDate: v.optional(v.string()), // 访问日期
    pros: v.optional(v.array(v.string())), // 优点
    cons: v.optional(v.array(v.string())), // 缺点
    imageUrls: v.optional(v.array(v.string())),
    isVerified: v.boolean(), // 是否已验证
    createdAt: v.number(),
  })
    .index('by_station', ['stationId'])
    .index('by_user', ['userId'])
    .index('by_rating', ['rating'])
    .index('by_station_rating', ['stationId', 'rating']),

  // ============================================
  // User Favorite Charging Stations
  // ============================================
  favoriteChargingStations: defineTable({
    userId: v.string(),
    stationId: v.id('chargingStations'),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_station', ['stationId'])
    .index('by_user_station', ['userId', 'stationId']),

  // ============================================
  // SIM Cards / Data Plans (电话卡/流量卡)
  // ============================================
  simCards: defineTable({
    // Basic Information
    name: v.string(), // 产品名称
    nameEn: v.optional(v.string()), // English name
    provider: v.string(), // 运营商/供应商 (e.g., 中国移动, Airalo, Holafly)
    providerLogo: v.optional(v.string()), // Provider logo URL

    // Card Type
    cardType: v.union(
      v.literal('physical'), // 实体SIM卡
      v.literal('esim'), // eSIM
      v.literal('wifi_device') // 随身WiFi设备
    ),

    // Coverage
    destinations: v.array(v.string()), // 支持的国家/地区代码 (ISO 3166-1 alpha-2)
    destinationNames: v.optional(v.array(v.string())), // 国家/地区名称
    coverageType: v.union(
      v.literal('single_country'), // 单国
      v.literal('regional'), // 区域 (e.g., 东南亚, 欧洲)
      v.literal('global') // 全球
    ),
    regionName: v.optional(v.string()), // 区域名称 (e.g., "东南亚10国", "欧洲35国")

    // Data Plans
    dataPlans: v.array(
      v.object({
        dataAmount: v.string(), // 流量额度 (e.g., "1GB", "3GB", "无限")
        dataAmountBytes: v.optional(v.number()), // 流量字节数 (用于排序)
        isUnlimited: v.boolean(), // 是否无限流量
        throttledSpeedAfterLimit: v.optional(v.string()), // 超量后限速 (e.g., "128kbps")
        validityDays: v.number(), // 有效期天数
        price: v.number(), // 价格
        originalPrice: v.optional(v.number()), // 原价 (用于显示折扣)
        currency: v.string(), // 货币代码 (e.g., "CNY", "USD")
        pricePerDay: v.optional(v.number()), // 每日均价
        pricePerGB: v.optional(v.number()), // 每GB价格
      })
    ),

    // Network Details
    networkType: v.array(v.string()), // 网络类型 ["4G", "5G"]
    supportedCarriers: v.optional(v.array(v.string())), // 支持的当地运营商

    // eSIM Specific
    esimInfo: v.optional(
      v.object({
        supportsQrActivation: v.boolean(), // 支持QR码激活
        supportsAppActivation: v.boolean(), // 支持APP激活
        activationInstructions: v.optional(v.string()), // 激活说明
        compatibleDevices: v.optional(v.array(v.string())), // 兼容设备列表
        requiresUnlockedPhone: v.boolean(), // 是否需要解锁手机
      })
    ),

    // Physical SIM Specific
    physicalSimInfo: v.optional(
      v.object({
        simSize: v.array(v.string()), // SIM卡尺寸 ["nano", "micro", "standard"]
        deliveryOptions: v.optional(
          v.array(
            v.object({
              method: v.string(), // 配送方式 (e.g., "顺丰", "机场自取", "酒店配送")
              estimatedDays: v.optional(v.number()), // 预计配送天数
              fee: v.optional(v.number()), // 配送费用
              description: v.optional(v.string()),
            })
          )
        ),
        pickupLocations: v.optional(v.array(v.string())), // 自取地点
      })
    ),

    // Voice & SMS
    includesVoice: v.boolean(), // 是否包含通话
    voiceMinutes: v.optional(v.number()), // 通话分钟数
    includesSms: v.boolean(), // 是否包含短信
    smsCount: v.optional(v.number()), // 短信条数
    localNumber: v.optional(v.boolean()), // 是否提供当地号码

    // Features
    features: v.array(v.string()), // 特色功能 (e.g., "热点共享", "即买即用", "无需实名")
    hotspotSupported: v.boolean(), // 是否支持热点共享
    maxDevices: v.optional(v.number()), // 最大连接设备数 (for WiFi device)

    // Purchase Information
    purchaseUrl: v.string(), // 购买链接
    purchasePlatforms: v.optional(v.array(v.string())), // 购买平台 (e.g., "淘宝", "京东", "官网")
    affiliateUrl: v.optional(v.string()), // 联盟链接

    // Ratings & Reviews
    rating: v.optional(v.number()), // 1-5 评分
    reviewCount: v.number(), // 评价数量
    salesCount: v.optional(v.number()), // 销量

    // Status & Priority
    isActive: v.boolean(), // 是否上架
    isPromoted: v.optional(v.boolean()), // 是否推广
    priority: v.number(), // 排序优先级

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_card_type', ['cardType'])
    .index('by_provider', ['provider'])
    .index('by_active', ['isActive'])
    .index('by_coverage_type', ['coverageType'])
    .index('by_priority', ['priority'])
    .index('by_promoted', ['isPromoted'])
    .index('by_rating', ['rating']),

  // ============================================
  // SIM Card Reviews (电话卡用户评价)
  // ============================================
  simCardReviews: defineTable({
    simCardId: v.id('simCards'),
    userId: v.optional(v.string()), // Auth user ID (optional for crawled reviews)
    authorName: v.optional(v.string()), // 评价者名称

    // Ratings (1-5 scale)
    overallRating: v.number(), // 综合评分
    signalRating: v.optional(v.number()), // 信号评分
    speedRating: v.optional(v.number()), // 网速评分
    valueRating: v.optional(v.number()), // 性价比评分
    serviceRating: v.optional(v.number()), // 服务评分

    // Review Content
    title: v.optional(v.string()), // 评价标题
    content: v.string(), // 评价内容

    // Usage Details
    destination: v.optional(v.string()), // 使用目的地
    usageDuration: v.optional(v.number()), // 使用天数
    actualDataUsed: v.optional(v.string()), // 实际使用流量
    deviceUsed: v.optional(v.string()), // 使用设备

    // Pros & Cons
    pros: v.optional(v.array(v.string())), // 优点
    cons: v.optional(v.array(v.string())), // 缺点

    // Experience Details
    activationExperience: v.optional(v.string()), // 激活体验
    signalQuality: v.optional(
      v.union(
        v.literal('excellent'), // 优秀
        v.literal('good'), // 良好
        v.literal('average'), // 一般
        v.literal('poor'), // 较差
        v.literal('very_poor') // 很差
      )
    ),
    speedTestResult: v.optional(v.string()), // 测速结果

    // Recommendation
    wouldRecommend: v.boolean(), // 是否推荐

    // Media
    imageUrls: v.optional(v.array(v.string())), // 评价图片

    // Verification
    isVerified: v.boolean(), // 是否已验证
    purchaseVerified: v.optional(v.boolean()), // 是否已验证购买

    // Engagement
    helpfulCount: v.number(), // 有用数
    reportCount: v.number(), // 举报数

    // Moderation
    status: v.union(
      v.literal('pending'), // 待审核
      v.literal('approved'), // 已通过
      v.literal('rejected') // 已拒绝
    ),

    // Timestamps
    reviewDate: v.optional(v.number()), // 评价日期
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_sim_card', ['simCardId'])
    .index('by_user', ['userId'])
    .index('by_overall_rating', ['overallRating'])
    .index('by_sim_card_rating', ['simCardId', 'overallRating'])
    .index('by_status', ['status'])
    .index('by_verified', ['isVerified'])
    .index('by_helpful', ['helpfulCount']),

  // ============================================
  // SIM Card Review Votes (评价投票)
  // ============================================
  simCardReviewVotes: defineTable({
    reviewId: v.id('simCardReviews'),
    userId: v.string(),
    voteType: v.union(v.literal('helpful'), v.literal('not_helpful')),
    createdAt: v.number(),
  })
    .index('by_review', ['reviewId'])
    .index('by_user', ['userId'])
    .index('by_review_user', ['reviewId', 'userId']),

  // ============================================
  // User Favorite SIM Cards (收藏的电话卡)
  // ============================================
  favoriteSimCards: defineTable({
    userId: v.string(),
    simCardId: v.id('simCards'),
    notes: v.optional(v.string()), // 用户备注
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_sim_card', ['simCardId'])
    .index('by_user_sim_card', ['userId', 'simCardId']),

  // ============================================
  // Travel Notes (游记)
  // ============================================
  travelNotes: defineTable({
    authorId: v.string(), // Auth user ID
    title: v.string(),
    content: v.string(),
    visibility: v.union(
      v.literal('private'),
      v.literal('public'),
      v.literal('followers')
    ),
    itineraryId: v.optional(v.id('itineraries')), // 关联的行程
    location: v.optional(v.string()), // 旅行地点
    travelDate: v.optional(v.string()), // 旅行日期 YYYY-MM-DD
    likesCount: v.number(),
    commentsCount: v.number(),
    viewsCount: v.number(),
    savesCount: v.number(),
    isEdited: v.boolean(),
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.number(), // Unix timestamp
  })
    .index('by_author', ['authorId'])
    .index('by_visibility', ['visibility'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_author_visibility', ['authorId', 'visibility'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Note Images (游记图片)
  // ============================================
  noteImages: defineTable({
    noteId: v.id('travelNotes'),
    url: v.string(),
    caption: v.optional(v.string()),
    isCover: v.boolean(), // 是否为封面图
    orderIndex: v.number(), // 排序顺序
    createdAt: v.number(),
  })
    .index('by_note', ['noteId'])
    .index('by_note_order', ['noteId', 'orderIndex']),

  // ============================================
  // Note Tags (游记标签)
  // ============================================
  noteTags: defineTable({
    noteId: v.id('travelNotes'),
    tag: v.string(), // 标签名（小写，去空格）
    createdAt: v.number(),
  })
    .index('by_note', ['noteId'])
    .index('by_tag', ['tag']),

  // ============================================
  // Note POIs (游记关联的POI)
  // ============================================
  notePois: defineTable({
    noteId: v.id('travelNotes'),
    poiId: v.id('pois'),
    mentionIndex: v.optional(v.number()), // 在内容中提及的位置
    createdAt: v.number(),
  })
    .index('by_note', ['noteId'])
    .index('by_poi', ['poiId']),

  // ============================================
  // Note Likes (游记点赞)
  // ============================================
  noteLikes: defineTable({
    userId: v.string(), // Auth user ID
    noteId: v.id('travelNotes'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_note', ['noteId'])
    .index('by_user_note', ['userId', 'noteId']),

  // ============================================
  // Note Comments (游记评论)
  // ============================================
  noteComments: defineTable({
    noteId: v.id('travelNotes'),
    userId: v.string(), // Auth user ID
    parentId: v.optional(v.id('noteComments')), // 回复的父评论
    content: v.string(),
    likesCount: v.number(),
    repliesCount: v.number(),
    isEdited: v.boolean(),
    isDeleted: v.boolean(), // 软删除
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_note', ['noteId'])
    .index('by_user', ['userId'])
    .index('by_parent', ['parentId'])
    .index('by_note_created', ['noteId', 'createdAt']),

  // ============================================
  // Note Comment Likes (评论点赞)
  // ============================================
  noteCommentLikes: defineTable({
    commentId: v.id('noteComments'),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_comment', ['commentId'])
    .index('by_user', ['userId'])
    .index('by_comment_user', ['commentId', 'userId']),

  // ============================================
  // Note Saves (游记收藏)
  // ============================================
  noteSaves: defineTable({
    userId: v.string(),
    noteId: v.id('travelNotes'),
    collectionId: v.optional(v.id('favoriteCollections')), // 可选的收藏夹
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_note', ['noteId'])
    .index('by_user_note', ['userId', 'noteId'])
    .index('by_collection', ['collectionId']),

  // ============================================
  // Travel Statistics (User Travel Stats)
  // ============================================
  userTravelStats: defineTable({
    userId: v.string(), // Auth user ID

    // Aggregate statistics
    totalTrips: v.number(), // Total number of completed trips
    totalDays: v.number(), // Total days traveled
    totalDistance: v.number(), // Total distance in kilometers
    totalCities: v.number(), // Number of unique cities visited
    totalCountries: v.number(), // Number of unique countries visited
    totalPois: v.number(), // Total POIs visited

    // Time-based stats
    longestTrip: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        days: v.number(),
        startDate: v.string(),
        endDate: v.string(),
      })
    ),
    shortestTrip: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        days: v.number(),
        startDate: v.string(),
        endDate: v.string(),
      })
    ),

    // Expense statistics
    totalExpenses: v.number(), // Total spending in CNY
    expensesByCategory: v.array(
      v.object({
        categoryId: v.id('expenseCategories'),
        categoryName: v.string(),
        amount: v.number(),
        percentage: v.number(), // 0-100
      })
    ),
    averageExpensePerDay: v.number(),
    averageExpensePerTrip: v.number(),

    // Popular destinations
    topDestinations: v.array(
      v.object({
        cityId: v.id('cities'),
        cityName: v.string(),
        visitCount: v.number(),
        totalDays: v.number(),
      })
    ),

    // Travel patterns
    preferredTransportModes: v.array(
      v.object({
        mode: v.string(), // walking, driving, transit, etc.
        count: v.number(),
        percentage: v.number(),
      })
    ),
    preferredPoiCategories: v.array(
      v.object({
        category: v.string(), // attraction, restaurant, hotel, etc.
        count: v.number(),
        percentage: v.number(),
      })
    ),

    // Monthly distribution
    monthlyTripCounts: v.array(
      v.object({
        month: v.number(), // 1-12
        count: v.number(),
      })
    ),

    // Timestamps
    lastCalculatedAt: v.number(), // Unix timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_total_trips', ['totalTrips'])
    .index('by_total_distance', ['totalDistance']),

  // ============================================
  // Yearly Reviews (Annual Travel Summary)
  // ============================================
  yearlyReviews: defineTable({
    userId: v.string(), // Auth user ID
    year: v.number(), // Year (e.g., 2024, 2025)

    // Summary statistics
    tripsCount: v.number(),
    daysCount: v.number(),
    citiesCount: v.number(),
    countriesCount: v.number(),
    poisCount: v.number(),
    totalDistance: v.number(), // Kilometers

    // Financial summary
    totalExpenses: v.number(), // CNY
    expenseBreakdown: v.array(
      v.object({
        categoryId: v.id('expenseCategories'),
        categoryName: v.string(),
        icon: v.optional(v.string()),
        amount: v.number(),
        percentage: v.number(),
      })
    ),
    averagePerTrip: v.number(),
    averagePerDay: v.number(),
    mostExpensiveTrip: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        amount: v.number(),
      })
    ),

    // Highlights
    firstTripOfYear: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        cityName: v.string(),
        startDate: v.string(),
      })
    ),
    lastTripOfYear: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        cityName: v.string(),
        startDate: v.string(),
      })
    ),
    longestTrip: v.optional(
      v.object({
        itineraryId: v.id('itineraries'),
        title: v.string(),
        cityName: v.string(),
        days: v.number(),
      })
    ),

    // Top destinations this year
    topCities: v.array(
      v.object({
        cityId: v.id('cities'),
        cityName: v.string(),
        visitCount: v.number(),
        totalDays: v.number(),
        imageUrl: v.optional(v.string()),
      })
    ),

    // Monthly activity heatmap
    monthlyActivity: v.array(
      v.object({
        month: v.number(), // 1-12
        tripsCount: v.number(),
        daysCount: v.number(),
        expenses: v.number(),
      })
    ),

    // Achievement badges
    achievements: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        icon: v.string(), // SF Symbol name
        earnedAt: v.optional(v.number()),
      })
    ),

    // Comparison with previous year
    yearOverYear: v.optional(
      v.object({
        tripsChange: v.number(), // Percentage change
        expensesChange: v.number(),
        distanceChange: v.number(),
        citiesChange: v.number(),
      })
    ),

    // Travel quotes / memories (user can add)
    memories: v.optional(
      v.array(
        v.object({
          text: v.string(),
          itineraryId: v.optional(v.id('itineraries')),
          imageUrl: v.optional(v.string()),
          createdAt: v.number(),
        })
      )
    ),

    // Generation metadata
    status: v.union(
      v.literal('generating'),
      v.literal('ready'),
      v.literal('error')
    ),
    generatedAt: v.optional(v.number()),
    error: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_year', ['year'])
    .index('by_user_year', ['userId', 'year'])
    .index('by_status', ['status']),

  // ============================================
  // Verification Badges (用户认证徽章)
  // ============================================
  verificationBadges: defineTable({
    userId: v.string(), // Auth user ID
    badgeType: v.union(
      v.literal('travel_expert'), // 旅行达人认证
      v.literal('local_guide'), // 本地向导认证
      v.literal('official_account') // 官方账号认证
    ),
    // Badge display info
    displayName: v.string(), // 显示名称，如 "旅行达人"
    description: v.optional(v.string()), // 徽章描述
    iconUrl: v.optional(v.string()), // 徽章图标 URL
    color: v.optional(v.string()), // 徽章颜色 (hex)

    // Verification details
    verifiedAt: v.number(), // 认证通过时间
    expiresAt: v.optional(v.number()), // 认证过期时间 (可选)
    verifiedBy: v.optional(v.string()), // 审核人 ID

    // Status
    isActive: v.boolean(), // 是否激活
    revokedAt: v.optional(v.number()), // 撤销时间
    revokedReason: v.optional(v.string()), // 撤销原因

    // Metadata
    metadata: v.optional(
      v.object({
        // 旅行达人特有字段
        travelExpertLevel: v.optional(v.number()), // 达人等级 1-5
        specialties: v.optional(v.array(v.string())), // 擅长领域，如 ["美食", "摄影", "户外"]
        totalGuides: v.optional(v.number()), // 发布攻略数
        totalLikes: v.optional(v.number()), // 获赞数

        // 本地向导特有字段
        localCity: v.optional(v.string()), // 所在城市
        localCityId: v.optional(v.id('cities')), // 城市 ID
        yearsOfResidence: v.optional(v.number()), // 居住年限
        languages: v.optional(v.array(v.string())), // 语言能力

        // 官方账号特有字段
        organizationName: v.optional(v.string()), // 机构名称
        organizationType: v.optional(v.string()), // 机构类型，如 "旅游局", "景区", "酒店"
        officialWebsite: v.optional(v.string()), // 官方网站
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'badgeType'])
    .index('by_type', ['badgeType'])
    .index('by_active', ['isActive'])
    .index('by_user_active', ['userId', 'isActive']),

  // ============================================
  // Verification Applications (认证申请)
  // ============================================
  verificationApplications: defineTable({
    userId: v.string(), // 申请人 ID
    badgeType: v.union(
      v.literal('travel_expert'),
      v.literal('local_guide'),
      v.literal('official_account')
    ),

    // Application status
    status: v.union(
      v.literal('pending'), // 待审核
      v.literal('under_review'), // 审核中
      v.literal('approved'), // 已通过
      v.literal('rejected'), // 已拒绝
      v.literal('cancelled') // 已取消
    ),

    // Applicant info
    realName: v.string(), // 真实姓名
    idType: v.union(
      v.literal('id_card'), // 身份证
      v.literal('passport'), // 护照
      v.literal('business_license') // 营业执照 (官方账号)
    ),
    idNumber: v.string(), // 证件号码 (加密存储)
    phone: v.string(), // 联系电话
    email: v.optional(v.string()), // 联系邮箱

    // Application materials
    applicationReason: v.string(), // 申请理由
    supportingMaterials: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal('id_photo'), // 证件照片
            v.literal('work_proof'), // 工作证明
            v.literal('portfolio'), // 作品集
            v.literal('certificate'), // 资质证书
            v.literal('other') // 其他材料
          ),
          url: v.string(), // 材料 URL
          description: v.optional(v.string()), // 材料说明
        })
      )
    ),

    // Type-specific application data
    applicationData: v.optional(
      v.object({
        // 旅行达人申请
        travelExperience: v.optional(v.string()), // 旅行经历描述
        socialMediaLinks: v.optional(v.array(v.string())), // 社交媒体链接
        publishedGuideIds: v.optional(v.array(v.string())), // 已发布攻略 ID

        // 本地向导申请
        localCity: v.optional(v.string()), // 所在城市
        residenceProof: v.optional(v.string()), // 居住证明 URL
        yearsOfResidence: v.optional(v.number()), // 居住年限
        localKnowledge: v.optional(v.string()), // 本地知识描述
        languages: v.optional(v.array(v.string())), // 语言能力

        // 官方账号申请
        organizationName: v.optional(v.string()), // 机构名称
        organizationType: v.optional(v.string()), // 机构类型
        businessLicenseUrl: v.optional(v.string()), // 营业执照 URL
        authorizationLetterUrl: v.optional(v.string()), // 授权书 URL
        officialWebsite: v.optional(v.string()), // 官方网站
      })
    ),

    // Review info
    reviewedBy: v.optional(v.string()), // 审核人 ID
    reviewedAt: v.optional(v.number()), // 审核时间
    reviewNotes: v.optional(v.string()), // 审核备注
    rejectionReason: v.optional(v.string()), // 拒绝原因

    // If approved, link to the created badge
    badgeId: v.optional(v.id('verificationBadges')),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_type', ['badgeType'])
    .index('by_user_type', ['userId', 'badgeType'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Weather Cache
  // ============================================
  weatherCache: defineTable({
    // Location (rounded to 2 decimal places for caching)
    latitude: v.number(),
    longitude: v.number(),
    // Cached weather data (JSON)
    data: v.object({
      latitude: v.number(),
      longitude: v.number(),
      timezone: v.string(),
      timezoneOffset: v.number(),
      current: v.optional(
        v.object({
          date: v.string(),
          timestamp: v.number(),
          condition: v.string(),
          conditionDescription: v.string(),
          icon: v.string(),
          tempMin: v.number(),
          tempMax: v.number(),
          tempMorning: v.number(),
          tempDay: v.number(),
          tempEvening: v.number(),
          tempNight: v.number(),
          feelsLikeDay: v.number(),
          humidity: v.number(),
          windSpeed: v.number(),
          windDirection: v.number(),
          precipitation: v.number(),
          precipitationProbability: v.number(),
          uvIndex: v.number(),
          sunrise: v.number(),
          sunset: v.number(),
          cloudiness: v.number(),
          pressure: v.number(),
        })
      ),
      daily: v.array(
        v.object({
          date: v.string(),
          timestamp: v.number(),
          condition: v.string(),
          conditionDescription: v.string(),
          icon: v.string(),
          tempMin: v.number(),
          tempMax: v.number(),
          tempMorning: v.number(),
          tempDay: v.number(),
          tempEvening: v.number(),
          tempNight: v.number(),
          feelsLikeDay: v.number(),
          humidity: v.number(),
          windSpeed: v.number(),
          windDirection: v.number(),
          precipitation: v.number(),
          precipitationProbability: v.number(),
          uvIndex: v.number(),
          sunrise: v.number(),
          sunset: v.number(),
          cloudiness: v.number(),
          pressure: v.number(),
        })
      ),
      alerts: v.array(
        v.object({
          event: v.string(),
          sender: v.string(),
          start: v.number(),
          end: v.number(),
          description: v.string(),
          severity: v.string(),
        })
      ),
      fetchedAt: v.number(),
    }),
    fetchedAt: v.number(),
  })
    .index('by_location', ['latitude', 'longitude'])
    .index('by_fetched_at', ['fetchedAt']),

  // ============================================
  // Packing Lists (智能打包清单)
  // ============================================
  packingLists: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.optional(v.id('itineraries')), // Link to itinerary (optional)
    title: v.string(), // List title
    destination: v.optional(v.string()), // Destination for weather-based suggestions
    startDate: v.optional(v.string()), // ISO date string YYYY-MM-DD
    endDate: v.optional(v.string()), // ISO date string YYYY-MM-DD
    tripType: v.optional(
      v.union(
        v.literal('leisure'), // 休闲
        v.literal('business'), // 商务
        v.literal('adventure'), // 冒险
        v.literal('beach'), // 海滩
        v.literal('ski'), // 滑雪
        v.literal('city'), // 城市
        v.literal('hiking'), // 徒步
        v.literal('other') // 其他
      )
    ),
    // Weather information for smart suggestions
    weatherInfo: v.optional(
      v.object({
        avgTemp: v.optional(v.number()), // Average temperature in Celsius
        condition: v.optional(v.string()), // Weather condition (sunny, rainy, etc.)
        humidity: v.optional(v.number()), // Humidity percentage
        fetchedAt: v.optional(v.number()), // When weather was fetched
      })
    ),
    // Sharing
    shareCode: v.optional(v.string()), // Unique code for sharing
    sharedWith: v.optional(v.array(v.string())), // User IDs with access
    isPublic: v.boolean(), // Public template for community
    templateId: v.optional(v.id('packingTemplates')), // If created from template
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_share_code', ['shareCode'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_public', ['isPublic']),

  // ============================================
  // Packing Items (清单物品)
  // ============================================
  packingItems: defineTable({
    packingListId: v.id('packingLists'),
    name: v.string(), // Item name
    category: v.union(
      v.literal('clothing'), // 衣物
      v.literal('toiletries'), // 洗漱用品
      v.literal('electronics'), // 电子产品
      v.literal('documents'), // 证件文件
      v.literal('medicine'), // 药品
      v.literal('accessories'), // 配饰
      v.literal('gear'), // 装备
      v.literal('snacks'), // 零食
      v.literal('other') // 其他
    ),
    quantity: v.number(), // Number of items
    isPacked: v.boolean(), // Whether item is packed
    isEssential: v.boolean(), // Must-have item
    suggestedBy: v.optional(
      v.union(
        v.literal('user'), // User added
        v.literal('weather'), // Weather-based suggestion
        v.literal('activity'), // Activity-based suggestion
        v.literal('template'), // From template
        v.literal('ai') // AI recommendation
      )
    ),
    notes: v.optional(v.string()), // Additional notes
    orderIndex: v.number(), // Display order within category
    // Tracking
    packedAt: v.optional(v.number()), // When item was marked as packed
    packedBy: v.optional(v.string()), // Who packed it (for shared lists)
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_list', ['packingListId'])
    .index('by_list_category', ['packingListId', 'category'])
    .index('by_list_packed', ['packingListId', 'isPacked'])
    .index('by_list_essential', ['packingListId', 'isEssential']),

  // ============================================
  // Packing Templates (清单模板)
  // ============================================
  packingTemplates: defineTable({
    name: v.string(), // Template name
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()), // Template description
    tripType: v.union(
      v.literal('leisure'),
      v.literal('business'),
      v.literal('adventure'),
      v.literal('beach'),
      v.literal('ski'),
      v.literal('city'),
      v.literal('hiking'),
      v.literal('other')
    ),
    climate: v.optional(
      v.union(
        v.literal('tropical'), // 热带
        v.literal('dry'), // 干燥
        v.literal('temperate'), // 温带
        v.literal('cold'), // 寒冷
        v.literal('polar'), // 极地
        v.literal('any') // 任何气候
      )
    ),
    durationDays: v.optional(v.number()), // Suggested trip duration
    // Template items with conditional logic
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        quantity: v.number(),
        isEssential: v.boolean(),
        // Conditional inclusion
        conditions: v.optional(
          v.object({
            minTemp: v.optional(v.number()), // Include if temp >= this
            maxTemp: v.optional(v.number()), // Include if temp <= this
            weatherConditions: v.optional(v.array(v.string())), // Include if weather matches
            activities: v.optional(v.array(v.string())), // Include if activities include
            minDays: v.optional(v.number()), // Include if trip >= days
            maxDays: v.optional(v.number()), // Include if trip <= days
          })
        ),
      })
    ),
    // Metadata
    usageCount: v.number(), // How many times template was used
    rating: v.optional(v.number()), // User rating 1-5
    ratingCount: v.optional(v.number()),
    isSystem: v.boolean(), // System default vs user-created
    createdBy: v.optional(v.string()), // User ID for user templates
    isPublic: v.boolean(), // Available in community
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_trip_type', ['tripType'])
    .index('by_climate', ['climate'])
    .index('by_system', ['isSystem'])
    .index('by_public', ['isPublic'])
    .index('by_creator', ['createdBy'])
    .index('by_usage', ['usageCount']),

  // ============================================
  // Expense Splitting - Trip Members (旅行同伴)
  // ============================================
  tripMembers: defineTable({
    itineraryId: v.id('itineraries'),
    name: v.string(), // Display name
    email: v.optional(v.string()), // Optional email for notifications
    avatarUrl: v.optional(v.string()),
    userId: v.optional(v.string()), // Link to auth user if registered
    isOwner: v.boolean(), // Whether this member created the trip
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_itinerary_user', ['itineraryId', 'userId'])
    .index('by_user', ['userId']),

  // ============================================
  // Expense Splitting - Shared Expenses (共享支出)
  // ============================================
  sharedExpenses: defineTable({
    itineraryId: v.id('itineraries'),
    paidById: v.id('tripMembers'), // Who paid
    amount: v.number(), // Total amount in cents (to avoid floating point issues)
    currency: v.string(), // Currency code (CNY, USD, etc.)
    description: v.string(), // What was purchased
    category: v.union(
      v.literal('food'), // 餐饮
      v.literal('transport'), // 交通
      v.literal('accommodation'), // 住宿
      v.literal('tickets'), // 门票
      v.literal('shopping'), // 购物
      v.literal('other') // 其他
    ),
    splitType: v.union(
      v.literal('equal'), // Split equally among participants
      v.literal('exact'), // Exact amounts per person
      v.literal('percentage'), // Percentage-based split
      v.literal('shares') // Share-based split (e.g., 2 shares vs 1 share)
    ),
    date: v.string(), // ISO date string YYYY-MM-DD
    notes: v.optional(v.string()),
    receiptImageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_itinerary_date', ['itineraryId', 'date'])
    .index('by_paid_by', ['paidById'])
    .index('by_category', ['category']),

  // ============================================
  // Expense Splitting - Expense Participants (支出参与者)
  // ============================================
  expenseParticipants: defineTable({
    expenseId: v.id('sharedExpenses'),
    memberId: v.id('tripMembers'),
    splitValue: v.number(), // Value depends on splitType: equal=1, exact=amount, percentage=%, shares=share count
    amountOwed: v.number(), // Calculated amount owed in cents
  })
    .index('by_expense', ['expenseId'])
    .index('by_member', ['memberId'])
    .index('by_expense_member', ['expenseId', 'memberId']),

  // ============================================
  // Expense Splitting - Settlements (结算记录)
  // ============================================
  settlements: defineTable({
    itineraryId: v.id('itineraries'),
    fromMemberId: v.id('tripMembers'), // Who pays
    toMemberId: v.id('tripMembers'), // Who receives
    amount: v.number(), // Amount in cents
    currency: v.string(),
    isSettled: v.boolean(), // Whether this has been paid
    settledAt: v.optional(v.number()), // When it was settled
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_from_member', ['fromMemberId'])
    .index('by_to_member', ['toMemberId'])
    .index('by_settled', ['isSettled']),

  // ============================================
  // Template Categories (模板分类)
  // ============================================
  templateCategories: defineTable({
    name: v.string(), // 分类名称：周末游、亲子游、蜜月游等
    nameEn: v.optional(v.string()), // English name
    icon: v.string(), // SF Symbol or emoji
    description: v.optional(v.string()),
    sortOrder: v.number(), // Display order
    isActive: v.boolean(), // Whether category is visible
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_sort_order', ['sortOrder'])
    .index('by_active', ['isActive']),

  // ============================================
  // Itinerary Templates (行程模板)
  // ============================================
  itineraryTemplates: defineTable({
    // Basic info
    title: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),

    // Classification
    categoryId: v.id('templateCategories'),
    templateType: v.union(v.literal('preset'), v.literal('user')), // preset=系统预设, user=用户创建

    // Creator info (for user templates)
    creatorId: v.optional(v.string()), // Clerk user ID
    creatorName: v.optional(v.string()),

    // Template structure
    daysCount: v.number(),
    days: v.array(
      v.object({
        dayNumber: v.number(),
        theme: v.optional(v.string()), // 主题：文化探索、美食之旅等
        pois: v.array(
          v.object({
            name: v.string(),
            type: v.union(
              v.literal('attraction'),
              v.literal('restaurant'),
              v.literal('hotel'),
              v.literal('transportation'),
              v.literal('activity'),
              v.literal('shopping')
            ),
            description: v.optional(v.string()),
            suggestedDuration: v.optional(v.number()), // Minutes
            suggestedTime: v.optional(v.string()), // e.g., "09:00"
            notes: v.optional(v.string()),
            // Optional location for reference (can be overridden when applied)
            latitude: v.optional(v.number()),
            longitude: v.optional(v.number()),
            address: v.optional(v.string()),
          })
        ),
      })
    ),

    // Metadata
    destinations: v.optional(v.array(v.string())), // Suitable destinations
    tags: v.optional(v.array(v.string())), // Tags for discovery
    estimatedBudget: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        currency: v.string(),
      })
    ),
    suitableFor: v.optional(v.array(v.string())), // 适合人群：情侣、家庭、独行等
    bestSeasons: v.optional(v.array(v.string())), // 最佳季节：春、夏、秋、冬

    // Visibility & sharing
    visibility: v.union(
      v.literal('private'),
      v.literal('public'),
      v.literal('unlisted')
    ),
    isPublished: v.boolean(), // Whether publicly discoverable

    // Engagement metrics
    viewCount: v.number(),
    likeCount: v.number(),
    saveCount: v.number(),
    useCount: v.number(), // How many itineraries created from this

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index('by_category', ['categoryId'])
    .index('by_type', ['templateType'])
    .index('by_creator', ['creatorId'])
    .index('by_visibility', ['visibility'])
    .index('by_published', ['isPublished'])
    .index('by_use_count', ['useCount'])
    .index('by_like_count', ['likeCount'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Template Likes (模板点赞)
  // ============================================
  templateLikes: defineTable({
    templateId: v.id('itineraryTemplates'),
    userId: v.string(), // Clerk user ID
    createdAt: v.number(),
  })
    .index('by_template', ['templateId'])
    .index('by_user', ['userId'])
    .index('by_template_user', ['templateId', 'userId']),

  // ============================================
  // Template Saves (模板收藏)
  // ============================================
  templateSaves: defineTable({
    templateId: v.id('itineraryTemplates'),
    userId: v.string(), // Clerk user ID
    createdAt: v.number(),
  })
    .index('by_template', ['templateId'])
    .index('by_user', ['userId'])
    .index('by_template_user', ['templateId', 'userId']),

  // ============================================
  // Itinerary Drafts (Auto-saved editing state)
  // ============================================
  itineraryDrafts: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.optional(v.id('itineraries')), // Reference to existing itinerary (null for new drafts)

    // Draft content (mirrors itinerary fields)
    title: v.string(),
    cityId: v.optional(v.id('cities')),
    startDate: v.optional(v.string()), // ISO date string YYYY-MM-DD
    endDate: v.optional(v.string()), // ISO date string YYYY-MM-DD
    visibility: v.optional(
      v.union(v.literal('private'), v.literal('team'), v.literal('public'))
    ),
    coverImageUrl: v.optional(v.string()),

    // Draft days with items (denormalized for auto-save performance)
    days: v.optional(
      v.array(
        v.object({
          dayNumber: v.number(),
          date: v.optional(v.string()),
          items: v.array(
            v.object({
              poiId: v.optional(v.id('pois')), // Reference to existing POI
              orderIndex: v.number(),
              startTime: v.optional(v.string()),
              endTime: v.optional(v.string()),
              transportMode: v.optional(
                v.union(
                  v.literal('walking'),
                  v.literal('driving'),
                  v.literal('transit'),
                  v.literal('cycling'),
                  v.literal('taxi')
                )
              ),
              notes: v.optional(v.string()),
              // Inline POI data for unsaved POIs
              inlinePoi: v.optional(
                v.object({
                  name: v.string(),
                  category: v.union(
                    v.literal('attraction'),
                    v.literal('restaurant'),
                    v.literal('hotel'),
                    v.literal('shopping'),
                    v.literal('other')
                  ),
                  address: v.optional(v.string()),
                  latitude: v.optional(v.number()),
                  longitude: v.optional(v.number()),
                })
              ),
            })
          ),
        })
      )
    ),

    // Auto-save metadata
    lastModifiedAt: v.number(), // Unix timestamp of last modification
    expiresAt: v.number(), // Unix timestamp when draft should be cleaned up (e.g., 30 days)

    // Multi-device sync
    deviceId: v.optional(v.string()), // Device identifier for conflict resolution
    syncVersion: v.number(), // Incremented on each save for optimistic locking
  })
    .index('by_user', ['userId'])
    .index('by_user_itinerary', ['userId', 'itineraryId'])
    .index('by_expires', ['expiresAt'])
    .index('by_user_modified', ['userId', 'lastModifiedAt']),

  // ============================================
  // User Travel Preferences (旅行偏好)
  // ============================================
  userTravelPreferences: defineTable({
    userId: v.string(), // Auth user ID
    travelStyles: v.optional(
      v.array(
        v.union(
          v.literal('adventure'),
          v.literal('relaxation'),
          v.literal('culture'),
          v.literal('food'),
          v.literal('nature'),
          v.literal('shopping'),
          v.literal('photography'),
          v.literal('budget'),
          v.literal('luxury')
        )
      )
    ),
    preferredPace: v.optional(
      v.union(v.literal('slow'), v.literal('moderate'), v.literal('fast'))
    ),
    languages: v.optional(v.array(v.string())),
    ageRange: v.optional(
      v.union(
        v.literal('18-25'),
        v.literal('26-35'),
        v.literal('36-45'),
        v.literal('46-55'),
        v.literal('55+')
      )
    ),
    gender: v.optional(
      v.union(v.literal('male'), v.literal('female'), v.literal('other'))
    ),
    preferredPartnerGender: v.optional(
      v.union(
        v.literal('male'),
        v.literal('female'),
        v.literal('other'),
        v.literal('any')
      )
    ),
    bio: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    smokingPreference: v.optional(
      v.union(
        v.literal('smoker'),
        v.literal('non_smoker'),
        v.literal('no_preference')
      )
    ),
    accommodationPreference: v.optional(
      v.union(
        v.literal('hostel'),
        v.literal('budget_hotel'),
        v.literal('mid_range'),
        v.literal('luxury'),
        v.literal('no_preference')
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_age_range', ['ageRange'])
    .index('by_gender', ['gender']),

  // ============================================
  // Travel Partner Requests (结伴请求)
  // ============================================
  travelPartnerRequests: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    destination: v.string(),
    destinationCityId: v.optional(v.id('cities')),
    startDate: v.string(),
    endDate: v.string(),
    isFlexibleDates: v.boolean(),
    currentGroupSize: v.number(),
    maxGroupSize: v.number(),
    preferredGender: v.optional(
      v.union(
        v.literal('male'),
        v.literal('female'),
        v.literal('other'),
        v.literal('any')
      )
    ),
    preferredAgeRange: v.optional(
      v.array(
        v.union(
          v.literal('18-25'),
          v.literal('26-35'),
          v.literal('36-45'),
          v.literal('46-55'),
          v.literal('55+')
        )
      )
    ),
    travelStyles: v.optional(
      v.array(
        v.union(
          v.literal('adventure'),
          v.literal('relaxation'),
          v.literal('culture'),
          v.literal('food'),
          v.literal('nature'),
          v.literal('shopping'),
          v.literal('photography'),
          v.literal('budget'),
          v.literal('luxury')
        )
      )
    ),
    budgetRange: v.optional(
      v.union(
        v.literal('budget'),
        v.literal('moderate'),
        v.literal('comfortable'),
        v.literal('luxury')
      )
    ),
    estimatedBudget: v.optional(v.number()),
    itineraryId: v.optional(v.id('itineraries')),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    status: v.union(
      v.literal('active'),
      v.literal('paused'),
      v.literal('fulfilled'),
      v.literal('cancelled'),
      v.literal('expired')
    ),
    viewCount: v.number(),
    applicationCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_destination', ['destination'])
    .index('by_city', ['destinationCityId'])
    .index('by_dates', ['startDate', 'endDate'])
    .index('by_status_dates', ['status', 'startDate'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Partner Match Applications (结伴申请)
  // ============================================
  partnerMatchApplications: defineTable({
    requestId: v.id('travelPartnerRequests'),
    applicantId: v.string(),
    requestOwnerId: v.string(),
    message: v.string(),
    matchScore: v.optional(v.number()),
    matchFactors: v.optional(
      v.object({
        styleMatch: v.optional(v.number()),
        ageMatch: v.optional(v.number()),
        budgetMatch: v.optional(v.number()),
        languageMatch: v.optional(v.number()),
        interestMatch: v.optional(v.number()),
      })
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('rejected'),
      v.literal('withdrawn'),
      v.literal('expired')
    ),
    responseMessage: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_request', ['requestId'])
    .index('by_applicant', ['applicantId'])
    .index('by_owner', ['requestOwnerId'])
    .index('by_request_status', ['requestId', 'status'])
    .index('by_applicant_status', ['applicantId', 'status'])
    .index('by_owner_status', ['requestOwnerId', 'status'])
    .index('by_match_score', ['matchScore']),

  // ============================================
  // Partner Matches (成功匹配)
  // ============================================
  partnerMatches: defineTable({
    requestId: v.id('travelPartnerRequests'),
    applicationId: v.id('partnerMatchApplications'),
    requestOwnerId: v.string(),
    partnerId: v.string(),
    matchScore: v.number(),
    matchedAt: v.number(),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    conversationId: v.optional(v.id('conversations')),
    ownerFeedback: v.optional(
      v.object({
        rating: v.number(),
        review: v.optional(v.string()),
        wouldTravelAgain: v.boolean(),
        createdAt: v.number(),
      })
    ),
    partnerFeedback: v.optional(
      v.object({
        rating: v.number(),
        review: v.optional(v.string()),
        wouldTravelAgain: v.boolean(),
        createdAt: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_request', ['requestId'])
    .index('by_owner', ['requestOwnerId'])
    .index('by_partner', ['partnerId'])
    .index('by_status', ['status'])
    .index('by_destination', ['destination'])
    .index('by_dates', ['startDate', 'endDate']),

  // ============================================
  // User Verifications (用户认证)
  // ============================================
  userVerifications: defineTable({
    userId: v.string(),
    verificationType: v.union(
      v.literal('identity'),
      v.literal('phone'),
      v.literal('email'),
      v.literal('social'),
      v.literal('travel_history'),
      v.literal('reference')
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('verified'),
      v.literal('rejected'),
      v.literal('expired')
    ),
    verificationData: v.optional(v.string()),
    verificationMethod: v.optional(v.string()),
    socialPlatform: v.optional(v.string()),
    socialId: v.optional(v.string()),
    referenceUserId: v.optional(v.string()),
    referenceNote: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'verificationType'])
    .index('by_status', ['status'])
    .index('by_type_status', ['verificationType', 'status']),

  // ============================================
  // User Trust Scores (用户信任分)
  // ============================================
  userTrustScores: defineTable({
    userId: v.string(),
    overallScore: v.number(),
    verificationScore: v.number(),
    activityScore: v.number(),
    feedbackScore: v.number(),
    responseScore: v.number(),
    totalTrips: v.number(),
    successfulMatches: v.number(),
    cancelledMatches: v.number(),
    averageRating: v.optional(v.number()),
    totalRatings: v.number(),
    badges: v.optional(
      v.array(
        v.union(
          v.literal('verified_identity'),
          v.literal('trusted_traveler'),
          v.literal('super_host'),
          v.literal('responsive'),
          v.literal('experienced'),
          v.literal('top_rated')
        )
      )
    ),
    lastCalculatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_overall_score', ['overallScore']),

  // ============================================
  // Partner Request Saves (收藏结伴请求)
  // ============================================
  partnerRequestSaves: defineTable({
    userId: v.string(),
    requestId: v.id('travelPartnerRequests'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_request', ['requestId'])
    .index('by_user_request', ['userId', 'requestId']),

  // ============================================
  // POI Questions (POI 问答 - 问题)
  // ============================================
  poiQuestions: defineTable({
    poiId: v.id('pois'), // 关联的 POI
    userId: v.string(), // 提问者 Auth user ID
    title: v.string(), // 问题标题
    content: v.string(), // 问题详情
    category: v.union(
      v.literal('general'), // 一般问题
      v.literal('transportation'), // 交通
      v.literal('timing'), // 时间/开放时间
      v.literal('pricing'), // 价格/门票
      v.literal('tips'), // 游玩攻略
      v.literal('food'), // 餐饮
      v.literal('accommodation'), // 住宿
      v.literal('safety'), // 安全
      v.literal('other') // 其他
    ),
    tags: v.optional(v.array(v.string())), // 标签
    imageUrls: v.optional(v.array(v.string())), // 问题附图
    // Statistics
    viewsCount: v.number(),
    answersCount: v.number(),
    followersCount: v.number(), // 关注此问题的用户数
    // Status
    status: v.union(
      v.literal('open'), // 开放中
      v.literal('answered'), // 已有采纳答案
      v.literal('closed'), // 已关闭
      v.literal('resolved') // 已解决
    ),
    acceptedAnswerId: v.optional(v.id('poiAnswers')), // 采纳的答案
    bestAnswerId: v.optional(v.id('poiAnswers')), // 最佳答案
    hasBestAnswer: v.optional(v.boolean()), // 是否有最佳答案
    isEdited: v.boolean(),
    isPinned: v.boolean(), // 是否置顶
    // Moderation
    reportCount: v.number(),
    isHidden: v.boolean(), // 是否被隐藏
    isDeleted: v.optional(v.boolean()), // 是否被删除
    // Vote counts
    upvotesCount: v.optional(v.number()),
    downvotesCount: v.optional(v.number()),
    // Author info (denormalized)
    authorName: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    lastActivityAt: v.number(), // 最后活动时间（新回答等）
  })
    .index('by_poi', ['poiId'])
    .index('by_user', ['userId'])
    .index('by_poi_status', ['poiId', 'status'])
    .index('by_poi_category', ['poiId', 'category'])
    .index('by_status', ['status'])
    .index('by_category', ['category'])
    .index('by_created', ['createdAt'])
    .index('by_last_activity', ['lastActivityAt'])
    .index('by_poi_last_activity', ['poiId', 'lastActivityAt'])
    .searchIndex('search_questions', {
      searchField: 'title',
      filterFields: ['poiId', 'isDeleted'],
    }),

  // ============================================
  // POI Answers (POI 问答 - 回答)
  // ============================================
  poiAnswers: defineTable({
    questionId: v.id('poiQuestions'), // 关联的问题
    poiId: v.optional(v.id('pois')), // 关联的 POI（冗余，方便查询）
    userId: v.string(), // 回答者 Auth user ID
    content: v.string(), // 回答内容
    imageUrls: v.optional(v.array(v.string())), // 回答附图
    // Author info (denormalized)
    authorName: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),
    // Statistics
    upvotesCount: v.number(), // 点赞数
    downvotesCount: v.number(), // 踩数
    commentsCount: v.number(), // 评论数
    // Status
    isAccepted: v.boolean(), // 是否被采纳
    isBestAnswer: v.optional(v.boolean()), // 是否为最佳答案
    isEdited: v.boolean(),
    isDeleted: v.boolean(), // 软删除
    // Author verification
    isVerifiedAuthor: v.boolean(), // 是否为认证用户（旅行达人/本地向导）
    authorBadgeType: v.optional(
      v.union(
        v.literal('travel_expert'),
        v.literal('local_guide'),
        v.literal('official_account')
      )
    ),
    // Moderation
    reportCount: v.number(),
    isHidden: v.boolean(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_question', ['questionId'])
    .index('by_user', ['userId'])
    .index('by_question_accepted', ['questionId', 'isAccepted'])
    .index('by_question_upvotes', ['questionId', 'upvotesCount'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Answer Votes (回答投票)
  // ============================================
  answerVotes: defineTable({
    answerId: v.id('poiAnswers'),
    userId: v.string(), // Auth user ID
    voteType: v.union(v.literal('up'), v.literal('down')),
    createdAt: v.number(),
  })
    .index('by_answer', ['answerId'])
    .index('by_user', ['userId'])
    .index('by_answer_user', ['answerId', 'userId']),

  // ============================================
  // Answer Comments (回答评论)
  // ============================================
  answerComments: defineTable({
    answerId: v.id('poiAnswers'),
    userId: v.string(), // Auth user ID
    content: v.string(),
    parentId: v.optional(v.id('answerComments')), // 回复的父评论
    likesCount: v.number(),
    isEdited: v.boolean(),
    isDeleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_answer', ['answerId'])
    .index('by_user', ['userId'])
    .index('by_parent', ['parentId'])
    .index('by_answer_created', ['answerId', 'createdAt']),

  // ============================================
  // Question Followers (问题关注)
  // ============================================
  questionFollowers: defineTable({
    questionId: v.id('poiQuestions'),
    userId: v.string(), // Auth user ID
    createdAt: v.number(),
  })
    .index('by_question', ['questionId'])
    .index('by_user', ['userId'])
    .index('by_question_user', ['questionId', 'userId']),

  // ============================================
  // Question Reports (问题举报)
  // ============================================
  questionReports: defineTable({
    questionId: v.id('poiQuestions'),
    userId: v.string(), // Auth user ID
    reason: v.union(
      v.literal('spam'),
      v.literal('inappropriate'),
      v.literal('duplicate'),
      v.literal('off_topic'),
      v.literal('other')
    ),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('resolved'),
      v.literal('dismissed')
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
  })
    .index('by_question', ['questionId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_question_user', ['questionId', 'userId']),

  // ============================================
  // Answer Reports (回答举报)
  // ============================================
  answerReports: defineTable({
    answerId: v.id('poiAnswers'),
    userId: v.string(), // Auth user ID
    reason: v.union(
      v.literal('spam'),
      v.literal('inappropriate'),
      v.literal('misleading'),
      v.literal('plagiarism'),
      v.literal('other')
    ),
    description: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('resolved'),
      v.literal('dismissed')
    ),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
  })
    .index('by_answer', ['answerId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_answer_user', ['answerId', 'userId']),

  // ============================================
  // Translation Phrases (翻译短语库)
  // ============================================
  translationPhrases: defineTable({
    // Category for organizing phrases
    category: v.union(
      v.literal('greeting'), // 问候语
      v.literal('transportation'), // 交通
      v.literal('dining'), // 餐饮
      v.literal('shopping'), // 购物
      v.literal('accommodation'), // 住宿
      v.literal('emergency'), // 紧急情况
      v.literal('directions'), // 问路
      v.literal('numbers'), // 数字
      v.literal('time'), // 时间
      v.literal('common') // 常用语
    ),

    // Source text and language
    sourceText: v.string(),
    sourceLang: v.string(), // e.g., 'en', 'zh', 'ja', 'ko'

    // Translations for different languages
    translations: v.array(
      v.object({
        lang: v.string(), // Target language code
        text: v.string(), // Translated text
        pinyin: v.optional(v.string()), // Pinyin for Chinese
        pronunciation: v.optional(v.string()), // Pronunciation guide
      })
    ),

    // Audio URLs for pronunciation
    audioUrls: v.optional(
      v.array(
        v.object({
          lang: v.string(),
          url: v.string(),
        })
      )
    ),

    // Usage context/examples
    usageContext: v.optional(v.string()),

    // Display order within category
    sortOrder: v.number(),

    // Offline availability
    isOfflineAvailable: v.boolean(),
  })
    .index('by_category', ['category'])
    .index('by_source_lang', ['sourceLang'])
    .index('by_category_lang', ['category', 'sourceLang'])
    .searchIndex('search_phrases', {
      searchField: 'sourceText',
      filterFields: ['category', 'sourceLang'],
    }),

  // ============================================
  // Saved Translations (用户保存的翻译)
  // ============================================
  savedTranslations: defineTable({
    userId: v.string(), // Auth user ID

    // Source content
    sourceText: v.string(),
    sourceLang: v.string(),

    // Translated content
    targetText: v.string(),
    targetLang: v.string(),

    // Translation type
    translationType: v.union(
      v.literal('text'), // 文字翻译
      v.literal('photo'), // 拍照翻译
      v.literal('voice') // 语音翻译
    ),

    // Optional media URLs
    imageUrl: v.optional(v.string()), // For photo translations
    audioUrl: v.optional(v.string()), // For voice translations

    // User preferences
    isFavorite: v.boolean(),
    usageCount: v.number(), // How many times accessed

    // Timestamps
    lastUsedAt: v.number(),
    createdAt: v.number(),

    // Optional notes
    notes: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'translationType'])
    .index('by_user_favorite', ['userId', 'isFavorite'])
    .index('by_user_last_used', ['userId', 'lastUsedAt'])
    .searchIndex('search_saved', {
      searchField: 'sourceText',
      filterFields: ['userId'],
    }),

  // ============================================
  // Offline Translation Packs (离线翻译包)
  // ============================================
  offlineTranslationPacks: defineTable({
    name: v.string(), // Pack name
    description: v.string(),

    // Language pair
    sourceLang: v.string(),
    targetLang: v.string(),

    // Pack metadata
    version: v.string(), // Version number
    phraseCount: v.number(), // Number of phrases
    downloadSize: v.number(), // Size in bytes

    // Download URL
    downloadUrl: v.string(),

    // Categories included
    categories: v.array(v.string()),

    // Status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_source_lang', ['sourceLang'])
    .index('by_target_lang', ['targetLang'])
    .index('by_lang_pair', ['sourceLang', 'targetLang'])
    .index('by_active', ['isActive']),

  // ============================================
  // User Offline Packs (用户下载的离线包)
  // ============================================
  userOfflinePacks: defineTable({
    userId: v.string(), // Auth user ID
    packId: v.id('offlineTranslationPacks'),

    // Download info
    downloadedVersion: v.string(),
    downloadedAt: v.number(),

    // Sync status
    lastSyncedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_pack', ['packId'])
    .index('by_user_pack', ['userId', 'packId']),

  // ============================================
  // POI Photos (用户上传的POI照片)
  // ============================================
  poiPhotos: defineTable({
    // Reference
    poiId: v.id('pois'),

    // User info
    userId: v.string(), // Auth user ID
    userName: v.optional(v.string()),
    userAvatarUrl: v.optional(v.string()),

    // Image data
    imageUrl: v.string(), // Full resolution image
    thumbnailUrl: v.optional(v.string()), // Thumbnail for grid display
    caption: v.optional(v.string()), // User caption/description
    width: v.optional(v.number()), // Image width in pixels
    height: v.optional(v.number()), // Image height in pixels

    // Photo category
    category: v.optional(
      v.union(
        v.literal('interior'), // Interior/indoor photos
        v.literal('exterior'), // Exterior/outdoor photos
        v.literal('food'), // Food and drinks
        v.literal('scenery'), // Scenic views
        v.literal('activity'), // Activities and experiences
        v.literal('detail'), // Close-up details
        v.literal('other') // Other/uncategorized
      )
    ),

    // Photo metadata
    takenAt: v.optional(v.number()), // When the photo was taken (EXIF data)
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ), // GPS coordinates from EXIF

    // Engagement
    likesCount: v.number(),
    viewsCount: v.number(),

    // Featured status
    isFeatured: v.boolean(), // Whether this is a featured/highlighted photo
    featuredAt: v.optional(v.number()), // When it was featured
    featuredBy: v.optional(v.string()), // Admin user ID who featured it

    // Moderation
    status: v.union(
      v.literal('pending'), // Awaiting review
      v.literal('approved'), // Approved for display
      v.literal('rejected'), // Rejected (inappropriate)
      v.literal('hidden') // Hidden by user
    ),
    moderatorNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()), // Admin user ID
    reviewedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_poi', ['poiId'])
    .index('by_user', ['userId'])
    .index('by_poi_status', ['poiId', 'status'])
    .index('by_poi_featured', ['poiId', 'isFeatured'])
    .index('by_poi_category', ['poiId', 'category'])
    .index('by_status', ['status'])
    .index('by_featured', ['isFeatured'])
    .index('by_created', ['createdAt'])
    .index('by_poi_created', ['poiId', 'createdAt'])
    .index('by_user_created', ['userId', 'createdAt']),

  // ============================================
  // POI Photo Likes (照片点赞)
  // ============================================
  poiPhotoLikes: defineTable({
    photoId: v.id('poiPhotos'),
    userId: v.string(), // Auth user ID
    createdAt: v.number(),
  })
    .index('by_photo', ['photoId'])
    .index('by_user', ['userId'])
    .index('by_photo_user', ['photoId', 'userId']),

  // ============================================
  // Flights (Flight Information Cache)
  // ============================================
  flights: defineTable({
    flightNumber: v.string(), // e.g., "CA1234"
    airline: v.string(), // e.g., "中国国航"
    airlineCode: v.string(), // e.g., "CA"
    departureAirport: v.string(), // IATA code, e.g., "PEK"
    departureAirportName: v.optional(v.string()), // e.g., "北京首都国际机场"
    departureCity: v.optional(v.string()), // e.g., "北京"
    departureTerminal: v.optional(v.string()), // e.g., "T3"
    departureGate: v.optional(v.string()), // e.g., "A12"
    arrivalAirport: v.string(), // IATA code
    arrivalAirportName: v.optional(v.string()),
    arrivalCity: v.optional(v.string()),
    arrivalTerminal: v.optional(v.string()),
    arrivalGate: v.optional(v.string()),
    departureDate: v.string(), // YYYY-MM-DD format
    scheduledDeparture: v.number(), // Unix timestamp
    scheduledArrival: v.number(), // Unix timestamp
    estimatedDeparture: v.optional(v.number()),
    estimatedArrival: v.optional(v.number()),
    actualDeparture: v.optional(v.number()),
    actualArrival: v.optional(v.number()),
    status: v.union(
      v.literal('scheduled'),
      v.literal('delayed'),
      v.literal('boarding'),
      v.literal('departed'),
      v.literal('in_air'),
      v.literal('landed'),
      v.literal('arrived'),
      v.literal('cancelled'),
      v.literal('diverted')
    ),
    aircraftType: v.optional(v.string()), // e.g., "Boeing 737-800"
    duration: v.optional(v.number()), // Duration in minutes
    distance: v.optional(v.number()), // Distance in km
    codeshares: v.optional(v.array(v.string())), // Codeshare flight numbers
    delayReason: v.optional(v.string()),
    lastUpdated: v.number(), // Unix timestamp
  })
    .index('by_flight_number', ['flightNumber'])
    .index('by_flight_number_date', ['flightNumber', 'departureDate'])
    .index('by_route', ['departureAirport', 'arrivalAirport'])
    .index('by_departure_date', ['departureDate'])
    .index('by_status', ['status']),

  // ============================================
  // Flight Bookings (User Reservations)
  // ============================================
  flightBookings: defineTable({
    userId: v.string(), // Clerk user ID
    flightId: v.id('flights'), // Reference to flight
    confirmationCode: v.string(), // PNR/Confirmation code
    passengerName: v.string(),
    passengerEmail: v.optional(v.string()),
    passengerPhone: v.optional(v.string()),
    seatNumber: v.optional(v.string()), // e.g., "12A"
    cabinClass: v.union(
      v.literal('economy'),
      v.literal('premium_economy'),
      v.literal('business'),
      v.literal('first')
    ),
    status: v.union(
      v.literal('confirmed'),
      v.literal('pending'),
      v.literal('cancelled'),
      v.literal('checked_in'),
      v.literal('boarded'),
      v.literal('completed')
    ),
    departureTime: v.number(), // Cached departure time for sorting
    arrivalTime: v.number(), // Cached arrival time
    ticketNumber: v.optional(v.string()),
    mealPreference: v.optional(v.string()), // e.g., "VGML"
    specialRequests: v.optional(v.string()),
    baggageAllowance: v.optional(v.string()), // e.g., "2x23kg"
    frequentFlyerNumber: v.optional(v.string()),
    checkInTime: v.optional(v.number()), // When user checked in
    itineraryId: v.optional(v.id('itineraries')), // Link to itinerary
    notes: v.optional(v.string()),
    importedFrom: v.optional(v.string()), // 'manual', 'email', 'api'
    rawEmailContent: v.optional(v.string()), // Original email for parsing reference
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_departure', ['userId', 'departureTime'])
    .index('by_confirmation', ['confirmationCode'])
    .index('by_flight', ['flightId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_status', ['status']),

  // ============================================
  // Visa Requirements (签证要求)
  // ============================================
  visaRequirements: defineTable({
    // Country pair
    originCountryCode: v.string(), // ISO 3166-1 alpha-2 (e.g., "CN")
    originCountryName: v.string(), // 中国
    originCountryNameEn: v.optional(v.string()), // China
    destinationCountryCode: v.string(), // ISO 3166-1 alpha-2 (e.g., "JP")
    destinationCountryName: v.string(), // 日本
    destinationCountryNameEn: v.optional(v.string()), // Japan

    // Visa type
    visaType: v.union(
      v.literal('visa_free'), // 免签
      v.literal('visa_on_arrival'), // 落地签
      v.literal('e_visa'), // 电子签证
      v.literal('standard_visa'), // 普通签证
      v.literal('transit_visa'), // 过境签
      v.literal('work_visa'), // 工作签证
      v.literal('student_visa'), // 学生签证
      v.literal('business_visa') // 商务签证
    ),
    visaTypeName: v.string(), // 免签/落地签/电子签证等
    visaTypeNameEn: v.optional(v.string()),

    // Difficulty level
    difficultyLevel: v.union(
      v.literal('very_easy'), // 非常容易（免签/落地签）
      v.literal('easy'), // 容易（电子签）
      v.literal('moderate'), // 中等
      v.literal('difficult'), // 困难
      v.literal('very_difficult') // 非常困难
    ),

    // Duration and validity
    maxStayDays: v.optional(v.number()), // 最长停留天数
    validityPeriod: v.optional(v.string()), // 有效期，如 "90天" "6个月"
    entryType: v.optional(
      v.union(v.literal('single'), v.literal('multiple'), v.literal('dual'))
    ), // 单次/多次入境

    // Processing information
    processingTime: v.optional(v.string()), // 办理时间，如 "5-7个工作日"
    processingTimeMin: v.optional(v.number()), // 最短处理天数
    processingTimeMax: v.optional(v.number()), // 最长处理天数
    expressFee: v.optional(v.number()), // 加急费用
    expressProcessingTime: v.optional(v.string()), // 加急处理时间

    // Cost information
    visaFee: v.optional(v.number()), // 签证费用
    visaFeeCurrency: v.optional(v.string()), // 货币代码，如 "CNY" "USD"
    serviceFee: v.optional(v.number()), // 服务费

    // Required documents
    requiredDocuments: v.array(
      v.object({
        name: v.string(), // 材料名称
        nameEn: v.optional(v.string()),
        description: v.optional(v.string()), // 详细说明
        isRequired: v.boolean(), // 是否必需
        notes: v.optional(v.string()), // 备注
      })
    ),

    // Application methods
    applicationMethods: v.array(
      v.object({
        method: v.union(
          v.literal('online'), // 在线申请
          v.literal('embassy'), // 大使馆
          v.literal('consulate'), // 领事馆
          v.literal('visa_center'), // 签证中心
          v.literal('on_arrival') // 到达时办理
        ),
        name: v.string(), // 方式名称
        nameEn: v.optional(v.string()),
        url: v.optional(v.string()), // 申请链接
        address: v.optional(v.string()), // 地址
        phone: v.optional(v.string()), // 电话
        email: v.optional(v.string()), // 邮箱
        notes: v.optional(v.string()), // 备注
      })
    ),

    // Entry requirements
    entryRequirements: v.optional(
      v.object({
        passportValidity: v.optional(v.string()), // 护照有效期要求，如 "6个月以上"
        blankPages: v.optional(v.number()), // 空白页要求
        onwardTicket: v.optional(v.boolean()), // 是否需要离境机票
        hotelBooking: v.optional(v.boolean()), // 是否需要酒店预订
        financialProof: v.optional(v.string()), // 财力证明要求
        invitationLetter: v.optional(v.boolean()), // 是否需要邀请函
        travelInsurance: v.optional(v.boolean()), // 是否需要旅行保险
        returnTicket: v.optional(v.boolean()), // 是否需要回程机票
        additionalRequirements: v.optional(v.array(v.string())), // 其他要求
      })
    ),

    // Special notes
    specialNotes: v.optional(v.array(v.string())), // 特别说明
    warnings: v.optional(v.array(v.string())), // 警告信息

    // E-visa specific
    eVisaUrl: v.optional(v.string()), // 电子签证申请网址
    eVisaProcessingDays: v.optional(v.number()), // 电子签证处理天数

    // Visa on arrival specific
    voaPorts: v.optional(v.array(v.string())), // 落地签口岸
    voaFee: v.optional(v.number()), // 落地签费用
    voaFeeCurrency: v.optional(v.string()), // 落地签费用货币

    // Data source
    source: v.string(), // 数据来源
    sourceUrl: v.optional(v.string()), // 来源链接
    verifiedBy: v.optional(v.string()), // 验证人
    lastVerifiedAt: v.number(), // 最后验证时间

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_origin', ['originCountryCode'])
    .index('by_destination', ['destinationCountryCode'])
    .index('by_origin_destination', [
      'originCountryCode',
      'destinationCountryCode',
    ])
    .index('by_visa_type', ['visaType'])
    .index('by_difficulty', ['difficultyLevel']),

  // ============================================
  // User Visa Reminders (用户签证提醒)
  // ============================================
  userVisaReminders: defineTable({
    userId: v.string(), // Auth user ID
    itineraryId: v.optional(v.id('itineraries')), // 关联行程
    visaRequirementId: v.optional(v.id('visaRequirements')), // 关联签证要求

    // Destination info
    destinationCountryCode: v.string(),
    destinationCountryName: v.string(),

    // Travel dates
    travelDate: v.number(), // 出行日期 Unix timestamp
    reminderDate: v.number(), // 提醒日期 Unix timestamp

    // Visa info
    visaType: v.union(
      v.literal('visa_free'),
      v.literal('visa_on_arrival'),
      v.literal('e_visa'),
      v.literal('standard_visa'),
      v.literal('transit_visa'),
      v.literal('work_visa'),
      v.literal('student_visa'),
      v.literal('business_visa')
    ),

    // Status
    status: v.union(
      v.literal('pending'), // 待提醒
      v.literal('sent'), // 已发送
      v.literal('dismissed'), // 已忽略
      v.literal('completed') // 已完成
    ),

    // Notes
    notes: v.optional(v.string()),

    // Checklist
    checklist: v.optional(
      v.array(
        v.object({
          item: v.string(),
          isCompleted: v.boolean(),
          completedAt: v.optional(v.number()),
        })
      )
    ),

    // Timestamps
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_reminder_date', ['reminderDate']),

  // ============================================
  // Visa Applications (签证申请跟踪)
  // ============================================
  visaApplications: defineTable({
    userId: v.string(), // Auth user ID
    visaRequirementId: v.optional(v.id('visaRequirements')), // 关联签证要求
    itineraryId: v.optional(v.id('itineraries')), // 关联行程

    // Destination info
    destinationCountryCode: v.string(),
    destinationCountryName: v.string(),

    // Visa type
    visaType: v.union(
      v.literal('visa_free'),
      v.literal('visa_on_arrival'),
      v.literal('e_visa'),
      v.literal('standard_visa'),
      v.literal('transit_visa'),
      v.literal('work_visa'),
      v.literal('student_visa'),
      v.literal('business_visa')
    ),

    // Application method
    applicationMethod: v.union(
      v.literal('online'),
      v.literal('embassy'),
      v.literal('consulate'),
      v.literal('visa_center'),
      v.literal('on_arrival')
    ),

    // Dates
    plannedTravelDate: v.number(), // 计划出行日期
    applicationDate: v.optional(v.number()), // 申请日期
    expectedResultDate: v.optional(v.number()), // 预计出签日期
    resultDate: v.optional(v.number()), // 实际出签日期

    // Application details
    applicationNumber: v.optional(v.string()), // 申请号
    visaNumber: v.optional(v.string()), // 签证号
    validFrom: v.optional(v.number()), // 签证有效期开始
    validUntil: v.optional(v.number()), // 签证有效期结束

    // Status
    status: v.union(
      v.literal('preparing'), // 准备中
      v.literal('submitted'), // 已提交
      v.literal('processing'), // 处理中
      v.literal('approved'), // 已批准
      v.literal('rejected'), // 已拒绝
      v.literal('cancelled') // 已取消
    ),

    // Documents tracking
    documents: v.optional(
      v.array(
        v.object({
          name: v.string(),
          status: v.union(
            v.literal('not_started'),
            v.literal('in_progress'),
            v.literal('completed')
          ),
          notes: v.optional(v.string()),
        })
      )
    ),

    // Notes
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()), // 拒签原因

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_destination', ['destinationCountryCode']),

  // ============================================
  // Visa Centers (签证中心信息)
  // ============================================
  visaCenters: defineTable({
    // Location
    countryCode: v.string(), // 所在国家
    city: v.string(), // 所在城市
    cityEn: v.optional(v.string()),

    // Target country
    targetCountryCode: v.string(), // 办理哪国签证
    targetCountryName: v.string(),
    targetCountryNameEn: v.optional(v.string()),

    // Center info
    name: v.string(), // 中心名称
    nameEn: v.optional(v.string()),
    type: v.union(
      v.literal('embassy'), // 大使馆
      v.literal('consulate'), // 领事馆
      v.literal('visa_center'), // 签证中心
      v.literal('agency') // 代理机构
    ),

    // Contact
    address: v.string(),
    addressEn: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),

    // Location
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    // Business hours
    businessHours: v.optional(
      v.object({
        monday: v.optional(v.string()),
        tuesday: v.optional(v.string()),
        wednesday: v.optional(v.string()),
        thursday: v.optional(v.string()),
        friday: v.optional(v.string()),
        saturday: v.optional(v.string()),
        sunday: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),

    // Services
    services: v.optional(v.array(v.string())), // 提供的服务
    appointmentRequired: v.boolean(), // 是否需要预约
    appointmentUrl: v.optional(v.string()), // 预约链接

    // Status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_country', ['countryCode'])
    .index('by_target_country', ['targetCountryCode'])
    .index('by_country_target', ['countryCode', 'targetCountryCode'])
    .index('by_city', ['city'])
    .index('by_type', ['type'])
    .index('by_active', ['isActive']),

  // ============================================
  // Share Links - Managed share links with permissions
  // ============================================
  shareLinks: defineTable({
    // Resource being shared
    resourceType: v.union(
      v.literal('itinerary'),
      v.literal('travelGuide'),
      v.literal('travelNote')
    ),
    resourceId: v.string(),
    ownerId: v.string(), // Auth user ID of the owner

    // Share link details
    shareCode: v.string(), // Unique short code for the link
    shareUrl: v.string(), // Full share URL

    // Platform where shared
    platform: v.union(
      v.literal('wechat'),
      v.literal('weibo'),
      v.literal('xiaohongshu'),
      v.literal('qq'),
      v.literal('douyin'),
      v.literal('copy_link'),
      v.literal('system_share'),
      v.literal('generic')
    ),

    // Access control
    permission: v.union(
      v.literal('public'), // Anyone with link can view
      v.literal('unlisted'), // Only people with link can view (not searchable)
      v.literal('private'), // Only owner and explicitly shared users can view
      v.literal('password') // Requires password to view
    ),
    password: v.optional(v.string()), // Password for password-protected links
    expiresAt: v.optional(v.number()), // Expiration timestamp
    maxViews: v.optional(v.number()), // Maximum number of views allowed

    // Permissions
    allowDownload: v.boolean(), // Allow downloading/exporting
    allowCopy: v.boolean(), // Allow copying the itinerary

    // Statistics
    viewCount: v.number(),
    clickCount: v.number(),
    saveCount: v.number(),
    lastAccessedAt: v.optional(v.number()),

    // Status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_share_code', ['shareCode'])
    .index('by_resource', ['resourceType', 'resourceId'])
    .index('by_owner', ['ownerId'])
    .index('by_owner_resource', ['ownerId', 'resourceType'])
    .index('by_active', ['isActive'])
    .index('by_expires', ['expiresAt']),

  // ============================================
  // Share Events - Track share actions
  // ============================================
  shareEvents: defineTable({
    // Resource being shared
    resourceType: v.union(
      v.literal('itinerary'),
      v.literal('travelGuide'),
      v.literal('travelNote')
    ),
    resourceId: v.string(),

    // Sharer info
    sharerId: v.optional(v.string()), // Auth user ID (optional for anonymous)
    shareLinkId: v.optional(v.id('shareLinks')), // Reference to share link if created

    // Share details
    platform: v.union(
      v.literal('wechat'),
      v.literal('weibo'),
      v.literal('xiaohongshu'),
      v.literal('qq'),
      v.literal('douyin'),
      v.literal('copy_link'),
      v.literal('system_share'),
      v.literal('generic')
    ),
    eventType: v.union(
      v.literal('share'), // Initial share action
      v.literal('click'), // Link clicked
      v.literal('view'), // Content viewed
      v.literal('save') // Content saved/copied
    ),
    shareUrl: v.optional(v.string()),

    // Timestamp
    createdAt: v.number(),
  })
    .index('by_resource', ['resourceType', 'resourceId'])
    .index('by_sharer', ['sharerId'])
    .index('by_platform', ['platform'])
    .index('by_event_type', ['eventType'])
    .index('by_created', ['createdAt'])
    .index('by_share_link', ['shareLinkId']),

  // ============================================
  // Share Event Logs - Detailed event tracking
  // ============================================
  shareEventLogs: defineTable({
    // Reference to share link (if applicable)
    shareLinkId: v.optional(v.id('shareLinks')),

    // Resource info
    resourceType: v.union(
      v.literal('itinerary'),
      v.literal('travelGuide'),
      v.literal('travelNote')
    ),
    resourceId: v.string(),

    // Event details
    platform: v.union(
      v.literal('wechat'),
      v.literal('weibo'),
      v.literal('xiaohongshu'),
      v.literal('qq'),
      v.literal('douyin'),
      v.literal('copy_link'),
      v.literal('system_share'),
      v.literal('generic')
    ),
    eventType: v.union(
      v.literal('share'),
      v.literal('click'),
      v.literal('view'),
      v.literal('save')
    ),

    // Tracking info (anonymized)
    referrer: v.optional(v.string()), // Referrer URL
    userAgent: v.optional(v.string()), // User agent string
    ipHash: v.optional(v.string()), // Hashed IP for deduplication

    // Timestamp
    createdAt: v.number(),
  })
    .index('by_share_link', ['shareLinkId'])
    .index('by_resource', ['resourceType', 'resourceId'])
    .index('by_created', ['createdAt'])
    .index('by_event_type', ['eventType']),

  // ============================================
  // Luggage (行李追踪)
  // ============================================
  luggage: defineTable({
    userId: v.string(), // Clerk user ID
    flightBookingId: v.optional(v.id('flightBookings')), // Link to flight booking
    itineraryId: v.optional(v.id('itineraries')), // Link to itinerary

    // Luggage identification
    tagNumber: v.optional(v.string()), // Airline luggage tag number
    description: v.string(), // User description, e.g., "黑色行李箱"
    color: v.optional(v.string()), // Primary color
    brand: v.optional(v.string()), // Brand name
    size: v.optional(
      v.union(
        v.literal('cabin'), // 登机箱
        v.literal('medium'), // 中型
        v.literal('large'), // 大型
        v.literal('oversized') // 超大
      )
    ),
    weight: v.optional(v.number()), // Weight in kg
    dimensions: v.optional(v.string()), // e.g., "55x40x20cm"

    // Distinguishing features
    features: v.optional(v.array(v.string())), // e.g., ["红色丝带", "贴纸"]

    // Photos
    tagPhotoUrl: v.optional(v.string()), // Photo of luggage tag
    luggagePhotoUrls: v.optional(v.array(v.string())), // Photos of the luggage

    // Status tracking
    status: v.union(
      v.literal('checked_in'), // 已托运
      v.literal('in_transit'), // 运输中
      v.literal('arrived'), // 已到达
      v.literal('claimed'), // 已领取
      v.literal('delayed'), // 延误
      v.literal('lost'), // 丢失
      v.literal('found'), // 已找到
      v.literal('damaged') // 损坏
    ),
    lastKnownLocation: v.optional(v.string()), // Last known location

    // Loss report
    lossReportFiled: v.optional(v.boolean()),
    lossReportNumber: v.optional(v.string()), // PIR number
    lossReportDate: v.optional(v.number()), // Unix timestamp
    lossReportNotes: v.optional(v.string()),

    // Airline info for tracking
    airlineCode: v.optional(v.string()), // e.g., "CA"
    airlineName: v.optional(v.string()), // e.g., "中国国航"
    airlineTrackingUrl: v.optional(v.string()), // URL to airline's baggage tracking
    airlineContactPhone: v.optional(v.string()),
    airlineContactEmail: v.optional(v.string()),

    // Reminders
    reminderEnabled: v.optional(v.boolean()),
    reminderTime: v.optional(v.number()), // Minutes before arrival to remind

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_flight_booking', ['flightBookingId'])
    .index('by_itinerary', ['itineraryId'])
    .index('by_tag_number', ['tagNumber'])
    .index('by_status', ['status']),

  // ============================================
  // Luggage Loss Report Templates (行李丢失报告模板)
  // ============================================
  luggageLossReportTemplates: defineTable({
    airlineCode: v.string(), // IATA airline code
    airlineName: v.string(),
    airlineNameEn: v.optional(v.string()),

    // Contact information
    baggageServicePhone: v.optional(v.string()),
    baggageServiceEmail: v.optional(v.string()),
    baggageServiceUrl: v.optional(v.string()),
    trackingUrl: v.optional(v.string()), // URL template for tracking

    // Report template
    reportInstructions: v.optional(v.string()), // Instructions in Chinese
    reportInstructionsEn: v.optional(v.string()),
    requiredDocuments: v.optional(v.array(v.string())), // Required documents list
    compensationPolicy: v.optional(v.string()), // Compensation policy summary
    compensationPolicyEn: v.optional(v.string()),
    maxCompensationAmount: v.optional(v.number()), // Max compensation in USD
    claimDeadlineDays: v.optional(v.number()), // Days to file claim

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_airline_code', ['airlineCode']),

  // ============================================
  // Local Events (本地活动/节日)
  // ============================================
  localEvents: defineTable({
    // Basic Information
    name: v.string(), // 活动名称
    nameEn: v.optional(v.string()), // 英文名称
    description: v.string(), // 活动描述
    descriptionEn: v.optional(v.string()), // 英文描述

    // Location
    cityId: v.id('cities'), // 所在城市
    venue: v.optional(v.string()), // 活动场地
    venueAddress: v.optional(v.string()), // 场地地址
    latitude: v.optional(v.number()), // 经度
    longitude: v.optional(v.number()), // 纬度

    // Event Type
    eventType: v.union(
      v.literal('festival'), // 节日 (春节, 中秋等)
      v.literal('concert'), // 演唱会/音乐会
      v.literal('exhibition'), // 展览
      v.literal('sports'), // 体育赛事
      v.literal('food'), // 美食节
      v.literal('cultural'), // 文化活动
      v.literal('market'), // 集市/市集
      v.literal('performance'), // 演出/表演
      v.literal('religious'), // 宗教活动
      v.literal('seasonal'), // 季节性活动 (赏花, 赏月)
      v.literal('local_custom'), // 地方习俗
      v.literal('other') // 其他
    ),

    // Date and Time
    startDate: v.string(), // ISO date string YYYY-MM-DD
    endDate: v.string(), // ISO date string YYYY-MM-DD
    startTime: v.optional(v.string()), // HH:MM format
    endTime: v.optional(v.string()), // HH:MM format
    isAllDay: v.boolean(), // 是否全天活动
    isRecurring: v.boolean(), // 是否为周期性活动

    // Recurring pattern (for festivals that happen every year)
    recurrencePattern: v.optional(
      v.object({
        type: v.union(
          v.literal('yearly'), // 每年
          v.literal('monthly'), // 每月
          v.literal('weekly') // 每周
        ),
        // For lunar calendar events (e.g., Chinese New Year)
        isLunarCalendar: v.optional(v.boolean()),
        lunarMonth: v.optional(v.number()), // 农历月份
        lunarDay: v.optional(v.number()), // 农历日期
        // For solar calendar events
        month: v.optional(v.number()), // 公历月份 (1-12)
        day: v.optional(v.number()), // 公历日期 (1-31)
        weekOfMonth: v.optional(v.number()), // 每月第几周 (1-5)
        dayOfWeek: v.optional(v.number()), // 星期几 (0=Sunday, 6=Saturday)
      })
    ),

    // Ticket Information
    isFree: v.boolean(), // 是否免费
    ticketPrice: v.optional(v.number()), // 票价
    ticketPriceMax: v.optional(v.number()), // 最高票价
    currency: v.optional(v.string()), // 货币代码
    ticketUrl: v.optional(v.string()), // 购票链接
    requiresBooking: v.optional(v.boolean()), // 是否需要预约

    // Content
    coverImageUrl: v.optional(v.string()), // 封面图片
    imageUrls: v.optional(v.array(v.string())), // 活动图片
    highlights: v.optional(v.array(v.string())), // 活动亮点
    tips: v.optional(v.array(v.string())), // 参与提示
    tags: v.optional(v.array(v.string())), // 标签

    // Contact Information
    organizerName: v.optional(v.string()), // 主办方
    organizerPhone: v.optional(v.string()), // 联系电话
    organizerEmail: v.optional(v.string()), // 联系邮箱
    officialWebsite: v.optional(v.string()), // 官方网站

    // Engagement Metrics
    viewCount: v.number(), // 浏览次数
    saveCount: v.number(), // 收藏次数
    rating: v.optional(v.number()), // 评分 (1-5)
    ratingCount: v.optional(v.number()), // 评分人数

    // Status
    status: v.union(
      v.literal('upcoming'), // 即将开始
      v.literal('ongoing'), // 进行中
      v.literal('ended'), // 已结束
      v.literal('cancelled') // 已取消
    ),
    isVerified: v.boolean(), // 是否经过验证
    isFeatured: v.optional(v.boolean()), // 是否为精选活动

    // Data Source
    source: v.optional(v.string()), // 数据来源
    sourceUrl: v.optional(v.string()), // 来源链接
    externalId: v.optional(v.string()), // 外部ID

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_city', ['cityId'])
    .index('by_city_type', ['cityId', 'eventType'])
    .index('by_city_status', ['cityId', 'status'])
    .index('by_city_dates', ['cityId', 'startDate', 'endDate'])
    .index('by_type', ['eventType'])
    .index('by_status', ['status'])
    .index('by_start_date', ['startDate'])
    .index('by_featured', ['isFeatured'])
    .index('by_recurring', ['isRecurring']),

  // ============================================
  // Event Favorites (活动收藏)
  // ============================================
  eventFavorites: defineTable({
    userId: v.string(), // Auth user ID
    eventId: v.id('localEvents'),
    notes: v.optional(v.string()), // 用户备注
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_event', ['eventId'])
    .index('by_user_event', ['userId', 'eventId'])
    .index('by_user_created', ['userId', 'createdAt']),

  // ============================================
  // Event Reminders (活动提醒)
  // ============================================
  eventReminders: defineTable({
    userId: v.string(), // Auth user ID
    eventId: v.id('localEvents'),

    // Reminder Settings
    reminderType: v.union(
      v.literal('event_start'), // 活动开始提醒
      v.literal('booking_open'), // 开放预约提醒
      v.literal('custom') // 自定义时间提醒
    ),
    reminderTime: v.number(), // Unix timestamp - 提醒时间
    minutesBefore: v.optional(v.number()), // 提前多少分钟提醒

    // Custom message
    message: v.optional(v.string()), // 自定义提醒消息

    // Status
    isTriggered: v.boolean(), // 是否已触发
    triggeredAt: v.optional(v.number()), // 触发时间
    isRead: v.boolean(), // 是否已读
    readAt: v.optional(v.number()), // 阅读时间

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_event', ['eventId'])
    .index('by_user_event', ['userId', 'eventId'])
    .index('by_reminder_time', ['reminderTime'])
    .index('by_triggered', ['isTriggered'])
    .index('by_user_triggered', ['userId', 'isTriggered']),

  // ============================================
  // Event Reviews (活动评价)
  // ============================================
  eventReviews: defineTable({
    eventId: v.id('localEvents'),
    userId: v.string(), // Auth user ID

    // Ratings
    rating: v.number(), // 综合评分 1-5
    atmosphereRating: v.optional(v.number()), // 氛围评分
    organizationRating: v.optional(v.number()), // 组织评分
    valueRating: v.optional(v.number()), // 性价比评分

    // Content
    content: v.string(), // 评价内容
    attendDate: v.optional(v.string()), // 参加日期 YYYY-MM-DD
    imageUrls: v.optional(v.array(v.string())), // 评价图片

    // Pros and Cons
    pros: v.optional(v.array(v.string())), // 优点
    cons: v.optional(v.array(v.string())), // 缺点
    wouldRecommend: v.boolean(), // 是否推荐

    // Engagement
    helpfulCount: v.number(), // 有用数
    reportCount: v.number(), // 举报数

    // Status
    isVerified: v.boolean(), // 是否已验证参加
    status: v.union(
      v.literal('pending'), // 待审核
      v.literal('approved'), // 已通过
      v.literal('rejected') // 已拒绝
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId'])
    .index('by_event_user', ['eventId', 'userId'])
    .index('by_rating', ['rating'])
    .index('by_event_rating', ['eventId', 'rating'])
    .index('by_status', ['status']),

  // ============================================
  // Event Review Votes (评价投票)
  // ============================================
  eventReviewVotes: defineTable({
    reviewId: v.id('eventReviews'),
    userId: v.string(),
    voteType: v.union(v.literal('helpful'), v.literal('not_helpful')),
    createdAt: v.number(),
  })
    .index('by_review', ['reviewId'])
    .index('by_user', ['userId'])
    .index('by_review_user', ['reviewId', 'userId']),

  // ============================================
  // User Preferences (用户偏好学习)
  // ============================================
  userPreferences: defineTable({
    userId: v.string(), // Auth user ID

    // Learned category scores (from behavior tracking)
    categoryScores: v.any(), // Record<string, number> - category -> score

    // Explicit user preferences (manually set)
    explicitPreferences: v.array(
      v.union(
        v.literal('food'),
        v.literal('culture'),
        v.literal('nature'),
        v.literal('shopping'),
        v.literal('nightlife'),
        v.literal('adventure'),
        v.literal('relaxation'),
        v.literal('photography'),
        v.literal('family'),
        v.literal('budget'),
        v.literal('luxury')
      )
    ),

    // Travel style preferences
    travelStyle: v.union(
      v.literal('adventurous'),
      v.literal('relaxed'),
      v.literal('cultural'),
      v.literal('balanced')
    ),

    // Budget preference
    budgetLevel: v.union(
      v.literal('budget'),
      v.literal('moderate'),
      v.literal('luxury')
    ),

    // Pace preference
    pacePreference: v.union(
      v.literal('slow'),
      v.literal('moderate'),
      v.literal('fast')
    ),

    // Additional preferences
    preferLocalFood: v.boolean(),
    preferOffBeatPlaces: v.boolean(),
    accessibilityNeeds: v.boolean(),

    // Statistics
    totalInteractions: v.number(),

    // Timestamps
    createdAt: v.optional(v.number()),
    lastUpdated: v.number(),
  }).index('by_user', ['userId']),

  // ============================================
  // User Behavior Events (用户行为事件)
  // ============================================
  userBehaviorEvents: defineTable({
    userId: v.string(), // Auth user ID

    // Behavior type
    behaviorType: v.union(
      v.literal('view'),
      v.literal('save'),
      v.literal('unsave'),
      v.literal('copy'),
      v.literal('share'),
      v.literal('like'),
      v.literal('unlike'),
      v.literal('search'),
      v.literal('poi_click'),
      v.literal('poi_add')
    ),

    // Target information
    targetType: v.union(
      v.literal('guide'),
      v.literal('itinerary'),
      v.literal('poi'),
      v.literal('city'),
      v.literal('search')
    ),
    targetId: v.string(),

    // Associated categories
    categories: v.array(
      v.union(
        v.literal('food'),
        v.literal('culture'),
        v.literal('nature'),
        v.literal('shopping'),
        v.literal('nightlife'),
        v.literal('adventure'),
        v.literal('relaxation'),
        v.literal('photography'),
        v.literal('family'),
        v.literal('budget'),
        v.literal('luxury')
      )
    ),

    // Additional metadata
    metadata: v.any(), // { duration?, scrollDepth?, searchQuery?, cityName?, poiCategory? }

    // Timestamp
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'behaviorType'])
    .index('by_target', ['targetType', 'targetId'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Itinerary Versions (行程版本历史)
  // ============================================
  itineraryVersions: defineTable({
    itineraryId: v.id('itineraries'),
    userId: v.string(), // User who created this version

    // Version metadata
    versionNumber: v.number(), // Auto-incremented version number
    versionNote: v.optional(v.string()), // User-provided note describing this version

    // Snapshot of itinerary at this version
    snapshot: v.object({
      title: v.string(),
      cityId: v.id('cities'),
      startDate: v.string(), // ISO date string YYYY-MM-DD
      endDate: v.string(),
      visibility: v.union(
        v.literal('private'),
        v.literal('team'),
        v.literal('public')
      ),
      coverImageUrl: v.optional(v.string()),
      // Days snapshot with items
      days: v.array(
        v.object({
          dayNumber: v.number(),
          date: v.string(),
          items: v.array(
            v.object({
              poiId: v.id('pois'),
              orderIndex: v.number(),
              startTime: v.optional(v.string()),
              endTime: v.optional(v.string()),
              transportMode: v.union(
                v.literal('walking'),
                v.literal('driving'),
                v.literal('transit'),
                v.literal('cycling'),
                v.literal('taxi')
              ),
              notes: v.optional(v.string()),
            })
          ),
        })
      ),
    }),

    // Version comparison metadata
    changesSummary: v.optional(v.string()), // Auto-generated summary of changes
    changesCount: v.optional(
      v.object({
        daysAdded: v.number(),
        daysRemoved: v.number(),
        itemsAdded: v.number(),
        itemsRemoved: v.number(),
        itemsModified: v.number(),
      })
    ),

    // Timestamps
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_itinerary', ['itineraryId'])
    .index('by_itinerary_version', ['itineraryId', 'versionNumber'])
    .index('by_user', ['userId'])
    .index('by_created', ['createdAt']),

  // ============================================
  // POI Questions & Answers (Q&A Community) - Extended
  // ============================================

  /**
   * Questions about POIs - Extended
   * Users can ask questions about specific points of interest
   */
  poiQuestionsExtended: defineTable({
    poiId: v.id('pois'), // The POI this question is about
    userId: v.string(), // Auth user ID of the question author

    // Question content
    title: v.string(), // Question title (max 200 chars)
    content: v.string(), // Question body (max 5000 chars)

    // Author info (denormalized for performance)
    authorName: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),

    // Engagement metrics
    upvotesCount: v.number(), // Number of upvotes
    downvotesCount: v.number(), // Number of downvotes
    answersCount: v.number(), // Number of answers
    viewsCount: v.number(), // Number of views

    // Best answer
    bestAnswerId: v.optional(v.id('poiAnswers')), // Marked best answer
    hasBestAnswer: v.boolean(), // Quick flag for filtering

    // Status
    status: v.union(
      v.literal('open'), // Accepting answers
      v.literal('closed'), // No longer accepting answers
      v.literal('resolved') // Has a best answer
    ),
    isEdited: v.boolean(),
    isDeleted: v.boolean(),

    // Moderation
    reportCount: v.number(),
    isHidden: v.boolean(), // Hidden by moderator

    // Tags for categorization
    tags: v.optional(v.array(v.string())),

    // Timestamps
    createdAt: v.number(), // Unix timestamp
    updatedAt: v.optional(v.number()),
    lastActivityAt: v.number(), // Updated when new answer is posted
  })
    .index('by_poi', ['poiId'])
    .index('by_poi_status', ['poiId', 'status'])
    .index('by_user', ['userId'])
    .index('by_created', ['createdAt'])
    .index('by_last_activity', ['lastActivityAt'])
    .index('by_upvotes', ['upvotesCount'])
    .index('by_poi_created', ['poiId', 'createdAt'])
    .searchIndex('search_questions', {
      searchField: 'title',
      filterFields: ['poiId', 'status', 'isDeleted'],
    }),

  /**
   * Answers to POI questions - Extended
   */
  poiAnswersExtended: defineTable({
    questionId: v.id('poiQuestions'), // The question this answers
    poiId: v.id('pois'), // Denormalized for easier queries
    userId: v.string(), // Auth user ID of the answer author

    // Answer content
    content: v.string(), // Answer body (max 10000 chars)

    // Author info (denormalized for performance)
    authorName: v.optional(v.string()),
    authorAvatarUrl: v.optional(v.string()),

    // Engagement metrics
    upvotesCount: v.number(),
    downvotesCount: v.number(),

    // Best answer status
    isBestAnswer: v.boolean(), // Marked as best by question author

    // Status
    isEdited: v.boolean(),
    isDeleted: v.boolean(),

    // Moderation
    reportCount: v.number(),
    isHidden: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_question', ['questionId'])
    .index('by_question_best', ['questionId', 'isBestAnswer'])
    .index('by_user', ['userId'])
    .index('by_poi', ['poiId'])
    .index('by_created', ['createdAt'])
    .index('by_upvotes', ['upvotesCount']),

  /**
   * Question votes (upvotes/downvotes)
   * One vote per user per question
   */
  poiQuestionVotes: defineTable({
    questionId: v.id('poiQuestions'),
    userId: v.string(), // Auth user ID
    voteType: v.union(v.literal('up'), v.literal('down')),
    createdAt: v.number(),
  })
    .index('by_question', ['questionId'])
    .index('by_user', ['userId'])
    .index('by_question_user', ['questionId', 'userId']),

  /**
   * Answer votes (upvotes/downvotes)
   * One vote per user per answer
   */
  poiAnswerVotes: defineTable({
    answerId: v.id('poiAnswers'),
    userId: v.string(), // Auth user ID
    voteType: v.union(v.literal('up'), v.literal('down')),
    createdAt: v.number(),
  })
    .index('by_answer', ['answerId'])
    .index('by_user', ['userId'])
    .index('by_answer_user', ['answerId', 'userId']),

  /**
   * Q&A reports for moderation
   */
  poiQAReports: defineTable({
    // Target (either question or answer)
    targetType: v.union(v.literal('question'), v.literal('answer')),
    targetId: v.string(), // Question or Answer ID

    // Reporter
    userId: v.string(), // Auth user ID of reporter

    // Report details
    reason: v.union(
      v.literal('spam'),
      v.literal('inappropriate'),
      v.literal('misleading'),
      v.literal('off_topic'),
      v.literal('harassment'),
      v.literal('other')
    ),
    description: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('dismissed'),
      v.literal('actioned')
    ),
    reviewedBy: v.optional(v.string()), // Admin user ID
    reviewedAt: v.optional(v.number()),
    actionTaken: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
  })
    .index('by_target', ['targetType', 'targetId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Content Translations
  // ============================================

  /**
   * Content translations for various entities
   */
  contentTranslations: defineTable({
    entityType: v.string(), // Type of entity being translated
    entityId: v.string(), // ID of the entity
    field: v.string(), // Field name being translated
    language: v.string(), // Target language code
    value: v.string(), // Translated value
    isAutoTranslated: v.boolean(), // Whether auto-translated
    translatedBy: v.optional(v.string()), // User ID or service name
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_entity', ['entityType', 'entityId'])
    .index('by_entity_field_language', [
      'entityType',
      'entityId',
      'field',
      'language',
    ])
    .index('by_type', ['entityType']),

  // ============================================
  // OTP Authentication (Phone Login)
  // ============================================

  /**
   * OTP verification codes for phone login
   */
  otpCodes: defineTable({
    phone: v.string(),
    code: v.string(),
    attempts: v.number(),
    expiresAt: v.number(), // Unix timestamp in milliseconds
  }).index('by_phone', ['phone']),

  /**
   * Rate limiting for OTP and other operations
   */
  rateLimits: defineTable({
    key: v.string(), // e.g., "hourly:{phone}" or "daily:{phone}"
    count: v.number(),
    expiresAt: v.number(), // Unix timestamp in milliseconds
  }).index('by_key', ['key']),

  // ============================================
  // Food Reviews & Collections
  // ============================================

  /**
   * Food reviews for restaurants
   */
  foodReviews: defineTable({
    restaurantId: v.id('pois'),
    userId: v.string(),
    rating: v.number(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    dishesOrdered: v.optional(v.array(v.string())),
    recommendedDishes: v.optional(v.array(v.string())),
    pricePerPerson: v.optional(v.number()),
    visitDate: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    wouldRecommend: v.boolean(),
    helpfulCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_restaurant_user', ['restaurantId', 'userId'])
    .index('by_user', ['userId']),

  /**
   * Tracks users marking food reviews as helpful
   */
  foodReviewHelpful: defineTable({
    reviewId: v.id('foodReviews'),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index('by_review', ['reviewId'])
    .index('by_review_user', ['reviewId', 'userId'])
    .index('by_user', ['userId']),

  /**
   * User's favorite restaurants
   */
  foodFavorites: defineTable({
    userId: v.string(),
    restaurantId: v.id('pois'),
    collectionId: v.optional(v.id('foodCollections')),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_restaurant', ['userId', 'restaurantId'])
    .index('by_collection', ['collectionId']),

  /**
   * Food collections for organizing favorite restaurants
   */
  foodCollections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    itemCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_public', ['isPublic']),

  // ============================================
  // Currency Rates Cache (汇率缓存)
  // ============================================

  /**
   * Cached exchange rates for a base currency
   */
  currencyRates: defineTable({
    base: v.string(), // ISO 4217 currency code (e.g., 'CNY', 'USD')
    rates: v.any(), // Record<string, number> - rates for all target currencies
    fetchedAt: v.number(), // Unix timestamp in milliseconds
  })
    .index('by_base', ['base'])
    .index('by_fetched_at', ['fetchedAt']),

  /**
   * Cached exchange rate history for currency pairs
   */
  currencyHistory: defineTable({
    base: v.string(), // Base currency code
    target: v.string(), // Target currency code
    days: v.number(), // Number of days in history
    data: v.object({
      base: v.string(),
      target: v.string(),
      rates: v.array(
        v.object({
          date: v.string(), // ISO date string YYYY-MM-DD
          rate: v.number(),
        })
      ),
      change: v.number(), // Percentage change over the period
      trend: v.union(v.literal('up'), v.literal('down'), v.literal('stable')),
    }),
    fetchedAt: v.number(), // Unix timestamp in milliseconds
  })
    .index('by_pair', ['base', 'target'])
    .index('by_pair_days', ['base', 'target', 'days'])
    .index('by_fetched_at', ['fetchedAt']),

  // ============================================
  // Agent Sessions (LangGraph Memory)
  // ============================================
  agentSessions: defineTable({
    sessionId: v.string(), // Unique session identifier
    userId: v.optional(v.string()), // Auth user ID (optional for anonymous)
    sessionType: v.union(
      v.literal('chat'), // General chat
      v.literal('travel_plan'), // Travel planning session
      v.literal('enrichment') // Content enrichment task
    ),
    status: v.union(
      v.literal('active'),
      v.literal('paused'), // Waiting for user input (interrupt)
      v.literal('completed'),
      v.literal('expired')
    ),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal('human'),
          v.literal('ai'),
          v.literal('system'),
          v.literal('tool')
        ),
        content: v.string(),
        toolCalls: v.optional(v.any()), // Tool call info if role is 'tool'
        toolName: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
    // Session metadata
    metadata: v.optional(v.any()), // Custom metadata (destination, dates, etc.)
    currentNode: v.optional(v.string()), // Current graph node (for resume)
    interruptData: v.optional(v.any()), // Data passed to interrupt()
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()), // Optional session expiry
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'sessionType'])
    .index('by_status', ['status'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Agent Checkpoints (LangGraph State Persistence)
  // ============================================
  agentCheckpoints: defineTable({
    threadId: v.string(), // Thread identifier (matches sessionId)
    checkpointNs: v.string(), // Checkpoint namespace
    checkpointId: v.string(), // Unique checkpoint identifier
    parentCheckpointId: v.optional(v.string()), // Parent checkpoint for history
    // Checkpoint data
    channelValues: v.any(), // Serialized channel state
    channelVersions: v.any(), // Channel version tracking
    versionsSeen: v.any(), // Versions seen by each node
    pendingSends: v.optional(v.array(v.any())), // Pending message sends
    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_ns', ['threadId', 'checkpointNs'])
    .index('by_thread_ns_id', ['threadId', 'checkpointNs', 'checkpointId'])
    .index('by_created', ['createdAt']),
});
