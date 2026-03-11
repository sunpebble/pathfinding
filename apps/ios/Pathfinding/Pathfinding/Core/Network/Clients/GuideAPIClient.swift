import Foundation

/// API client for travel guide-related operations
actor GuideAPIClient {
  static let shared = GuideAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Guide APIs

  /// Fetch travel guides with caching
  func fetchGuides(limit: Int = 20, offset: Int = 0, forceRefresh: Bool = false) async throws -> [BlogPost] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/guides"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit)),
      URLQueryItem(name: "offset", value: String(offset)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: forceRefresh)
    let result = try decoder.decode(BlogListResponse.self, from: data)
    return result.data
  }

  /// Fetch single guide by ID
  func fetchGuide(id: String) async throws -> BlogPost {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/guides/by-id"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "id", value: id),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    return try decoder.decode(BlogPost.self, from: data)
  }

  /// Search guides with filters
  func searchGuides(
    query: String? = nil,
    destination: String? = nil,
    hasAiData: Bool? = nil,
    daysAgo: Int? = nil,
    limit: Int = 30
  ) async throws -> [BlogPost] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/guides/search"),
      resolvingAgainstBaseURL: false
    )!
    var queryItems: [URLQueryItem] = []

    if let query = query, !query.isEmpty {
      queryItems.append(URLQueryItem(name: "q", value: query))
    }
    if let destination = destination {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let hasAiData = hasAiData, hasAiData {
      queryItems.append(URLQueryItem(name: "hasAiData", value: "true"))
    }
    if let daysAgo = daysAgo {
      queryItems.append(URLQueryItem(name: "daysAgo", value: String(daysAgo)))
    }
    queryItems.append(URLQueryItem(name: "limit", value: String(limit)))

    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(BlogListResponse.self, from: data)
    return result.data
  }

  /// Fetch popular destinations
  func fetchPopularDestinations(limit: Int = 10) async throws -> [PopularDestination] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/guides/destinations"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    struct Response: Codable {
      let data: [PopularDestination]
    }
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(Response.self, from: data)
    return result.data
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch travel guides with caching
  func fetchGuides(limit: Int = 20, offset: Int = 0, forceRefresh: Bool = false) async throws -> [BlogPost] {
    try await GuideAPIClient.shared.fetchGuides(limit: limit, offset: offset, forceRefresh: forceRefresh)
  }

  /// Fetch single guide by ID
  func fetchGuide(id: String) async throws -> BlogPost {
    try await GuideAPIClient.shared.fetchGuide(id: id)
  }

  /// Search guides with filters
  func searchGuides(
    query: String? = nil,
    destination: String? = nil,
    hasAiData: Bool? = nil,
    daysAgo: Int? = nil,
    limit: Int = 30
  ) async throws -> [BlogPost] {
    try await GuideAPIClient.shared.searchGuides(
      query: query,
      destination: destination,
      hasAiData: hasAiData,
      daysAgo: daysAgo,
      limit: limit
    )
  }

  /// Fetch popular destinations
  func fetchPopularDestinations(limit: Int = 10) async throws -> [PopularDestination] {
    try await GuideAPIClient.shared.fetchPopularDestinations(limit: limit)
  }
}
