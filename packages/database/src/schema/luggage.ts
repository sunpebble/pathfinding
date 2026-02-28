/**
 * Luggage schema - luggage tracking, loss report templates.
 */
import { double, index, json, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const luggage = mysqlTable('luggage', {
  id: id(),
  userId: fk('user_id').notNull(),
  flightBookingId: fk('flight_booking_id'),
  itineraryId: fk('itinerary_id'),
  description: varchar('description', { length: 500 }),
  tagNumber: varchar('tag_number', { length: 100 }),
  color: varchar('color', { length: 50 }),
  brand: varchar('brand', { length: 100 }),
  weight: double('weight'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  imageUrls: json('image_urls'),
  lastLocationDescription: text('last_location_description'),
  lastLocationTime: timestamp('last_location_time', { mode: 'date' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('luggage_user_idx').on(t.userId),
  index('luggage_user_status_idx').on(t.userId, t.status),
  index('luggage_flight_idx').on(t.flightBookingId),
  index('luggage_itin_idx').on(t.itineraryId),
  index('luggage_tag_idx').on(t.tagNumber),
  index('luggage_status_idx').on(t.status),
]);

export const luggageLossReportTemplates = mysqlTable('luggage_loss_report_templates', {
  id: id(),
  airlineCode: varchar('airline_code', { length: 10 }).notNull(),
  airlineName: varchar('airline_name', { length: 255 }),
  templateContent: text('template_content'),
  requiredFields: json('required_fields'),
  contactInfo: json('contact_info'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [index('luggage_loss_tpl_airline_idx').on(t.airlineCode)]);
