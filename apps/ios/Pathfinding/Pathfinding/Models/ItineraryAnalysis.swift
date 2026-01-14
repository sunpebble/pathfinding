import Foundation

// MARK: - Itinerary Analysis Report

/// Comprehensive analysis report for a travel itinerary
struct ItineraryAnalysisReport: Codable, Identifiable {
  var id: String { itineraryId }
  let itineraryId: String
  let itineraryTitle: String
  let cityName: String
  let startDate: String
  let endDate: String
  let totalDays: Int
  let analyzedAt: TimeInterval

  // Overall Score
  let overallScore: Int
  let scoreBreakdown: [ScoreBreakdown]
  let scoreLevel: ScoreLevel

  // Day-by-day analysis
  let dayAnalysis: [DayAnalysis]

  // Time analysis
  let timeAnalysis: TimeAnalysis

  // Route optimization suggestions
  let routeOptimizations: [RouteOptimizationSuggestion]

  // Budget analysis
  let budgetAnalysis: BudgetAnalysis?

  // Summary
  let strengths: [String]
  let improvements: [String]
  let criticalIssues: [String]

  // Recommendations
  let topRecommendations: [String]

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
    case itineraryTitle = "itinerary_title"
    case cityName = "city_name"
    case startDate = "start_date"
    case endDate = "end_date"
    case totalDays = "total_days"
    case analyzedAt = "analyzed_at"
    case overallScore = "overall_score"
    case scoreBreakdown = "score_breakdown"
    case scoreLevel = "score_level"
    case dayAnalysis = "day_analysis"
    case timeAnalysis = "time_analysis"
    case routeOptimizations = "route_optimizations"
    case budgetAnalysis = "budget_analysis"
    case strengths, improvements
    case criticalIssues = "critical_issues"
    case topRecommendations = "top_recommendations"
  }

  enum ScoreLevel: String, Codable {
    case excellent
    case good
    case fair
    case needsImprovement = "needs_improvement"

    var displayName: String {
      switch self {
      case .excellent: return "优秀"
      case .good: return "良好"
      case .fair: return "一般"
      case .needsImprovement: return "待改进"
      }
    }

    var color: String {
      switch self {
      case .excellent: return "green"
      case .good: return "blue"
      case .fair: return "orange"
      case .needsImprovement: return "red"
      }
    }
  }
}

// MARK: - Score Breakdown

struct ScoreBreakdown: Codable, Identifiable, Hashable {
  var id: String { category }
  let category: String
  let categoryName: String
  let score: Int
  let weight: Int
  let feedback: String

  enum CodingKeys: String, CodingKey {
    case category
    case categoryName = "category_name"
    case score, weight, feedback
  }
}

// MARK: - Day Analysis

struct DayAnalysis: Codable, Identifiable, Hashable {
  var id: Int { dayNumber }
  let dayNumber: Int
  let date: String
  let itemCount: Int
  let totalPlannedMinutes: Int
  let totalTransitMinutes: Int
  let totalDistanceKm: Double
  let paceRating: PaceRating
  let paceScore: Int
  let routeEfficiency: Int
  let poisAnalysis: [PoiAnalysis]
  let suggestions: [String]
  let warnings: [String]

  enum CodingKeys: String, CodingKey {
    case dayNumber = "day_number"
    case date
    case itemCount = "item_count"
    case totalPlannedMinutes = "total_planned_minutes"
    case totalTransitMinutes = "total_transit_minutes"
    case totalDistanceKm = "total_distance_km"
    case paceRating = "pace_rating"
    case paceScore = "pace_score"
    case routeEfficiency = "route_efficiency"
    case poisAnalysis = "pois_analysis"
    case suggestions, warnings
  }

  enum PaceRating: String, Codable {
    case relaxed
    case moderate
    case intensive
    case exhausting

    var displayName: String {
      switch self {
      case .relaxed: return "轻松"
      case .moderate: return "适中"
      case .intensive: return "紧凑"
      case .exhausting: return "疲惫"
      }
    }

    var icon: String {
      switch self {
      case .relaxed: return "leaf.fill"
      case .moderate: return "figure.walk"
      case .intensive: return "figure.run"
      case .exhausting: return "bolt.fill"
      }
    }

    var color: String {
      switch self {
      case .relaxed: return "green"
      case .moderate: return "blue"
      case .intensive: return "orange"
      case .exhausting: return "red"
      }
    }
  }
}

// MARK: - POI Analysis

struct PoiAnalysis: Codable, Identifiable, Hashable {
  var id: String { poiId }
  let poiId: String
  let poiName: String
  let category: String
  let scheduledTime: String?
  let suggestedDuration: Int
  let actualDuration: Int?
  let durationStatus: DurationStatus
  let openingHoursConflict: Bool
  let openingHours: String?
  let suggestedTimeSlot: String?
  let notes: [String]

  enum CodingKeys: String, CodingKey {
    case poiId = "poi_id"
    case poiName = "poi_name"
    case category
    case scheduledTime = "scheduled_time"
    case suggestedDuration = "suggested_duration"
    case actualDuration = "actual_duration"
    case durationStatus = "duration_status"
    case openingHoursConflict = "opening_hours_conflict"
    case openingHours = "opening_hours"
    case suggestedTimeSlot = "suggested_time_slot"
    case notes
  }

  enum DurationStatus: String, Codable {
    case adequate
    case tooShort = "too_short"
    case tooLong = "too_long"

    var displayName: String {
      switch self {
      case .adequate: return "合适"
      case .tooShort: return "过短"
      case .tooLong: return "过长"
      }
    }

    var icon: String {
      switch self {
      case .adequate: return "checkmark.circle.fill"
      case .tooShort: return "exclamationmark.triangle.fill"
      case .tooLong: return "clock.fill"
      }
    }
  }
}

// MARK: - Time Analysis

struct TimeAnalysis: Codable, Hashable {
  let averageStartTime: String
  let averageEndTime: String
  let totalTravelMinutes: Int
  let totalActivityMinutes: Int
  let restTimeMinutes: Int
  let suggestedBreaks: [BreakSuggestion]
  let timeUtilization: Int

  enum CodingKeys: String, CodingKey {
    case averageStartTime = "average_start_time"
    case averageEndTime = "average_end_time"
    case totalTravelMinutes = "total_travel_minutes"
    case totalActivityMinutes = "total_activity_minutes"
    case restTimeMinutes = "rest_time_minutes"
    case suggestedBreaks = "suggested_breaks"
    case timeUtilization = "time_utilization"
  }
}

// MARK: - Break Suggestion

struct BreakSuggestion: Codable, Identifiable, Hashable {
  var id: String { "\(afterPoiName)-\(type.rawValue)" }
  let afterPoiName: String
  let suggestedDuration: Int
  let reason: String
  let type: BreakType

  enum CodingKeys: String, CodingKey {
    case afterPoiName = "after_poi_name"
    case suggestedDuration = "suggested_duration"
    case reason, type
  }

  enum BreakType: String, Codable {
    case meal
    case rest
    case buffer

    var displayName: String {
      switch self {
      case .meal: return "用餐"
      case .rest: return "休息"
      case .buffer: return "缓冲"
      }
    }

    var icon: String {
      switch self {
      case .meal: return "fork.knife"
      case .rest: return "cup.and.saucer.fill"
      case .buffer: return "clock.badge.checkmark.fill"
      }
    }
  }
}

// MARK: - Route Optimization Suggestion

struct RouteOptimizationSuggestion: Codable, Identifiable, Hashable {
  var id: Int { dayNumber }
  let dayNumber: Int
  let originalOrder: [String]
  let suggestedOrder: [String]
  let estimatedTimeSavingMinutes: Int
  let estimatedDistanceSavingKm: Double
  let reason: String

  enum CodingKeys: String, CodingKey {
    case dayNumber = "day_number"
    case originalOrder = "original_order"
    case suggestedOrder = "suggested_order"
    case estimatedTimeSavingMinutes = "estimated_time_saving_minutes"
    case estimatedDistanceSavingKm = "estimated_distance_saving_km"
    case reason
  }
}

// MARK: - Budget Analysis

struct BudgetAnalysis: Codable, Hashable {
  let estimatedTotal: Double
  let currency: String
  let breakdown: [BudgetBreakdown]
  let perDayAverage: Double
  let perPersonAverage: Double?
  let comparisonToAverage: BudgetComparison
  let savingOpportunities: [SavingOpportunity]

  enum CodingKeys: String, CodingKey {
    case estimatedTotal = "estimated_total"
    case currency
    case breakdown
    case perDayAverage = "per_day_average"
    case perPersonAverage = "per_person_average"
    case comparisonToAverage = "comparison_to_average"
    case savingOpportunities = "saving_opportunities"
  }

  enum BudgetComparison: String, Codable {
    case belowAverage = "below_average"
    case average
    case aboveAverage = "above_average"
    case luxury

    var displayName: String {
      switch self {
      case .belowAverage: return "经济型"
      case .average: return "中等"
      case .aboveAverage: return "舒适型"
      case .luxury: return "豪华型"
      }
    }

    var icon: String {
      switch self {
      case .belowAverage: return "leaf.fill"
      case .average: return "star.fill"
      case .aboveAverage: return "star.circle.fill"
      case .luxury: return "crown.fill"
      }
    }
  }
}

// MARK: - Budget Breakdown

struct BudgetBreakdown: Codable, Identifiable, Hashable {
  var id: String { category }
  let category: String
  let categoryName: String
  let amount: Double
  let percentage: Int
  let items: [BudgetItem]

  enum CodingKeys: String, CodingKey {
    case category
    case categoryName = "category_name"
    case amount, percentage, items
  }
}

// MARK: - Budget Item

struct BudgetItem: Codable, Identifiable, Hashable {
  var id: String { name }
  let name: String
  let estimatedCost: Double
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case name
    case estimatedCost = "estimated_cost"
    case notes
  }
}

// MARK: - Saving Opportunity

struct SavingOpportunity: Codable, Identifiable, Hashable {
  var id: String { "\(category)-\(suggestion)" }
  let category: String
  let suggestion: String
  let potentialSaving: Double
  let effort: EffortLevel

  enum CodingKeys: String, CodingKey {
    case category, suggestion
    case potentialSaving = "potential_saving"
    case effort
  }

  enum EffortLevel: String, Codable {
    case easy
    case moderate
    case difficult

    var displayName: String {
      switch self {
      case .easy: return "简单"
      case .moderate: return "中等"
      case .difficult: return "困难"
      }
    }

    var color: String {
      switch self {
      case .easy: return "green"
      case .moderate: return "orange"
      case .difficult: return "red"
      }
    }
  }
}

// MARK: - Quick Analysis Summary

struct QuickAnalysisSummary: Codable {
  let overallScore: Int
  let scoreLevel: String
  let topIssues: [String]
  let topSuggestions: [String]

  enum CodingKeys: String, CodingKey {
    case overallScore = "overall_score"
    case scoreLevel = "score_level"
    case topIssues = "top_issues"
    case topSuggestions = "top_suggestions"
  }
}

// MARK: - API Response Wrappers

struct AnalysisReportResponse: Codable {
  let success: Bool
  let data: ItineraryAnalysisReport
}

struct QuickAnalysisResponse: Codable {
  let success: Bool
  let data: QuickAnalysisSummary
}

struct ScoreOnlyResponse: Codable {
  let success: Bool
  let data: ScoreOnlyData
}

struct ScoreOnlyData: Codable {
  let overallScore: Int
  let scoreLevel: String
  let scoreBreakdown: [ScoreBreakdown]

  enum CodingKeys: String, CodingKey {
    case overallScore = "overall_score"
    case scoreLevel = "score_level"
    case scoreBreakdown = "score_breakdown"
  }
}

struct BudgetAnalysisResponse: Codable {
  let success: Bool
  let data: BudgetAnalysis?
}

struct AnalysisRecommendationsResponse: Codable {
  let success: Bool
  let data: RecommendationsData
}

struct RecommendationsData: Codable {
  let topRecommendations: [String]
  let routeOptimizations: [RouteOptimizationSuggestion]
  let strengths: [String]
  let improvements: [String]
  let criticalIssues: [String]

  enum CodingKeys: String, CodingKey {
    case topRecommendations = "top_recommendations"
    case routeOptimizations = "route_optimizations"
    case strengths, improvements
    case criticalIssues = "critical_issues"
  }
}
