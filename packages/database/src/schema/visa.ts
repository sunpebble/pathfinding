/**
 * Visa schema - requirements, reminders, applications, visa centers.
 */
import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const visaRequirements = mysqlTable(
  'visa_requirements',
  {
    id: id(),
    originCountry: varchar('origin_country', { length: 10 }).notNull(),
    destinationCountry: varchar('destination_country', { length: 10 }).notNull(),
    visaType: varchar('visa_type', { length: 30 }),
    isRequired: boolean('is_required').notNull(),
    duration: int('duration'),
    processingTime: varchar('processing_time', { length: 100 }),
    fee: double('fee'),
    currency: varchar('currency', { length: 10 }),
    requirements: json('requirements'),
    notes: text('notes'),
    difficulty: varchar('difficulty', { length: 20 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('visa_req_origin_idx').on(t.originCountry),
    index('visa_req_dest_idx').on(t.destinationCountry),
    index('visa_req_origin_dest_idx').on(t.originCountry, t.destinationCountry),
    index('visa_req_type_idx').on(t.visaType),
    index('visa_req_difficulty_idx').on(t.difficulty),
  ],
);

export const userVisaReminders = mysqlTable(
  'user_visa_reminders',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id'),
    destination: varchar('destination', { length: 255 }),
    reminderDate: timestamp('reminder_date', { mode: 'date' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    message: text('message'),
    createdAt: createdAt(),
  },
  t => [
    index('visa_reminders_user_idx').on(t.userId),
    index('visa_reminders_itin_idx').on(t.itineraryId),
    index('visa_reminders_status_idx').on(t.status),
    index('visa_reminders_user_status_idx').on(t.userId, t.status),
    index('visa_reminders_date_idx').on(t.reminderDate),
  ],
);

export const visaApplications = mysqlTable(
  'visa_applications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id'),
    destinationCountry: varchar('destination_country', { length: 10 }).notNull(),
    visaType: varchar('visa_type', { length: 30 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    applicationDate: varchar('application_date', { length: 10 }),
    expectedDate: varchar('expected_date', { length: 10 }),
    documents: json('documents'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('visa_apps_user_idx').on(t.userId),
    index('visa_apps_itin_idx').on(t.itineraryId),
    index('visa_apps_status_idx').on(t.status),
    index('visa_apps_user_status_idx').on(t.userId, t.status),
    index('visa_apps_dest_idx').on(t.destinationCountry),
  ],
);

export const visaCenters = mysqlTable(
  'visa_centers',
  {
    id: id(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    targetCountry: varchar('target_country', { length: 10 }).notNull(),
    city: varchar('city', { length: 255 }),
    name: varchar('name', { length: 500 }).notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 50 }),
    website: text('website'),
    centerType: varchar('center_type', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    workingHours: json('working_hours'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('visa_centers_country_idx').on(t.countryCode),
    index('visa_centers_target_idx').on(t.targetCountry),
    index('visa_centers_country_target_idx').on(t.countryCode, t.targetCountry),
    index('visa_centers_city_idx').on(t.city),
    index('visa_centers_type_idx').on(t.centerType),
    index('visa_centers_active_idx').on(t.isActive),
  ],
);
