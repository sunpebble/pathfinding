import Foundation
import Observation
import OSLog

/// Insurance Store - Manages insurance products and user insurance via API
@MainActor
@Observable
final class InsuranceStore {
  static let shared = InsuranceStore()

  private let logger = Logger(subsystem: "com.kunish.pathfinding", category: "InsuranceStore")
  private let authManager = AuthManager.shared

  // MARK: - State

  /// Available insurance products
  var products: [InsuranceProduct] = []

  /// Recommended products for current destination
  var recommendedProducts: [InsuranceProduct] = []

  /// User's insurance policies
  var userInsurances: [UserInsurance] = []

  /// Claim guides
  var claimGuides: [ClaimGuide] = []

  /// Current destination risk profile
  var currentRiskProfile: DestinationRiskProfile?

  /// Effective risk level for recommendations
  var effectiveRiskLevel: RiskLevel = .medium

  /// Recommended insurance types
  var recommendedTypes: [InsuranceType] = []

  /// Loading states
  var isLoadingProducts = false
  var isLoadingRecommendations = false
  var isLoadingUserInsurances = false
  var isLoadingClaimGuides = false

  /// Error state
  var errorMessage: String?

  // MARK: - Private

  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder

  private init() {
    let urlString = AppConfig.apiBaseURL.replacingOccurrences(of: ":3001", with: ":8000")
    self.baseURL = URL(string: urlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
    self.session = URLSession(configuration: config)
    self.decoder = JSONDecoder()
  }

  // MARK: - Product APIs

  /// Fetch all insurance products
  func fetchProducts(type: InsuranceType? = nil, domesticOnly: Bool? = nil, limit: Int = 20) async {
    isLoadingProducts = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/products"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "limit", value: String(limit))
      ]
      if let type = type {
        queryItems.append(URLQueryItem(name: "type", value: type.rawValue))
      }
      if let domesticOnly = domesticOnly {
        queryItems.append(URLQueryItem(name: "domesticOnly", value: String(domesticOnly)))
      }
      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(InsuranceProductListResponse.self, from: data)
      products = result.data
      logger.info("Loaded \(result.data.count) insurance products")
    } catch {
      logger.error("Failed to fetch products: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingProducts = false
  }

  /// Get recommended insurance for a destination
  func getRecommendations(destination: String, tripDays: Int, riskLevel: RiskLevel? = nil) async {
    isLoadingRecommendations = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/recommend"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "destination", value: destination),
        URLQueryItem(name: "tripDays", value: String(tripDays))
      ]
      if let riskLevel = riskLevel {
        queryItems.append(URLQueryItem(name: "riskLevel", value: riskLevel.rawValue))
      }
      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(InsuranceRecommendationResponse.self, from: data)
      recommendedProducts = result.data.products
      currentRiskProfile = result.data.riskProfile
      effectiveRiskLevel = RiskLevel(rawValue: result.data.effectiveRiskLevel) ?? .medium
      recommendedTypes = result.data.recommendedTypes.compactMap { InsuranceType(rawValue: $0) }

      logger.info("Got \(result.data.products.count) recommended products for \(destination)")
    } catch {
      logger.error("Failed to get recommendations: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingRecommendations = false
  }

  /// Compare insurance products
  func compareProducts(productIds: [String]) async -> [InsuranceProduct] {
    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/compare"),
        resolvingAgainstBaseURL: false
      )!
      components.queryItems = [
        URLQueryItem(name: "productIds", value: productIds.joined(separator: ","))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(InsuranceProductListResponse.self, from: data)
      return result.data
    } catch {
      logger.error("Failed to compare products: \(String(describing: error))")
      errorMessage = error.localizedDescription
      return []
    }
  }

  // MARK: - User Insurance APIs

  /// Fetch user's insurance policies
  func fetchUserInsurances(status: String? = nil) async {
    isLoadingUserInsurances = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/my"),
        resolvingAgainstBaseURL: false
      )!

      if let status = status {
        components.queryItems = [URLQueryItem(name: "status", value: status)]
      }

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(UserInsuranceListResponse.self, from: data)
      userInsurances = result.data
      logger.info("Loaded \(result.data.count) user insurances")
    } catch {
      logger.error("Failed to fetch user insurances: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingUserInsurances = false
  }

  /// Get insurance for a specific itinerary
  func getInsuranceForItinerary(itineraryId: String) async -> [UserInsurance] {
    do {
      let url = baseURL.appendingPathComponent("v1/insurance/itinerary/\(itineraryId)")
      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(UserInsuranceListResponse.self, from: data)
      return result.data
    } catch {
      logger.error("Failed to get insurance for itinerary: \(String(describing: error))")
      return []
    }
  }

  // MARK: - Claim Guides APIs

  /// Fetch claim guides
  func fetchClaimGuides(claimType: ClaimType? = nil) async {
    isLoadingClaimGuides = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/claim-guides"),
        resolvingAgainstBaseURL: false
      )!

      if let claimType = claimType {
        components.queryItems = [URLQueryItem(name: "claimType", value: claimType.rawValue)]
      }

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(ClaimGuideListResponse.self, from: data)
      claimGuides = result.data
      logger.info("Loaded \(result.data.count) claim guides")
    } catch {
      logger.error("Failed to fetch claim guides: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingClaimGuides = false
  }

  /// Get destination risk profile
  func getRiskProfile(destination: String? = nil, destinationCode: String? = nil) async -> DestinationRiskProfile? {
    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/insurance/risk"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = []
      if let destination = destination {
        queryItems.append(URLQueryItem(name: "destination", value: destination))
      }
      if let destinationCode = destinationCode {
        queryItems.append(URLQueryItem(name: "destinationCode", value: destinationCode))
      }
      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(DestinationRiskResponse.self, from: data)
      return result.data
    } catch {
      logger.error("Failed to get risk profile: \(String(describing: error))")
      return nil
    }
  }

  // MARK: - Private Helpers

  private func createAuthenticatedRequest(url: URL, method: String = "GET") async throws -> URLRequest {
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await authManager.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    return request
  }

  private func validateResponse(_ response: URLResponse) throws {
    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    switch httpResponse.statusCode {
    case 200...299:
      return
    case 401:
      throw APIError.unauthorized
    case 404:
      throw APIError.notFound
    case 500...599:
      throw APIError.serverError(httpResponse.statusCode)
    default:
      throw APIError.httpError(httpResponse.statusCode)
    }
  }

  // MARK: - Clear Cache

  func clearCache() {
    products = []
    recommendedProducts = []
    userInsurances = []
    claimGuides = []
    currentRiskProfile = nil
    errorMessage = nil
  }
}
