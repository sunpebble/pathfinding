import Foundation
import OSLog
import CoreLocation

/// Store for managing travel footprints (visited cities, countries, and map data)
@Observable
@MainActor
final class FootprintStore {
  static let shared = FootprintStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "FootprintStore")
  private let decoder: JSONDecoder = {
    let decoder = JSONDecoder()
    return decoder
  }()
  private let encoder = JSONEncoder()

  // MARK: - State

  var visitedCities: [VisitedCity] = []
  var visitedCountries: [VisitedCountry] = []
  var footprintStats: FootprintStats?
  var mapData: FootprintMapData?
  var timeline: [FootprintTimelineItem] = []

  var isLoadingCities = false
  var isLoadingCountries = false
  var isLoadingStats = false
  var isLoadingMap = false
  var isLoadingTimeline = false
  var isAddingCity = false

  var error: Error?

  // Pagination
  var timelineOffset = 0
  var timelineHasMore = true
  private let timelinePageSize = 20

  private init() {}

  // MARK: - Load Visited Cities

  func loadVisitedCities() async {
    guard !isLoadingCities else { return }
    isLoadingCities = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "footprints/cities")
      let response = try decoder.decode(VisitedCitiesResponse.self, from: data)
      visitedCities = response.data
      logger.info("Loaded \(self.visitedCities.count) visited cities")
    } catch {
      self.error = error
      logger.error("Failed to load visited cities: \(error.localizedDescription)")
    }

    isLoadingCities = false
  }

  // MARK: - Load Visited Countries

  func loadVisitedCountries() async {
    guard !isLoadingCountries else { return }
    isLoadingCountries = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "footprints/countries")
      let response = try decoder.decode(VisitedCountriesResponse.self, from: data)
      visitedCountries = response.data
      logger.info("Loaded \(self.visitedCountries.count) visited countries")
    } catch {
      self.error = error
      logger.error("Failed to load visited countries: \(error.localizedDescription)")
    }

    isLoadingCountries = false
  }

  // MARK: - Load Stats

  func loadStats() async {
    guard !isLoadingStats else { return }
    isLoadingStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "footprints/stats")
      let response = try decoder.decode(FootprintStatsResponse.self, from: data)
      footprintStats = response.data
      logger.info("Loaded footprint stats: \(self.footprintStats?.totalCities ?? 0) cities, \(self.footprintStats?.totalCountries ?? 0) countries")
    } catch {
      self.error = error
      logger.error("Failed to load footprint stats: \(error.localizedDescription)")
    }

    isLoadingStats = false
  }

  func refreshStats() async {
    isLoadingStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.postData(endpoint: "footprints/stats/refresh", body: [:])
      let response = try decoder.decode(FootprintStatsResponse.self, from: data)
      footprintStats = response.data
      logger.info("Refreshed footprint stats")
    } catch {
      self.error = error
      logger.error("Failed to refresh footprint stats: \(error.localizedDescription)")
    }

    isLoadingStats = false
  }

  // MARK: - Load Map Data

  func loadMapData() async {
    guard !isLoadingMap else { return }
    isLoadingMap = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(endpoint: "footprints/map")
      let response = try decoder.decode(FootprintMapResponse.self, from: data)
      mapData = response.data
      logger.info("Loaded map data: \(self.mapData?.features.count ?? 0) features, \(self.mapData?.visitedCountries.count ?? 0) countries")
    } catch {
      self.error = error
      logger.error("Failed to load map data: \(error.localizedDescription)")
    }

    isLoadingMap = false
  }

  // MARK: - Load Timeline

  func loadTimeline(reset: Bool = false) async {
    guard !isLoadingTimeline else { return }

    if reset {
      timelineOffset = 0
      timelineHasMore = true
      timeline = []
    }

    guard timelineHasMore else { return }

    isLoadingTimeline = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(
        endpoint: "footprints/timeline?limit=\(timelinePageSize)&offset=\(timelineOffset)"
      )
      let response = try decoder.decode(FootprintTimelineResponse.self, from: data)

      if reset {
        timeline = response.data
      } else {
        timeline.append(contentsOf: response.data)
      }

      timelineOffset += response.data.count
      timelineHasMore = response.meta.hasMore
      logger.info("Loaded \(response.data.count) timeline items (total: \(self.timeline.count))")
    } catch {
      self.error = error
      logger.error("Failed to load timeline: \(error.localizedDescription)")
    }

    isLoadingTimeline = false
  }

  // MARK: - Add Visited City

  func addVisitedCity(_ input: AddVisitedCityInput) async -> Bool {
    isAddingCity = true
    error = nil

    do {
      let bodyData = try encoder.encode(input)
      guard let body = try JSONSerialization.jsonObject(with: bodyData) as? [String: Any] else {
        throw APIError.invalidResponse
      }

      _ = try await NetworkClient.shared.postData(endpoint: "footprints/cities", body: body)
      logger.info("Added visited city: \(input.cityName)")

      // Refresh data
      await loadVisitedCities()
      await loadStats()
      await loadMapData()

      isAddingCity = false
      return true
    } catch {
      self.error = error
      logger.error("Failed to add visited city: \(error.localizedDescription)")
      isAddingCity = false
      return false
    }
  }

  // MARK: - Update Visited City

  func updateVisitedCity(id: String, input: UpdateVisitedCityInput) async -> Bool {
    error = nil

    do {
      let bodyData = try encoder.encode(input)
      guard let body = try JSONSerialization.jsonObject(with: bodyData) as? [String: Any] else {
        throw APIError.invalidResponse
      }

      _ = try await NetworkClient.shared.patchData(endpoint: "footprints/cities/\(id)", body: body)
      logger.info("Updated visited city: \(id)")

      // Refresh cities list
      await loadVisitedCities()
      return true
    } catch {
      self.error = error
      logger.error("Failed to update visited city: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Remove Visited City

  func removeVisitedCity(id: String) async -> Bool {
    error = nil

    do {
      _ = try await NetworkClient.shared.deleteData(endpoint: "footprints/cities/\(id)")
      logger.info("Removed visited city: \(id)")

      // Refresh data
      await loadVisitedCities()
      await loadStats()
      await loadMapData()

      return true
    } catch {
      self.error = error
      logger.error("Failed to remove visited city: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Set Travel Goals

  func setTravelGoals(goalCities: Int? = nil, goalCountries: Int? = nil) async -> Bool {
    error = nil

    do {
      var body: [String: Any] = [:]
      if let goalCities { body["goalCities"] = goalCities }
      if let goalCountries { body["goalCountries"] = goalCountries }

      _ = try await NetworkClient.shared.patchData(endpoint: "footprints/goals", body: body)
      logger.info("Updated travel goals")

      await loadStats()
      return true
    } catch {
      self.error = error
      logger.error("Failed to set travel goals: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Load All Data

  func loadAllData() async {
    async let cities: () = loadVisitedCities()
    async let countries: () = loadVisitedCountries()
    async let stats: () = loadStats()
    async let map: () = loadMapData()

    _ = await (cities, countries, stats, map)
  }

  // MARK: - Clear Cache

  func clearCache() {
    visitedCities = []
    visitedCountries = []
    footprintStats = nil
    mapData = nil
    timeline = []
    timelineOffset = 0
    timelineHasMore = true
    error = nil
    logger.info("Footprint cache cleared")
  }

  // MARK: - Computed Properties

  /// Cities grouped by country
  var citiesByCountry: [String: [VisitedCity]] {
    Dictionary(grouping: visitedCities, by: { $0.countryCode })
  }

  /// Cities sorted by visit count
  var mostVisitedCities: [VisitedCity] {
    visitedCities.sorted { ($0.visitCount ?? 1) > ($1.visitCount ?? 1) }
  }

  /// Countries sorted by cities count
  var countriesWithMostCities: [VisitedCountry] {
    visitedCountries.sorted { $0.citiesCount > $1.citiesCount }
  }

  /// Total visits (sum of all city visit counts)
  var totalVisits: Int {
    visitedCities.reduce(0) { $0 + ($1.visitCount ?? 1) }
  }

  /// Check if a city has been visited
  func hasVisited(cityName: String) -> Bool {
    visitedCities.contains { $0.cityName == cityName }
  }

  /// Check if a country has been visited
  func hasVisitedCountry(countryCode: String) -> Bool {
    visitedCountries.contains { $0.countryCode == countryCode }
  }

  /// Get cities for a specific country
  func cities(forCountry countryCode: String) -> [VisitedCity] {
    visitedCities.filter { $0.countryCode == countryCode }
  }
}
