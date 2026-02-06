import Foundation

/// API client for itinerary copy and public itinerary operations
actor ItineraryAPIClient {
  static let shared = ItineraryAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Itinerary Copy APIs

  /// Copy a public itinerary to user's collection (full copy)
  func copyItinerary(
    itineraryId: String,
    newStartDate: String
  ) async throws -> APIItinerary {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy")

    let body = CopyItineraryRequest(startDate: newStartDate)
    let data = try await network.postWithRetry(url: url, body: body)
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
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy-partial")

    let body = CopyItineraryPartialRequest(
      startDate: newStartDate,
      selectedDays: selectedDays,
      title: newTitle
    )
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(CopyItineraryResponse.self, from: data)
    return result.data
  }

  /// Get user's itinerary copy history
  func getCopyHistory(
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> CopyHistoryResult {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/itineraries/copy-history"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CopyHistoryResponse.self, from: data)
    return CopyHistoryResult(data: result.data, total: result.meta.totalCount)
  }

  /// Get copy statistics for an itinerary (owner only)
  func getItineraryCopyStats(itineraryId: String) async throws -> ItineraryCopyStats {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy-stats")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
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
      url: await baseURL.appendingPathComponent("v1/itineraries/public"),
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

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(PublicItinerariesResponse.self, from: data)
    return PublicItinerariesResult(data: result.data, total: result.meta.totalCount)
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Copy a public itinerary to user's collection (full copy)
  func copyItinerary(
    itineraryId: String,
    newStartDate: String
  ) async throws -> APIItinerary {
    try await ItineraryAPIClient.shared.copyItinerary(itineraryId: itineraryId, newStartDate: newStartDate)
  }

  /// Copy specific days from an itinerary (partial copy)
  func copyItineraryPartial(
    itineraryId: String,
    newStartDate: String,
    selectedDays: [Int],
    newTitle: String? = nil
  ) async throws -> APIItinerary {
    try await ItineraryAPIClient.shared.copyItineraryPartial(
      itineraryId: itineraryId,
      newStartDate: newStartDate,
      selectedDays: selectedDays,
      newTitle: newTitle
    )
  }

  /// Get user's itinerary copy history
  func getCopyHistory(
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> CopyHistoryResult {
    try await ItineraryAPIClient.shared.getCopyHistory(page: page, pageSize: pageSize)
  }

  /// Get copy statistics for an itinerary (owner only)
  func getItineraryCopyStats(itineraryId: String) async throws -> ItineraryCopyStats {
    try await ItineraryAPIClient.shared.getItineraryCopyStats(itineraryId: itineraryId)
  }

  /// List public itineraries for discovery
  func listPublicItineraries(
    cityId: String? = nil,
    page: Int = 1,
    pageSize: Int = 20,
    sortBy: String = "created_at"
  ) async throws -> PublicItinerariesResult {
    try await ItineraryAPIClient.shared.listPublicItineraries(
      cityId: cityId,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy
    )
  }
}
