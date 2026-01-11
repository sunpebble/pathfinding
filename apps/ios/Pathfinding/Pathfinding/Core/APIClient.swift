import Foundation

/// API client for Crawler service
@Observable
final class APIClient {
  static let shared = APIClient()

  private let baseURL: URL
  private let session: URLSession

  init(baseURL: String = "http://localhost:3001") {
    self.baseURL = URL(string: baseURL)!
    self.session = URLSession.shared
  }

  /// Fetch travel guides
  func fetchGuides(limit: Int = 20, offset: Int = 0) async throws -> [BlogPost] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("/api/guides"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit)),
      URLQueryItem(name: "offset", value: String(offset)),
    ]

    let (data, _) = try await session.data(from: components.url!)
    let response = try JSONDecoder().decode(BlogListResponse.self, from: data)
    return response.data
  }

  /// Fetch single guide by ID
  func fetchGuide(id: String) async throws -> BlogPost {
    let url = baseURL.appendingPathComponent("/api/guides/\(id)")
    let (data, _) = try await session.data(from: url)
    return try JSONDecoder().decode(BlogPost.self, from: data)
  }
}
