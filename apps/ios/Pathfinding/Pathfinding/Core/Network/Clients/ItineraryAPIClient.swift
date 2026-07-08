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

  /// Get copy statistics for an itinerary (owner only)
  func getItineraryCopyStats(itineraryId: String) async throws -> ItineraryCopyStats {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/copy-stats")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(CopyStatsResponse.self, from: data)
    return result.data
  }
}
