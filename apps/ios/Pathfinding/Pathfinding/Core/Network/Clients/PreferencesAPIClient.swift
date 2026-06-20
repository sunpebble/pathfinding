import Foundation

/// API client for user preferences-related operations
actor PreferencesAPIClient {
  static let shared = PreferencesAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Preferences APIs

  /// Fetch user preferences
  func fetchPreferences() async throws -> UserPreferences {
    let url = await baseURL.appendingPathComponent("v1/preferences")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(PreferencesResponse.self, from: data)
    return result.data
  }

  /// Update user preferences
  func updatePreferences(request: UpdatePreferencesRequest) async throws -> UserPreferences {
    let url = await baseURL.appendingPathComponent("v1/preferences")

    let data = try await network.putWithRetry(url: url, body: request)
    let result = try decoder.decode(PreferencesResponse.self, from: data)
    return result.data
  }

  /// Record a behavior event
  func recordBehavior(request: RecordBehaviorRequest) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/preferences/behavior")

    let data = try await network.postWithRetry(url: url, body: request)
    let result = try decoder.decode(RecordBehaviorResponse.self, from: data)
    return result.data.eventId
  }

  /// Fetch top preference categories
  func fetchTopCategories(limit: Int = 5) async throws -> [CategoryScore] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/preferences/categories"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CategoryScoresResponse.self, from: data)
    return result.data
  }

  /// Fetch personalized recommendations
  func fetchRecommendations() async throws -> RecommendedCategories {
    let url = await baseURL.appendingPathComponent("v1/preferences/recommendations")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(RecommendationsResponse.self, from: data)
    return result.data
  }

  /// Fetch recent behavior events
  func fetchRecentBehaviors(limit: Int = 50, type: BehaviorType? = nil) async throws -> [BehaviorEvent] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/preferences/behaviors"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]
    if let type = type {
      queryItems.append(URLQueryItem(name: "type", value: type.rawValue))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(BehaviorsResponse.self, from: data)
    return result.data
  }

  /// Reset learned preferences
  func resetPreferences() async throws -> ResetPreferencesResult {
    let url = await baseURL.appendingPathComponent("v1/preferences/reset")

    let data = try await network.deleteWithRetry(url: url)
    let result = try decoder.decode(ResetPreferencesResponse.self, from: data)
    return result.data
  }
}
