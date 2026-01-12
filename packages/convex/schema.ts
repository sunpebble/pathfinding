import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Pathfinding Database Schema
 * Migrated from Supabase PostgreSQL to Convex
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
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index('by_email', ['email']),

  // ============================================
  // Reference Data
  // ============================================
  cities: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    timezone: v.string(),
    countryCode: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_country', ['countryCode']),

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
    businessHours: v.optional(v.any()),
    phone: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    source: v.string(),
  })
    .index('by_city', ['cityId'])
    .index('by_category', ['category'])
    .index('by_city_category', ['cityId', 'category'])
    .index('by_external_source', ['externalId', 'source']),

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
      v.literal('tripadvisor')
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
            })
          ),
        })
      )
    ),
  })
    .index('by_platform', ['sourcePlatform'])
    .index('by_platform_external', ['sourcePlatform', 'sourceExternalId'])
    .index('by_quality', ['qualityScore'])
    .index('by_destinations', ['destinations']),

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
});
