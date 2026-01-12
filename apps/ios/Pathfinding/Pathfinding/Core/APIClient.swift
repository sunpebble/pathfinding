import Foundation
import OSLog

/// API client for Crawler service with caching and retry logic
actor APIClient {
  static let shared = APIClient()

  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "APIClient")

  // Response cache
  private var responseCache: [String: CachedResponse] = [:]

  private struct CachedResponse {
    let data: Data
    let cachedAt: Date
  }

  init(baseURL: String? = nil) {
    let urlString = baseURL ?? AppConfig.apiBaseURL
    self.baseURL = URL(string: urlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = AppConfig.networkTimeoutRequest
    config.timeoutIntervalForResource = AppConfig.networkTimeoutResource
    config.waitsForConnectivity = true
    self.session = URLSession(configuration: config)

    self.decoder = JSONDecoder()
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
    let url = baseURL.appendingPathComponent("api/guides/\(id)")
    let data = try await fetchWithRetry(url: url)
    return try decoder.decode(BlogPost.self, from: data)
  }

  // MARK: - Private Methods

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

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
          throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
          // Cache the successful response
          responseCache[cacheKey] = CachedResponse(data: data, cachedAt: Date())
          return data

        case 401:
          throw APIError.unauthorized

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
