import Foundation
import SwiftUI

// MARK: - Preference Category

/// Categories for travel preferences
enum PreferenceCategory: String, Codable, CaseIterable, Identifiable {
  case food = "food"
  case culture = "culture"
  case nature = "nature"
  case shopping = "shopping"
  case nightlife = "nightlife"
  case adventure = "adventure"
  case relaxation = "relaxation"
  case photography = "photography"
  case family = "family"
  case budget = "budget"
  case luxury = "luxury"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .food: return "美食"
    case .culture: return "文化历史"
    case .nature: return "自然风光"
    case .shopping: return "购物"
    case .nightlife: return "夜生活"
    case .adventure: return "冒险运动"
    case .relaxation: return "休闲放松"
    case .photography: return "摄影"
    case .family: return "亲子游"
    case .budget: return "经济实惠"
    case .luxury: return "奢华体验"
    }
  }

  var icon: String {
    switch self {
    case .food: return "fork.knife"
    case .culture: return "building.columns"
    case .nature: return "leaf.fill"
    case .shopping: return "bag.fill"
    case .nightlife: return "moon.stars.fill"
    case .adventure: return "figure.hiking"
    case .relaxation: return "sparkles"
    case .photography: return "camera.fill"
    case .family: return "figure.2.and.child.holdinghands"
    case .budget: return "dollarsign.circle"
    case .luxury: return "crown.fill"
    }
  }

  /// Centralised SwiftUI Color for this category.
  /// Single source of truth – replaces all per-view `categoryColor(for:)` switch statements.
  var color: Color {
    switch self {
    case .food: return .orange
    case .culture: return .purple
    case .nature: return .green
    case .shopping: return .pink
    case .nightlife: return .indigo
    case .adventure: return .red
    case .relaxation: return .cyan
    case .photography: return .yellow
    case .family: return .blue
    case .budget: return .mint
    case .luxury: return .orange // iOS has no "gold"; closest is orange
    }
  }
}

// MARK: - Travel Style

/// Travel style preferences
enum TravelStyle: String, Codable, CaseIterable, Identifiable {
  case adventurous = "adventurous"
  case relaxed = "relaxed"
  case cultural = "cultural"
  case balanced = "balanced"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .adventurous: return "探险型"
    case .relaxed: return "休闲型"
    case .cultural: return "文化型"
    case .balanced: return "均衡型"
    }
  }

  var description: String {
    switch self {
    case .adventurous: return "喜欢挑战和冒险，探索未知"
    case .relaxed: return "悠闲慢节奏，享受旅途"
    case .cultural: return "深度体验当地文化历史"
    case .balanced: return "兼顾各方面，灵活安排"
    }
  }

  var icon: String {
    switch self {
    case .adventurous: return "figure.climbing"
    case .relaxed: return "cup.and.saucer.fill"
    case .cultural: return "books.vertical.fill"
    case .balanced: return "scale.3d"
    }
  }
}

// MARK: - Budget Level

/// Budget level preferences
enum BudgetLevel: String, Codable, CaseIterable, Identifiable {
  case budget = "budget"
  case moderate = "moderate"
  case luxury = "luxury"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .budget: return "经济型"
    case .moderate: return "舒适型"
    case .luxury: return "奢华型"
    }
  }

  var description: String {
    switch self {
    case .budget: return "精打细算，高性价比"
    case .moderate: return "适度消费，品质与价格平衡"
    case .luxury: return "追求极致体验，不吝开销"
    }
  }

  var icon: String {
    switch self {
    case .budget: return "dollarsign"
    case .moderate: return "dollarsign.circle"
    case .luxury: return "dollarsign.circle.fill"
    }
  }
}

// MARK: - Pace Preference

/// Travel pace preferences
enum PacePreference: String, Codable, CaseIterable, Identifiable {
  case slow = "slow"
  case moderate = "moderate"
  case fast = "fast"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .slow: return "慢节奏"
    case .moderate: return "适中"
    case .fast: return "快节奏"
    }
  }

  var description: String {
    switch self {
    case .slow: return "每天 1-2 个景点，深度体验"
    case .moderate: return "每天 3-4 个景点，劳逸结合"
    case .fast: return "每天 5+ 个景点，充分利用时间"
    }
  }

  var icon: String {
    switch self {
    case .slow: return "tortoise.fill"
    case .moderate: return "figure.walk"
    case .fast: return "hare.fill"
    }
  }
}

// MARK: - User Preferences

/// User preferences model
struct UserPreferences: Codable, Identifiable {
  let id: String?
  let userId: String
  var categoryScores: [String: Double]
  var explicitPreferences: [PreferenceCategory]
  var travelStyle: TravelStyle
  var budgetLevel: BudgetLevel
  var pacePreference: PacePreference
  var preferLocalFood: Bool
  var preferOffBeatPlaces: Bool
  var accessibilityNeeds: Bool
  var totalInteractions: Int
  var createdAt: Date?
  var lastUpdated: Date

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case categoryScores = "category_scores"
    case explicitPreferences = "explicit_preferences"
    case travelStyle = "travel_style"
    case budgetLevel = "budget_level"
    case pacePreference = "pace_preference"
    case preferLocalFood = "prefer_local_food"
    case preferOffBeatPlaces = "prefer_off_beat_places"
    case accessibilityNeeds = "accessibility_needs"
    case totalInteractions = "total_interactions"
    case createdAt = "created_at"
    case lastUpdated = "last_updated"
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id)
    userId = try container.decode(String.self, forKey: .userId)
    categoryScores = try container.decodeIfPresent([String: Double].self, forKey: .categoryScores) ?? [:]
    explicitPreferences = try container.decodeIfPresent([PreferenceCategory].self, forKey: .explicitPreferences) ?? []
    travelStyle = try container.decodeIfPresent(TravelStyle.self, forKey: .travelStyle) ?? .balanced
    budgetLevel = try container.decodeIfPresent(BudgetLevel.self, forKey: .budgetLevel) ?? .moderate
    pacePreference = try container.decodeIfPresent(PacePreference.self, forKey: .pacePreference) ?? .moderate
    preferLocalFood = try container.decodeIfPresent(Bool.self, forKey: .preferLocalFood) ?? true
    preferOffBeatPlaces = try container.decodeIfPresent(Bool.self, forKey: .preferOffBeatPlaces) ?? false
    accessibilityNeeds = try container.decodeIfPresent(Bool.self, forKey: .accessibilityNeeds) ?? false
    totalInteractions = try container.decodeIfPresent(Int.self, forKey: .totalInteractions) ?? 0

    if let timestamp = try container.decodeIfPresent(Double.self, forKey: .createdAt) {
      createdAt = Date(timeIntervalSince1970: timestamp / 1000)
    } else {
      createdAt = nil
    }

    if let timestamp = try container.decodeIfPresent(Double.self, forKey: .lastUpdated) {
      lastUpdated = Date(timeIntervalSince1970: timestamp / 1000)
    } else {
      lastUpdated = Date()
    }
  }

  init(
    id: String? = nil,
    userId: String,
    categoryScores: [String: Double] = [:],
    explicitPreferences: [PreferenceCategory] = [],
    travelStyle: TravelStyle = .balanced,
    budgetLevel: BudgetLevel = .moderate,
    pacePreference: PacePreference = .moderate,
    preferLocalFood: Bool = true,
    preferOffBeatPlaces: Bool = false,
    accessibilityNeeds: Bool = false,
    totalInteractions: Int = 0,
    createdAt: Date? = nil,
    lastUpdated: Date = Date()
  ) {
    self.id = id
    self.userId = userId
    self.categoryScores = categoryScores
    self.explicitPreferences = explicitPreferences
    self.travelStyle = travelStyle
    self.budgetLevel = budgetLevel
    self.pacePreference = pacePreference
    self.preferLocalFood = preferLocalFood
    self.preferOffBeatPlaces = preferOffBeatPlaces
    self.accessibilityNeeds = accessibilityNeeds
    self.totalInteractions = totalInteractions
    self.createdAt = createdAt
    self.lastUpdated = lastUpdated
  }

  /// Get top categories sorted by score
  var topCategories: [PreferenceCategory] {
    let sorted = categoryScores.sorted { $0.value > $1.value }
    return sorted.prefix(5).compactMap { PreferenceCategory(rawValue: $0.key) }
  }

  /// Check if preferences have been learned from behavior
  var isLearned: Bool {
    totalInteractions > 10
  }
}

// MARK: - Category Score

/// Category score with normalized value
struct CategoryScore: Codable, Identifiable {
  let category: String
  let score: Double
  let normalized: Double

  var id: String { category }

  var preferenceCategory: PreferenceCategory? {
    PreferenceCategory(rawValue: category)
  }

  enum CodingKeys: String, CodingKey {
    case category
    case score
    case normalized
  }
}

// MARK: - Recommended Categories

/// Personalized recommendations based on preferences
struct RecommendedCategories: Codable {
  let topCategories: [String]
  let style: TravelStyle
  let budgetLevel: BudgetLevel?
  let pacePreference: PacePreference?
  let isLearned: Bool
  let totalInteractions: Int?

  enum CodingKeys: String, CodingKey {
    case topCategories = "top_categories"
    case style
    case budgetLevel = "budget_level"
    case pacePreference = "pace_preference"
    case isLearned = "is_learned"
    case totalInteractions = "total_interactions"
  }

  var topPreferenceCategories: [PreferenceCategory] {
    topCategories.compactMap { PreferenceCategory(rawValue: $0) }
  }
}

// MARK: - Behavior Event

/// User behavior types for tracking
enum BehaviorType: String, Codable {
  case view = "view"
  case save = "save"
  case unsave = "unsave"
  case copy = "copy"
  case share = "share"
  case like = "like"
  case unlike = "unlike"
  case search = "search"
  case poiClick = "poi_click"
  case poiAdd = "poi_add"
}

/// Target types for behavior tracking
enum BehaviorTargetType: String, Codable {
  case guide = "guide"
  case itinerary = "itinerary"
  case poi = "poi"
  case city = "city"
  case search = "search"
}

/// Behavior event metadata
struct BehaviorMetadata: Codable {
  var duration: Int?
  var scrollDepth: Int?
  var searchQuery: String?
  var cityName: String?
  var poiCategory: String?

  enum CodingKeys: String, CodingKey {
    case duration
    case scrollDepth = "scroll_depth"
    case searchQuery = "search_query"
    case cityName = "city_name"
    case poiCategory = "poi_category"
  }
}

/// User behavior event
struct BehaviorEvent: Codable, Identifiable {
  let id: String
  let userId: String
  let behaviorType: BehaviorType
  let targetType: BehaviorTargetType
  let targetId: String
  let categories: [PreferenceCategory]
  let metadata: BehaviorMetadata?
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case behaviorType = "behavior_type"
    case targetType = "target_type"
    case targetId = "target_id"
    case categories
    case metadata
    case createdAt = "created_at"
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    userId = try container.decode(String.self, forKey: .userId)
    behaviorType = try container.decode(BehaviorType.self, forKey: .behaviorType)
    targetType = try container.decode(BehaviorTargetType.self, forKey: .targetType)
    targetId = try container.decode(String.self, forKey: .targetId)
    categories = try container.decodeIfPresent([PreferenceCategory].self, forKey: .categories) ?? []
    metadata = try container.decodeIfPresent(BehaviorMetadata.self, forKey: .metadata)

    if let timestamp = try container.decodeIfPresent(Double.self, forKey: .createdAt) {
      createdAt = Date(timeIntervalSince1970: timestamp / 1000)
    } else {
      createdAt = Date()
    }
  }
}

// MARK: - Update Preferences Request

/// Request to update user preferences
struct UpdatePreferencesRequest: Encodable {
  var explicitPreferences: [PreferenceCategory]?
  var travelStyle: TravelStyle?
  var budgetLevel: BudgetLevel?
  var pacePreference: PacePreference?
  var preferLocalFood: Bool?
  var preferOffBeatPlaces: Bool?
  var accessibilityNeeds: Bool?

  enum CodingKeys: String, CodingKey {
    case explicitPreferences = "explicit_preferences"
    case travelStyle = "travel_style"
    case budgetLevel = "budget_level"
    case pacePreference = "pace_preference"
    case preferLocalFood = "prefer_local_food"
    case preferOffBeatPlaces = "prefer_off_beat_places"
    case accessibilityNeeds = "accessibility_needs"
  }
}

// MARK: - Record Behavior Request

/// Request to record a behavior event
struct RecordBehaviorRequest: Encodable {
  let behaviorType: BehaviorType
  let targetType: BehaviorTargetType
  let targetId: String
  var categories: [PreferenceCategory]?
  var metadata: BehaviorMetadata?

  enum CodingKeys: String, CodingKey {
    case behaviorType = "behavior_type"
    case targetType = "target_type"
    case targetId = "target_id"
    case categories
    case metadata
  }
}

// MARK: - API Response Types

struct PreferencesResponse: Codable {
  let success: Bool
  let data: UserPreferences
}

struct CategoryScoresResponse: Codable {
  let success: Bool
  let data: [CategoryScore]
}

struct RecommendationsResponse: Codable {
  let success: Bool
  let data: RecommendedCategories
}

struct BehaviorsResponse: Codable {
  let success: Bool
  let data: [BehaviorEvent]
}

struct RecordBehaviorResponse: Codable {
  let success: Bool
  let data: RecordBehaviorResult
}

struct RecordBehaviorResult: Codable {
  let eventId: String

  enum CodingKeys: String, CodingKey {
    case eventId = "event_id"
  }
}

struct ResetPreferencesResponse: Codable {
  let success: Bool
  let data: ResetPreferencesResult
}

struct ResetPreferencesResult: Codable {
  let success: Bool
  let deletedEvents: Int

  enum CodingKeys: String, CodingKey {
    case success
    case deletedEvents = "deleted_events"
  }
}
