/**
 * Travel Partners schema - partner requests, match applications, matches, saves.
 */
import { double, index, int, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const travelPartnerRequests = mysqlTable('travel_partner_requests', {
  id: id(),
  userId: fk('user_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  destination: varchar('destination', { length: 255 }),
  cityId: fk('city_id'),
  startDate: varchar('start_date', { length: 10 }),
  endDate: varchar('end_date', { length: 10 }),
  travelStyle: varchar('travel_style', { length: 50 }),
  budgetLevel: varchar('budget_level', { length: 30 }),
  maxPartners: int('max_partners').notNull().default(1),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('partner_req_user_idx').on(t.userId),
  index('partner_req_status_idx').on(t.status),
  index('partner_req_dest_idx').on(t.destination),
  index('partner_req_city_idx').on(t.cityId),
  index('partner_req_dates_idx').on(t.startDate),
  index('partner_req_status_dates_idx').on(t.status, t.startDate),
  index('partner_req_created_idx').on(t.createdAt),
]);

export const partnerMatchApplications = mysqlTable('partner_match_applications', {
  id: id(),
  requestId: fk('request_id').notNull(),
  applicantId: fk('applicant_id').notNull(),
  ownerId: fk('owner_id').notNull(),
  message: text('message'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  matchScore: double('match_score'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('partner_apps_request_idx').on(t.requestId),
  index('partner_apps_applicant_idx').on(t.applicantId),
  index('partner_apps_owner_idx').on(t.ownerId),
  index('partner_apps_req_status_idx').on(t.requestId, t.status),
  index('partner_apps_app_status_idx').on(t.applicantId, t.status),
  index('partner_apps_own_status_idx').on(t.ownerId, t.status),
  index('partner_apps_score_idx').on(t.matchScore),
]);

export const partnerMatches = mysqlTable('partner_matches', {
  id: id(),
  requestId: fk('request_id').notNull(),
  ownerId: fk('owner_id').notNull(),
  partnerId: fk('partner_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  destination: varchar('destination', { length: 255 }),
  startDate: varchar('start_date', { length: 10 }),
  endDate: varchar('end_date', { length: 10 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('partner_matches_request_idx').on(t.requestId),
  index('partner_matches_owner_idx').on(t.ownerId),
  index('partner_matches_partner_idx').on(t.partnerId),
  index('partner_matches_status_idx').on(t.status),
  index('partner_matches_dest_idx').on(t.destination),
  index('partner_matches_dates_idx').on(t.startDate),
]);

export const partnerRequestSaves = mysqlTable('partner_request_saves', {
  id: id(),
  userId: fk('user_id').notNull(),
  requestId: fk('request_id').notNull(),
  createdAt: createdAt(),
}, t => [
  index('partner_saves_user_idx').on(t.userId),
  index('partner_saves_request_idx').on(t.requestId),
  index('partner_saves_pair_idx').on(t.userId, t.requestId),
]);
