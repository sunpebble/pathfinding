/**
 * EV Charging schema - charging stations, reviews, favorites.
 */
import {
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const chargingStations = mysqlTable(
  'charging_stations',
  {
    id: id(),
    name: varchar('name', { length: 255 }).notNull(),
    cityId: fk('city_id'),
    address: text('address'),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    operator: varchar('operator', { length: 255 }),
    stationType: varchar('station_type', { length: 30 }),
    connectorTypes: json('connector_types'),
    maxPower: double('max_power'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    pricing: json('pricing'),
    amenities: json('amenities'),
    sourceId: varchar('source_id', { length: 255 }),
    source: varchar('source', { length: 50 }),
    rating: double('rating'),
    ratingCount: int('rating_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('charging_stations_city_idx').on(t.cityId),
    index('charging_stations_status_idx').on(t.status),
    index('charging_stations_operator_idx').on(t.operator),
    index('charging_stations_type_idx').on(t.stationType),
    index('charging_stations_source_idx').on(t.source),
    index('charging_stations_ext_idx').on(t.sourceId),
    index('charging_stations_city_status_idx').on(t.cityId, t.status),
  ],
);

export const chargingStationReviews = mysqlTable(
  'charging_station_reviews',
  {
    id: id(),
    stationId: fk('station_id').notNull(),
    userId: fk('user_id').notNull(),
    rating: double('rating').notNull(),
    comment: text('comment'),
    chargingSpeed: varchar('charging_speed', { length: 20 }),
    availability: varchar('availability', { length: 20 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('cs_reviews_station_idx').on(t.stationId),
    index('cs_reviews_user_idx').on(t.userId),
    index('cs_reviews_rating_idx').on(t.rating),
    index('cs_reviews_station_rating_idx').on(t.stationId, t.rating),
  ],
);

export const favoriteChargingStations = mysqlTable(
  'favorite_charging_stations',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    stationId: fk('station_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('fav_cs_user_idx').on(t.userId),
    index('fav_cs_station_idx').on(t.stationId),
    index('fav_cs_pair_idx').on(t.userId, t.stationId),
  ],
);
