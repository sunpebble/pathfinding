import Foundation
import OSLog

/// Base networking client with shared infrastructure for all API clients
/// Provides retry logic, authentication, caching, and request building
actor NetworkClient {
  static let shared = NetworkClient()

  let apiBaseURL: URL
  let session: URLSession
  let decoder: JSONDecoder
  let logger = Logger(subsystem: "com.sunpebble.trips", category: "NetworkClient")
  private let authManager = AuthManager.shared

  // Response cache
  private var responseCache: [String: CachedResponse] = [:]

  private struct CachedResponse {
    let data: Data
    let cachedAt: Date
  }

  init(apiBaseURL: String? = nil) {
    let apiBaseUrlString = apiBaseURL ?? AppConfig.apiBaseURL
    self.apiBaseURL = URL(string: apiBaseUrlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = AppConfig.networkTimeoutRequest
    config.timeoutIntervalForResource = AppConfig.networkTimeoutResource
    #if DEBUG
      config.waitsForConnectivity = false
    #else
      config.waitsForConnectivity = true
    #endif
    self.session = URLSession(configuration: config)

    // ponytail: API serializes all dates as ISO8601 (Drizzle/Hono c.json); iso8601 is safe app-wide.
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    self.decoder = decoder
  }

  /// Default baseURL - points to API server for CRUD operations
  var baseURL: URL {
    apiBaseURL
  }

  /// Construct full URL for a given path, routing to the appropriate service
  func url(for path: String) -> URL {
    apiBaseURL.appendingPathComponent(path)
  }

  // MARK: - Request Building

  /// Create URLRequest with authentication header if available
  func createRequest(url: URL) async -> URLRequest {
    var request = URLRequest(url: url)

    if let token = try? await authManager.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      logger.debug("Added auth token to request for \(url.path)")
    }

    return request
  }

  // MARK: - Core Request Engine

  /// Generic request with retry logic, 401 token refresh, and rate limit handling.
  /// All HTTP method helpers (`fetchWithRetry`, `postWithRetry`, etc.) delegate here.
  ///
  /// - Parameters:
  ///   - url: The request URL
  ///   - configureRequest: Closure to set httpMethod, headers, and body on the request
  ///   - cacheKey: If non-nil, the response will be cached/read from cache under this key
  ///   - maxRetries: Maximum retry attempts
  /// - Returns: Response data
  private func performRequest(
    url: URL,
    configureRequest: @Sendable (inout URLRequest) throws -> Void,
    cacheKey: String? = nil,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try Task.checkCancellation()

    // Check cache first (GET requests only)
    if let cacheKey, let cached = responseCache[cacheKey] {
      let age = Date().timeIntervalSince(cached.cachedAt)
      if age < AppConfig.apiCacheValiditySeconds {
        logger.debug("Using cached response for \(url.path)")
        return cached.data
      }
    }

    var lastError: Error?

    for attempt in 1...maxRetries {
      if Task.isCancelled {
        throw APIError.cancelled
      }

      do {
        logger.debug("Request \(url.path) (attempt \(attempt)/\(maxRetries))")

        var request = await createRequest(url: url)
        try configureRequest(&request)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          if let cacheKey {
            responseCache[cacheKey] = CachedResponse(data: data, cachedAt: Date())
          }
          return data

        case 401:
          logger.warning("Received 401, attempting token refresh")
          do {
            try await authManager.refreshToken()
            var retryRequest = await createRequest(url: url)
            try configureRequest(&retryRequest)

            let (retryData, retryResponse) = try await session.data(for: retryRequest)
            guard let retryHttpResponse = retryResponse as? HTTPURLResponse,
                  retryHttpResponse.statusCode >= 200 && retryHttpResponse.statusCode < 300
            else {
              throw APIError.unauthorized
            }
            if let cacheKey {
              responseCache[cacheKey] = CachedResponse(data: retryData, cachedAt: Date())
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

  // MARK: - HTTP Method Helpers

  /// GET request with retry logic and caching
  func fetchWithRetry(
    url: URL,
    forceRefresh: Bool = false,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try await performRequest(
      url: url,
      configureRequest: { _ in /* GET is default, no configuration needed */ },
      cacheKey: forceRefresh ? nil : url.absoluteString,
      maxRetries: maxRetries
    )
  }

  /// POST request with retry logic
  func postWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    let bodyData = try JSONEncoder().encode(body)
    return try await performRequest(
      url: url,
      configureRequest: { request in
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
      },
      maxRetries: maxRetries
    )
  }

  /// PUT request with retry logic
  func putWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    let bodyData = try JSONEncoder().encode(body)
    return try await performRequest(
      url: url,
      configureRequest: { request in
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
      },
      maxRetries: maxRetries
    )
  }

  /// PATCH request with retry logic
  func patchWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    let bodyData = try JSONEncoder().encode(body)
    return try await performRequest(
      url: url,
      configureRequest: { request in
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
      },
      maxRetries: maxRetries
    )
  }

  /// DELETE request with retry logic
  func deleteWithRetry(
    url: URL,
    maxRetries: Int = AppConfig.maxRetryAttempts
  ) async throws -> Data {
    try await performRequest(
      url: url,
      configureRequest: { request in
        request.httpMethod = "DELETE"
      },
      maxRetries: maxRetries
    )
  }

  /// Clear response cache
  func clearCache() {
    responseCache.removeAll()
    logger.info("API cache cleared")
  }

  /// Helper to create authenticated request
  func createAuthenticatedRequest(url: URL) async -> URLRequest {
    var request = URLRequest(url: url)
    if let token = try? await authManager.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    return request
  }
}

// MARK: - Generic API Methods Extension

extension NetworkClient {
  /// Generic GET request with path and optional query items
  /// Path should be like "comments", "notifications", etc. (without api/ prefix)
  func fetch<T: Decodable & Sendable>(path: String, queryItems: [URLQueryItem] = []) async throws -> T {
    var components = URLComponents(
      url: apiBaseURL.appendingPathComponent("api/\(path)"),
      resolvingAgainstBaseURL: false
    )!

    if !queryItems.isEmpty {
      components.queryItems = queryItems
    }

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await fetchWithRetry(url: url)
    return try decoder.decode(T.self, from: data)
  }

  /// Generic POST request with path and body (Dictionary)
  func post<T: Decodable & Sendable>(path: String, body: [String: Any]) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")

    var request = await createRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await session.data(for: request)

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

    return try decoder.decode(T.self, from: data)
  }

  /// Generic POST request with path and Encodable body
  func post<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")
    let data = try await postWithRetry(url: url, body: body)
    return try decoder.decode(T.self, from: data)
  }

  /// POST request that doesn't return a value
  func postVoid(path: String, body: [String: Any]) async throws {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")

    var request = await createRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (_, response) = try await session.data(for: request)

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

  /// Generic PUT request with path and body (Dictionary)
  func put<T: Decodable & Sendable>(path: String, body: [String: Any]) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")

    var request = await createRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await session.data(for: request)

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

    return try decoder.decode(T.self, from: data)
  }

  /// Generic PUT request with path and Encodable body
  func putWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")
    let data = try await putWithRetry(url: url, body: body)
    return try decoder.decode(T.self, from: data)
  }

  /// Generic PATCH request with path and body (Dictionary)
  func patch<T: Decodable & Sendable>(path: String, body: [String: Any]) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")

    var request = await createRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await session.data(for: request)

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

    return try decoder.decode(T.self, from: data)
  }

  /// Generic PATCH request with path and Encodable body
  func patchWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")
    let data = try await patchWithRetry(url: url, body: body)
    return try decoder.decode(T.self, from: data)
  }

  /// Generic DELETE request with path
  func delete(path: String) async throws {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")
    _ = try await deleteWithRetry(url: url)
  }

  /// Generic DELETE request with path and body (Dictionary)
  func delete(path: String, body: [String: Any]) async throws {
    let url = apiBaseURL.appendingPathComponent("api/\(path)")

    var request = await createRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (_, response) = try await session.data(for: request)

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
}
