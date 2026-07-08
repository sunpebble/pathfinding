/**
 * POIs schema - points of interest.
 */
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── JSON column type definitions ───────────────────────
/** Business hours per day of week */
export type BusinessHours = Record<string, { open: string; close: string } | null>;
/** Best time to visit a POI */
export interface BestVisitTime { season?: string; timeOfDay?: string; notes?: string }
/** Local recommendation details */
export interface LocalRecommendation { tip?: string; reason?: string; source?: string }

// ── POIs ───────────────────────────────────────────────
export const pois = sqliteTable(
  'pois',
  {
    id: id(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    nameEn: text('name_en'),
    category: text('category').notNull(),
    cityId: fk('city_id').notNull(),
    address: text('address'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    rating: real('rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    priceLevel: integer('price_level'),
    businessHours: text('business_hours', { mode: 'json' }).$type<BusinessHours>(),
    bestVisitTime: text('best_visit_time', { mode: 'json' }).$type<BestVisitTime>(),
    phone: text('phone'),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>(),
    source: text('source').notNull(),
    isHiddenGem: integer('is_hidden_gem', { mode: 'boolean' }),
    hiddenGemScore: real('hidden_gem_score'),
    hiddenGemRating: real('hidden_gem_rating'),
    hiddenGemRatingCount: integer('hidden_gem_rating_count'),
    localRecommendation: text('local_recommendation', { mode: 'json' }).$type<LocalRecommendation>(),
    popularityLevel: text('popularity_level'),
    cuisineType: text('cuisine_type'),
    isLocalFavorite: integer('is_local_favorite', { mode: 'boolean' }),
    signatureDishes: text('signature_dishes', { mode: 'json' }).$type<string[]>(),
    dietaryOptions: text('dietary_options', { mode: 'json' }).$type<string[]>(),
    averagePrice: real('average_price'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('pois_city_idx').on(t.cityId),
    index('pois_category_idx').on(t.category),
    index('pois_city_category_idx').on(t.cityId, t.category),
    index('pois_external_source_idx').on(t.externalId, t.source),
    index('pois_hidden_gem_idx').on(t.isHiddenGem),
    index('pois_city_hidden_gem_idx').on(t.cityId, t.isHiddenGem),
    index('pois_popularity_idx').on(t.popularityLevel),
  ],
);
