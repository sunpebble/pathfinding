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

  var apiBaseURL: URL {
    network.apiBaseURL
  }

  var aiServiceURL: URL {
    network.aiServiceURL
  }

  var session: URLSession {
    network.session
  }

  var decoder: JSONDecoder {
    network.decoder
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

  func post<T: Decodable & Sendable>(path: String, body: sending [String: Any]) async throws -> T {
    try await network.post(path: path, body: body)
  }

  func post<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.post(path: path, body: body)
  }

  func postVoid(path: String, body: sending [String: Any]) async throws {
    try await network.postVoid(path: path, body: body)
  }

  func put<T: Decodable & Sendable>(path: String, body: sending [String: Any]) async throws -> T {
    try await network.put(path: path, body: body)
  }

  func putWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.putWithBody(path: path, body: body)
  }

  func patch<T: Decodable & Sendable>(path: String, body: sending [String: Any]) async throws -> T {
    try await network.patch(path: path, body: body)
  }

  func patchWithBody<T: Decodable & Sendable, B: Encodable & Sendable>(path: String, body: B) async throws -> T {
    try await network.patchWithBody(path: path, body: body)
  }

  func delete(path: String) async throws {
    try await network.delete(path: path)
  }

  func delete(path: String, body: sending [String: Any]) async throws {
    try await network.delete(path: path, body: body)
  }

  func createAuthenticatedRequest(url: URL) async -> URLRequest {
    await network.createAuthenticatedRequest(url: url)
  }
}
