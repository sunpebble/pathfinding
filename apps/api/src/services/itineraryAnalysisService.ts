/**
 * Itinerary Analysis Service
 * Provides comprehensive analysis of travel itineraries including:
 * - Reasonableness analysis
 * - Time schedule suggestions
 * - Route optimization recommendations
 * - Budget analysis
 * - Overall itinerary scoring
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisOptions {
  includeRouteOptimization?: boolean;
  includeBudgetAnalysis?: boolean;
  includeTimeAnalysis?: boolean;
  preferredTransportMode?: 'walking' | 'driving' | 'transit' | 'taxi' | 'cycling';
}

export interface PoiAnalysis {
  poiId: string;
  poiName: string;
  category: string;
  scheduledTime?: string;
  suggestedDuration: number; // minutes
  actualDuration?: number; // minutes
  durationStatus: 'adequate' | 'too_short' | 'too_long';
  openingHoursConflict: boolean;
  openingHours?: string;
  suggestedTimeSlot?: string;
  notes: string[];
}

export interface DayAnalysis {
  dayNumber: number;
  date: string;
  itemCount: number;
  totalPlannedMinutes: number;
  totalTransitMinutes: number;
  totalDistanceKm: number;
  paceRating: 'relaxed' | 'moderate' | 'intensive' | 'exhausting';
  paceScore: number; // 0-100
  routeEfficiency: number; // 0-100 percentage
  poisAnalysis: PoiAnalysis[];
  suggestions: string[];
  warnings: string[];
}

export interface TimeAnalysis {
  averageStartTime: string;
  averageEndTime: string;
  totalTravelMinutes: number;
  totalActivityMinutes: number;
  restTimeMinutes: number;
  suggestedBreaks: BreakSuggestion[];
  timeUtilization: number; // 0-100 percentage
}

export interface BreakSuggestion {
  afterPoiName: string;
  suggestedDuration: number; // minutes
  reason: string;
  type: 'meal' | 'rest' | 'buffer';
}

export interface RouteOptimizationSuggestion {
  dayNumber: number;
  originalOrder: string[];
  suggestedOrder: string[];
  estimatedTimeSavingMinutes: number;
  estimatedDistanceSavingKm: number;
  reason: string;
}

export interface BudgetAnalysis {
  estimatedTotal: number;
  currency: string;
  breakdown: BudgetBreakdown[];
  perDayAverage: number;
  perPersonAverage?: number;
  comparisonToAverage: 'below_average' | 'average' | 'above_average' | 'luxury';
  savingOpportunities: SavingOpportunity[];
}

export interface BudgetBreakdown {
  category: string;
  categoryName: string;
  amount: number;
  percentage: number;
  items: BudgetItem[];
}

export interface BudgetItem {
  name: string;
  estimatedCost: number;
  notes?: string;
}

export interface SavingOpportunity {
  category: string;
  suggestion: string;
  potentialSaving: number;
  effort: 'easy' | 'moderate' | 'difficult';
}

export interface ScoreBreakdown {
  category: string;
  categoryName: string;
  score: number; // 0-100
  weight: number; // percentage weight
  feedback: string;
}

export interface ItineraryAnalysisReport {
  itineraryId: string;
  itineraryTitle: string;
  cityName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  analyzedAt: number;

  // Overall Score
  overallScore: number; // 0-100
  scoreBreakdown: ScoreBreakdown[];
  scoreLevel: 'excellent' | 'good' | 'fair' | 'needs_improvement';

  // Day-by-day analysis
  dayAnalysis: DayAnalysis[];

  // Time analysis
  timeAnalysis: TimeAnalysis;

  // Route optimization suggestions
  routeOptimizations: RouteOptimizationSuggestion[];

  // Budget analysis
  budgetAnalysis?: BudgetAnalysis;

  // Summary
  strengths: string[];
  improvements: string[];
  criticalIssues: string[];

  // Recommendations
  topRecommendations: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDaysCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getEstimatedDuration(category: string): number {
  // Default durations in minutes based on POI category
  const durations: Record<string, number> = {
    attraction: 90,
    museum: 120,
    park: 60,
    restaurant: 60,
    cafe: 30,
    shopping: 45,
    hotel: 0,
    transportation: 15,
    temple: 60,
    beach: 120,
    landmark: 45,
    entertainment: 90,
    nightlife: 120,
  };
  return durations[category.toLowerCase()] || 60;
}

function calculatePaceRating(
  itemCount: number,
  totalMinutes: number,
  transitMinutes: number
): { rating: 'relaxed' | 'moderate' | 'intensive' | 'exhausting'; score: number } {
  const activityMinutes = totalMinutes - transitMinutes;
  const avgMinutesPerPoi = itemCount > 0 ? activityMinutes / itemCount : 0;
  const poiDensity = itemCount / (totalMinutes / 60);

  if (poiDensity <= 0.5 || avgMinutesPerPoi >= 90) {
    return { rating: 'relaxed', score: 85 };
  } else if (poiDensity <= 1.0 || avgMinutesPerPoi >= 60) {
    return { rating: 'moderate', score: 95 };
  } else if (poiDensity <= 1.5 || avgMinutesPerPoi >= 40) {
    return { rating: 'intensive', score: 70 };
  } else {
    return { rating: 'exhausting', score: 45 };
  }
}

function estimateTransitTime(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  mode: string
): { minutes: number; distanceKm: number } {
  // Haversine formula for distance
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Speed in km/h based on mode
  const speeds: Record<string, number> = {
    walking: 4.5,
    cycling: 15,
    driving: 30,
    taxi: 25,
    transit: 20,
  };
  const speed = speeds[mode] || speeds.walking;
  const minutes = Math.ceil((distanceKm / speed) * 60);

  return { minutes, distanceKm };
}

function analyzeOpeningHours(scheduledTime?: string, openingHours?: string): boolean {
  // Simplified opening hours check
  if (!scheduledTime || !openingHours) return false;

  // Parse common formats like "9:00-18:00" or "09:00-21:00"
  const match = openingHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return false;

  const openHour = parseInt(match[1]);
  const closeHour = parseInt(match[3]);

  const timeMatch = scheduledTime.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return false;

  const scheduledHour = parseInt(timeMatch[1]);

  return scheduledHour < openHour || scheduledHour >= closeHour;
}

function estimateBudgetCategory(
  category: string,
  cityTier: 'tier1' | 'tier2' | 'tier3'
): number {
  // Base costs in CNY
  const baseCosts: Record<string, Record<string, number>> = {
    attraction: { tier1: 80, tier2: 50, tier3: 30 },
    museum: { tier1: 60, tier2: 40, tier3: 20 },
    restaurant: { tier1: 120, tier2: 80, tier3: 50 },
    cafe: { tier1: 45, tier2: 35, tier3: 25 },
    shopping: { tier1: 200, tier2: 150, tier3: 100 },
    entertainment: { tier1: 150, tier2: 100, tier3: 70 },
  };

  return baseCosts[category.toLowerCase()]?.[cityTier] || 50;
}

function determineScoreLevel(
  score: number
): 'excellent' | 'good' | 'fair' | 'needs_improvement' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'needs_improvement';
}

// ============================================================================
// Service Implementation
// ============================================================================

export const ItineraryAnalysisService = {
  /**
   * Generate a comprehensive analysis report for an itinerary
   */
  async analyze(
    itineraryId: string,
    userId: string,
    options: AnalysisOptions = {}
  ): Promise<ItineraryAnalysisReport> {
    // Fetch itinerary with full details
    const itinerary = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!itinerary) {
      throw new NotFoundError('Itinerary not found');
    }

    // Check access
    if (itinerary.userId !== userId && itinerary.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    const totalDays = calculateDaysCount(itinerary.startDate, itinerary.endDate);
    const preferredMode = options.preferredTransportMode || 'walking';

    // Analyze each day
    const dayAnalyses: DayAnalysis[] = [];
    const routeOptimizations: RouteOptimizationSuggestion[] = [];
    let totalTransitMinutes = 0;
    let totalActivityMinutes = 0;

    for (const day of itinerary.days || []) {
      const poisAnalysis: PoiAnalysis[] = [];
      let dayTransitMinutes = 0;
      let dayTotalMinutes = 0;
      let dayDistanceKm = 0;
      const warnings: string[] = [];
      const suggestions: string[] = [];

      const items = day.items || [];
      const originalOrder: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const poi = item.poi;

        if (!poi) continue;

        originalOrder.push(poi.name);

        const suggestedDuration = getEstimatedDuration(poi.category || 'attraction');
        const actualDuration = item.startTime && item.endTime
          ? calculateTimeDiff(item.startTime, item.endTime)
          : undefined;

        let durationStatus: 'adequate' | 'too_short' | 'too_long' = 'adequate';
        if (actualDuration !== undefined) {
          if (actualDuration < suggestedDuration * 0.5) {
            durationStatus = 'too_short';
            warnings.push(
              `${poi.name} 安排时间过短，建议至少 ${suggestedDuration} 分钟`
            );
          } else if (actualDuration > suggestedDuration * 2) {
            durationStatus = 'too_long';
          }
        }

        // Check opening hours conflict
        const openingHoursConflict = analyzeOpeningHours(
          item.startTime,
          undefined // We would need to fetch this from a POI details API
        );

        if (openingHoursConflict) {
          warnings.push(`${poi.name} 可能不在营业时间内`);
        }

        poisAnalysis.push({
          poiId: poi.id,
          poiName: poi.name,
          category: poi.category || 'attraction',
          scheduledTime: item.startTime,
          suggestedDuration,
          actualDuration,
          durationStatus,
          openingHoursConflict,
          notes: [],
        });

        dayTotalMinutes += actualDuration || suggestedDuration;

        // Calculate transit to next POI
        if (i < items.length - 1) {
          const nextItem = items[i + 1];
          const nextPoi = nextItem.poi;
          if (nextPoi && poi.latitude && poi.longitude && nextPoi.latitude && nextPoi.longitude) {
            const transit = estimateTransitTime(
              poi.latitude,
              poi.longitude,
              nextPoi.latitude,
              nextPoi.longitude,
              preferredMode
            );
            dayTransitMinutes += transit.minutes;
            dayDistanceKm += transit.distanceKm;
          }
        }
      }

      dayTotalMinutes += dayTransitMinutes;
      totalTransitMinutes += dayTransitMinutes;
      totalActivityMinutes += dayTotalMinutes - dayTransitMinutes;

      const paceResult = calculatePaceRating(
        items.length,
        dayTotalMinutes,
        dayTransitMinutes
      );

      // Calculate route efficiency
      const routeEfficiency = items.length <= 1 ? 100 : Math.max(
        50,
        100 - (dayDistanceKm / items.length) * 5
      );

      // Generate suggestions based on analysis
      if (paceResult.rating === 'exhausting') {
        suggestions.push('建议减少当日景点数量，或将部分景点调整到其他日程');
      }

      if (routeEfficiency < 70) {
        suggestions.push('建议优化景点顺序以减少交通时间');

        // Add route optimization suggestion
        if (options.includeRouteOptimization) {
          routeOptimizations.push({
            dayNumber: day.dayNumber,
            originalOrder,
            suggestedOrder: [...originalOrder].sort(), // Simplified - would use TSP algorithm
            estimatedTimeSavingMinutes: Math.round(dayTransitMinutes * 0.2),
            estimatedDistanceSavingKm: Math.round(dayDistanceKm * 0.15 * 10) / 10,
            reason: '通过优化访问顺序可减少往返路程',
          });
        }
      }

      if (items.length > 0 && dayTotalMinutes / items.length < 40) {
        suggestions.push('每个景点停留时间较短，建议增加游览时间');
      }

      dayAnalyses.push({
        dayNumber: day.dayNumber,
        date: day.date,
        itemCount: items.length,
        totalPlannedMinutes: dayTotalMinutes,
        totalTransitMinutes: dayTransitMinutes,
        totalDistanceKm: Math.round(dayDistanceKm * 10) / 10,
        paceRating: paceResult.rating,
        paceScore: paceResult.score,
        routeEfficiency: Math.round(routeEfficiency),
        poisAnalysis,
        suggestions,
        warnings,
      });
    }

    // Time analysis
    const timeAnalysis = this.analyzeTimeSchedule(dayAnalyses, totalDays);

    // Budget analysis (if requested)
    let budgetAnalysis: BudgetAnalysis | undefined;
    if (options.includeBudgetAnalysis) {
      budgetAnalysis = this.analyzeBudget(itinerary, dayAnalyses);
    }

    // Calculate overall score
    const scoreBreakdown = this.calculateScoreBreakdown(
      dayAnalyses,
      timeAnalysis,
      routeOptimizations,
      budgetAnalysis
    );
    const overallScore = Math.round(
      scoreBreakdown.reduce((sum, item) => sum + item.score * (item.weight / 100), 0)
    );

    // Generate summary insights
    const { strengths, improvements, criticalIssues } = this.generateInsights(
      dayAnalyses,
      timeAnalysis,
      routeOptimizations
    );

    // Top recommendations
    const topRecommendations = this.generateTopRecommendations(
      dayAnalyses,
      routeOptimizations,
      budgetAnalysis
    );

    return {
      itineraryId,
      itineraryTitle: itinerary.title,
      cityName: itinerary.cityName || '',
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      totalDays,
      analyzedAt: Date.now(),
      overallScore,
      scoreBreakdown,
      scoreLevel: determineScoreLevel(overallScore),
      dayAnalysis: dayAnalyses,
      timeAnalysis,
      routeOptimizations,
      budgetAnalysis,
      strengths,
      improvements,
      criticalIssues,
      topRecommendations,
    };
  },

  /**
   * Analyze time schedule across all days
   */
  analyzeTimeSchedule(dayAnalyses: DayAnalysis[], totalDays: number): TimeAnalysis {
    const totalTravelMinutes = dayAnalyses.reduce(
      (sum, day) => sum + day.totalTransitMinutes,
      0
    );
    const totalActivityMinutes = dayAnalyses.reduce(
      (sum, day) => sum + (day.totalPlannedMinutes - day.totalTransitMinutes),
      0
    );

    // Calculate average times (assuming 9 AM start, adjusted by activity)
    const avgDailyMinutes = totalDays > 0 ?
      (totalActivityMinutes + totalTravelMinutes) / totalDays : 0;

    const suggestedBreaks: BreakSuggestion[] = [];

    // Add break suggestions based on schedule
    for (const day of dayAnalyses) {
      if (day.totalPlannedMinutes > 360) {
        // More than 6 hours
        suggestedBreaks.push({
          afterPoiName:
            day.poisAnalysis[Math.floor(day.poisAnalysis.length / 2)]?.poiName ||
            '中间景点',
          suggestedDuration: 60,
          reason: '长时间游览后建议休息用餐',
          type: 'meal',
        });
      }

      if (day.paceRating === 'intensive' || day.paceRating === 'exhausting') {
        suggestedBreaks.push({
          afterPoiName:
            day.poisAnalysis[day.poisAnalysis.length - 1]?.poiName || '最后景点',
          suggestedDuration: 30,
          reason: '行程紧凑，建议适当休息',
          type: 'rest',
        });
      }
    }

    // Estimate rest time
    const restTimeMinutes = totalDays * 60; // 1 hour rest per day average

    // Time utilization (assuming 10-hour activity window per day)
    const availableMinutes = totalDays * 600;
    const timeUtilization = Math.min(
      100,
      Math.round(((totalActivityMinutes + totalTravelMinutes) / availableMinutes) * 100)
    );

    return {
      averageStartTime: '09:00',
      averageEndTime:
        avgDailyMinutes > 480
          ? '20:00'
          : avgDailyMinutes > 360
            ? '18:00'
            : '16:00',
      totalTravelMinutes,
      totalActivityMinutes,
      restTimeMinutes,
      suggestedBreaks,
      timeUtilization,
    };
  },

  /**
   * Analyze budget for the itinerary
   */
  analyzeBudget(itinerary: any, dayAnalyses: DayAnalysis[]): BudgetAnalysis {
    const cityTier = 'tier1' as const; // Would determine from city data
    const breakdown: BudgetBreakdown[] = [];
    const items: Record<string, BudgetItem[]> = {};
    const categoryTotals: Record<string, number> = {};

    // Estimate costs per POI category
    for (const day of dayAnalyses) {
      for (const poi of day.poisAnalysis) {
        const cost = estimateBudgetCategory(poi.category, cityTier);
        const category = poi.category || 'other';

        if (!items[category]) {
          items[category] = [];
          categoryTotals[category] = 0;
        }

        items[category].push({
          name: poi.poiName,
          estimatedCost: cost,
        });
        categoryTotals[category] += cost;
      }
    }

    // Add transportation and accommodation estimates
    const totalDays = dayAnalyses.length;
    categoryTotals['transportation'] = totalDays * 100; // 100 CNY per day avg
    categoryTotals['accommodation'] = totalDays * 350; // 350 CNY per night avg
    categoryTotals['meals'] = totalDays * 150; // 150 CNY per day avg

    items['transportation'] = [
      { name: '市内交通', estimatedCost: totalDays * 100 },
    ];
    items['accommodation'] = [
      { name: '住宿', estimatedCost: totalDays * 350 },
    ];
    items['meals'] = [{ name: '餐饮', estimatedCost: totalDays * 150 }];

    const estimatedTotal = Object.values(categoryTotals).reduce(
      (sum, val) => sum + val,
      0
    );

    // Build breakdown
    const categoryNames: Record<string, string> = {
      attraction: '景点门票',
      museum: '博物馆',
      restaurant: '餐厅',
      cafe: '咖啡茶饮',
      shopping: '购物',
      entertainment: '娱乐',
      transportation: '交通',
      accommodation: '住宿',
      meals: '餐饮',
      other: '其他',
    };

    for (const [category, total] of Object.entries(categoryTotals)) {
      breakdown.push({
        category,
        categoryName: categoryNames[category] || category,
        amount: total,
        percentage: Math.round((total / estimatedTotal) * 100),
        items: items[category] || [],
      });
    }

    // Sort by amount
    breakdown.sort((a, b) => b.amount - a.amount);

    // Determine comparison to average
    const perDayAverage = totalDays > 0 ? estimatedTotal / totalDays : 0;
    let comparisonToAverage: 'below_average' | 'average' | 'above_average' | 'luxury';
    if (perDayAverage < 400) {
      comparisonToAverage = 'below_average';
    } else if (perDayAverage < 800) {
      comparisonToAverage = 'average';
    } else if (perDayAverage < 1500) {
      comparisonToAverage = 'above_average';
    } else {
      comparisonToAverage = 'luxury';
    }

    // Generate saving opportunities
    const savingOpportunities: SavingOpportunity[] = [];

    if (categoryTotals['accommodation'] > totalDays * 300) {
      savingOpportunities.push({
        category: 'accommodation',
        suggestion: '考虑选择经济型酒店或民宿',
        potentialSaving: totalDays * 150,
        effort: 'easy',
      });
    }

    if (categoryTotals['transportation'] > totalDays * 80) {
      savingOpportunities.push({
        category: 'transportation',
        suggestion: '使用公共交通代替打车',
        potentialSaving: totalDays * 40,
        effort: 'moderate',
      });
    }

    return {
      estimatedTotal,
      currency: 'CNY',
      breakdown,
      perDayAverage,
      comparisonToAverage,
      savingOpportunities,
    };
  },

  /**
   * Calculate score breakdown
   */
  calculateScoreBreakdown(
    dayAnalyses: DayAnalysis[],
    timeAnalysis: TimeAnalysis,
    routeOptimizations: RouteOptimizationSuggestion[],
    budgetAnalysis?: BudgetAnalysis
  ): ScoreBreakdown[] {
    const breakdown: ScoreBreakdown[] = [];

    // Pace/Schedule Score
    const avgPaceScore =
      dayAnalyses.length > 0
        ? dayAnalyses.reduce((sum, day) => sum + day.paceScore, 0) / dayAnalyses.length
        : 80;
    breakdown.push({
      category: 'pace',
      categoryName: '行程节奏',
      score: Math.round(avgPaceScore),
      weight: 25,
      feedback:
        avgPaceScore >= 80
          ? '行程节奏合理，张弛有度'
          : avgPaceScore >= 60
            ? '部分日程较为紧凑，建议适当调整'
            : '行程过于紧凑，建议减少景点数量',
    });

    // Route Efficiency Score
    const avgRouteEfficiency =
      dayAnalyses.length > 0
        ? dayAnalyses.reduce((sum, day) => sum + day.routeEfficiency, 0) /
          dayAnalyses.length
        : 80;
    breakdown.push({
      category: 'route',
      categoryName: '路线效率',
      score: Math.round(avgRouteEfficiency),
      weight: 25,
      feedback:
        routeOptimizations.length === 0
          ? '路线规划高效，交通时间合理'
          : `有 ${routeOptimizations.length} 天的路线可进一步优化`,
    });

    // Time Utilization Score
    const timeScore = Math.min(100, timeAnalysis.timeUtilization + 20);
    breakdown.push({
      category: 'time',
      categoryName: '时间利用',
      score: timeScore,
      weight: 20,
      feedback:
        timeScore >= 80
          ? '时间安排充实合理'
          : timeScore >= 60
            ? '部分时间段可以更充分利用'
            : '建议增加活动安排或减少行程天数',
    });

    // Coverage Score (based on variety of POI categories)
    const categories = new Set(
      dayAnalyses.flatMap((d) => d.poisAnalysis.map((p) => p.category))
    );
    const coverageScore = Math.min(100, categories.size * 15 + 40);
    breakdown.push({
      category: 'coverage',
      categoryName: '体验丰富度',
      score: coverageScore,
      weight: 15,
      feedback:
        coverageScore >= 80
          ? '行程涵盖多种体验类型'
          : '建议增加不同类型的活动体验',
    });

    // Practical Score (warnings count)
    const totalWarnings = dayAnalyses.reduce(
      (sum, day) => sum + day.warnings.length,
      0
    );
    const practicalScore = Math.max(50, 100 - totalWarnings * 10);
    breakdown.push({
      category: 'practical',
      categoryName: '实用性',
      score: practicalScore,
      weight: 15,
      feedback:
        totalWarnings === 0
          ? '行程安排实际可行'
          : `存在 ${totalWarnings} 个需要注意的问题`,
    });

    return breakdown;
  },

  /**
   * Generate insights from analysis
   */
  generateInsights(
    dayAnalyses: DayAnalysis[],
    timeAnalysis: TimeAnalysis,
    routeOptimizations: RouteOptimizationSuggestion[]
  ): { strengths: string[]; improvements: string[]; criticalIssues: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const criticalIssues: string[] = [];

    // Check pace
    const relaxedDays = dayAnalyses.filter(
      (d) => d.paceRating === 'relaxed' || d.paceRating === 'moderate'
    ).length;
    if (relaxedDays === dayAnalyses.length) {
      strengths.push('整体行程节奏舒适，不会太累');
    } else if (relaxedDays >= dayAnalyses.length * 0.7) {
      strengths.push('大部分日程安排合理');
    }

    const exhaustingDays = dayAnalyses.filter(
      (d) => d.paceRating === 'exhausting'
    ).length;
    if (exhaustingDays > 0) {
      criticalIssues.push(
        `第 ${dayAnalyses
          .filter((d) => d.paceRating === 'exhausting')
          .map((d) => d.dayNumber)
          .join('、')} 天行程过于紧凑，可能导致疲劳`
      );
    }

    // Check route efficiency
    if (routeOptimizations.length === 0) {
      strengths.push('路线规划高效，减少了不必要的往返');
    } else {
      improvements.push('部分日程的景点顺序可以优化以节省交通时间');
    }

    // Check time utilization
    if (timeAnalysis.timeUtilization >= 70 && timeAnalysis.timeUtilization <= 90) {
      strengths.push('时间利用充分且留有余地');
    } else if (timeAnalysis.timeUtilization < 60) {
      improvements.push('可以考虑增加更多活动或缩短行程');
    }

    // Check warnings
    const allWarnings = dayAnalyses.flatMap((d) => d.warnings);
    if (allWarnings.length === 0) {
      strengths.push('未发现明显的时间冲突或问题');
    } else {
      for (const warning of allWarnings.slice(0, 3)) {
        criticalIssues.push(warning);
      }
    }

    // Check variety
    const categories = new Set(
      dayAnalyses.flatMap((d) => d.poisAnalysis.map((p) => p.category))
    );
    if (categories.size >= 4) {
      strengths.push('行程内容丰富多样');
    }

    return { strengths, improvements, criticalIssues };
  },

  /**
   * Generate top recommendations
   */
  generateTopRecommendations(
    dayAnalyses: DayAnalysis[],
    routeOptimizations: RouteOptimizationSuggestion[],
    budgetAnalysis?: BudgetAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Add most impactful suggestions
    const allSuggestions = dayAnalyses.flatMap((d) =>
      d.suggestions.map((s) => ({ dayNumber: d.dayNumber, suggestion: s }))
    );

    for (const { dayNumber, suggestion } of allSuggestions.slice(0, 2)) {
      recommendations.push(`第 ${dayNumber} 天：${suggestion}`);
    }

    // Add route optimization recommendations
    if (routeOptimizations.length > 0) {
      const best = routeOptimizations.reduce((a, b) =>
        a.estimatedTimeSavingMinutes > b.estimatedTimeSavingMinutes ? a : b
      );
      recommendations.push(
        `第 ${best.dayNumber} 天优化路线可节省约 ${best.estimatedTimeSavingMinutes} 分钟`
      );
    }

    // Add budget recommendations
    if (budgetAnalysis && budgetAnalysis.savingOpportunities.length > 0) {
      const best = budgetAnalysis.savingOpportunities[0];
      recommendations.push(
        `${best.suggestion}，预计可节省 ¥${best.potentialSaving}`
      );
    }

    // Add general recommendations based on analysis
    const exhaustingDays = dayAnalyses.filter(
      (d) => d.paceRating === 'exhausting'
    );
    if (exhaustingDays.length > 0) {
      recommendations.push(
        '考虑将部分景点调整到其他日期，保持精力充沛'
      );
    }

    return recommendations.slice(0, 5);
  },

  /**
   * Get quick analysis summary (lighter version)
   */
  async getQuickAnalysis(
    itineraryId: string,
    userId: string
  ): Promise<{
    overallScore: number;
    scoreLevel: string;
    topIssues: string[];
    topSuggestions: string[];
  }> {
    const report = await this.analyze(itineraryId, userId, {
      includeBudgetAnalysis: false,
      includeRouteOptimization: false,
    });

    return {
      overallScore: report.overallScore,
      scoreLevel: report.scoreLevel,
      topIssues: report.criticalIssues.slice(0, 3),
      topSuggestions: report.topRecommendations.slice(0, 3),
    };
  },
};

// Helper function to calculate time difference in minutes
function calculateTimeDiff(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}
