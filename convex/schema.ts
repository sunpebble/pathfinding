import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // 用户表 (合并 auth.users + profiles)
  users: defineTable({
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    expoPushToken: v.optional(v.string()),
  })
    .index('by_phone', ['phone'])
    .index('by_email', ['email']),

  // 城市表
  cities: defineTable({
    name: v.string(),
    nameEn: v.optional(v.string()),
    country: v.string(),
    countryCode: v.string(),
    timezone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    imageUrl: v.optional(v.string()),
  }).index('by_country', ['countryCode']),

  // 兴趣点表
  pois: defineTable({
    cityId: v.id('cities'),
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    description: v.optional(v.string()),
    descriptionEn: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    openingHours: v.optional(v.any()),
    priceLevel: v.optional(v.number()),
    rating: v.optional(v.number()),
    imageUrls: v.optional(v.array(v.string())),
    externalId: v.optional(v.string()),
    externalSource: v.optional(v.string()),
  })
    .index('by_city', ['cityId'])
    .index('by_city_category', ['cityId', 'category'])
    .index('by_external', ['externalSource', 'externalId']),

  // 行程表
  itineraries: defineTable({
    userId: v.id('users'),
    cityId: v.id('cities'),
    title: v.string(),
    startDate: v.string(), // ISO date string YYYY-MM-DD
    endDate: v.string(),
    visibility: v.union(v.literal('private'), v.literal('public')),
    coverImageUrl: v.optional(v.string()),
    copyCount: v.optional(v.number()),
    sourceItineraryId: v.optional(v.id('itineraries')),
  })
    .index('by_user', ['userId'])
    .index('by_visibility', ['visibility'])
    .index('by_city_public', ['cityId', 'visibility']),

  // 行程天数表
  itineraryDays: defineTable({
    itineraryId: v.id('itineraries'),
    dayNumber: v.number(),
    date: v.string(), // ISO date string YYYY-MM-DD
  }).index('by_itinerary', ['itineraryId']),

  // 行程项目表
  itineraryItems: defineTable({
    dayId: v.id('itineraryDays'),
    poiId: v.optional(v.id('pois')),
    orderIndex: v.number(),
    startTime: v.optional(v.string()), // HH:mm format
    endTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    transportMode: v.optional(v.string()),
    transportMinutes: v.optional(v.number()),
  })
    .index('by_day', ['dayId'])
    .index('by_poi', ['poiId']),

  // 提醒表
  reminders: defineTable({
    itemId: v.id('itineraryItems'),
    userId: v.id('users'),
    minutesBefore: v.number(),
    scheduledAt: v.number(), // Unix timestamp in milliseconds
    sentAt: v.optional(v.number()),
  })
    .index('by_item', ['itemId'])
    .index('by_user', ['userId'])
    .index('by_scheduled', ['scheduledAt']),

  // OTP 验证码表 (用于手机登录)
  otpCodes: defineTable({
    phone: v.string(),
    code: v.string(),
    attempts: v.number(),
    expiresAt: v.number(), // Unix timestamp in milliseconds
  }).index('by_phone', ['phone']),

  // 速率限制表
  rateLimits: defineTable({
    key: v.string(), // e.g., "hourly:{phone}" or "daily:{phone}"
    count: v.number(),
    expiresAt: v.number(), // Unix timestamp in milliseconds
  }).index('by_key', ['key']),
});
