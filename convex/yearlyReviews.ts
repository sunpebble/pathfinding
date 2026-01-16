import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Yearly Reviews - Annual Travel Summary Queries and Mutations
 */

// Get yearly review for a specific year
export const getByYear = query({
  args: {
    userId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db
      .query('yearlyReviews')
      .withIndex('by_user_year', (q) =>
        q.eq('userId', args.userId).eq('year', args.year)
      )
      .first();

    return review;
  },
});

// Get all yearly reviews for a user
export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query('yearlyReviews')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    return reviews;
  },
});

// Get available years for a user (years with data)
export const getAvailableYears = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const years = new Set(
      itineraries.map((it) => new Date(it.startDate).getFullYear())
    );

    return Array.from(years).sort((a, b) => b - a);
  },
});

// Helper function to calculate days between dates
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

// Generate yearly review for a specific year
export const generate = mutation({
  args: {
    userId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if review already exists
    const existingReview = await ctx.db
      .query('yearlyReviews')
      .withIndex('by_user_year', (q) =>
        q.eq('userId', args.userId).eq('year', args.year)
      )
      .first();

    // Create placeholder if needed
    const reviewId =
      existingReview?._id ??
      (await ctx.db.insert('yearlyReviews', {
        userId: args.userId,
        year: args.year,
        tripsCount: 0,
        daysCount: 0,
        citiesCount: 0,
        countriesCount: 0,
        poisCount: 0,
        totalDistance: 0,
        totalExpenses: 0,
        expenseBreakdown: [],
        averagePerTrip: 0,
        averagePerDay: 0,
        topCities: [],
        monthlyActivity: [],
        achievements: [],
        status: 'generating',
        createdAt: now,
        updatedAt: now,
      }));

    // Mark as generating
    await ctx.db.patch(reviewId, { status: 'generating', updatedAt: now });

    try {
      // Get itineraries for this year
      const allItineraries = await ctx.db
        .query('itineraries')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();

      const itineraries = allItineraries.filter((it) => {
        const year = new Date(it.startDate).getFullYear();
        return year === args.year;
      });

      if (itineraries.length === 0) {
        await ctx.db.patch(reviewId, {
          status: 'ready',
          generatedAt: now,
          updatedAt: now,
        });
        return reviewId;
      }

      // Calculate basic stats
      const tripsCount = itineraries.length;
      const itineraryDaysData = itineraries.map((it) => ({
        itinerary: it,
        days: calculateDays(it.startDate, it.endDate),
      }));
      const daysCount = itineraryDaysData.reduce((sum, d) => sum + d.days, 0);

      // Get unique cities and countries
      const cityIds = [...new Set(itineraries.map((it) => it.cityId))];
      const cities = await Promise.all(cityIds.map((id) => ctx.db.get(id)));
      const citiesCount = cityIds.length;
      const countryCodes = new Set(
        cities.filter((c) => c).map((c) => c!.countryCode)
      );
      const countriesCount = countryCodes.size;

      // Count POIs
      let poisCount = 0;
      for (const it of itineraries) {
        const days = await ctx.db
          .query('itineraryDays')
          .withIndex('by_itinerary', (q) => q.eq('itineraryId', it._id))
          .collect();

        for (const day of days) {
          const items = await ctx.db
            .query('itineraryItems')
            .withIndex('by_day', (q) => q.eq('dayId', day._id))
            .collect();
          poisCount += items.length;
        }
      }

      // Get expenses for this year
      const allExpenses = await ctx.db
        .query('expenses')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();

      const yearExpenses = allExpenses.filter((e) => {
        const year = new Date(e.date).getFullYear();
        return year === args.year;
      });

      const totalExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Calculate expense breakdown
      const expenseByCategory: Record<
        string,
        { categoryId: Id<'expenseCategories'>; amount: number }
      > = {};
      for (const expense of yearExpenses) {
        const key = expense.categoryId;
        if (!expenseByCategory[key]) {
          expenseByCategory[key] = {
            categoryId: expense.categoryId,
            amount: 0,
          };
        }
        expenseByCategory[key].amount += expense.amount;
      }

      const expenseBreakdown = await Promise.all(
        Object.values(expenseByCategory).map(async (ec) => {
          const category = await ctx.db.get(ec.categoryId);
          return {
            categoryId: ec.categoryId,
            categoryName: category?.name ?? 'Unknown',
            icon: category?.icon,
            amount: ec.amount,
            percentage:
              totalExpenses > 0 ? (ec.amount / totalExpenses) * 100 : 0,
          };
        })
      );

      // Find most expensive trip
      let mostExpensiveTrip:
        | { itineraryId: Id<'itineraries'>; title: string; amount: number }
        | undefined;
      let maxTripExpense = 0;

      for (const it of itineraries) {
        const tripExpenses = yearExpenses.filter(
          (e) => e.itineraryId === it._id
        );
        const tripTotal = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
        if (tripTotal > maxTripExpense) {
          maxTripExpense = tripTotal;
          mostExpensiveTrip = {
            itineraryId: it._id,
            title: it.title,
            amount: tripTotal,
          };
        }
      }

      // Find first and last trip of year
      const sortedByDate = [...itineraries].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      const firstTrip = sortedByDate[0];
      const lastTrip = sortedByDate[sortedByDate.length - 1];
      const firstCity = firstTrip ? await ctx.db.get(firstTrip.cityId) : null;
      const lastCity = lastTrip ? await ctx.db.get(lastTrip.cityId) : null;

      const firstTripOfYear = firstTrip
        ? {
            itineraryId: firstTrip._id,
            title: firstTrip.title,
            cityName: firstCity?.name ?? 'Unknown',
            startDate: firstTrip.startDate,
          }
        : undefined;

      const lastTripOfYear = lastTrip
        ? {
            itineraryId: lastTrip._id,
            title: lastTrip.title,
            cityName: lastCity?.name ?? 'Unknown',
            startDate: lastTrip.startDate,
          }
        : undefined;

      // Find longest trip
      const sortedByDays = [...itineraryDaysData].sort(
        (a, b) => b.days - a.days
      );
      const longestTripData = sortedByDays[0];
      const longestTripCity = longestTripData
        ? await ctx.db.get(longestTripData.itinerary.cityId)
        : null;

      const longestTrip = longestTripData
        ? {
            itineraryId: longestTripData.itinerary._id,
            title: longestTripData.itinerary.title,
            cityName: longestTripCity?.name ?? 'Unknown',
            days: longestTripData.days,
          }
        : undefined;

      // Calculate top cities
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

      const topCities = await Promise.all(
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
          })
      );

      // Calculate monthly activity
      const monthlyData: Record<
        number,
        { tripsCount: number; daysCount: number; expenses: number }
      > = {};

      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = { tripsCount: 0, daysCount: 0, expenses: 0 };
      }

      for (const { itinerary, days } of itineraryDaysData) {
        const month = new Date(itinerary.startDate).getMonth() + 1;
        monthlyData[month].tripsCount += 1;
        monthlyData[month].daysCount += days;
      }

      for (const expense of yearExpenses) {
        const month = new Date(expense.date).getMonth() + 1;
        monthlyData[month].expenses += expense.amount;
      }

      const monthlyActivity = Object.entries(monthlyData).map(
        ([month, data]) => ({
          month: Number.parseInt(month),
          ...data,
        })
      );

      // Generate achievements
      const achievements: Array<{
        id: string;
        title: string;
        description: string;
        icon: string;
        earnedAt?: number;
      }> = [];

      if (tripsCount >= 1) {
        achievements.push({
          id: 'first_trip',
          title: '开启旅途',
          description: '完成了今年的第一次旅行',
          icon: 'flag.fill',
          earnedAt: now,
        });
      }

      if (tripsCount >= 5) {
        achievements.push({
          id: 'frequent_traveler',
          title: '旅行达人',
          description: '今年完成了5次以上的旅行',
          icon: 'star.fill',
          earnedAt: now,
        });
      }

      if (tripsCount >= 10) {
        achievements.push({
          id: 'travel_master',
          title: '旅行大师',
          description: '今年完成了10次以上的旅行',
          icon: 'crown.fill',
          earnedAt: now,
        });
      }

      if (citiesCount >= 5) {
        achievements.push({
          id: 'city_explorer',
          title: '城市探索者',
          description: '今年探索了5个以上的城市',
          icon: 'building.2.fill',
          earnedAt: now,
        });
      }

      if (daysCount >= 30) {
        achievements.push({
          id: 'month_on_road',
          title: '在路上的一个月',
          description: '今年旅行时间超过30天',
          icon: 'calendar.badge.clock',
          earnedAt: now,
        });
      }

      // Calculate year-over-year comparison
      let yearOverYear:
        | {
            tripsChange: number;
            expensesChange: number;
            distanceChange: number;
            citiesChange: number;
          }
        | undefined;

      const previousYear = args.year - 1;
      const previousReview = await ctx.db
        .query('yearlyReviews')
        .withIndex('by_user_year', (q) =>
          q.eq('userId', args.userId).eq('year', previousYear)
        )
        .first();

      if (previousReview && previousReview.status === 'ready') {
        const calcChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        yearOverYear = {
          tripsChange: calcChange(tripsCount, previousReview.tripsCount),
          expensesChange: calcChange(
            totalExpenses,
            previousReview.totalExpenses
          ),
          distanceChange: 0, // Would need route calculation
          citiesChange: calcChange(citiesCount, previousReview.citiesCount),
        };
      }

      // Update the review with all calculated data
      await ctx.db.patch(reviewId, {
        tripsCount,
        daysCount,
        citiesCount,
        countriesCount,
        poisCount,
        totalDistance: 0,
        totalExpenses,
        expenseBreakdown,
        averagePerTrip: tripsCount > 0 ? totalExpenses / tripsCount : 0,
        averagePerDay: daysCount > 0 ? totalExpenses / daysCount : 0,
        mostExpensiveTrip,
        firstTripOfYear,
        lastTripOfYear,
        longestTrip,
        topCities,
        monthlyActivity,
        achievements,
        yearOverYear,
        status: 'ready',
        generatedAt: now,
        updatedAt: now,
      });

      return reviewId;
    } catch (error) {
      // Mark as error
      await ctx.db.patch(reviewId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: now,
      });
      throw error;
    }
  },
});

// Add a memory to yearly review
export const addMemory = mutation({
  args: {
    userId: v.string(),
    year: v.number(),
    text: v.string(),
    itineraryId: v.optional(v.id('itineraries')),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const review = await ctx.db
      .query('yearlyReviews')
      .withIndex('by_user_year', (q) =>
        q.eq('userId', args.userId).eq('year', args.year)
      )
      .first();

    if (!review) {
      throw new Error('Yearly review not found');
    }

    const memories = review.memories ?? [];
    memories.push({
      text: args.text,
      itineraryId: args.itineraryId,
      imageUrl: args.imageUrl,
      createdAt: now,
    });

    await ctx.db.patch(review._id, {
      memories,
      updatedAt: now,
    });

    return review._id;
  },
});

// Delete yearly review
export const remove = mutation({
  args: {
    userId: v.string(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db
      .query('yearlyReviews')
      .withIndex('by_user_year', (q) =>
        q.eq('userId', args.userId).eq('year', args.year)
      )
      .first();

    if (!review) {
      throw new Error('Yearly review not found');
    }

    if (review.userId !== args.userId) {
      throw new Error('Unauthorized');
    }

    await ctx.db.delete(review._id);
  },
});
