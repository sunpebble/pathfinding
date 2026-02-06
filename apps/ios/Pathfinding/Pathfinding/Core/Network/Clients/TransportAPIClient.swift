import Foundation

/// API client for transport-related operations
actor TransportAPIClient {
  static let shared = TransportAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }
  private var aiServiceURL: URL { network.aiServiceURL }

  private init() {}

  // MARK: - Transport APIs

  /// Compare transport routes between two points
  func compareTransportRoutes(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    originName: String? = nil,
    destinationName: String? = nil,
    city: String? = nil,
    modes: [TransportMode]? = nil
  ) async throws -> TransportComparison {
    let url = aiServiceURL.appendingPathComponent("api/transport/compare")

    let body = TransportCompareRequest(
      origin: origin,
      destination: destination,
      originName: originName,
      destinationName: destinationName,
      city: city,
      modes: modes
    )
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(TransportComparisonResponse.self, from: data)
    return result.data
  }

  /// Get walking route between two points
  func getWalkingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate
  ) async throws -> TransportRoute {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/transport/walking"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "origin", value: "\(origin.latitude),\(origin.longitude)"),
      URLQueryItem(name: "destination", value: "\(destination.latitude),\(destination.longitude)"),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransportRouteResponse.self, from: data)
    return result.data
  }

  /// Get cycling route between two points
  func getCyclingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate
  ) async throws -> TransportRoute {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/transport/cycling"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "origin", value: "\(origin.latitude),\(origin.longitude)"),
      URLQueryItem(name: "destination", value: "\(destination.latitude),\(destination.longitude)"),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransportRouteResponse.self, from: data)
    return result.data
  }

  /// Get driving route with taxi estimate
  func getDrivingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    city: String? = nil
  ) async throws -> DrivingRouteData {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/transport/driving"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "origin", value: "\(origin.latitude),\(origin.longitude)"),
      URLQueryItem(name: "destination", value: "\(destination.latitude),\(destination.longitude)"),
    ]
    if let city = city {
      queryItems.append(URLQueryItem(name: "city", value: city))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(DrivingRouteResponse.self, from: data)
    return result.data
  }

  /// Get public transit route
  func getTransitRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    city: String
  ) async throws -> TransportRoute {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/transport/transit"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "origin", value: "\(origin.latitude),\(origin.longitude)"),
      URLQueryItem(name: "destination", value: "\(destination.latitude),\(destination.longitude)"),
      URLQueryItem(name: "city", value: city),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransportRouteResponse.self, from: data)
    return result.data
  }

  /// Get city transit information
  func getCityTransitInfo(cityName: String) async throws -> CityTransitInfo {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/city/\(encodedCity)")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(CityTransitInfoResponse.self, from: data)
    return result.data
  }

  /// Get transit pass recommendations for a city
  func getTransitPasses(cityName: String) async throws -> [TransitPassRecommendation] {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/passes/\(encodedCity)")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransitPassesResponse.self, from: data)
    return result.data
  }

  /// Get transit tips for a city
  func getTransitTips(cityName: String) async throws -> [String] {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/tips/\(encodedCity)")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransitTipsResponse.self, from: data)
    return result.data
  }

  /// Batch compare routes for multiple origin-destination pairs
  func batchCompareTransportRoutes(
    routes: [TransportRouteRequest],
    city: String? = nil
  ) async throws -> [TransportComparison] {
    let url = aiServiceURL.appendingPathComponent("api/transport/batch")

    let body = BatchTransportRequest(routes: routes, city: city)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(BatchTransportResponse.self, from: data)
    return result.data
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Compare transport routes between two points
  func compareTransportRoutes(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    originName: String? = nil,
    destinationName: String? = nil,
    city: String? = nil,
    modes: [TransportMode]? = nil
  ) async throws -> TransportComparison {
    try await TransportAPIClient.shared.compareTransportRoutes(
      origin: origin,
      destination: destination,
      originName: originName,
      destinationName: destinationName,
      city: city,
      modes: modes
    )
  }

  /// Get walking route between two points
  func getWalkingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate
  ) async throws -> TransportRoute {
    try await TransportAPIClient.shared.getWalkingRoute(origin: origin, destination: destination)
  }

  /// Get cycling route between two points
  func getCyclingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate
  ) async throws -> TransportRoute {
    try await TransportAPIClient.shared.getCyclingRoute(origin: origin, destination: destination)
  }

  /// Get driving route with taxi estimate
  func getDrivingRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    city: String? = nil
  ) async throws -> DrivingRouteData {
    try await TransportAPIClient.shared.getDrivingRoute(origin: origin, destination: destination, city: city)
  }

  /// Get public transit route
  func getTransitRoute(
    origin: TransportCoordinate,
    destination: TransportCoordinate,
    city: String
  ) async throws -> TransportRoute {
    try await TransportAPIClient.shared.getTransitRoute(origin: origin, destination: destination, city: city)
  }

  /// Get city transit information
  func getCityTransitInfo(cityName: String) async throws -> CityTransitInfo {
    try await TransportAPIClient.shared.getCityTransitInfo(cityName: cityName)
  }

  /// Get transit pass recommendations for a city
  func getTransitPasses(cityName: String) async throws -> [TransitPassRecommendation] {
    try await TransportAPIClient.shared.getTransitPasses(cityName: cityName)
  }

  /// Get transit tips for a city
  func getTransitTips(cityName: String) async throws -> [String] {
    try await TransportAPIClient.shared.getTransitTips(cityName: cityName)
  }

  /// Batch compare routes for multiple origin-destination pairs
  func batchCompareTransportRoutes(
    routes: [TransportRouteRequest],
    city: String? = nil
  ) async throws -> [TransportComparison] {
    try await TransportAPIClient.shared.batchCompareTransportRoutes(routes: routes, city: city)
  }
}
