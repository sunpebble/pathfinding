/**
 * Safety schema - safety ratings, alerts, danger zones, incident reports,
 * emergency contacts/services, SOS alerts.
 */
import {
  boolean,
  double,
  index,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

// ── Safety Ratings ─────────────────────────────────────
export const safetyRatings = mysqlTable(
  'safety_ratings',
  {
    id: id(),
    destination: varchar('destination', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    city: varchar('city', { length: 255 }),
    overallRating: double('overall_rating').notNull(),
    crimeRating: double('crime_rating'),
    healthRating: double('health_rating'),
    naturalDisasterRating: double('natural_disaster_rating'),
    infrastructureRating: double('infrastructure_rating'),
    detailedRatings: json('detailed_ratings'),
    lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('safety_ratings_dest_idx').on(t.destination),
    index('safety_ratings_country_idx').on(t.countryCode),
    index('safety_ratings_city_idx').on(t.city),
    index('safety_ratings_overall_idx').on(t.overallRating),
  ],
);

// ── Safety Alerts ──────────────────────────────────────
export const safetyAlerts = mysqlTable(
  'safety_alerts',
  {
    id: id(),
    destination: varchar('destination', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    city: varchar('city', { length: 255 }),
    alertType: varchar('alert_type', { length: 30 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    recommendations: json('recommendations'),
    isActive: boolean('is_active').notNull().default(true),
    startsAt: timestamp('starts_at', { mode: 'date' }),
    endsAt: timestamp('ends_at', { mode: 'date' }),
    source: varchar('source', { length: 100 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('safety_alerts_dest_idx').on(t.destination),
    index('safety_alerts_country_idx').on(t.countryCode),
    index('safety_alerts_city_idx').on(t.city),
    index('safety_alerts_type_idx').on(t.alertType),
    index('safety_alerts_severity_idx').on(t.severity),
    index('safety_alerts_active_idx').on(t.isActive),
    index('safety_alerts_active_dest_idx').on(t.isActive, t.destination),
  ],
);

// ── Danger Zones ───────────────────────────────────────
export const dangerZones = mysqlTable(
  'danger_zones',
  {
    id: id(),
    destination: varchar('destination', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    city: varchar('city', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    dangerLevel: varchar('danger_level', { length: 20 }).notNull(),
    dangerType: varchar('danger_type', { length: 50 }),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    radius: double('radius'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('danger_zones_dest_idx').on(t.destination),
    index('danger_zones_country_idx').on(t.countryCode),
    index('danger_zones_city_idx').on(t.city),
    index('danger_zones_level_idx').on(t.dangerLevel),
    index('danger_zones_active_idx').on(t.isActive),
    index('danger_zones_location_idx').on(t.latitude, t.longitude),
  ],
);

// ── Safety Incident Reports ───────────────────────────
export const safetyIncidentReports = mysqlTable(
  'safety_incident_reports',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    destination: varchar('destination', { length: 255 }).notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    city: varchar('city', { length: 255 }),
    incidentType: varchar('incident_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    severity: varchar('severity', { length: 20 }),
    latitude: double('latitude'),
    longitude: double('longitude'),
    occurredAt: timestamp('occurred_at', { mode: 'date' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('safety_incidents_user_idx').on(t.userId),
    index('safety_incidents_dest_idx').on(t.destination),
    index('safety_incidents_country_idx').on(t.countryCode),
    index('safety_incidents_city_idx').on(t.city),
    index('safety_incidents_type_idx').on(t.incidentType),
    index('safety_incidents_status_idx').on(t.status),
    index('safety_incidents_date_idx').on(t.occurredAt),
  ],
);

// ── Emergency Contacts ─────────────────────────────────
export const emergencyContacts = mysqlTable(
  'emergency_contacts',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    relationship: varchar('relationship', { length: 50 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('emergency_contacts_user_idx').on(t.userId),
    index('emergency_contacts_user_primary_idx').on(t.userId, t.isPrimary),
  ],
);

// ── Emergency Services ─────────────────────────────────
export const emergencyServices = mysqlTable(
  'emergency_services',
  {
    id: id(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    city: varchar('city', { length: 255 }),
    police: varchar('police', { length: 50 }),
    ambulance: varchar('ambulance', { length: 50 }),
    fire: varchar('fire', { length: 50 }),
    embassy: json('embassy'),
    otherNumbers: json('other_numbers'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('emergency_services_country_idx').on(t.countryCode),
    index('emergency_services_country_city_idx').on(t.countryCode, t.city),
  ],
);

// ── SOS Alerts ─────────────────────────────────────────
export const sosAlerts = mysqlTable(
  'sos_alerts',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    message: text('message'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    contactsNotified: json('contacts_notified'),
    resolvedAt: timestamp('resolved_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('sos_alerts_user_idx').on(t.userId),
    index('sos_alerts_user_status_idx').on(t.userId, t.status),
    index('sos_alerts_status_idx').on(t.status),
  ],
);
