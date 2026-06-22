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
}
