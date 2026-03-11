/**
 * Insurance schema - products, user insurance, risk profiles, claim guides.
 */
import { boolean, double, index, int, json, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const insuranceProducts = mysqlTable('insurance_products', {
  id: id(),
  name: varchar('name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  productType: varchar('product_type', { length: 30 }).notNull(),
  description: text('description'),
  coverage: json('coverage'),
  price: double('price'),
  currency: varchar('currency', { length: 10 }),
  isDomestic: boolean('is_domestic'),
  isActive: boolean('is_active').notNull().default(true),
  priority: int('priority').notNull().default(0),
  rating: double('rating'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('ins_products_type_idx').on(t.productType),
  index('ins_products_provider_idx').on(t.provider),
  index('ins_products_active_idx').on(t.isActive),
  index('ins_products_domestic_idx').on(t.isDomestic),
  index('ins_products_priority_idx').on(t.priority),
]);

export const userInsurance = mysqlTable('user_insurance', {
  id: id(),
  userId: fk('user_id').notNull(),
  productId: fk('product_id').notNull(),
  itineraryId: fk('itinerary_id'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  policyNumber: varchar('policy_number', { length: 100 }),
  startDate: varchar('start_date', { length: 10 }),
  endDate: varchar('end_date', { length: 10 }),
  purchasePrice: double('purchase_price'),
  currency: varchar('currency', { length: 10 }),
  metadata: json('metadata'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('user_ins_user_idx').on(t.userId),
  index('user_ins_product_idx').on(t.productId),
  index('user_ins_itin_idx').on(t.itineraryId),
  index('user_ins_status_idx').on(t.status),
  index('user_ins_user_status_idx').on(t.userId, t.status),
]);

export const destinationRiskProfiles = mysqlTable('destination_risk_profiles', {
  id: id(),
  destination: varchar('destination', { length: 255 }).notNull(),
  countryCode: varchar('country_code', { length: 10 }),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),
  riskFactors: json('risk_factors'),
  recommendedCoverage: json('recommended_coverage'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('risk_profiles_dest_idx').on(t.destination),
  index('risk_profiles_code_idx').on(t.countryCode),
  index('risk_profiles_level_idx').on(t.riskLevel),
]);

export const insuranceClaimGuides = mysqlTable('insurance_claim_guides', {
  id: id(),
  claimType: varchar('claim_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content'),
  steps: json('steps'),
  requiredDocuments: json('required_documents'),
  isActive: boolean('is_active').notNull().default(true),
  priority: int('priority').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('claim_guides_type_idx').on(t.claimType),
  index('claim_guides_active_idx').on(t.isActive),
  index('claim_guides_priority_idx').on(t.priority),
]);

export const travelInsurance = mysqlTable('travel_insurance', {
  id: id(),
  userId: fk('user_id').notNull(),
  policyNumber: varchar('policy_number', { length: 100 }),
  provider: varchar('provider', { length: 255 }),
  coverageType: varchar('coverage_type', { length: 50 }),
  startDate: varchar('start_date', { length: 10 }),
  endDate: varchar('end_date', { length: 10 }),
  isActive: boolean('is_active').notNull().default(true),
  details: json('details'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('travel_ins_user_idx').on(t.userId),
  index('travel_ins_user_active_idx').on(t.userId, t.isActive),
]);
