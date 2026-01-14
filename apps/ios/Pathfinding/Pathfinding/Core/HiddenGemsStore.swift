import Foundation
import OSLog

/// Store for managing hidden gems discovery
@Observable
@MainActor
final class HiddenGemsStore {
  static let shared = HiddenGemsStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "HiddenGemsStore")

  // MARK: - State

  var hiddenGems: [HiddenGemPoi] = []
  var localRecommendations: [HiddenGemPoi] = []
  var userSubmissions: [UserSubmittedPoi] = []
  var mySubmissions: [UserSubmittedPoi] = []
  var selectedPoiRatings: [HiddenGemRating] = []

  var isLoading = false
  var isLoadingRatings = false
  var error: Error?

  // Filter state
  var selectedCategory: PoiCategory?
  var selectedPopularityLevel: PopularityLevel?
  var onlyLocalRecommended = false
  var searchQuery = ""
  var selectedCityId: String?

  // MARK: - Computed Properties

  var filteredHiddenGems: [HiddenGemPoi] {
    var gems = hiddenGems

    if let category = selectedCategory {
      gems = gems.filter { $0.category == category }
    }

    if let level = selectedPopularityLevel {
      gems = gems.filter { $0.popularityLevel == level }
    }

    if onlyLocalRecommended {
      gems = gems.filter { $0.localRecommendation?.isLocalRecommended == true }
    }

    if !searchQuery.isEmpty {
      let query = searchQuery.lowercased()
      gems = gems.filter {
        $0.name.lowercased().contains(query) ||
        $0.nameEn?.lowercased().contains(query) == true ||
        $0.address?.lowercased().contains(query) == true
      }
    }

    return gems
  }

  // MARK: - API Methods

  /// Fetch hidden gems with optional filters
  func fetchHiddenGems(
    cityId: String? = nil,
    category: PoiCategory? = nil,
    popularityLevel: PopularityLevel? = nil,
    onlyLocalRecommended: Bool = false,
    forceRefresh: Bool = false
  ) async {
    isLoading = true
    error = nil

    do {
      var queryItems: [URLQueryItem] = []

      if let cityId = cityId ?? selectedCityId {
        queryItems.append(URLQueryItem(name: "city_id", value: cityId))
      }
      if let category = category ?? selectedCategory {
        queryItems.append(URLQueryItem(name: "category", value: category.rawValue))
      }
      if let level = popularityLevel ?? selectedPopularityLevel {
        queryItems.append(URLQueryItem(name: "popularity_level", value: level.rawValue))
      }
      if onlyLocalRecommended || self.onlyLocalRecommended {
        queryItems.append(URLQueryItem(name: "only_local_recommended", value: "true"))
      }

      let gems = try await HiddenGemsAPIClient.shared.fetchHiddenGems(queryItems: queryItems)
      hiddenGems = gems
      logger.info("Loaded \(gems.count) hidden gems")
    } catch {
      self.error = error
      logger.error("Failed to fetch hidden gems: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Search hidden gems by keyword
  func searchHiddenGems(query: String, cityId: String? = nil) async {
    guard !query.isEmpty else {
      await fetchHiddenGems()
      return
    }

    isLoading = true
    error = nil

    do {
      let gems = try await HiddenGemsAPIClient.shared.searchHiddenGems(
        query: query,
        cityId: cityId ?? selectedCityId
      )
      hiddenGems = gems
      logger.info("Found \(gems.count) hidden gems for query: \(query)")
    } catch {
      self.error = error
      logger.error("Failed to search hidden gems: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Fetch local recommendations for a city
  func fetchLocalRecommendations(cityId: String, category: PoiCategory? = nil) async {
    isLoading = true
    error = nil

    do {
      let recommendations = try await HiddenGemsAPIClient.shared.getLocalRecommendations(
        cityId: cityId,
        category: category
      )
      localRecommendations = recommendations
      logger.info("Loaded \(recommendations.count) local recommendations")
    } catch {
      self.error = error
      logger.error("Failed to fetch local recommendations: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Fetch hidden gems by popularity level
  func fetchByPopularityLevel(_ level: PopularityLevel, cityId: String? = nil) async {
    isLoading = true
    error = nil

    do {
      let gems = try await HiddenGemsAPIClient.shared.getByPopularityLevel(
        level: level,
        cityId: cityId ?? selectedCityId
      )
      hiddenGems = gems
      logger.info("Loaded \(gems.count) gems at \(level.rawValue) popularity level")
    } catch {
      self.error = error
      logger.error("Failed to fetch by popularity: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Submit a new hidden gem
  func submitHiddenGem(_ request: SubmitHiddenGemRequest) async -> String? {
    isLoading = true
    error = nil

    do {
      let id = try await HiddenGemsAPIClient.shared.submitHiddenGem(request)
      logger.info("Submitted hidden gem with id: \(id)")
      await fetchMySubmissions() // Refresh my submissions
      isLoading = false
      return id
    } catch {
      self.error = error
      logger.error("Failed to submit hidden gem: \(String(describing: error))")
      isLoading = false
      return nil
    }
  }

  /// Fetch user submitted POIs
  func fetchUserSubmissions(status: SubmissionStatus? = nil, cityId: String? = nil) async {
    isLoading = true
    error = nil

    do {
      let submissions = try await HiddenGemsAPIClient.shared.listUserSubmittedPois(
        status: status,
        cityId: cityId ?? selectedCityId
      )
      userSubmissions = submissions
      logger.info("Loaded \(submissions.count) user submissions")
    } catch {
      self.error = error
      logger.error("Failed to fetch user submissions: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Fetch my submissions
  func fetchMySubmissions() async {
    isLoading = true
    error = nil

    do {
      let submissions = try await HiddenGemsAPIClient.shared.getMySubmissions()
      mySubmissions = submissions
      logger.info("Loaded \(submissions.count) of my submissions")
    } catch {
      self.error = error
      logger.error("Failed to fetch my submissions: \(String(describing: error))")
    }

    isLoading = false
  }

  /// Vote on a user submitted POI
  func vote(poiId: String, voteType: String) async -> Bool {
    do {
      let result = try await HiddenGemsAPIClient.shared.voteOnSubmission(poiId: poiId, voteType: voteType)
      logger.info("Vote \(result.action): \(result.voteType)")
      // Update local state
      if let index = userSubmissions.firstIndex(where: { $0.id == poiId }) {
        await fetchUserSubmissions() // Refresh to get updated counts
      }
      return true
    } catch {
      self.error = error
      logger.error("Failed to vote: \(String(describing: error))")
      return false
    }
  }

  /// Rate a hidden gem
  func rateHiddenGem(poiId: String, request: RateHiddenGemRequest) async -> Bool {
    do {
      try await HiddenGemsAPIClient.shared.rateHiddenGem(poiId: poiId, request: request)
      logger.info("Rated hidden gem \(poiId)")
      await fetchRatings(for: poiId) // Refresh ratings
      return true
    } catch {
      self.error = error
      logger.error("Failed to rate hidden gem: \(String(describing: error))")
      return false
    }
  }

  /// Fetch ratings for a POI
  func fetchRatings(for poiId: String) async {
    isLoadingRatings = true

    do {
      let ratings = try await HiddenGemsAPIClient.shared.getHiddenGemRatings(poiId: poiId)
      selectedPoiRatings = ratings
      logger.info("Loaded \(ratings.count) ratings for POI \(poiId)")
    } catch {
      logger.error("Failed to fetch ratings: \(String(describing: error))")
    }

    isLoadingRatings = false
  }

  /// Clear filters
  func clearFilters() {
    selectedCategory = nil
    selectedPopularityLevel = nil
    onlyLocalRecommended = false
    searchQuery = ""
  }
}

// MARK: - Hidden Gems API Client

actor HiddenGemsAPIClient {
  static let shared = HiddenGemsAPIClient()

  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "HiddenGemsAPI")
  private let authManager = AuthManager.shared

  init() {
    self.baseURL = URL(string: AppConfig.apiBaseURL)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = AppConfig.networkTimeoutRequest
    self.session = URLSession(configuration: config)

    self.decoder = JSONDecoder()
    self.encoder = JSONEncoder()
  }

  // MARK: - Private Helpers

  private func createRequest(url: URL, method: String = "GET", body: Data? = nil) async -> URLRequest {
    var request = URLRequest(url: url)
    request.httpMethod = method

    if let token = try? await authManager.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    if let body = body {
      request.httpBody = body
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }

    return request
  }

  private func performRequest<T: Decodable>(request: URLRequest) async throws -> T {
    let (data, response) = try await session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard (200...299).contains(httpResponse.statusCode) else {
      switch httpResponse.statusCode {
      case 401: throw APIError.unauthorized
      case 404: throw APIError.notFound
      default: throw APIError.httpError(httpResponse.statusCode)
      }
    }

    return try decoder.decode(T.self, from: data)
  }

  // MARK: - Hidden Gems APIs

  func fetchHiddenGems(queryItems: [URLQueryItem] = []) async throws -> [HiddenGemPoi] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/hidden-gems"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    let request = await createRequest(url: components.url!)
    let response: HiddenGemsListResponse = try await performRequest(request: request)
    return response.data
  }

  func searchHiddenGems(query: String, cityId: String? = nil) async throws -> [HiddenGemPoi] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/hidden-gems/search"),
      resolvingAgainstBaseURL: false
    )!
    var queryItems = [URLQueryItem(name: "query", value: query)]
    if let cityId = cityId {
      queryItems.append(URLQueryItem(name: "city_id", value: cityId))
    }
    components.queryItems = queryItems

    let request = await createRequest(url: components.url!)
    let response: HiddenGemsListResponse = try await performRequest(request: request)
    return response.data
  }

  func getByPopularityLevel(level: PopularityLevel, cityId: String? = nil) async throws -> [HiddenGemPoi] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/hidden-gems/by-popularity/\(level.rawValue)"),
      resolvingAgainstBaseURL: false
    )!
    if let cityId = cityId {
      components.queryItems = [URLQueryItem(name: "city_id", value: cityId)]
    }

    let request = await createRequest(url: components.url!)
    let response: HiddenGemsListResponse = try await performRequest(request: request)
    return response.data
  }

  func getLocalRecommendations(cityId: String, category: PoiCategory? = nil) async throws -> [HiddenGemPoi] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/hidden-gems/local-recommendations/\(cityId)"),
      resolvingAgainstBaseURL: false
    )!
    if let category = category {
      components.queryItems = [URLQueryItem(name: "category", value: category.rawValue)]
    }

    let request = await createRequest(url: components.url!)
    let response: HiddenGemsListResponse = try await performRequest(request: request)
    return response.data
  }

  func submitHiddenGem(_ submission: SubmitHiddenGemRequest) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/hidden-gems/submit")
    let body = try encoder.encode(submission)
    let request = await createRequest(url: url, method: "POST", body: body)
    let response: SubmitHiddenGemResponse = try await performRequest(request: request)
    return response.data.id
  }

  func listUserSubmittedPois(status: SubmissionStatus? = nil, cityId: String? = nil) async throws -> [UserSubmittedPoi] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/hidden-gems/submissions"),
      resolvingAgainstBaseURL: false
    )!
    var queryItems: [URLQueryItem] = []
    if let status = status {
      queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
    }
    if let cityId = cityId {
      queryItems.append(URLQueryItem(name: "city_id", value: cityId))
    }
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    let request = await createRequest(url: components.url!)
    let response: UserSubmittedPoisListResponse = try await performRequest(request: request)
    return response.data
  }

  func getMySubmissions() async throws -> [UserSubmittedPoi] {
    let url = baseURL.appendingPathComponent("v1/hidden-gems/my-submissions")
    let request = await createRequest(url: url)
    let response: UserSubmittedPoisListResponse = try await performRequest(request: request)
    return response.data
  }

  func voteOnSubmission(poiId: String, voteType: String) async throws -> HiddenGemVoteResponse.VoteResult {
    let url = baseURL.appendingPathComponent("v1/hidden-gems/submissions/\(poiId)/vote")
    let body = try encoder.encode(VoteRequest(voteType: voteType))
    let request = await createRequest(url: url, method: "POST", body: body)
    let response: HiddenGemVoteResponse = try await performRequest(request: request)
    return response.data
  }

  func rateHiddenGem(poiId: String, request: RateHiddenGemRequest) async throws {
    let url = baseURL.appendingPathComponent("v1/hidden-gems/\(poiId)/rate")
    let body = try encoder.encode(request)
    let httpRequest = await createRequest(url: url, method: "POST", body: body)
    let _: GenericResponse = try await performRequest(request: httpRequest)
  }

  func getHiddenGemRatings(poiId: String) async throws -> [HiddenGemRating] {
    let url = baseURL.appendingPathComponent("v1/hidden-gems/\(poiId)/ratings")
    let request = await createRequest(url: url)
    let response: HiddenGemRatingsResponse = try await performRequest(request: request)
    return response.data
  }
}

// Generic response for endpoints that just return success
private struct GenericResponse: Codable {
  let data: AnyCodable?
  let success: Bool?
}

private struct AnyCodable: Codable {
  init(from decoder: Decoder) throws {
    // Just accept any value
  }

  func encode(to encoder: Encoder) throws {
    // Empty encoding
  }
}
