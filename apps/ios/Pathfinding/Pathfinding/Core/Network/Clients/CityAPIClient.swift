import Foundation

/// API client for city encyclopedia operations
actor CityAPIClient {
  static let shared = CityAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - City Encyclopedia APIs

  /// Fetch city with encyclopedia data by ID (public API)
  func fetchCityWithEncyclopedia(cityId: String) async throws -> CityWithEncyclopedia {
    let url = await baseURL.appendingPathComponent("v1/cities/\(cityId)/encyclopedia")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(CityEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// List cities with encyclopedia data (public API)
  func fetchCitiesWithEncyclopedia(
    countryCode: String? = nil,
    limit: Int = 50
  ) async throws -> [CityWithEncyclopedia] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/cities"),
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

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// Search cities by name (public API)
  func searchCities(query: String) async throws -> [CityWithEncyclopedia] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/cities/search"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "q", value: query)
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }

  /// Fetch cities by country code (public API)
  func fetchCitiesByCountry(countryCode: String) async throws -> [CityWithEncyclopedia] {
    let url = await baseURL.appendingPathComponent("v1/cities/country/\(countryCode)")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(CitiesWithEncyclopediaResponse.self, from: data)
    return result.data
  }
}
