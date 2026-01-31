import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Travel Statistics - Queries and Mutations
 */

// Get user's travel statistics
export const getByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query('travelStats')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    return stats;
  },
});

// Calculate and update user's travel statistics
export const calculate = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get all user's itineraries
    const itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    if (itineraries.length === 0) {
      // Create or update empty stats
      const existingStats = await ctx.db
        .query('travelStats')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .first();

      const emptyStats = {
        userId: args.userId,
        totalTrips: 0,
        totalDays: 0,
        totalDistance: 0,
        totalCities: 0,
        totalCountries: 0,
        totalPois: 0,
        totalExpenses: 0,
        expensesByCategory: [],
        averageExpensePerDay: 0,
        averageExpensePerTrip: 0,
        topDestinations: [],
        preferredTransportModes: [],
        preferredPoiCategories: [],
        monthlyTripCounts: [],
        lastCalculatedAt: now,
        createdAt: existingStats?.createdAt ?? now,
        updatedAt: now,
      };

      if (existingStats) {
        await ctx.db.patch(existingStats._id, emptyStats);
        return existingStats._id;
      }
      else {
        return await ctx.db.insert('travelStats', emptyStats);
      }
    }

    // Calculate days per itinerary
    const itineraryDaysData = itineraries.map((it) => {
      const start = new Date(it.startDate);
      const end = new Date(it.endDate);
      const days
        = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          + 1;
      return { itinerary: it, days };
    });

    const totalTrips = itineraries.length;
    const totalDays = itineraryDaysData.reduce((sum, d) => sum + d.days, 0);

    // Get unique cities
    const cityIds = [...new Set(itineraries.map(it => it.cityId))];
    const cities = await Promise.all(cityIds.map(id => ctx.db.get(id)));
    const totalCities = cityIds.length;

    // Get unique countries from cities
    const countryCodes = new Set(
      cities.filter(c => c).map(c => c!.countryCode),
    );
    const totalCountries = countryCodes.size;

    // Get all POIs visited
    let totalPois = 0;
    const transportModeCount: Record<string, number> = {};
    const poiCategoryCount: Record<string, number> = {};

    for (const it of itineraries) {
      const days = await ctx.db
        .query('itineraryDays')
        .withIndex('by_itinerary', q => q.eq('itineraryId', it._id))
        .collect();

      for (const day of days) {
        const items = await ctx.db
          .query('itineraryItems')
          .withIndex('by_day', q => q.eq('dayId', day._id))
          .collect();

        totalPois += items.length;

        for (const item of items) {
          // Count transport modes
          transportModeCount[item.transportMode]
            = (transportModeCount[item.transportMode] || 0) + 1;

          // Get POI category
          const poi = await ctx.db.get(item.poiId);
          if (poi) {
            poiCategoryCount[poi.category]
              = (poiCategoryCount[poi.category] || 0) + 1;
          }
        }
      }
    }

    // Find longest and shortest trips
    const sortedByDays = [...itineraryDaysData].sort((a, b) => b.days - a.days);
    const longestTrip = sortedByDays[0]
      ? {
          itineraryId: sortedByDays[0].itinerary._id,
          title: sortedByDays[0].itinerary.title,
          days: sortedByDays[0].days,
          startDate: sortedByDays[0].itinerary.startDate,
          endDate: sortedByDays[0].itinerary.endDate,
        }
      : undefined;

    const shortestTrip
      = sortedByDays.length > 0
        ? {
            itineraryId: sortedByDays[sortedByDays.length - 1].itinerary._id,
            title: sortedByDays[sortedByDays.length - 1].itinerary.title,
            days: sortedByDays[sortedByDays.length - 1].days,
            startDate:
              sortedByDays[sortedByDays.length - 1].itinerary.startDate,
            endDate: sortedByDays[sortedByDays.length - 1].itinerary.endDate,
          }
        : undefined;

    // Get expenses
    const expenses = await ctx.db
      .query('expenses')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate expense by category
    const expenseByCategory: Record<
      string,
      { categoryId: Id<'expenseCategories'>; amount: number }
    > = {};
    for (const expense of expenses) {
      const key = expense.categoryId;
      if (!expenseByCategory[key]) {
        expenseByCategory[key] = { categoryId: expense.categoryId, amount: 0 };
      }
      expenseByCategory[key].amount += expense.amount;
    }

    // Get category names
    const expensesByCategory = await Promise.all(
      Object.values(expenseByCategory).map(async (ec) => {
        const category = await ctx.db.get(ec.categoryId);
        return {
          categoryId: ec.categoryId,
          categoryName: category?.name ?? 'Unknown',
          amount: ec.amount,
          percentage: totalExpenses > 0 ? (ec.amount / totalExpenses) * 100 : 0,
        };
      }),
    );

    // Calculate top destinations
    const cityVisitCount: Record<
      string,
      { cityId: Id<'cities'>; visitCount: number; totalDays: number }
    > = {};
    for (const { itinerary, days } of itineraryDaysData) {
      const key = itinerary.cityId;
      if (!cityVisitCount[key]) {
        cityVisitCount[key] = {
          cityId: itinerary.cityId,
          visitCount: 0,
          totalDays: 0,
        };
      }
      cityVisitCount[key].visitCount += 1;
      cityVisitCount[key].totalDays += days;
    }

    const topDestinations = await Promise.all(
      Object.values(cityVisitCount)
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 5)
        .map(async (cv) => {
          const city = await ctx.db.get(cv.cityId);
          return {
            cityId: cv.cityId,
            cityName: city?.name ?? 'Unknown',
            visitCount: cv.visitCount,
            totalDays: cv.totalDays,
          };
        }),
    );

    // Calculate preferred transport modes
    const totalTransportModes = Object.values(transportModeCount).reduce(
      (sum, c) => sum + c,
      0,
    );
    const preferredTransportModes = Object.entries(transportModeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([mode, count]) => ({
        mode,
        count,
        percentage:
          totalTransportModes > 0 ? (count / totalTransportModes) * 100 : 0,
      }));

    // Calculate preferred POI categories
    const totalPoiCategories = Object.values(poiCategoryCount).reduce(
      (sum, c) => sum + c,
      0,
    );
    const preferredPoiCategories = Object.entries(poiCategoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        percentage:
          totalPoiCategories > 0 ? (count / totalPoiCategories) * 100 : 0,
      }));

    // Calculate monthly trip counts
    const monthlyCount: Record<number, number> = {};
    for (const it of itineraries) {
      const month = new Date(it.startDate).getMonth() + 1; // 1-12
      monthlyCount[month] = (monthlyCount[month] || 0) + 1;
    }
    const monthlyTripCounts = Object.entries(monthlyCount).map(
      ([month, count]) => ({
        month: Number.parseInt(month),
        count,
      }),
    );

    // Create stats object
    const stats = {
      userId: args.userId,
      totalTrips,
      totalDays,
      totalDistance: 0, // Would need route calculation
      totalCities,
      totalCountries,
      totalPois,
      longestTrip,
      shortestTrip,
      totalExpenses,
      expensesByCategory,
      averageExpensePerDay: totalDays > 0 ? totalExpenses / totalDays : 0,
      averageExpensePerTrip: totalTrips > 0 ? totalExpenses / totalTrips : 0,
      topDestinations,
      preferredTransportModes,
      preferredPoiCategories,
      monthlyTripCounts,
      lastCalculatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Check if stats exist
    const existingStats = await ctx.db
      .query('travelStats')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (existingStats) {
      await ctx.db.patch(existingStats._id, {
        ...stats,
        createdAt: existingStats.createdAt,
      });
      return existingStats._id;
    }
    else {
      return await ctx.db.insert('travelStats', stats);
    }
  },
});

// Get quick stats summary (lighter query)
export const getQuickStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query('travelStats')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!stats) {
      return {
        totalTrips: 0,
        totalDays: 0,
        totalCities: 0,
        totalExpenses: 0,
      };
    }

    return {
      totalTrips: stats.totalTrips,
      totalDays: stats.totalDays,
      totalCities: stats.totalCities,
      totalExpenses: stats.totalExpenses,
    };
  },
});
