import { v } from 'convex/values';

/**
 * Single time period (open-close)
 */
export const timePeriodValidator = v.object({
  /** Opening time in HH:MM format */
  open: v.string(),
  /** Closing time in HH:MM format */
  close: v.string(),
});

/**
 * Array of time periods for a single day
 * Supports multiple periods (e.g., lunch break)
 */
export const dayHoursValidator = v.optional(v.array(timePeriodValidator));

/**
 * Business hours validator matching the pois table structure
 * Used for normalizedPois.businessHours and pois.businessHours
 *
 * @example
 * businessHours: businessHoursValidator
 */
export const businessHoursValidator = v.union(
  v.object({
    /** Monday hours */
    monday: dayHoursValidator,
    /** Tuesday hours */
    tuesday: dayHoursValidator,
    /** Wednesday hours */
    wednesday: dayHoursValidator,
    /** Thursday hours */
    thursday: dayHoursValidator,
    /** Friday hours */
    friday: dayHoursValidator,
    /** Saturday hours */
    saturday: dayHoursValidator,
    /** Sunday hours */
    sunday: dayHoursValidator,
    /** IANA timezone identifier (e.g., "Asia/Shanghai") */
    timezone: v.optional(v.string()),
    /** Additional notes about hours */
    notes: v.optional(v.string()),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Strict version without legacy fallback - use for new data only
 */
export const businessHoursStrictValidator = v.object({
  monday: dayHoursValidator,
  tuesday: dayHoursValidator,
  wednesday: dayHoursValidator,
  thursday: dayHoursValidator,
  friday: dayHoursValidator,
  saturday: dayHoursValidator,
  sunday: dayHoursValidator,
  timezone: v.optional(v.string()),
  notes: v.optional(v.string()),
});
