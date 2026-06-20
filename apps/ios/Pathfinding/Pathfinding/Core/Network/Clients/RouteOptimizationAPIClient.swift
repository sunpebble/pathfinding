import Foundation

/// API client for route optimization operations
actor RouteOptimizationAPIClient {
  static let shared = RouteOptimizationAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Route Optimization APIs

  /// Optimize a single day's route
  func optimizeDayRoute(day: AiDay, options: RouteOptimizationOptions? = nil) async throws -> OptimizedRouteResult {
    let url = await baseURL.appendingPathComponent("v1/route-optimization/day")

    let body = OptimizeDayRequest(day: day, options: options)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(OptimizedRouteResponse.self, from: data)
    return result.data
  }

  /// Optimize a full itinerary
  func optimizeItinerary(days: [AiDay], options: RouteOptimizationOptions? = nil) async throws -> OptimizedItineraryResult {
    let url = await baseURL.appendingPathComponent("v1/route-optimization/itinerary")

    let body = OptimizeItineraryRequest(days: days, options: options)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(OptimizedItineraryResponse.self, from: data)
    return result.data
  }

  /// Compare original and optimized routes
  func compareRoute(day: AiDay, options: RouteOptimizationOptions? = nil) async throws -> RouteComparisonResult {
    let url = await baseURL.appendingPathComponent("v1/route-optimization/compare")

    let body = OptimizeDayRequest(day: day, options: options)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(RouteComparisonResponse.self, from: data)
    return result.data
  }

  /// Get available transport modes
  func getTransportModes() async throws -> [RouteTransportModeInfo] {
    let url = await baseURL.appendingPathComponent("v1/route-optimization/transport-modes")
    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TransportModesResponse.self, from: data)
    return result.data
  }
}
