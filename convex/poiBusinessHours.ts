/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * POI Business Hours - Queries and Mutations
 * Manages business hours, holiday hours, and reminders for POIs
 */

// ============================================
// Business Hours Types
// ============================================

const timeSlotValidator = v.object({
  open: v.string(), // HH:MM format
  close: v.string(), // HH:MM format
});

const businessHoursValidator = v.object({
  monday: v.optional(v.array(timeSlotValidator)),
  tuesday: v.optional(v.array(timeSlotValidator)),
  wednesday: v.optional(v.array(timeSlotValidator)),
  thursday: v.optional(v.array(timeSlotValidator)),
  friday: v.optional(v.array(timeSlotValidator)),
  saturday: v.optional(v.array(timeSlotValidator)),
  sunday: v.optional(v.array(timeSlotValidator)),
  timezone: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const bestVisitTimeValidator = v.object({
  recommendedTime: v.optional(v.string()),
  reason: v.optional(v.string()),
  avoidTimes: v.optional(v.array(v.string())),
  peakHours: v.optional(v.array(v.string())),
  seasonalNotes: v.optional(v.string()),
});

const reminderTypeValidator = v.union(
  v.literal("opening"),
  v.literal("closing"),
  v.literal("best_time"),
);

// ============================================
// Helper Functions
// ============================================

/**
 * Get the day of week as a lowercase string
 */
function getDayOfWeek(date: Date): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if current time is within a time slot
 */
function isWithinTimeSlot(
  currentMinutes: number,
  slot: { open: string; close: string },
): boolean {
  const openMinutes = parseTimeToMinutes(slot.open);
  const closeMinutes = parseTimeToMinutes(slot.close);

  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// ============================================
// Business Hours Queries
// ============================================

/**
 * Get POI with business hours and open/closed status
 */
export const getPoiWithBusinessHours = query({
  args: {
    poiId: v.id("pois"),
    timezone: v.optional(v.string()), // Client's timezone for accurate status
  },
  handler: async (ctx, args) => {
    const poi = await ctx.db.get(args.poiId);
    if (!poi) return null;

    // Get today's date in the POI's timezone or client's timezone
    const now = new Date();
    const dayOfWeek = getDayOfWeek(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check regular business hours
    const businessHours = poi.businessHours as
      | Record<string, unknown>
      | undefined;
    const todayHours = businessHours?.[dayOfWeek] as
      | Array<{ open: string; close: string }>
      | undefined;

    let isOpen = false;
    let nextOpenTime: string | null = null;
    let nextCloseTime: string | null = null;

    if (todayHours && todayHours.length > 0) {
      for (const slot of todayHours) {
        if (isWithinTimeSlot(currentMinutes, slot)) {
          isOpen = true;
          nextCloseTime = slot.close;
          break;
        }
        // Find next opening time
        const openMinutes = parseTimeToMinutes(slot.open);
        if (openMinutes > currentMinutes && !nextOpenTime) {
          nextOpenTime = slot.open;
        }
      }
    }

    // Check for holiday hours that might override
    const today = now.toISOString().split("T")[0];
    const holidayHours = await ctx.db
      .query("poiHolidayHours")
      .withIndex("by_poi", (q) => q.eq("poiId", args.poiId))
      .filter((q) =>
        q.and(
          q.lte(q.field("startDate"), today),
          q.gte(q.field("endDate"), today),
        ),
      )
      .first();

    let holidayInfo = null;
    if (holidayHours) {
      holidayInfo = {
        holidayName: holidayHours.holidayName,
        holidayNameEn: holidayHours.holidayNameEn,
        isClosed: holidayHours.isClosed,
        hours: holidayHours.hours,
        notes: holidayHours.notes,
      };

      // Override open status based on holiday hours
      if (holidayHours.isClosed) {
        isOpen = false;
        nextOpenTime = null;
        nextCloseTime = null;
      } else if (holidayHours.hours && holidayHours.hours.length > 0) {
        isOpen = false;
        for (const slot of holidayHours.hours) {
          if (isWithinTimeSlot(currentMinutes, slot)) {
            isOpen = true;
            nextCloseTime = slot.close;
            break;
          }
        }
      }
    }

    return {
      poi,
      openStatus: {
        isOpen,
        nextOpenTime,
        nextCloseTime,
        currentDay: dayOfWeek,
        todayHours,
        holidayInfo,
      },
      bestVisitTime: poi.bestVisitTime,
    };
  },
});

/**
 * Get business hours for multiple POIs
 */
export const getBatchPoiBusinessHours = query({
  args: {
    poiIds: v.array(v.id("pois")),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      poiId: Id<"pois">;
      businessHours: unknown;
      bestVisitTime: unknown;
    }> = [];

    for (const poiId of args.poiIds) {
      const poi = await ctx.db.get(poiId);
      if (poi) {
        results.push({
          poiId,
          businessHours: poi.businessHours,
          bestVisitTime: poi.bestVisitTime,
        });
      }
    }

    return results;
  },
});

// ============================================
// Holiday Hours Queries
// ============================================

/**
 * Get holiday hours for a POI
 */
export const getHolidayHours = query({
  args: {
    poiId: v.id("pois"),
    includeExpired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];

    let query = ctx.db
      .query("poiHolidayHours")
      .withIndex("by_poi", (q) => q.eq("poiId", args.poiId));

    if (!args.includeExpired) {
      query = query.filter((q) => q.gte(q.field("endDate"), today));
    }

    return await query.collect();
  },
});

/**
 * Get upcoming holidays for a date range
 */
export const getUpcomingHolidays = query({
  args: {
    poiId: v.id("pois"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("poiHolidayHours")
      .withIndex("by_poi_dates", (q) =>
        q
          .eq("poiId", args.poiId)
          .gte("startDate", args.startDate)
          .lte("startDate", args.endDate),
      )
      .collect();
  },
});

// ============================================
// Business Hours Mutations
// ============================================

/**
 * Update business hours for a POI
 */
export const updateBusinessHours = mutation({
  args: {
    poiId: v.id("pois"),
    businessHours: businessHoursValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.poiId, {
      businessHours: args.businessHours,
    });
    return await ctx.db.get(args.poiId);
  },
});

/**
 * Update best visit time for a POI
 */
export const updateBestVisitTime = mutation({
  args: {
    poiId: v.id("pois"),
    bestVisitTime: bestVisitTimeValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.poiId, {
      bestVisitTime: args.bestVisitTime,
    });
    return await ctx.db.get(args.poiId);
  },
});

// ============================================
// Holiday Hours Mutations
// ============================================

/**
 * Create holiday hours for a POI
 */
export const createHolidayHours = mutation({
  args: {
    poiId: v.id("pois"),
    holidayName: v.string(),
    holidayNameEn: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    isClosed: v.boolean(),
    hours: v.optional(v.array(timeSlotValidator)),
    notes: v.optional(v.string()),
    isRecurring: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("poiHolidayHours", {
      poiId: args.poiId,
      holidayName: args.holidayName,
      holidayNameEn: args.holidayNameEn,
      startDate: args.startDate,
      endDate: args.endDate,
      isClosed: args.isClosed,
      hours: args.hours,
      notes: args.notes,
      isRecurring: args.isRecurring,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update holiday hours
 */
export const updateHolidayHours = mutation({
  args: {
    id: v.id("poiHolidayHours"),
    holidayName: v.optional(v.string()),
    holidayNameEn: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isClosed: v.optional(v.boolean()),
    hours: v.optional(v.array(timeSlotValidator)),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Delete holiday hours
 */
export const deleteHolidayHours = mutation({
  args: {
    id: v.id("poiHolidayHours"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================
// Business Hours Reminders
// ============================================

/**
 * Create a business hours reminder
 */
export const createReminder = mutation({
  args: {
    userId: v.string(),
    poiId: v.id("pois"),
    itineraryItemId: v.optional(v.id("itineraryItems")),
    reminderType: reminderTypeValidator,
    minutesBefore: v.number(),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("poiBusinessHoursReminders", {
      userId: args.userId,
      poiId: args.poiId,
      itineraryItemId: args.itineraryItemId,
      reminderType: args.reminderType,
      minutesBefore: args.minutesBefore,
      scheduledTime: args.scheduledTime,
      isTriggered: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get user's reminders
 */
export const getUserReminders = query({
  args: {
    userId: v.string(),
    includeTriggered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("poiBusinessHoursReminders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (!args.includeTriggered) {
      query = query.filter((q) => q.eq(q.field("isTriggered"), false));
    }

    const reminders = await query.collect();

    // Enrich with POI data
    const enrichedReminders = await Promise.all(
      reminders.map(async (reminder) => {
        const poi = await ctx.db.get(reminder.poiId);
        return {
          ...reminder,
          poi: poi
            ? {
                id: poi._id,
                name: poi.name,
                category: poi.category,
                address: poi.address,
              }
            : null,
        };
      }),
    );

    return enrichedReminders;
  },
});

/**
 * Get pending reminders for processing
 */
export const getPendingReminders = query({
  args: {
    beforeTime: v.number(), // Unix timestamp
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("poiBusinessHoursReminders")
      .withIndex("by_scheduled_time")
      .filter((q) =>
        q.and(
          q.lte(q.field("scheduledTime"), args.beforeTime),
          q.eq(q.field("isTriggered"), false),
        ),
      )
      .collect();
  },
});

/**
 * Mark reminder as triggered
 */
export const triggerReminder = mutation({
  args: {
    id: v.id("poiBusinessHoursReminders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isTriggered: true,
      triggeredAt: Date.now(),
    });
  },
});

/**
 * Delete a reminder
 */
export const deleteReminder = mutation({
  args: {
    id: v.id("poiBusinessHoursReminders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Delete all reminders for a POI
 */
export const deletePoiReminders = mutation({
  args: {
    userId: v.string(),
    poiId: v.id("pois"),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("poiBusinessHoursReminders")
      .withIndex("by_user_poi", (q) =>
        q.eq("userId", args.userId).eq("poiId", args.poiId),
      )
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    return reminders.length;
  },
});
