import Foundation

/// API client for Crawler service
final class APIClient: Sendable {
  static let shared = APIClient()

  private let baseURL: URL
  private let session: URLSession

  init(baseURL: String = "http://127.0.0.1:3001") {
    self.baseURL = URL(string: baseURL)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
    self.session = URLSession(configuration: config)
  }

  /// Fetch travel guides
  func fetchGuides(limit: Int = 20, offset: Int = 0) async throws -> [BlogPost] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/guides"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit)),
      URLQueryItem(name: "offset", value: String(offset)),
    ]

    guard let url = components.url else {
      throw URLError(.badURL)
    }

    print("🌐 Fetching: \(url)")

    let (data, response) = try await session.data(from: url)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("📡 Response status: \(httpResponse.statusCode)")

    guard httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    // Debug: print raw JSON
    if let jsonString = String(data: data, encoding: .utf8) {
      print("📄 Raw JSON (first 500 chars): \(String(jsonString.prefix(500)))")
    }

    do {
      let decoder = JSONDecoder()
      let result = try decoder.decode(BlogListResponse.self, from: data)
      print("✅ Loaded \(result.data.count) guides")
      return result.data
    } catch let DecodingError.keyNotFound(key, context) {
      print("❌ Key not found: \(key.stringValue)")
      print("   Context: \(context.debugDescription)")
      print("   Path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
      throw DecodingError.keyNotFound(key, context)
    } catch let DecodingError.typeMismatch(type, context) {
      print("❌ Type mismatch: \(type)")
      print("   Context: \(context.debugDescription)")
      print("   Path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
      throw DecodingError.typeMismatch(type, context)
    } catch let DecodingError.valueNotFound(type, context) {
      print("❌ Value not found: \(type)")
      print("   Context: \(context.debugDescription)")
      print("   Path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
      throw DecodingError.valueNotFound(type, context)
    } catch {
      print("❌ Decoding error: \(error)")
      throw error
    }
  }

  /// Fetch single guide by ID
  func fetchGuide(id: String) async throws -> BlogPost {
    let url = baseURL.appendingPathComponent("api/guides/\(id)")
    let (data, _) = try await session.data(from: url)
    return try JSONDecoder().decode(BlogPost.self, from: data)
  }
}
