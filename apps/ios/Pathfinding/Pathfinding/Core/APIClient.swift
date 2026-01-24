import Foundation
import OSLog

/// API client providing backward compatibility for existing code.
///
/// For new code, prefer using specialized API clients directly:
/// - `GuideAPIClient.shared` for travel guides
/// - `SafetyAPIClient.shared` for safety information
/// - `FlightAPIClient.shared` for flight operations
/// - etc.
actor APIClient {
  static let shared = APIClient()

  private let network = NetworkClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "APIClient")

  private init() {}

  // MARK: - Delegate Properties to NetworkClient

  var convexURL: URL {
    get async { await network.convexURL }
  }

  var aiServiceURL: URL {
    get async { await network.aiServiceURL }
  }

  var session: URLSession {
    get async { await network.session }
  }

  var decoder: JSONDecoder {
    get async { await network.decoder }
  }

  var baseURL: URL {
    get async { await network.baseURL }
  }

  // MARK: - Delegate Methods to NetworkClient

  func serviceType(for path: String) async -> APIServiceType {
    await network.serviceType(for: path)
  }

  func baseURL(for path: String) async -> URL {
    await network.baseURL(for: path)
  }

  func url(for path: String) async -> URL {
    await network.url(for: path)
  }

  func clearCache() async {
    await network.clearCache()
  }

  func createRequest(url: URL) async -> URLRequest {
    await network.createRequest(url: url)
  }

  // MARK: - Retry Methods (Delegate to NetworkClient)

  func fetchWithRetry(
    url: URL,
    forceRefresh: Bool = false,
    maxRetries: Int = 3
  ) async throws -> Data {
    try await network.fetchWithRetry(url: url, forceRefresh: forceRefresh, maxRetries: maxRetries)
  }

  func postWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = 3
  ) async throws -> Data {
    try await network.postWithRetry(url: url, body: body, maxRetries: maxRetries)
  }

  func putWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = 3
  ) async throws -> Data {
    try await network.putWithRetry(url: url, body: body, maxRetries: maxRetries)
  }

  func patchWithRetry<T: Encodable & Sendable>(
    url: URL,
    body: T,
    maxRetries: Int = 3
  ) async throws -> Data {
    try await network.patchWithRetry(url: url, body: body, maxRetries: maxRetries)
  }

  func deleteWithRetry(
    url: URL,
    maxRetries: Int = 3
  ) async throws -> Data {
    try await network.deleteWithRetry(url: url, maxRetries: maxRetries)
  }
}

// MARK: - Generic API Methods Extension

extension APIClient {
  func fetch<T: Decodable & Sendable>(path: String, queryItems: [URLQueryItem] = []) async throws -> T {
    try await network.fetch(path: path, queryItems: queryItems)
  }

  nonisolated func post<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.convexURL)!
    let url = baseURL.appendingPathComponent("http/api/\(path)")

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
      if statusCode == 401 { throw APIError.unauthorized }
      if statusCode == 404 { throw APIError.notFound }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  func post<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.post(path: path, body: body)
  }

  nonisolated func postVoid(path: String, body: [String: Any]) async throws {
    let baseURL = URL(string: AppConfig.convexURL)!
    let url = baseURL.appendingPathComponent("http/api/\(path)")

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
      if statusCode == 401 { throw APIError.unauthorized }
      if statusCode == 404 { throw APIError.notFound }
      throw APIError.httpError(statusCode)
    }
  }

  nonisolated func put<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.convexURL)!
    let url = baseURL.appendingPathComponent("http/api/\(path)")

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
      if statusCode == 401 { throw APIError.unauthorized }
      if statusCode == 404 { throw APIError.notFound }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  func putWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.putWithBody(path: path, body: body)
  }

  nonisolated func patch<T: Decodable>(path: String, body: [String: Any]) async throws -> T {
    let baseURL = URL(string: AppConfig.convexURL)!
    let url = baseURL.appendingPathComponent("http/api/\(path)")

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
      if statusCode == 401 { throw APIError.unauthorized }
      if statusCode == 404 { throw APIError.notFound }
      throw APIError.httpError(statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  func patchWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.patchWithBody(path: path, body: body)
  }

  func delete(path: String) async throws {
    try await network.delete(path: path)
  }

  nonisolated func delete(path: String, body: [String: Any]) async throws {
    let baseURL = URL(string: AppConfig.convexURL)!
    let url = baseURL.appendingPathComponent("http/api/\(path)")

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
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
      if statusCode == 401 { throw APIError.unauthorized }
      if statusCode == 404 { throw APIError.notFound }
      throw APIError.httpError(statusCode)
    }
  }

  func createAuthenticatedRequest(url: URL) async -> URLRequest {
    await network.createAuthenticatedRequest(url: url)
  }
}
