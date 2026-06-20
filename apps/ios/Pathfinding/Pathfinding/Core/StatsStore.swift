import Foundation
import OSLog

/// Store for managing travel statistics data
@Observable
@MainActor
final class StatsStore {
  static let shared = StatsStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "StatsStore")

  // State
  var quickStats: QuickStats?
  var fullStats: TravelStats?
  var yearlyReviews: [YearlyReview] = []
  var currentYearReview: YearlyReview?
  var availableYears: [Int] = []

  var isLoadingQuickStats = false
  var isLoadingFullStats = false
  var isLoadingYearlyReview = false
  var isGeneratingReview = false

  var error: Error?

  private init() {}

  // MARK: - Quick Stats

  func loadQuickStats() async {
    guard !isLoadingQuickStats else { return }
    isLoadingQuickStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "stats/quick")
      let response = try JSONDecoder().decode(QuickStatsResponse.self, from: data)
      quickStats = response.data
      logger.info("Loaded quick stats")
    } catch {
      self.error = error
      logger.error("Failed to load quick stats: \(error.localizedDescription)")
    }

    isLoadingQuickStats = false
  }

  // MARK: - Full Stats

  func loadFullStats() async {
    guard !isLoadingFullStats else { return }
    isLoadingFullStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "stats")
      let response = try JSONDecoder().decode(TravelStatsResponse.self, from: data)
      fullStats = response.data
      logger.info("Loaded full stats")
    } catch {
      self.error = error
      logger.error("Failed to load full stats: \(error.localizedDescription)")
    }

    isLoadingFullStats = false
  }

  func calculateStats() async {
    isLoadingFullStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.postData(endpoint: "stats/calculate", body: [:])
      let response = try JSONDecoder().decode(TravelStatsResponse.self, from: data)
      fullStats = response.data
      logger.info("Calculated and loaded stats")
    } catch {
      self.error = error
      logger.error("Failed to calculate stats: \(error.localizedDescription)")
    }

    isLoadingFullStats = false
  }

  // MARK: - Yearly Reviews

  func loadAvailableYears() async {
    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "stats/yearly/available")
      let response = try JSONDecoder().decode(AvailableYearsResponse.self, from: data)
      availableYears = response.data
      logger.info("Loaded \(self.availableYears.count) available years")
    } catch {
      self.error = error
      logger.error("Failed to load available years: \(error.localizedDescription)")
    }
  }

  func loadYearlyReviews() async {
    isLoadingYearlyReview = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "stats/yearly")
      let response = try JSONDecoder().decode(YearlyReviewsListResponse.self, from: data)
      yearlyReviews = response.data
      logger.info("Loaded \(self.yearlyReviews.count) yearly reviews")
    } catch {
      self.error = error
      logger.error("Failed to load yearly reviews: \(error.localizedDescription)")
    }

    isLoadingYearlyReview = false
  }

  func loadYearlyReview(year: Int) async {
    isLoadingYearlyReview = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "stats/yearly/\(year)")
      let response = try JSONDecoder().decode(YearlyReviewResponse.self, from: data)
      currentYearReview = response.data
      logger.info("Loaded yearly review for \(year)")
    } catch {
      self.error = error
      logger.error("Failed to load yearly review: \(error.localizedDescription)")
    }

    isLoadingYearlyReview = false
  }

  func generateYearlyReview(year: Int) async {
    isGeneratingReview = true
    error = nil

    do {
      let data = try await NetworkClient.shared.postData(
        endpoint: "stats/yearly/\(year)/generate",
        body: [:]
      )
      let response = try JSONDecoder().decode(YearlyReviewResponse.self, from: data)
      currentYearReview = response.data

      // Update the list if needed
      if let review = response.data {
        if let index = yearlyReviews.firstIndex(where: { $0.year == year }) {
          yearlyReviews[index] = review
        } else {
          yearlyReviews.append(review)
          yearlyReviews.sort { $0.year > $1.year }
        }
      }

      logger.info("Generated yearly review for \(year)")
    } catch {
      self.error = error
      logger.error("Failed to generate yearly review: \(error.localizedDescription)")
    }

    isGeneratingReview = false
  }

  func addMemory(year: Int, text: String, itineraryId: String? = nil, imageUrl: String? = nil) async {
    do {
      var body: [String: Any] = ["text": text]
      if let itineraryId { body["itineraryId"] = itineraryId }
      if let imageUrl { body["imageUrl"] = imageUrl }

      let data = try await NetworkClient.shared.postData(
        endpoint: "stats/yearly/\(year)/memories",
        body: body
      )
      let response = try JSONDecoder().decode(YearlyReviewResponse.self, from: data)
      currentYearReview = response.data
      logger.info("Added memory to yearly review for \(year)")
    } catch {
      self.error = error
      logger.error("Failed to add memory: \(error.localizedDescription)")
    }
  }

  // MARK: - Helpers

  func clearCache() {
    quickStats = nil
    fullStats = nil
    yearlyReviews = []
    currentYearReview = nil
    availableYears = []
    error = nil
    logger.info("Stats cache cleared")
  }
}
