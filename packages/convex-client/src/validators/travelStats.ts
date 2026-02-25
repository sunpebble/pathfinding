import { v } from "convex/values";

/**
 * Yearly travel statistics
 */
export const yearlyStatsEntryValidator = v.object({
  /** Number of cities visited */
  cities: v.optional(v.number()),
  /** Number of countries visited */
  countries: v.optional(v.number()),
  /** Number of trips taken */
  trips: v.optional(v.number()),
  /** Total travel days */
  days: v.optional(v.number()),
  /** Total distance traveled (km) */
  distance: v.optional(v.number()),
  /** Total expenses */
  expenses: v.optional(v.number()),
  /** Most visited city that year */
  topCity: v.optional(v.string()),
  /** Most visited country that year */
  topCountry: v.optional(v.string()),
});

/**
 * Yearly stats validator (object keyed by year)
 * Used for travelStats.yearlyStats field
 *
 * @example
 * yearlyStats: yearlyStatsValidator
 *
 * // Data format:
 * {
 *   "2024": { cities: 5, countries: 2, trips: 3 },
 *   "2025": { cities: 8, countries: 4, trips: 5 }
 * }
 */
export const yearlyStatsValidator = v.union(
  v.record(
    v.string(), // Year as string key (e.g., "2024")
    yearlyStatsEntryValidator,
  ),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Strict version without legacy fallback - use for new data only
 */
export const yearlyStatsStrictValidator = v.record(
  v.string(),
  yearlyStatsEntryValidator,
);
