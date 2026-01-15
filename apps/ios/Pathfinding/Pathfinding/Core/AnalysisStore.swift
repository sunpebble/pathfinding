import Foundation
import OSLog

/// Store for managing itinerary analysis data
@Observable
@MainActor
final class AnalysisStore {
  static let shared = AnalysisStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "AnalysisStore")

  // State
  var currentReport: ItineraryAnalysisReport?
  var quickSummary: QuickAnalysisSummary?
  var cachedReports: [String: ItineraryAnalysisReport] = [:]

  var isLoading = false
  var isLoadingQuick = false
  var error: Error?

  private init() {}

  // MARK: - Full Analysis

  /// Load full analysis report for an itinerary
  func loadAnalysis(
    itineraryId: String,
    includeRouteOptimization: Bool = true,
    includeBudgetAnalysis: Bool = true,
    preferredTransportMode: String? = nil,
    forceRefresh: Bool = false
  ) async {
    // Check cache first
    if !forceRefresh, let cached = cachedReports[itineraryId] {
      currentReport = cached
      logger.info("Using cached analysis for itinerary \(itineraryId)")
      return
    }

    guard !isLoading else { return }
    isLoading = true
    error = nil

    do {
      var queryParams: [String] = []
      queryParams.append("includeRouteOptimization=\(includeRouteOptimization)")
      queryParams.append("includeBudgetAnalysis=\(includeBudgetAnalysis)")
      if let mode = preferredTransportMode {
        queryParams.append("preferredTransportMode=\(mode)")
      }

      let queryString = queryParams.joined(separator: "&")
      let endpoint = "analysis/\(itineraryId)?\(queryString)"

      let data = try await APIClient.shared.fetchData(endpoint: endpoint)
      let response = try JSONDecoder().decode(AnalysisReportResponse.self, from: data)
      currentReport = response.data
      cachedReports[itineraryId] = response.data
      logger.info("Loaded analysis for itinerary \(itineraryId)")
    } catch {
      self.error = error
      logger.error("Failed to load analysis: \(error.localizedDescription)")
    }

    isLoading = false
  }

  /// Generate analysis with custom options
  func generateAnalysis(
    itineraryId: String,
    options: AnalysisOptions
  ) async {
    guard !isLoading else { return }
    isLoading = true
    error = nil

    do {
      let bodyDict: [String: Any] = [
        "includeRouteOptimization": options.includeRouteOptimization,
        "includeBudgetAnalysis": options.includeBudgetAnalysis,
        "includeTimeAnalysis": options.includeTimeAnalysis,
        "preferredTransportMode": options.preferredTransportMode as Any,
      ].compactMapValues { $0 }
      let bodyData = try JSONSerialization.data(withJSONObject: bodyDict)

      let data = try await APIClient.shared.postDataWithBody(
        endpoint: "analysis/\(itineraryId)",
        bodyData: bodyData
      )
      let response = try JSONDecoder().decode(AnalysisReportResponse.self, from: data)
      currentReport = response.data
      cachedReports[itineraryId] = response.data
      logger.info("Generated analysis for itinerary \(itineraryId)")
    } catch {
      self.error = error
      logger.error("Failed to generate analysis: \(error.localizedDescription)")
    }

    isLoading = false
  }

  // MARK: - Quick Analysis

  /// Load quick analysis summary
  func loadQuickAnalysis(itineraryId: String) async {
    guard !isLoadingQuick else { return }
    isLoadingQuick = true
    error = nil

    do {
      let data = try await APIClient.shared.fetchData(
        endpoint: "analysis/\(itineraryId)/quick"
      )
      let response = try JSONDecoder().decode(QuickAnalysisResponse.self, from: data)
      quickSummary = response.data
      logger.info("Loaded quick analysis for itinerary \(itineraryId)")
    } catch {
      self.error = error
      logger.error("Failed to load quick analysis: \(error.localizedDescription)")
    }

    isLoadingQuick = false
  }

  // MARK: - Score Only

  /// Load just the score breakdown
  func loadScoreOnly(itineraryId: String) async -> ScoreOnlyData? {
    do {
      let data = try await APIClient.shared.fetchData(
        endpoint: "analysis/\(itineraryId)/score"
      )
      let response = try JSONDecoder().decode(ScoreOnlyResponse.self, from: data)
      return response.data
    } catch {
      logger.error("Failed to load score: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Budget Analysis

  /// Load budget analysis only
  func loadBudgetAnalysis(itineraryId: String) async -> BudgetAnalysis? {
    do {
      let data = try await APIClient.shared.fetchData(
        endpoint: "analysis/\(itineraryId)/budget"
      )
      let response = try JSONDecoder().decode(BudgetAnalysisResponse.self, from: data)
      return response.data
    } catch {
      logger.error("Failed to load budget analysis: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Recommendations

  /// Load recommendations only
  func loadRecommendations(itineraryId: String) async -> RecommendationsData? {
    do {
      let data = try await APIClient.shared.fetchData(
        endpoint: "analysis/\(itineraryId)/recommendations"
      )
      let response = try JSONDecoder().decode(AnalysisRecommendationsResponse.self, from: data)
      return response.data
    } catch {
      logger.error("Failed to load recommendations: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Helpers

  func clearCache() {
    currentReport = nil
    quickSummary = nil
    cachedReports.removeAll()
    error = nil
    logger.info("Analysis cache cleared")
  }

  func clearCacheForItinerary(_ itineraryId: String) {
    cachedReports.removeValue(forKey: itineraryId)
    if currentReport?.itineraryId == itineraryId {
      currentReport = nil
    }
    logger.info("Cleared analysis cache for itinerary \(itineraryId)")
  }
}

// MARK: - Analysis Options

struct AnalysisOptions {
  var includeRouteOptimization: Bool = true
  var includeBudgetAnalysis: Bool = true
  var includeTimeAnalysis: Bool = true
  var preferredTransportMode: String?
}
