import Foundation
import OSLog

/// Empty response type for API calls that don't return data
struct EmptyResponse: Codable {}

/// Service type for API routing
enum APIServiceType {
  case convex      // CRUD operations - guides, chat sessions, translations data, etc.
  case aiService   // AI/LLM, weather, transport, translations AI, PDF export
}

/// API client with dual-service routing and caching
actor APIClient {
  static let shared = APIClient()

  let convexURL: URL
  let aiServiceURL: URL
  let session: URLSession
  private let decoder: JSONDecoder
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "APIClient")
  private let authManager = AuthManager.shared

  // Response cache
  private var responseCache: [String: CachedResponse] = [:]

  private struct CachedResponse {
    let data: Data
    let cachedAt: Date
  }

  /// Paths that should be routed to AI Service
  private static let aiServicePaths: Set<String> = [
    "api/ai",
    "api/weather",
    "api/transport",
    "api/pdf",
    "api/flights",
    "api/translations/text",
    "api/translations/photo",
    "api/translations/detect",
    "api/translations/batch",
    "api/chat/query",
  ]

  init(convexURL: String? = nil, aiServiceURL: String? = nil) {
    let convexUrlString = convexURL ?? AppConfig.convexURL
    let aiServiceUrlString = aiServiceURL ?? AppConfig.aiServiceURL
    self.convexURL = URL(string: convexUrlString)!
    self.aiServiceURL = URL(string: aiServiceUrlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = AppConfig.networkTimeoutRequest
    config.timeoutIntervalForResource = AppConfig.networkTimeoutResource
    config.waitsForConnectivity = true
    self.session = URLSession(configuration: config)

    self.decoder = JSONDecoder()
  }

  /// Determine which service to use for a given path
  private func serviceType(for path: String) -> APIServiceType {
    // Check if path starts with any AI service path
    for aiPath in Self.aiServicePaths {
      if path.hasPrefix(aiPath) {
        return .aiService
      }
    }
    return .convex
  }

  /// Get base URL for a given path
  private func baseURL(for path: String) -> URL {
    switch serviceType(for: path) {
    case .convex:
      return convexURL
    case .aiService:
      return aiServiceURL
    }
  }

  /// Default baseURL - points to Convex for CRUD operations
  /// AI Service endpoints should use aiServiceURL directly
  var baseURL: URL {
    convexURL
  }

  /// Construct full URL for a given path, routing to the appropriate service
  private func url(for path: String) -> URL {
    baseURL(for: path).appendingPathComponent(path)
  }

  /// Fetch travel guides with caching
  func fetchGuides(limit: Int = 20, offset: Int = 0, forceRefresh: Bool = false) async throws
    -> [BlogPost]
  {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/guides"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit)),
      URLQueryItem(name: "offset", value: String(offset)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: forceRefresh)

    do {
      let result = try decoder.decode(BlogListResponse.self, from: data)
      logger.info("Loaded \(result.data.count) guides")
      return result.data
    } catch {
      logger.error("Decoding error: \(String(describing: error))")
      throw error
    }
  }

  /// Fetch single guide by ID
  func fetchGuide(id: String) async throws -> BlogPost {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/guides/by-id"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "id", value: id),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    return try decoder.decode(BlogPost.self, from: data)
  }

  // MARK: - Safety API

  /// Fetch comprehensive safety information for a destination
  func fetchDestinationSafetyInfo(destinationName: String, countryCode: String? = nil) async throws
    -> DestinationSafetyInfo
  {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/safety/destination/\(destinationName)"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/safety/ratings"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/safety/alerts"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/safety/danger-zones"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/safety/danger-zones/nearby"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/safety/incidents"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(IncidentReportsResponse.self, from: data)
    return result.data
  }

  // MARK: - Astronomy API

  /// Fetch sun times for a specific location and date
  func fetchSunTimes(
    latitude: Double,
    longitude: Double,
    date: String? = nil,
    timezone: String? = nil
  ) async throws -> SunTimes {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/astronomy/sun-times"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("api/astronomy/sun-times/range"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(SunTimesRangeResponse.self, from: data)
    return result.data
  }

  /// Fetch moon phase for a specific date
  func fetchMoonPhase(date: String? = nil) async throws -> MoonPhase {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/astronomy/moon-phase"),
      resolvingAgainstBaseURL: false
    )!

    if let date = date {
      components.queryItems = [URLQueryItem(name: "date", value: date)]
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(MoonPhaseResponse.self, from: data)
    return result.data
  }

  /// Fetch moon phases for a date range
  func fetchMoonPhases(startDate: String, endDate: String) async throws -> [MoonPhase] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/astronomy/moon-phases"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "startDate", value: startDate),
      URLQueryItem(name: "endDate", value: endDate),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("api/astronomy/events"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("api/astronomy/stargazing-spots"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("api/astronomy/combined"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(AstronomyDataResponse.self, from: data)
    return result.data
  }

    // MARK: - Route Optimization API

    /// Optimize a single day's route
    func optimizeDayRoute(day: AiDay, options: RouteOptimizationOptions? = nil) async throws -> OptimizedRouteResult {
        let url = baseURL.appendingPathComponent("v1/route-optimization/day")

        let body = OptimizeDayRequest(day: day, options: options)
        let data = try await postWithRetry(url: url, body: body)
        let result = try decoder.decode(OptimizedRouteResponse.self, from: data)
        return result.data
    }

    /// Optimize a full itinerary
    func optimizeItinerary(days: [AiDay], options: RouteOptimizationOptions? = nil) async throws -> OptimizedItineraryResult {
        let url = baseURL.appendingPathComponent("v1/route-optimization/itinerary")

        let body = OptimizeItineraryRequest(days: days, options: options)
        let data = try await postWithRetry(url: url, body: body)
        let result = try decoder.decode(OptimizedItineraryResponse.self, from: data)
        return result.data
    }

    /// Compare original and optimized routes
    func compareRoute(day: AiDay, options: RouteOptimizationOptions? = nil) async throws -> RouteComparisonResult {
        let url = baseURL.appendingPathComponent("v1/route-optimization/compare")

        let body = OptimizeDayRequest(day: day, options: options)
        let data = try await postWithRetry(url: url, body: body)
        let result = try decoder.decode(RouteComparisonResponse.self, from: data)
        return result.data
    }

    /// Get available transport modes
    func getTransportModes() async throws -> [RouteTransportModeInfo] {
        let url = baseURL.appendingPathComponent("v1/route-optimization/transport-modes")
        let data = try await fetchWithRetry(url: url)
        let result = try decoder.decode(TransportModesResponse.self, from: data)
        return result.data
    }

  // MARK: - Collaboration API

  /// Join a collaborative editing session
  func joinCollaborationSession(
    itineraryId: String,
    displayName: String? = nil,
    avatarUrl: String? = nil
  ) async throws -> JoinSessionResponse {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/join")

    let body = JoinSessionRequest(displayName: displayName, avatarUrl: avatarUrl)
    let data = try await postWithRetry(url: url, body: body)
    return try decoder.decode(JoinSessionResponse.self, from: data)
  }

  /// Leave a collaborative editing session
  func leaveCollaborationSession(itineraryId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/leave")

    _ = try await postWithRetry(url: url, body: EmptyBody())
  }

  /// Send heartbeat to keep session alive
  func sendCollaborationHeartbeat(itineraryId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/heartbeat")

    _ = try await postWithRetry(url: url, body: EmptyBody())
  }

  /// Get all collaborators with their presence status
  func getCollaboratorsWithPresence(itineraryId: String) async throws -> [CollaboratorWithPresence] {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/presence")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CollaboratorsResponse.self, from: data)
    return result.data
  }

  /// Get only online collaborators
  func getOnlineCollaborators(itineraryId: String) async throws -> [CollaboratorPresence] {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/online")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(PresenceListResponse.self, from: data)
    return result.data
  }

  /// Update cursor position in collaborative session
  func updateCollaborationCursor(
    itineraryId: String,
    dayId: String? = nil,
    itemId: String? = nil,
    cursorPosition: CursorPosition? = nil
  ) async throws {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/cursor")

    let body = UpdateCursorRequest(
      currentDayId: dayId,
      currentItemId: itemId,
      cursorPosition: cursorPosition
    )
    _ = try await postWithRetry(url: url, body: body)
  }

  /// Update selection state in collaborative session
  func updateCollaborationSelection(
    itineraryId: String,
    elements: [SelectedElement]?
  ) async throws {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/selection")

    let body = UpdateSelectionRequest(selectedElements: elements)
    _ = try await postWithRetry(url: url, body: body)
  }

  /// Record an edit operation for conflict tracking
  func recordCollaborationOperation(
    itineraryId: String,
    operationType: String,
    targetType: String,
    targetId: String,
    changes: [String: AnyCodableValue]? = nil,
    baseVersion: Int? = nil
  ) async throws -> RecordOperationResponse {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/operation")

    let body = RecordOperationRequest(
      operationType: operationType,
      targetType: targetType,
      targetId: targetId,
      changes: changes,
      baseVersion: baseVersion
    )
    let data = try await postWithRetry(url: url, body: body)
    return try decoder.decode(RecordOperationResponse.self, from: data)
  }

  /// Get recent operations for an itinerary
  func getRecentOperations(itineraryId: String, limit: Int = 50) async throws -> [EditOperation] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/operations"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(OperationsListResponse.self, from: data)
    return result.data
  }

  /// Get conflicted operations that need resolution
  func getConflictedOperations(itineraryId: String) async throws -> [EditOperation] {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/conflicts")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(OperationsListResponse.self, from: data)
    return result.data
  }

  /// Resolve a conflicted operation
  func resolveCollaborationConflict(
    operationId: String,
    resolution: String
  ) async throws {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(operationId)/collaboration/resolve")

    let body = ResolveConflictRequest(operationId: operationId, resolution: resolution)
    _ = try await postWithRetry(url: url, body: body)
  }

  // MARK: - Private Methods

  /// Empty body for POST requests that don't need a body
  private struct EmptyBody: Encodable {}

  /// POST request with retry logic
  private func postWithRetry<T: Encodable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try Task.checkCancellation()

    var lastError: Error?

    for attempt in 1...maxRetries {
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("POST \(url.path) (attempt \(attempt)/\(maxRetries))")

        var request = await createRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          return data

        case 401:
          logger.warning("Received 401 on POST, attempting token refresh")
          do {
            try await authManager.refreshToken()
            var retryRequest = await createRequest(url: url)
            retryRequest.httpMethod = "POST"
            retryRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
            retryRequest.httpBody = try JSONEncoder().encode(body)

            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            return retryData
          } catch {
            logger.error("Token refresh failed: \(String(describing: error))")
            throw APIError.unauthorized
          }

        case 404:
          throw APIError.notFound

        case 429:
          let waitTime = Double(attempt) * 2
          try await Task.sleep(for: .seconds(waitTime))
          continue

        case 500...599:
          throw APIError.serverError(httpResponse.statusCode)

        default:
          throw APIError.httpError(httpResponse.statusCode)
        }
      } catch is CancellationError {
        throw APIError.cancelled
      } catch let error as APIError {
        if !error.isRecoverable {
          throw error
        }
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          try? await Task.sleep(for: .seconds(waitTime))
        }
      } catch {
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          do {
            try await Task.sleep(for: .seconds(waitTime))
          } catch {
            throw APIError.cancelled
          }
        }
      }
    }

    throw lastError ?? APIError.unknown
  }

  /// Create URLRequest with authentication header if available
  private func createRequest(url: URL) async -> URLRequest {
    var request = URLRequest(url: url)

    // Add authorization header if user is authenticated
    if let token = try? await authManager.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      logger.debug("Added auth token to request for \(url.path)")
    }

    return request
  }

  private func fetchWithRetry(
    url: URL,
    forceRefresh: Bool = false,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    // Check for cancellation before starting
    try Task.checkCancellation()

    let cacheKey = url.absoluteString

    // Check cache first
    if !forceRefresh, let cached = responseCache[cacheKey] {
      let age = Date().timeIntervalSince(cached.cachedAt)
      if age < AppConfig.apiCacheValiditySeconds {
        logger.debug("Using cached response for \(url.path)")
        return cached.data
      }
    }

    var lastError: Error?

    for attempt in 1...maxRetries {
      // Check for cancellation before each attempt
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("Fetching \(url.path) (attempt \(attempt)/\(maxRetries))")

        // Create request with authentication header
        let request = await createRequest(url: url)
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          // Cache the successful response
          responseCache[cacheKey] = CachedResponse(data: data, cachedAt: Date())
          return data

        case 401:
          // Try to refresh token and retry once
          logger.warning("Received 401, attempting token refresh")
          do {
            try await authManager.refreshToken()
            // Retry once with new token
            let retryRequest = await createRequest(url: url)
            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            responseCache[cacheKey] = CachedResponse(data: retryData, cachedAt: Date())
            return retryData
          } catch {
            logger.error("Token refresh failed: \(String(describing: error))")
            throw APIError.unauthorized
          }

        case 404:
          throw APIError.notFound

        case 429:
          // Rate limited - wait and retry
          let waitTime = Double(attempt) * 2
          try await Task.sleep(for: .seconds(waitTime))
          continue

        case 500...599:
          throw APIError.serverError(httpResponse.statusCode)

        default:
          throw APIError.httpError(httpResponse.statusCode)
        }
      } catch is CancellationError {
        // Task was cancelled - don't retry
        throw APIError.cancelled
      } catch let error as APIError {
        // Don't retry non-recoverable API errors
        if !error.isRecoverable {
          throw error
        }
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          try? await Task.sleep(for: .seconds(waitTime))
        }
      } catch {
        lastError = error
        // Network error - exponential backoff with cancellation check
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          do {
            try await Task.sleep(for: .seconds(waitTime))
          } catch {
            // Sleep was cancelled
            throw APIError.cancelled
          }
        }
      }
    }

    throw lastError ?? APIError.unknown
  }

  /// Clear response cache
  func clearCache() {
    responseCache.removeAll()
    logger.info("API cache cleared")
  }

  // MARK: - Transport Planning API

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
    let data = try await postWithRetry(url: url, body: body)
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

    let data = try await fetchWithRetry(url: url)
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

    let data = try await fetchWithRetry(url: url)
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

    let data = try await fetchWithRetry(url: url)
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(TransportRouteResponse.self, from: data)
    return result.data
  }

  /// Get city transit information
  func getCityTransitInfo(cityName: String) async throws -> CityTransitInfo {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/city/\(encodedCity)")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(CityTransitInfoResponse.self, from: data)
    return result.data
  }

  /// Get transit pass recommendations for a city
  func getTransitPasses(cityName: String) async throws -> [TransitPassRecommendation] {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/passes/\(encodedCity)")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(TransitPassesResponse.self, from: data)
    return result.data
  }

  /// Get transit tips for a city
  func getTransitTips(cityName: String) async throws -> [String] {
    let encodedCity = cityName.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? cityName
    let url = aiServiceURL.appendingPathComponent("api/transport/tips/\(encodedCity)")

    let data = try await fetchWithRetry(url: url)
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
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(BatchTransportResponse.self, from: data)
    return result.data
  }

  // MARK: - PDF Export API

  /// Fetch available PDF templates
  func fetchPdfTemplates(language: String = "zh") async throws -> [String: PdfTemplate] {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/pdf/templates"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "lang", value: language)
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(PdfTemplatesResponse.self, from: data)
    return result.data
  }

  /// Get PDF preview info for a guide
  func fetchGuidePdfPreview(guideId: String) async throws -> PdfPreviewInfo {
    let url = aiServiceURL.appendingPathComponent("api/pdf/guide/\(guideId)/preview")

    let body = EmptyBody()
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(PdfPreviewResponse.self, from: data)
    return result.data
  }

  /// Generate PDF for a guide and return the file URL
  func generateGuidePdf(
    guideId: String,
    options: PdfExportOptions
  ) async throws -> URL {
    let url = aiServiceURL.appendingPathComponent("api/pdf/guide/\(guideId)")

    logger.info("Generating PDF for guide \(guideId)")

    var request = await createRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(options)

    let (data, response) = try await session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      if httpResponse.statusCode == 401 {
        throw APIError.unauthorized
      } else if httpResponse.statusCode == 404 {
        throw APIError.notFound
      } else {
        throw APIError.httpError(httpResponse.statusCode)
      }
    }

    // Extract filename from Content-Disposition header
    let contentDisposition = httpResponse.value(forHTTPHeaderField: "Content-Disposition") ?? ""
    let filenameMatch = contentDisposition.range(of: "filename=\"([^\"]+)\"", options: .regularExpression)
    let filename: String
    if let match = filenameMatch {
      let extracted = String(contentDisposition[match])
        .replacingOccurrences(of: "filename=\"", with: "")
        .replacingOccurrences(of: "\"", with: "")
      filename = extracted.removingPercentEncoding ?? extracted
    } else {
      filename = "itinerary-\(guideId).pdf"
    }

    // Save to temporary directory
    let tempDir = FileManager.default.temporaryDirectory
    let fileURL = tempDir.appendingPathComponent(filename)

    try data.write(to: fileURL)
    logger.info("PDF saved to \(fileURL.path)")

    return fileURL
  }

  // MARK: - Itinerary Copy API

  /// Copy a public itinerary to user's collection (full copy)
  func copyItinerary(
    itineraryId: String,
    newStartDate: String
  ) async throws -> APIItinerary {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy")

    let body = CopyItineraryRequest(startDate: newStartDate)
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(CopyItineraryResponse.self, from: data)
    return result.data
  }

  /// Copy specific days from an itinerary (partial copy)
  func copyItineraryPartial(
    itineraryId: String,
    newStartDate: String,
    selectedDays: [Int],
    newTitle: String? = nil
  ) async throws -> APIItinerary {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy-partial")

    let body = CopyItineraryPartialRequest(
      startDate: newStartDate,
      selectedDays: selectedDays,
      title: newTitle
    )
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(CopyItineraryResponse.self, from: data)
    return result.data
  }

  /// Get user's itinerary copy history
  func getCopyHistory(
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> CopyHistoryResult {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/itineraries/copy-history"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CopyHistoryResponse.self, from: data)
    return CopyHistoryResult(data: result.data, total: result.meta.totalCount)
  }

  /// Get copy statistics for an itinerary (owner only)
  func getItineraryCopyStats(itineraryId: String) async throws -> ItineraryCopyStats {
    let url = baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy-stats")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CopyStatsResponse.self, from: data)
    return result.data
  }

  /// List public itineraries for discovery
  func listPublicItineraries(
    cityId: String? = nil,
    page: Int = 1,
    pageSize: Int = 20,
    sortBy: String = "created_at"
  ) async throws -> PublicItinerariesResult {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/itineraries/public"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
      URLQueryItem(name: "sortBy", value: sortBy),
    ]
    if let cityId = cityId {
      queryItems.append(URLQueryItem(name: "cityId", value: cityId))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(PublicItinerariesResponse.self, from: data)
    return PublicItinerariesResult(data: result.data, total: result.meta.totalCount)
  }

  // MARK: - User Preferences API

  /// Fetch user preferences
  func fetchPreferences() async throws -> UserPreferences {
    let url = baseURL.appendingPathComponent("v1/preferences")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(PreferencesResponse.self, from: data)
    return result.data
  }

  /// Update user preferences
  func updatePreferences(request: UpdatePreferencesRequest) async throws -> UserPreferences {
    let url = baseURL.appendingPathComponent("v1/preferences")

    let data = try await putWithRetry(url: url, body: request)
    let result = try decoder.decode(PreferencesResponse.self, from: data)
    return result.data
  }

  /// Record a behavior event
  func recordBehavior(request: RecordBehaviorRequest) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/preferences/behavior")

    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(RecordBehaviorResponse.self, from: data)
    return result.data.eventId
  }

  /// Fetch top preference categories
  func fetchTopCategories(limit: Int = 5) async throws -> [CategoryScore] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/preferences/categories"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CategoryScoresResponse.self, from: data)
    return result.data
  }

  /// Fetch personalized recommendations
  func fetchRecommendations() async throws -> RecommendedCategories {
    let url = baseURL.appendingPathComponent("v1/preferences/recommendations")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(RecommendationsResponse.self, from: data)
    return result.data
  }

  /// Fetch recent behavior events
  func fetchRecentBehaviors(limit: Int = 50, type: BehaviorType? = nil) async throws -> [BehaviorEvent] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/preferences/behaviors"),
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

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(BehaviorsResponse.self, from: data)
    return result.data
  }

  /// Reset learned preferences
  func resetPreferences() async throws -> ResetPreferencesResult {
    let url = baseURL.appendingPathComponent("v1/preferences/reset")

    let data = try await deleteWithRetry(url: url)
    let result = try decoder.decode(ResetPreferencesResponse.self, from: data)
    return result.data
  }

  // MARK: - Flight API

  /// Lookup flight by number and date (public API)
  func lookupFlight(flightNumber: String, date: String) async throws -> FlightInfo {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/flights/lookup"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "flightNumber", value: flightNumber),
      URLQueryItem(name: "date", value: date),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightLookupResponse.self, from: data)

    guard let flightInfo = result.data else {
      throw APIError.notFound
    }

    return flightInfo
  }

  /// Search flights by route (public API)
  func searchFlightsByRoute(
    departureAirport: String,
    arrivalAirport: String,
    date: String? = nil,
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> FlightSearchResult {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/flights/search"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "departureAirport", value: departureAirport),
      URLQueryItem(name: "arrivalAirport", value: arrivalAirport),
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]
    if let date = date {
      queryItems.append(URLQueryItem(name: "date", value: date))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(FlightSearchResponse.self, from: data)
    return FlightSearchResult(data: result.data, total: result.meta.totalCount)
  }

  /// Fetch user's flight bookings (protected API)
  func fetchFlightBookings(
    page: Int = 1,
    pageSize: Int = 20,
    status: BookingStatus? = nil,
    upcoming: Bool? = nil,
    itineraryId: String? = nil
  ) async throws -> FlightBookingsResult {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/flights/bookings"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]
    if let status = status {
      queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
    }
    if let upcoming = upcoming {
      queryItems.append(URLQueryItem(name: "upcoming", value: upcoming ? "true" : "false"))
    }
    if let itineraryId = itineraryId {
      queryItems.append(URLQueryItem(name: "itineraryId", value: itineraryId))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return FlightBookingsResult(data: result.data, total: result.meta?.totalCount ?? result.data.count)
  }

  /// Fetch upcoming flights for user
  func fetchUpcomingFlights(limit: Int = 5) async throws -> FlightBookingsResult {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/flights/upcoming"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return FlightBookingsResult(data: result.data, total: result.data.count)
  }

  /// Create a new flight booking
  func createFlightBooking(_ input: CreateFlightBookingInput) async throws -> CreateFlightBookingResponse {
    let url = baseURL.appendingPathComponent("v1/flights/bookings")

    let data = try await postWithRetry(url: url, body: input)
    return try decoder.decode(CreateFlightBookingResponse.self, from: data)
  }

  /// Update a flight booking
  func updateFlightBooking(_ bookingId: String, input: UpdateFlightBookingInput) async throws -> FlightBooking {
    let url = baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)")

    let data = try await patchWithRetry(url: url, body: input)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Delete a flight booking
  func deleteFlightBooking(_ bookingId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)")
    _ = try await deleteWithRetry(url: url)
  }

  /// Link flight booking to itinerary
  func linkFlightToItinerary(bookingId: String, itineraryId: String) async throws -> FlightBooking {
    let url = baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/link")

    let body = LinkFlightItineraryRequest(itineraryId: itineraryId)
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Unlink flight booking from itinerary
  func unlinkFlightFromItinerary(bookingId: String) async throws -> FlightBooking {
    let url = baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/unlink")

    let data = try await postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Check in for a flight
  func checkInFlight(bookingId: String, seatNumber: String? = nil) async throws -> FlightBooking {
    let url = baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/check-in")

    let body = CheckInFlightRequest(seatNumber: seatNumber)
    let data = try await postWithRetry(url: url, body: body)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Fetch flight bookings for a specific itinerary
  func fetchFlightBookingsForItinerary(_ itineraryId: String) async throws -> [FlightBooking] {
    let url = baseURL.appendingPathComponent("v1/flights/itinerary/\(itineraryId)/bookings")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return result.data
  }

  /// Get flight status for a booking
  func getFlightStatus(bookingId: String) async throws -> FlightStatusData {
    let url = baseURL.appendingPathComponent("v1/flights/status/\(bookingId)")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightStatusResponse.self, from: data)

    guard let statusData = result.data else {
      throw APIError.notFound
    }

    return statusData
  }

  // MARK: - City Encyclopedia API

  /// Fetch city with encyclopedia data by ID (public API)
  func fetchCityWithEncyclopedia(cityId: String) async throws -> CityWithEncyclopedia {
    let url = baseURL.appendingPathComponent("v1/cities/\(cityId)/encyclopedia")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(CityEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// List cities with encyclopedia data (public API)
  func fetchCitiesWithEncyclopedia(
    countryCode: String? = nil,
    limit: Int = 50
  ) async throws -> [CityWithEncyclopedia] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/cities"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems: [URLQueryItem] = [
      URLQueryItem(name: "limit", value: String(limit))
    ]
    if let countryCode = countryCode {
      queryItems.append(URLQueryItem(name: "countryCode", value: countryCode))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// Search cities by name (public API)
  func searchCities(query: String) async throws -> [CityWithEncyclopedia] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/cities/search"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "q", value: query)
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// Fetch cities by country code (public API)
  func fetchCitiesByCountry(countryCode: String) async throws -> [CityWithEncyclopedia] {
    let url = baseURL.appendingPathComponent("v1/cities/country/\(countryCode)")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// PATCH request with retry logic
  private func patchWithRetry<T: Encodable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try Task.checkCancellation()

    var lastError: Error?

    for attempt in 1...maxRetries {
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("PATCH \(url.path) (attempt \(attempt)/\(maxRetries))")

        var request = await createRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          return data

        case 401:
          logger.warning("Received 401 on PATCH, attempting token refresh")
          do {
            try await authManager.refreshToken()
            var retryRequest = await createRequest(url: url)
            retryRequest.httpMethod = "PATCH"
            retryRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
            retryRequest.httpBody = try JSONEncoder().encode(body)

            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            return retryData
          } catch {
            logger.error("Token refresh failed: \(String(describing: error))")
            throw APIError.unauthorized
          }

        case 404:
          throw APIError.notFound

        case 429:
          let waitTime = Double(attempt) * 2
          try await Task.sleep(for: .seconds(waitTime))
          continue

        case 500...599:
          throw APIError.serverError(httpResponse.statusCode)

        default:
          throw APIError.httpError(httpResponse.statusCode)
        }
      } catch is CancellationError {
        throw APIError.cancelled
      } catch let error as APIError {
        if !error.isRecoverable {
          throw error
        }
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          try? await Task.sleep(for: .seconds(waitTime))
        }
      } catch {
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          do {
            try await Task.sleep(for: .seconds(waitTime))
          } catch {
            throw APIError.cancelled
          }
        }
      }
    }

    throw lastError ?? APIError.unknown
  }

  /// PUT request with retry logic
  private func putWithRetry<T: Encodable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try Task.checkCancellation()

    var lastError: Error?

    for attempt in 1...maxRetries {
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("PUT \(url.path) (attempt \(attempt)/\(maxRetries))")

        var request = await createRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          return data

        case 401:
          logger.warning("Received 401 on PUT, attempting token refresh")
          do {
            try await authManager.refreshToken()
            var retryRequest = await createRequest(url: url)
            retryRequest.httpMethod = "PUT"
            retryRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
            retryRequest.httpBody = try JSONEncoder().encode(body)

            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            return retryData
          } catch {
            logger.error("Token refresh failed: \(String(describing: error))")
            throw APIError.unauthorized
          }

        case 404:
          throw APIError.notFound

        case 429:
          let waitTime = Double(attempt) * 2
          try await Task.sleep(for: .seconds(waitTime))
          continue

        case 500...599:
          throw APIError.serverError(httpResponse.statusCode)

        default:
          throw APIError.httpError(httpResponse.statusCode)
        }
      } catch is CancellationError {
        throw APIError.cancelled
      } catch let error as APIError {
        if !error.isRecoverable {
          throw error
        }
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          try? await Task.sleep(for: .seconds(waitTime))
        }
      } catch {
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          do {
            try await Task.sleep(for: .seconds(waitTime))
          } catch {
            throw APIError.cancelled
          }
        }
      }
    }

    throw lastError ?? APIError.unknown
  }

  /// DELETE request with retry logic
  private func deleteWithRetry(
    url: URL,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try Task.checkCancellation()

    var lastError: Error?

    for attempt in 1...maxRetries {
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("DELETE \(url.path) (attempt \(attempt)/\(maxRetries))")

        var request = await createRequest(url: url)
        request.httpMethod = "DELETE"

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          return data

        case 401:
          logger.warning("Received 401 on DELETE, attempting token refresh")
          do {
            try await authManager.refreshToken()
            var retryRequest = await createRequest(url: url)
            retryRequest.httpMethod = "DELETE"

            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            return retryData
          } catch {
            logger.error("Token refresh failed: \(String(describing: error))")
            throw APIError.unauthorized
          }

        case 404:
          throw APIError.notFound

        case 429:
          let waitTime = Double(attempt) * 2
          try await Task.sleep(for: .seconds(waitTime))
          continue

        case 500...599:
          throw APIError.serverError(httpResponse.statusCode)

        default:
          throw APIError.httpError(httpResponse.statusCode)
        }
      } catch is CancellationError {
        throw APIError.cancelled
      } catch let error as APIError {
        if !error.isRecoverable {
          throw error
        }
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          try? await Task.sleep(for: .seconds(waitTime))
        }
      } catch {
        lastError = error
        if attempt < maxRetries {
          let waitTime = Double(attempt) * 1.5
          do {
            try await Task.sleep(for: .seconds(waitTime))
          } catch {
            throw APIError.cancelled
          }
        }
      }
    }

    throw lastError ?? APIError.unknown
  }
}

// MARK: - Generic API Methods Extension

extension APIClient {
  /// Generic GET request with path and optional query items
  func fetch<T: Decodable>(path: String, queryItems: [URLQueryItem] = []) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/\(path)"),
      resolvingAgainstBaseURL: false
    )!

    if !queryItems.isEmpty {
      components.queryItems = queryItems
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic POST request with path and body
  func post<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic POST request with path and Encodable body
  func post<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// POST request that doesn't return a value
  func postVoid(path: String, body: [String: Any]) async throws {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }
  }

  /// Generic PUT request with path and body
  func put<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic PUT request with path and Encodable body
  func putWithBody<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic PATCH request with path and body
  func patch<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic PATCH request with path and Encodable body
  func patchWithBody<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// Generic DELETE request with path
  func delete(path: String) async throws {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500
      if statusCode == 401 {
        throw APIError.unauthorized
      } else if statusCode == 404 {
        throw APIError.notFound
      }
      throw APIError.httpError(statusCode)
    }
  }

  /// Helper to create authenticated request
  func createAuthenticatedRequest(url: URL) async -> URLRequest {
    var request = URLRequest(url: url)
    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    return request
  }
}

// MARK: - Ticket API Extension

extension APIClient {
  /// Fetch tickets for a POI
  func fetchPoiTickets(poiId: String, activeOnly: Bool = true) async throws -> [PoiTicket] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "activeOnly", value: activeOnly ? "true" : "false")
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketListResponse.self, from: data)
    return result.data
  }

  /// Fetch price range for a POI
  func fetchTicketPriceRange(poiId: String) async throws -> TicketPriceRange? {
    let url = baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets/price-range")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(TicketPriceRangeResponse.self, from: data)
    return result.data
  }

  /// Fetch recommended tickets for a POI
  func fetchRecommendedTickets(poiId: String, limit: Int = 5) async throws -> [PoiTicket] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets/recommended"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketListResponse.self, from: data)
    return result.data
  }

  /// Fetch a single ticket by ID
  func fetchTicketById(ticketId: String) async throws -> PoiTicket {
    let url = baseURL.appendingPathComponent("v1/tickets/\(ticketId)")

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketResponse.self, from: data)
    return result.data
  }

  /// Fetch user's ticket reminders
  func fetchTicketReminders(includeTriggered: Bool = false, limit: Int = 50) async throws -> [TicketReminder] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/ticket-reminders"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "includeTriggered", value: includeTriggered ? "true" : "false"),
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketReminderListResponse.self, from: data)
    return result.data
  }

  /// Fetch upcoming reminders
  func fetchUpcomingReminders(days: Int = 7) async throws -> [TicketReminder] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/ticket-reminders/upcoming"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "days", value: String(days))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketReminderListResponse.self, from: data)
    return result.data
  }

  /// Fetch unread reminder count
  func fetchTicketReminderUnreadCount() async throws -> Int {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders/unread-count")

    let data = try await fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketUnreadCountResponse.self, from: data)
    return result.data.count
  }

  /// Create a new ticket reminder
  func createTicketReminder(request: CreateTicketReminderRequest) async throws -> TicketReminder {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders")

    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Update a ticket reminder
  func updateTicketReminder(reminderId: String, request: UpdateTicketReminderRequest) async throws -> TicketReminder {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)")

    let data = try await patchWithRetry(url: url, body: request)
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Mark a reminder as read
  func markTicketReminderRead(reminderId: String) async throws -> TicketReminder {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)/read")

    let data = try await postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Mark all reminders as read
  func markAllTicketRemindersRead() async throws -> Int {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders/read-all")

    let data = try await postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(MarkAllReadResponse.self, from: data)
    return result.data.count
  }

  /// Delete a ticket reminder
  func deleteTicketReminder(reminderId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)")
    _ = try await deleteWithRetry(url: url)
  }

  // MARK: - Translation Methods

  /// Fetch supported languages
  func fetchSupportedLanguages() async throws -> [SupportedLanguage] {
    let url = baseURL.appendingPathComponent("v1/translation/languages")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(SupportedLanguagesResponse.self, from: data)
    return result.data
  }

  /// Translate text
  func translateText(text: String, targetLang: String, sourceLang: String?) async throws -> TranslationResult {
    let url = baseURL.appendingPathComponent("v1/translation/text")
    let request = TranslateTextRequest(text: text, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(TranslationResultResponse.self, from: data)
    return result.data
  }

  /// Translate photo (OCR + translation)
  func translatePhoto(imageBase64: String, targetLang: String) async throws -> PhotoTranslationResult {
    let url = baseURL.appendingPathComponent("v1/translation/photo")
    let request = TranslatePhotoRequest(imageBase64: imageBase64, targetLang: targetLang)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(PhotoTranslationResultResponse.self, from: data)
    return result.data
  }

  /// Translate voice
  func translateVoice(recognizedText: String, targetLang: String, sourceLang: String?) async throws -> VoiceTranslationResult {
    let url = baseURL.appendingPathComponent("v1/translation/voice")
    let request = TranslateVoiceRequest(recognizedText: recognizedText, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(VoiceTranslationResultResponse.self, from: data)
    return result.data
  }

  /// Batch translate texts
  func translateBatch(texts: [String], targetLang: String, sourceLang: String?) async throws -> [TranslationResult] {
    let url = baseURL.appendingPathComponent("v1/translation/batch")
    let request = TranslateBatchRequest(texts: texts, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(TranslationBatchResponse.self, from: data)
    return result.data
  }

  /// Detect language
  func detectLanguage(text: String) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/translation/detect")
    let request = DetectLanguageRequest(text: text)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(DetectLanguageResponse.self, from: data)
    return result.data.language
  }

  /// Get pinyin for Chinese text
  func getPinyin(text: String) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/translation/pinyin")
    let request = GetPinyinRequest(text: text)
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(PinyinResponse.self, from: data)
    return result.data.pinyin ?? ""
  }

  /// Fetch phrase categories
  func fetchPhraseCategories(sourceLang: String) async throws -> [PhraseCategory] {
    var components = URLComponents(url: baseURL.appendingPathComponent("v1/translation/phrases/categories"), resolvingAgainstBaseURL: false)!
    components.queryItems = [URLQueryItem(name: "source_lang", value: sourceLang)]
    let data = try await fetchWithRetry(url: components.url!)
    let result = try decoder.decode(PhraseCategoriesResponse.self, from: data)
    return result.data
  }

  /// Fetch phrases for a category
  func fetchPhrases(categoryId: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    var components = URLComponents(url: baseURL.appendingPathComponent("v1/translation/phrases"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "category", value: categoryId),
      URLQueryItem(name: "source_lang", value: sourceLang),
      URLQueryItem(name: "target_lang", value: targetLang)
    ]
    let data = try await fetchWithRetry(url: components.url!)
    let result = try decoder.decode(PhrasesResponse.self, from: data)
    return result.data
  }

  /// Search phrases
  func searchPhrases(query: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    var components = URLComponents(url: baseURL.appendingPathComponent("v1/translation/phrases/search"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "q", value: query),
      URLQueryItem(name: "source_lang", value: sourceLang),
      URLQueryItem(name: "target_lang", value: targetLang)
    ]
    let data = try await fetchWithRetry(url: components.url!)
    let result = try decoder.decode(PhrasesResponse.self, from: data)
    return result.data
  }

  /// Fetch saved translations
  func fetchSavedTranslations(userId: String) async throws -> [SavedTranslation] {
    let url = baseURL.appendingPathComponent("v1/translation/saved")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(SavedTranslationsResponse.self, from: data)
    return result.data
  }

  /// Save a translation
  func saveTranslation(sourceText: String, sourceLang: String, targetText: String, targetLang: String, translationType: SavedTranslation.TranslationType, imageUrl: String?, audioUrl: String?) async throws -> SavedTranslation {
    let url = baseURL.appendingPathComponent("v1/translation/saved")
    let request = SaveTranslationRequest(
      sourceText: sourceText,
      sourceLang: sourceLang,
      targetText: targetText,
      targetLang: targetLang,
      translationType: translationType.rawValue,
      imageUrl: imageUrl,
      audioUrl: audioUrl
    )
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(SavedTranslationResponse.self, from: data)
    return result.data
  }

  /// Toggle translation favorite
  func toggleTranslationFavorite(translationId: String) async throws -> SavedTranslation {
    let url = baseURL.appendingPathComponent("v1/translation/saved/\(translationId)/favorite")
    let data = try await postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(SavedTranslationResponse.self, from: data)
    return result.data
  }

  /// Delete saved translation
  func deleteSavedTranslation(translationId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/translation/saved/\(translationId)")
    _ = try await deleteWithRetry(url: url)
  }
}

/// Response for mark all read
struct MarkAllReadResponse: Codable {
  let data: MarkAllReadData

  struct MarkAllReadData: Codable {
    let count: Int
  }
}

// MARK: - Translation Request Types

struct TranslateTextRequest: Codable {
  let text: String
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case text
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslatePhotoRequest: Codable {
  let imageBase64: String
  let targetLang: String

  enum CodingKeys: String, CodingKey {
    case imageBase64 = "image_base64"
    case targetLang = "target_lang"
  }
}

struct TranslateVoiceRequest: Codable {
  let recognizedText: String
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case recognizedText = "recognized_text"
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslateBatchRequest: Codable {
  let texts: [String]
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case texts
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslationBatchResponse: Codable {
  let data: [TranslationResult]
}

struct DetectLanguageRequest: Codable {
  let text: String
}

struct DetectLanguageResponse: Codable {
  let data: DetectLanguageData

  struct DetectLanguageData: Codable {
    let language: String
  }
}

struct GetPinyinRequest: Codable {
  let text: String
}

struct PhrasesResponse: Codable {
  let data: [TranslationPhrase]
}

struct SaveTranslationRequest: Codable {
  let sourceText: String
  let sourceLang: String
  let targetText: String
  let targetLang: String
  let translationType: String
  let imageUrl: String?
  let audioUrl: String?

  enum CodingKeys: String, CodingKey {
    case sourceText = "source_text"
    case sourceLang = "source_lang"
    case targetText = "target_text"
    case targetLang = "target_lang"
    case translationType = "translation_type"
    case imageUrl = "image_url"
    case audioUrl = "audio_url"
  }
}

struct SavedTranslationResponse: Codable {
  let data: SavedTranslation
}

// MARK: - API Error

enum APIError: LocalizedError {
  case invalidURL
  case invalidResponse
  case unauthorized
  case notFound
  case serverError(Int)
  case httpError(Int)
  case cancelled
  case networkError(Error)
  case unknown

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "请求地址无效"
    case .invalidResponse:
      return "服务器响应无效"
    case .unauthorized:
      return "未授权，请重新登录"
    case .notFound:
      return "请求的资源不存在"
    case .serverError(let code):
      return "服务器错误 (\(code))"
    case .httpError(let code):
      return "请求失败 (\(code))"
    case .cancelled:
      return "请求已取消"
    case .networkError(let error):
      return "网络错误: \(error.localizedDescription)"
    case .unknown:
      return "未知错误"
    }
  }

  /// Whether this error is recoverable (can retry)
  var isRecoverable: Bool {
    switch self {
    case .serverError, .networkError:
      return true
    case .invalidURL, .invalidResponse, .unauthorized, .notFound, .cancelled, .httpError, .unknown:
      return false
    }
  }
}

// MARK: - WiFi API Extension

extension APIClient {
  /// Fetch WiFi spots with optional filters
  func fetchWiFiSpots(cityId: String? = nil, type: String? = nil, limit: Int? = nil) async throws -> [WiFiSpot] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/wifi/spots"),
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

    let data = try await fetchWithRetry(url: url)
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
      url: baseURL.appendingPathComponent("v1/wifi/spots/nearby"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotListResponse.self, from: data)
    return result.data
  }

  /// Search WiFi spots
  func searchWiFiSpots(query: String, cityId: String? = nil, type: String? = nil) async throws -> [WiFiSpot] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/wifi/spots/search"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotListResponse.self, from: data)
    return result.data
  }

  /// Fetch WiFi spot by ID
  func fetchWiFiSpot(id: String) async throws -> WiFiSpot {
    let url = baseURL.appendingPathComponent("v1/wifi/spots/\(id)")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiSpotResponse.self, from: data)
    return result.data
  }

  /// Create a new WiFi spot
  func createWiFiSpot(_ request: CreateWiFiSpotRequest) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/wifi/spots")
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Fetch WiFi credentials for user
  func fetchWiFiCredentials() async throws -> [WiFiCredential] {
    let url = baseURL.appendingPathComponent("v1/wifi/credentials")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialListResponse.self, from: data)
    return result.data
  }

  /// Fetch WiFi credential for a spot
  func fetchWiFiCredentialForSpot(spotId: String) async throws -> WiFiCredential? {
    let url = baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/credential")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialResponse.self, from: data)
    return result.data
  }

  /// Fetch shared WiFi credentials
  func fetchSharedWiFiCredentials() async throws -> [WiFiCredential] {
    let url = baseURL.appendingPathComponent("v1/wifi/credentials/shared")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiCredentialListResponse.self, from: data)
    return result.data
  }

  /// Create a new WiFi credential
  func createWiFiCredential(_ request: CreateWiFiCredentialRequest) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/wifi/credentials")
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Delete WiFi credential
  func deleteWiFiCredential(id: String) async throws {
    let url = baseURL.appendingPathComponent("v1/wifi/credentials/\(id)")
    _ = try await deleteWithRetry(url: url)
  }

  /// Mark WiFi credential as used
  func markWiFiCredentialUsed(id: String) async throws {
    let url = baseURL.appendingPathComponent("v1/wifi/credentials/\(id)/used")
    _ = try await postWithRetry(url: url, body: EmptyBody())
  }

  /// Fetch reviews for a WiFi spot
  func fetchWiFiReviews(spotId: String, limit: Int? = nil, offset: Int? = nil) async throws -> [WiFiReview] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/reviews"),
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

    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiReviewListResponse.self, from: data)
    return result.data
  }

  /// Fetch user's review for a WiFi spot
  func fetchUserWiFiReview(spotId: String) async throws -> WiFiReview? {
    let url = baseURL.appendingPathComponent("v1/wifi/spots/\(spotId)/reviews/me")
    let data = try await fetchWithRetry(url: url)
    let result = try decoder.decode(WiFiReviewResponse.self, from: data)
    return result.data
  }

  /// Create a WiFi review
  func createWiFiReview(_ request: CreateWiFiReviewRequest) async throws -> String {
    let url = baseURL.appendingPathComponent("v1/wifi/reviews")
    let data = try await postWithRetry(url: url, body: request)
    let result = try decoder.decode(WiFiCreateResponse.self, from: data)
    return result.data.id
  }

  /// Mark WiFi review as helpful
  func markWiFiReviewHelpful(reviewId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/wifi/reviews/\(reviewId)/helpful")
    _ = try await postWithRetry(url: url, body: EmptyBody())
  }

  /// Delete WiFi review
  func deleteWiFiReview(reviewId: String) async throws {
    let url = baseURL.appendingPathComponent("v1/wifi/reviews/\(reviewId)")
    _ = try await deleteWithRetry(url: url)
  }
}
