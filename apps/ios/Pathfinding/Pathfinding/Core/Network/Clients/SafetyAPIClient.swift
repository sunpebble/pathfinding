import Foundation

/// API client for destination safety information
actor SafetyAPIClient {
  static let shared = SafetyAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Safety APIs

  /// Fetch comprehensive safety information for a destination
  func fetchDestinationSafetyInfo(destinationName: String, countryCode: String? = nil) async throws -> DestinationSafetyInfo {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/destination/\(destinationName)"),
      resolvingAgainstBaseURL: false
    )!

    if let countryCode = countryCode {
      components.queryItems = [
        URLQueryItem(name: "countryCode", value: countryCode)
      ]
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(DestinationSafetyInfoResponse.self, from: data)
    return result.data
  }

  /// Fetch safety rating for a destination
  func fetchSafetyRating(
    destinationName: String? = nil,
    countryCode: String? = nil,
    cityId: String? = nil
  ) async throws -> SafetyRating? {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/ratings"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let destination = destinationName {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let country = countryCode {
      queryItems.append(URLQueryItem(name: "countryCode", value: country))
    }
    if let city = cityId {
      queryItems.append(URLQueryItem(name: "cityId", value: city))
    }
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(SafetyRatingResponse.self, from: data)
    return result.data
  }

  /// Fetch active safety alerts for a destination
  func fetchSafetyAlerts(
    destinationName: String? = nil,
    countryCode: String? = nil,
    severity: String? = nil
  ) async throws -> [SafetyAlert] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/alerts"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let destination = destinationName {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let country = countryCode {
      queryItems.append(URLQueryItem(name: "countryCode", value: country))
    }
    if let sev = severity {
      queryItems.append(URLQueryItem(name: "severity", value: sev))
    }
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(SafetyAlertsResponse.self, from: data)
    return result.data
  }

  /// Fetch danger zones for a destination
  func fetchDangerZones(
    destinationName: String? = nil,
    countryCode: String? = nil,
    dangerLevel: String? = nil
  ) async throws -> [DangerZone] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/danger-zones"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let destination = destinationName {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let country = countryCode {
      queryItems.append(URLQueryItem(name: "countryCode", value: country))
    }
    if let level = dangerLevel {
      queryItems.append(URLQueryItem(name: "dangerLevel", value: level))
    }
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(DangerZonesResponse.self, from: data)
    return result.data
  }

  /// Fetch nearby danger zones based on coordinates
  func fetchNearbyDangerZones(
    latitude: Double,
    longitude: Double,
    radiusKm: Double = 5.0
  ) async throws -> [DangerZone] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/danger-zones/nearby"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "lat", value: String(latitude)),
      URLQueryItem(name: "lng", value: String(longitude)),
      URLQueryItem(name: "radiusKm", value: String(radiusKm)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(DangerZonesResponse.self, from: data)
    return result.data
  }

  /// Fetch incident reports for a destination
  func fetchIncidentReports(
    destinationName: String? = nil,
    countryCode: String? = nil,
    incidentType: String? = nil,
    limit: Int = 50
  ) async throws -> [SafetyIncidentReport] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/safety/incidents"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "limit", value: String(limit))
    ]
    if let destination = destinationName {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let country = countryCode {
      queryItems.append(URLQueryItem(name: "countryCode", value: country))
    }
    if let type = incidentType {
      queryItems.append(URLQueryItem(name: "incidentType", value: type))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(IncidentReportsResponse.self, from: data)
    return result.data
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch comprehensive safety information for a destination
  func fetchDestinationSafetyInfo(destinationName: String, countryCode: String? = nil) async throws -> DestinationSafetyInfo {
    try await SafetyAPIClient.shared.fetchDestinationSafetyInfo(destinationName: destinationName, countryCode: countryCode)
  }

  /// Fetch safety rating for a destination
  func fetchSafetyRating(
    destinationName: String? = nil,
    countryCode: String? = nil,
    cityId: String? = nil
  ) async throws -> SafetyRating? {
    try await SafetyAPIClient.shared.fetchSafetyRating(destinationName: destinationName, countryCode: countryCode, cityId: cityId)
  }

  /// Fetch active safety alerts for a destination
  func fetchSafetyAlerts(
    destinationName: String? = nil,
    countryCode: String? = nil,
    severity: String? = nil
  ) async throws -> [SafetyAlert] {
    try await SafetyAPIClient.shared.fetchSafetyAlerts(destinationName: destinationName, countryCode: countryCode, severity: severity)
  }

  /// Fetch danger zones for a destination
  func fetchDangerZones(
    destinationName: String? = nil,
    countryCode: String? = nil,
    dangerLevel: String? = nil
  ) async throws -> [DangerZone] {
    try await SafetyAPIClient.shared.fetchDangerZones(destinationName: destinationName, countryCode: countryCode, dangerLevel: dangerLevel)
  }

  /// Fetch nearby danger zones based on coordinates
  func fetchNearbyDangerZones(
    latitude: Double,
    longitude: Double,
    radiusKm: Double = 5.0
  ) async throws -> [DangerZone] {
    try await SafetyAPIClient.shared.fetchNearbyDangerZones(latitude: latitude, longitude: longitude, radiusKm: radiusKm)
  }

  /// Fetch incident reports for a destination
  func fetchIncidentReports(
    destinationName: String? = nil,
    countryCode: String? = nil,
    incidentType: String? = nil,
    limit: Int = 50
  ) async throws -> [SafetyIncidentReport] {
    try await SafetyAPIClient.shared.fetchIncidentReports(destinationName: destinationName, countryCode: countryCode, incidentType: incidentType, limit: limit)
  }
}
