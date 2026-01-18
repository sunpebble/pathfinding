import Foundation
import Observation
import OSLog

/// SimCard Store - Manages SIM card products, reviews, and favorites via API
@MainActor
@Observable
final class SimCardStore {
  static let shared = SimCardStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "SimCardStore")
  private let authManager = AuthManager.shared

  // MARK: - State

  /// Available SIM card products
  var products: [SimCard] = []

  /// Recommended SIM cards for current destination
  var recommendedProducts: [SimCard] = []

  /// Popular SIM cards
  var popularProducts: [SimCard] = []

  /// eSIM products
  var esimProducts: [SimCard] = []

  /// Search results
  var searchResults: [SimCard] = []

  /// Comparison products
  var comparisonProducts: [SimCard] = []

  /// Current SIM card detail
  var currentSimCard: SimCard?

  /// Reviews for current SIM card
  var currentReviews: [SimCardReview] = []

  /// Top reviews for current SIM card
  var topReviews: [SimCardReview] = []

  /// User's reviews
  var userReviews: [SimCardReview] = []

  /// User's favorite SIM cards
  var favorites: [FavoriteSimCard] = []

  /// Loading states
  var isLoadingProducts = false
  var isLoadingRecommendations = false
  var isLoadingPopular = false
  var isLoadingEsim = false
  var isSearching = false
  var isLoadingDetail = false
  var isLoadingReviews = false
  var isLoadingFavorites = false
  var isSubmittingReview = false

  /// Error state
  var errorMessage: String?

  // MARK: - Private

  private let baseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder

  private init() {
    let urlString = AppConfig.convexURL.replacingOccurrences(of: ":3001", with: ":8000")
    self.baseURL = URL(string: urlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
    self.session = URLSession(configuration: config)
    self.decoder = JSONDecoder()
    self.encoder = JSONEncoder()
  }

  // MARK: - Product APIs

  /// Fetch SIM card products with filters
  func fetchProducts(
    destination: String? = nil,
    cardType: SimCardType? = nil,
    coverageType: SimCardCoverageType? = nil,
    minData: Int? = nil,
    maxPrice: Double? = nil,
    minDays: Int? = nil,
    includesVoice: Bool? = nil,
    limit: Int = 20,
    offset: Int = 0
  ) async {
    isLoadingProducts = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "limit", value: String(limit)),
        URLQueryItem(name: "offset", value: String(offset))
      ]

      if let destination = destination {
        queryItems.append(URLQueryItem(name: "destination", value: destination))
      }
      if let cardType = cardType {
        queryItems.append(URLQueryItem(name: "cardType", value: cardType.rawValue))
      }
      if let coverageType = coverageType {
        queryItems.append(URLQueryItem(name: "coverageType", value: coverageType.rawValue))
      }
      if let minData = minData {
        queryItems.append(URLQueryItem(name: "minData", value: String(minData)))
      }
      if let maxPrice = maxPrice {
        queryItems.append(URLQueryItem(name: "maxPrice", value: String(maxPrice)))
      }
      if let minDays = minDays {
        queryItems.append(URLQueryItem(name: "minDays", value: String(minDays)))
      }
      if let includesVoice = includesVoice {
        queryItems.append(URLQueryItem(name: "includesVoice", value: String(includesVoice)))
      }

      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      products = result.data
      logger.info("Loaded \(result.data.count) SIM card products")
    } catch {
      logger.error("Failed to fetch products: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingProducts = false
  }

  /// Get recommended SIM cards for a destination
  func getRecommendations(
    destination: String,
    tripDurationDays: Int? = nil,
    needsVoice: Bool? = nil,
    preferEsim: Bool? = nil,
    limit: Int = 10
  ) async {
    isLoadingRecommendations = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/recommend"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "destination", value: destination),
        URLQueryItem(name: "limit", value: String(limit))
      ]

      if let tripDurationDays = tripDurationDays {
        queryItems.append(URLQueryItem(name: "tripDurationDays", value: String(tripDurationDays)))
      }
      if let needsVoice = needsVoice {
        queryItems.append(URLQueryItem(name: "needsVoice", value: String(needsVoice)))
      }
      if let preferEsim = preferEsim {
        queryItems.append(URLQueryItem(name: "preferEsim", value: String(preferEsim)))
      }

      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      recommendedProducts = result.data
      logger.info("Got \(result.data.count) recommended SIM cards for \(destination)")
    } catch {
      logger.error("Failed to get recommendations: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingRecommendations = false
  }

  /// Search SIM cards
  func search(query: String, destination: String? = nil, limit: Int = 20) async {
    isSearching = true
    errorMessage = nil

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/search"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "query", value: query),
        URLQueryItem(name: "limit", value: String(limit))
      ]

      if let destination = destination {
        queryItems.append(URLQueryItem(name: "destination", value: destination))
      }

      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      searchResults = result.data
      logger.info("Found \(result.data.count) SIM cards for query: \(query)")
    } catch {
      logger.error("Failed to search: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isSearching = false
  }

  /// Get popular SIM cards
  func fetchPopular(destination: String? = nil, limit: Int = 10) async {
    isLoadingPopular = true

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/popular"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "limit", value: String(limit))
      ]

      if let destination = destination {
        queryItems.append(URLQueryItem(name: "destination", value: destination))
      }

      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      popularProducts = result.data
      logger.info("Loaded \(result.data.count) popular SIM cards")
    } catch {
      logger.error("Failed to fetch popular: \(String(describing: error))")
    }

    isLoadingPopular = false
  }

  /// Get eSIM products
  func fetchEsimProducts(destination: String? = nil, limit: Int = 20) async {
    isLoadingEsim = true

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/esim"),
        resolvingAgainstBaseURL: false
      )!

      var queryItems: [URLQueryItem] = [
        URLQueryItem(name: "limit", value: String(limit))
      ]

      if let destination = destination {
        queryItems.append(URLQueryItem(name: "destination", value: destination))
      }

      components.queryItems = queryItems

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      esimProducts = result.data
      logger.info("Loaded \(result.data.count) eSIM products")
    } catch {
      logger.error("Failed to fetch eSIM products: \(String(describing: error))")
    }

    isLoadingEsim = false
  }

  /// Compare SIM card products
  func compareProducts(ids: [String]) async {
    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/compare"),
        resolvingAgainstBaseURL: false
      )!

      components.queryItems = [
        URLQueryItem(name: "ids", value: ids.joined(separator: ","))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardListResponse.self, from: data)
      comparisonProducts = result.data
      logger.info("Loaded \(result.data.count) SIM cards for comparison")
    } catch {
      logger.error("Failed to compare products: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }
  }

  /// Get SIM card by ID
  func fetchSimCard(id: String) async {
    isLoadingDetail = true
    errorMessage = nil

    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(id)")
      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardResponse.self, from: data)
      currentSimCard = result.data
      logger.info("Loaded SIM card: \(result.data.name)")
    } catch {
      logger.error("Failed to fetch SIM card: \(String(describing: error))")
      errorMessage = error.localizedDescription
    }

    isLoadingDetail = false
  }

  // MARK: - Review APIs

  /// Fetch reviews for a SIM card
  func fetchReviews(simCardId: String, limit: Int = 20, offset: Int = 0) async {
    isLoadingReviews = true

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/reviews"),
        resolvingAgainstBaseURL: false
      )!

      components.queryItems = [
        URLQueryItem(name: "status", value: "approved"),
        URLQueryItem(name: "limit", value: String(limit)),
        URLQueryItem(name: "offset", value: String(offset))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardReviewListResponse.self, from: data)
      currentReviews = result.data
      logger.info("Loaded \(result.data.count) reviews")
    } catch {
      logger.error("Failed to fetch reviews: \(String(describing: error))")
    }

    isLoadingReviews = false
  }

  /// Fetch top reviews for a SIM card
  func fetchTopReviews(simCardId: String, limit: Int = 5) async {
    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/reviews/top"),
        resolvingAgainstBaseURL: false
      )!

      components.queryItems = [
        URLQueryItem(name: "limit", value: String(limit))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardReviewListResponse.self, from: data)
      topReviews = result.data
      logger.info("Loaded \(result.data.count) top reviews")
    } catch {
      logger.error("Failed to fetch top reviews: \(String(describing: error))")
    }
  }

  /// Submit a review
  func submitReview(
    simCardId: String,
    overallRating: Double,
    content: String,
    title: String? = nil,
    signalRating: Double? = nil,
    speedRating: Double? = nil,
    valueRating: Double? = nil,
    serviceRating: Double? = nil,
    destination: String? = nil,
    usageDuration: Int? = nil,
    actualDataUsed: String? = nil,
    deviceUsed: String? = nil,
    pros: [String]? = nil,
    cons: [String]? = nil,
    activationExperience: String? = nil,
    signalQuality: SignalQuality? = nil,
    speedTestResult: String? = nil,
    wouldRecommend: Bool = true
  ) async -> Bool {
    isSubmittingReview = true
    errorMessage = nil

    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/reviews")
      var request = try await createAuthenticatedRequest(url: url, method: "POST")

      let reviewRequest = CreateSimCardReviewRequest(
        authorName: nil,
        overallRating: overallRating,
        signalRating: signalRating,
        speedRating: speedRating,
        valueRating: valueRating,
        serviceRating: serviceRating,
        title: title,
        content: content,
        destination: destination,
        usageDuration: usageDuration,
        actualDataUsed: actualDataUsed,
        deviceUsed: deviceUsed,
        pros: pros,
        cons: cons,
        activationExperience: activationExperience,
        signalQuality: signalQuality?.rawValue,
        speedTestResult: speedTestResult,
        wouldRecommend: wouldRecommend,
        imageUrls: nil
      )

      request.httpBody = try encoder.encode(reviewRequest)
      let (_, response) = try await session.data(for: request)

      try validateResponse(response)

      logger.info("Review submitted successfully")
      isSubmittingReview = false
      return true
    } catch {
      logger.error("Failed to submit review: \(String(describing: error))")
      errorMessage = error.localizedDescription
      isSubmittingReview = false
      return false
    }
  }

  /// Vote on a review
  func voteOnReview(reviewId: String, voteType: SimCardReviewVoteType) async -> Bool {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/reviews/\(reviewId)/vote")
      var request = try await createAuthenticatedRequest(url: url, method: "POST")

      let voteRequest = SimCardVoteRequest(voteType: voteType.rawValue)
      request.httpBody = try encoder.encode(voteRequest)

      let (_, response) = try await session.data(for: request)
      try validateResponse(response)

      logger.info("Vote submitted successfully")
      return true
    } catch {
      logger.error("Failed to vote on review: \(String(describing: error))")
      return false
    }
  }

  /// Report a review
  func reportReview(reviewId: String) async -> Bool {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/reviews/\(reviewId)/report")
      let request = try await createAuthenticatedRequest(url: url, method: "POST")

      let (_, response) = try await session.data(for: request)
      try validateResponse(response)

      logger.info("Review reported successfully")
      return true
    } catch {
      logger.error("Failed to report review: \(String(describing: error))")
      return false
    }
  }

  /// Fetch user's reviews
  func fetchUserReviews(limit: Int = 20) async {
    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/my/reviews"),
        resolvingAgainstBaseURL: false
      )!

      components.queryItems = [
        URLQueryItem(name: "limit", value: String(limit))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardReviewListResponse.self, from: data)
      userReviews = result.data
      logger.info("Loaded \(result.data.count) user reviews")
    } catch {
      logger.error("Failed to fetch user reviews: \(String(describing: error))")
    }
  }

  // MARK: - Favorites APIs

  /// Fetch user's favorite SIM cards
  func fetchFavorites(limit: Int = 50, offset: Int = 0) async {
    isLoadingFavorites = true

    do {
      var components = URLComponents(
        url: baseURL.appendingPathComponent("v1/sim-cards/favorites"),
        resolvingAgainstBaseURL: false
      )!

      components.queryItems = [
        URLQueryItem(name: "limit", value: String(limit)),
        URLQueryItem(name: "offset", value: String(offset))
      ]

      guard let url = components.url else {
        throw APIError.invalidURL
      }

      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(FavoriteSimCardListResponse.self, from: data)
      favorites = result.data
      logger.info("Loaded \(result.data.count) favorite SIM cards")
    } catch {
      logger.error("Failed to fetch favorites: \(String(describing: error))")
    }

    isLoadingFavorites = false
  }

  /// Check if a SIM card is favorited
  func isFavorited(simCardId: String) async -> Bool {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/favorite")
      let request = try await createAuthenticatedRequest(url: url)
      let (data, response) = try await session.data(for: request)

      try validateResponse(response)

      let result = try decoder.decode(SimCardFavoriteStatusResponse.self, from: data)
      return result.data.isFavorited
    } catch {
      logger.error("Failed to check favorite status: \(String(describing: error))")
      return false
    }
  }

  /// Add a SIM card to favorites
  func addToFavorites(simCardId: String, notes: String? = nil) async -> Bool {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/favorite")
      var request = try await createAuthenticatedRequest(url: url, method: "POST")

      let favoriteRequest = AddSimCardToFavoritesRequest(notes: notes)
      request.httpBody = try encoder.encode(favoriteRequest)

      let (_, response) = try await session.data(for: request)
      try validateResponse(response)

      logger.info("Added SIM card to favorites")
      await fetchFavorites()
      return true
    } catch {
      logger.error("Failed to add to favorites: \(String(describing: error))")
      return false
    }
  }

  /// Remove a SIM card from favorites
  func removeFromFavorites(simCardId: String) async -> Bool {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/favorite")
      let request = try await createAuthenticatedRequest(url: url, method: "DELETE")

      let (_, response) = try await session.data(for: request)
      try validateResponse(response)

      logger.info("Removed SIM card from favorites")
      favorites.removeAll { $0.simCardId == simCardId }
      return true
    } catch {
      logger.error("Failed to remove from favorites: \(String(describing: error))")
      return false
    }
  }

  /// Toggle favorite status
  func toggleFavorite(simCardId: String) async -> Bool? {
    do {
      let url = baseURL.appendingPathComponent("v1/sim-cards/\(simCardId)/favorite/toggle")
      let request = try await createAuthenticatedRequest(url: url, method: "POST")

      let (data, response) = try await session.data(for: request)
      try validateResponse(response)

      let result = try decoder.decode(SimCardToggleFavoriteResponse.self, from: data)
      logger.info("Toggled favorite: \(result.data.isFavorited)")

      if result.data.isFavorited {
        await fetchFavorites()
      } else {
        favorites.removeAll { $0.simCardId == simCardId }
      }

      return result.data.isFavorited
    } catch {
      logger.error("Failed to toggle favorite: \(String(describing: error))")
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
    popularProducts = []
    esimProducts = []
    searchResults = []
    comparisonProducts = []
    currentSimCard = nil
    currentReviews = []
    topReviews = []
    userReviews = []
    favorites = []
    errorMessage = nil
  }
}
