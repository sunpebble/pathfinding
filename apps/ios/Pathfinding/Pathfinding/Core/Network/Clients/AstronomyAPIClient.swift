import Foundation

/// API client for astronomy-related operations
actor AstronomyAPIClient {
  static let shared = AstronomyAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Astronomy APIs

  /// Fetch sun times for a specific location and date
  func fetchSunTimes(
    latitude: Double,
    longitude: Double,
    date: String? = nil,
    timezone: String? = nil
  ) async throws -> SunTimes {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/sun-times"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "lat", value: String(latitude)),
      URLQueryItem(name: "lng", value: String(longitude)),
    ]
    if let date = date {
      queryItems.append(URLQueryItem(name: "date", value: date))
    }
    if let timezone = timezone {
      queryItems.append(URLQueryItem(name: "timezone", value: timezone))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(SunTimesResponse.self, from: data)
    return result.data
  }

  /// Fetch sun times for a date range
  func fetchSunTimesRange(
    latitude: Double,
    longitude: Double,
    startDate: String,
    endDate: String,
    timezone: String? = nil
  ) async throws -> [SunTimes] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/sun-times/range"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "lat", value: String(latitude)),
      URLQueryItem(name: "lng", value: String(longitude)),
      URLQueryItem(name: "startDate", value: startDate),
      URLQueryItem(name: "endDate", value: endDate),
    ]
    if let timezone = timezone {
      queryItems.append(URLQueryItem(name: "timezone", value: timezone))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(SunTimesRangeResponse.self, from: data)
    return result.data
  }

  /// Fetch moon phase for a specific date
  func fetchMoonPhase(date: String? = nil) async throws -> MoonPhase {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/moon-phase"),
      resolvingAgainstBaseURL: false
    )!

    if let date = date {
      components.queryItems = [URLQueryItem(name: "date", value: date)]
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(MoonPhaseResponse.self, from: data)
    return result.data
  }

  /// Fetch moon phases for a date range
  func fetchMoonPhases(startDate: String, endDate: String) async throws -> [MoonPhase] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/moon-phases"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "startDate", value: startDate),
      URLQueryItem(name: "endDate", value: endDate),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(MoonPhasesResponse.self, from: data)
    return result.data
  }

  /// Fetch upcoming astronomical events
  func fetchAstronomicalEvents(
    startDate: String? = nil,
    endDate: String? = nil,
    types: [String]? = nil
  ) async throws -> [AstronomicalEvent] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/events"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = []
    if let startDate = startDate {
      queryItems.append(URLQueryItem(name: "startDate", value: startDate))
    }
    if let endDate = endDate {
      queryItems.append(URLQueryItem(name: "endDate", value: endDate))
    }
    if let types = types, !types.isEmpty {
      queryItems.append(URLQueryItem(name: "types", value: types.joined(separator: ",")))
    }
    components.queryItems = queryItems.isEmpty ? nil : queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(AstronomicalEventsResponse.self, from: data)
    return result.data
  }

  /// Fetch stargazing spots near a location
  func fetchStargazingSpots(
    latitude: Double,
    longitude: Double,
    radiusKm: Double = 100,
    limit: Int = 10
  ) async throws -> [StargazingSpot] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/stargazing-spots"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "lat", value: String(latitude)),
      URLQueryItem(name: "lng", value: String(longitude)),
      URLQueryItem(name: "radiusKm", value: String(radiusKm)),
      URLQueryItem(name: "limit", value: String(limit)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(StargazingSpotsResponse.self, from: data)
    return result.data
  }

  /// Fetch combined astronomy data for a location
  func fetchAstronomyData(
    latitude: Double,
    longitude: Double,
    date: String? = nil,
    timezone: String? = nil,
    includeEvents: Bool = true,
    includeSpots: Bool = true
  ) async throws -> AstronomyData {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("api/astronomy/combined"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "lat", value: String(latitude)),
      URLQueryItem(name: "lng", value: String(longitude)),
      URLQueryItem(name: "includeEvents", value: includeEvents ? "true" : "false"),
      URLQueryItem(name: "includeSpots", value: includeSpots ? "true" : "false"),
    ]
    if let date = date {
      queryItems.append(URLQueryItem(name: "date", value: date))
    }
    if let timezone = timezone {
      queryItems.append(URLQueryItem(name: "timezone", value: timezone))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(AstronomyDataResponse.self, from: data)
    return result.data
  }
}
