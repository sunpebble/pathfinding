import Foundation
import OSLog

/// Store for managing user preferences and behavior tracking
@Observable
@MainActor
final class PreferenceStore {
  static let shared = PreferenceStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "PreferenceStore")

  // MARK: - State

  var preferences: UserPreferences?
  var topCategories: [CategoryScore] = []
  var recommendations: RecommendedCategories?
  var recentBehaviors: [BehaviorEvent] = []

  var isLoading = false
  var error: String?

  // MARK: - Computed Properties

  /// Whether preferences have been loaded
  var hasPreferences: Bool {
    preferences != nil
  }

  /// Whether the user has set explicit preferences
  var hasExplicitPreferences: Bool {
    !(preferences?.explicitPreferences.isEmpty ?? true)
  }

  /// Whether preferences are learned from behavior
  var isLearned: Bool {
    preferences?.isLearned ?? false
  }

  // MARK: - Initialization

  private init() {}

  // MARK: - Public Methods

  /// Load user preferences
  func loadPreferences() async {
    isLoading = true
    error = nil

    do {
      preferences = try await APIClient.shared.fetchPreferences()
      logger.info("Loaded user preferences")
    } catch {
      logger.error("Failed to load preferences: \(String(describing: error))")
      self.error = error.localizedDescription
    }

    isLoading = false
  }

  /// Load top preference categories
  func loadTopCategories(limit: Int = 5) async {
    do {
      topCategories = try await APIClient.shared.fetchTopCategories(limit: limit)
      logger.info("Loaded \(self.topCategories.count) top categories")
    } catch {
      logger.error("Failed to load top categories: \(String(describing: error))")
    }
  }

  /// Load personalized recommendations
  func loadRecommendations() async {
    do {
      recommendations = try await APIClient.shared.fetchRecommendations()
      logger.info("Loaded recommendations")
    } catch {
      logger.error("Failed to load recommendations: \(String(describing: error))")
    }
  }

  /// Load recent behavior events
  func loadRecentBehaviors(limit: Int = 50) async {
    do {
      recentBehaviors = try await APIClient.shared.fetchRecentBehaviors(limit: limit)
      logger.info("Loaded \(self.recentBehaviors.count) recent behaviors")
    } catch {
      logger.error("Failed to load recent behaviors: \(String(describing: error))")
    }
  }

  /// Update user preferences
  func updatePreferences(
    explicitPreferences: [PreferenceCategory]? = nil,
    travelStyle: TravelStyle? = nil,
    budgetLevel: BudgetLevel? = nil,
    pacePreference: PacePreference? = nil,
    preferLocalFood: Bool? = nil,
    preferOffBeatPlaces: Bool? = nil,
    accessibilityNeeds: Bool? = nil
  ) async -> Bool {
    isLoading = true
    error = nil

    let request = UpdatePreferencesRequest(
      explicitPreferences: explicitPreferences,
      travelStyle: travelStyle,
      budgetLevel: budgetLevel,
      pacePreference: pacePreference,
      preferLocalFood: preferLocalFood,
      preferOffBeatPlaces: preferOffBeatPlaces,
      accessibilityNeeds: accessibilityNeeds
    )

    do {
      preferences = try await APIClient.shared.updatePreferences(request: request)
      logger.info("Updated user preferences")
      isLoading = false
      return true
    } catch {
      logger.error("Failed to update preferences: \(String(describing: error))")
      self.error = error.localizedDescription
      isLoading = false
      return false
    }
  }

  /// Record a behavior event
  func recordBehavior(
    type: BehaviorType,
    targetType: BehaviorTargetType,
    targetId: String,
    categories: [PreferenceCategory]? = nil,
    metadata: BehaviorMetadata? = nil
  ) async {
    let request = RecordBehaviorRequest(
      behaviorType: type,
      targetType: targetType,
      targetId: targetId,
      categories: categories,
      metadata: metadata
    )

    do {
      _ = try await APIClient.shared.recordBehavior(request: request)
      logger.debug("Recorded behavior: \(type.rawValue) on \(targetType.rawValue):\(targetId)")
    } catch {
      logger.error("Failed to record behavior: \(String(describing: error))")
    }
  }

  /// Reset learned preferences (keeps explicit settings)
  func resetPreferences() async -> Bool {
    isLoading = true
    error = nil

    do {
      let result = try await APIClient.shared.resetPreferences()
      if result.success {
        // Reload preferences after reset
        await loadPreferences()
        await loadTopCategories()
        recentBehaviors = []
        logger.info("Reset preferences, deleted \(result.deletedEvents) events")
      }
      isLoading = false
      return result.success
    } catch {
      logger.error("Failed to reset preferences: \(String(describing: error))")
      self.error = error.localizedDescription
      isLoading = false
      return false
    }
  }

  /// Load all preference data at once
  func loadAllData() async {
    await loadPreferences()
    await loadTopCategories()
    await loadRecommendations()
  }

  // MARK: - Convenience Methods for Common Behaviors

  /// Record viewing a guide
  func recordGuideView(guideId: String, categories: [PreferenceCategory]? = nil, duration: Int? = nil) async {
    var metadata: BehaviorMetadata?
    if let duration = duration {
      metadata = BehaviorMetadata(duration: duration)
    }
    await recordBehavior(
      type: .view,
      targetType: .guide,
      targetId: guideId,
      categories: categories,
      metadata: metadata
    )
  }

  /// Record saving a guide
  func recordGuideSave(guideId: String, categories: [PreferenceCategory]? = nil) async {
    await recordBehavior(
      type: .save,
      targetType: .guide,
      targetId: guideId,
      categories: categories
    )
  }

  /// Record copying an itinerary
  func recordItineraryCopy(itineraryId: String, categories: [PreferenceCategory]? = nil) async {
    await recordBehavior(
      type: .copy,
      targetType: .itinerary,
      targetId: itineraryId,
      categories: categories
    )
  }

  /// Record clicking on a POI
  func recordPoiClick(poiId: String, category: String? = nil) async {
    var metadata: BehaviorMetadata?
    if let category = category {
      metadata = BehaviorMetadata(poiCategory: category)
    }
    await recordBehavior(
      type: .poiClick,
      targetType: .poi,
      targetId: poiId,
      metadata: metadata
    )
  }

  /// Record a search
  func recordSearch(query: String, cityName: String? = nil) async {
    let metadata = BehaviorMetadata(searchQuery: query, cityName: cityName)
    await recordBehavior(
      type: .search,
      targetType: .search,
      targetId: query,
      metadata: metadata
    )
  }
}
