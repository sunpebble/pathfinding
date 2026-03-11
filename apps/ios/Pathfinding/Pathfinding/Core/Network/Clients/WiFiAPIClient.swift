import Foundation

/// API client for WiFi-related operations
actor WiFiAPIClient {
  static let shared = WiFiAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - WiFi APIs

  /// Fetch WiFi spots with optional filters
  func fetchWiFiSpots(cityId: String? = nil, type: String? = nil, limit: Int? = nil) async throws -> [WiFiSpot] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/wifi/spots"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let cityId = cityId {
      queryItems.append(URLQueryItem(name: "cityId", value: cityId))
    }
    if let type = type {
      queryItems.append(URLQueryItem(name: "type", value: type))
    }
    if let limit = limit {
      queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
    }
    if !queryItems.isEmpty {
      components.queryItems = queryItems
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotListResponse.self, from: data)
    return result.data
  }

  /// Fetch nearby WiFi spots
  func fetchNearbyWiFiSpots(
    latitude: Double,
    longitude: Double,
    radiusKm: Double,
    type: String? = nil,
    limit: Int? = nil
  ) async throws -> [WiFiSpot] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/wifi/spots/nearby"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "latitude", value: String(latitude)),
      URLQueryItem(name: "longitude", value: String(longitude)),
      URLQueryItem(name: "radiusKm", value: String(radiusKm))
    ]
    if let type = type {
      queryItems.append(URLQueryItem(name: "type", value: type))
    }
    if let limit = limit {
      queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotListResponse.self, from: data)
    return result.data
  }

  /// Search WiFi spots
  func searchWiFiSpots(query: String, cityId: String? = nil, type: String? = nil) async throws -> [WiFiSpot] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/wifi/spots/search"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "q", value: query)
    ]
    if let cityId = cityId {
      queryItems.append(URLQueryItem(name: "cityId", value: cityId))
    }
    if let type = type {
      queryItems.append(URLQueryItem(name: "type", value: type))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotListResponse.self, from: data)
    return result.data
  }

  /// Fetch WiFi spot by ID
  func fetchWiFiSpot(id: String) async throws -> WiFiSpot {
    let url = await baseURL.appendingPathComponent("v1/wifi/spots/\(id)")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotResponse.self, from: data)
    return result.data
  }

  /// Create a new WiFi spot
  func createWiFiSpot(_ request: CreateWiFiSpotRequest) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/wifi/spots")
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Fetch WiFi credentials for user
  func fetchWiFiCredentials() async throws -> [WiFiCredential] {
    let url = await baseURL.appendingPathComponent("v1/wifi/credentials")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialListResponse.self, from: data)
    return result.data
  }

  /// Fetch WiFi credential for a spot
  func fetchWiFiCredentialForSpot(spotId: String) async throws -> WiFiCredential? {
    let url = await baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/credential")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialResponse.self, from: data)
    return result.data
  }

  /// Fetch shared WiFi credentials
  func fetchSharedWiFiCredentials() async throws -> [WiFiCredential] {
    let url = await baseURL.appendingPathComponent("v1/wifi/credentials/shared")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialListResponse.self, from: data)
    return result.data
  }

  /// Create a new WiFi credential
  func createWiFiCredential(_ request: CreateWiFiCredentialRequest) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/wifi/credentials")
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Delete WiFi credential
  func deleteWiFiCredential(id: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/wifi/credentials/\(id)")
    _ = try await network.deleteWithRetry(url: url)
  }

  /// Mark WiFi credential as used
  func markWiFiCredentialUsed(id: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/wifi/credentials/\(id)/used")
    _ = try await network.postWithRetry(url: url, body: EmptyBody())
  }

  /// Fetch reviews for a WiFi spot
  func fetchWiFiReviews(spotId: String, limit: Int? = nil, offset: Int? = nil) async throws -> [WiFiReview] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/reviews"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let limit = limit {
      queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
    }
    if let offset = offset {
      queryItems.append(URLQueryItem(name: "offset", value: String(offset)))
    }
    if !queryItems.isEmpty {
      components.queryItems = queryItems
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiReviewListResponse.self, from: data)
    return result.data
  }

  /// Fetch user's review for a WiFi spot
  func fetchUserWiFiReview(spotId: String) async throws -> WiFiReview? {
    let url = await baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/reviews/me")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiReviewResponse.self, from: data)
    return result.data
  }

  /// Create a WiFi review
  func createWiFiReview(_ request: CreateWiFiReviewRequest) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/wifi/reviews")
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Mark WiFi review as helpful
  func markWiFiReviewHelpful(reviewId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/wifi/reviews/\(reviewId)/helpful")
    _ = try await network.postWithRetry(url: url, body: EmptyBody())
  }

  /// Delete WiFi review
  func deleteWiFiReview(reviewId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/wifi/reviews/\(reviewId)")
    _ = try await network.deleteWithRetry(url: url)
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch WiFi spots with optional filters
  func fetchWiFiSpots(cityId: String? = nil, type: String? = nil, limit: Int? = nil) async throws -> [WiFiSpot] {
    try await WiFiAPIClient.shared.fetchWiFiSpots(cityId: cityId, type: type, limit: limit)
  }

  /// Fetch nearby WiFi spots
  func fetchNearbyWiFiSpots(
    latitude: Double,
    longitude: Double,
    radiusKm: Double,
    type: String? = nil,
    limit: Int? = nil
  ) async throws -> [WiFiSpot] {
    try await WiFiAPIClient.shared.fetchNearbyWiFiSpots(latitude: latitude, longitude: longitude, radiusKm: radiusKm, type: type, limit: limit)
  }

  /// Search WiFi spots
  func searchWiFiSpots(query: String, cityId: String? = nil, type: String? = nil) async throws -> [WiFiSpot] {
    try await WiFiAPIClient.shared.searchWiFiSpots(query: query, cityId: cityId, type: type)
  }

  /// Fetch WiFi spot by ID
  func fetchWiFiSpot(id: String) async throws -> WiFiSpot {
    try await WiFiAPIClient.shared.fetchWiFiSpot(id: id)
  }

  /// Create a new WiFi spot
  func createWiFiSpot(_ request: CreateWiFiSpotRequest) async throws -> String {
    try await WiFiAPIClient.shared.createWiFiSpot(request)
  }

  /// Fetch WiFi credentials for user
  func fetchWiFiCredentials() async throws -> [WiFiCredential] {
    try await WiFiAPIClient.shared.fetchWiFiCredentials()
  }

  /// Fetch WiFi credential for a spot
  func fetchWiFiCredentialForSpot(spotId: String) async throws -> WiFiCredential? {
    try await WiFiAPIClient.shared.fetchWiFiCredentialForSpot(spotId: spotId)
  }

  /// Fetch shared WiFi credentials
  func fetchSharedWiFiCredentials() async throws -> [WiFiCredential] {
    try await WiFiAPIClient.shared.fetchSharedWiFiCredentials()
  }

  /// Create a new WiFi credential
  func createWiFiCredential(_ request: CreateWiFiCredentialRequest) async throws -> String {
    try await WiFiAPIClient.shared.createWiFiCredential(request)
  }

  /// Delete WiFi credential
  func deleteWiFiCredential(id: String) async throws {
    try await WiFiAPIClient.shared.deleteWiFiCredential(id: id)
  }

  /// Mark WiFi credential as used
  func markWiFiCredentialUsed(id: String) async throws {
    try await WiFiAPIClient.shared.markWiFiCredentialUsed(id: id)
  }

  /// Fetch reviews for a WiFi spot
  func fetchWiFiReviews(spotId: String, limit: Int? = nil, offset: Int? = nil) async throws -> [WiFiReview] {
    try await WiFiAPIClient.shared.fetchWiFiReviews(spotId: spotId, limit: limit, offset: offset)
  }

  /// Fetch user's review for a WiFi spot
  func fetchUserWiFiReview(spotId: String) async throws -> WiFiReview? {
    try await WiFiAPIClient.shared.fetchUserWiFiReview(spotId: spotId)
  }

  /// Create a WiFi review
  func createWiFiReview(_ request: CreateWiFiReviewRequest) async throws -> String {
    try await WiFiAPIClient.shared.createWiFiReview(request)
  }

  /// Mark WiFi review as helpful
  func markWiFiReviewHelpful(reviewId: String) async throws {
    try await WiFiAPIClient.shared.markWiFiReviewHelpful(reviewId: reviewId)
  }

  /// Delete WiFi review
  func deleteWiFiReview(reviewId: String) async throws {
    try await WiFiAPIClient.shared.deleteWiFiReview(reviewId: reviewId)
  }
}
