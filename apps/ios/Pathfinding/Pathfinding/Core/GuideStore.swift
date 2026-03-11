import Foundation
import OSLog

/// Global state management for travel guides using @Observable
@Observable
@MainActor
final class GuideStore {
  static let shared = GuideStore()

  // MARK: - State
  private(set) var guides: [BlogPost] = []
  private(set) var isLoading = false
  private(set) var error: StoreError?
  private(set) var lastFetchedAt: Date?

  // Search state
  private(set) var searchResults: [BlogPost] = []
  private(set) var popularDestinations: [PopularDestination] = []
  private(set) var isSearching = false

  // MARK: - Cache Configuration
  private let cacheValidityDuration: TimeInterval = 5 * 60 // 5 minutes

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "GuideStore")

  private init() {}

  // MARK: - Computed Properties

  var featuredGuides: [BlogPost] {
    Array(guides.prefix(3))
  }

  var recentGuides: [BlogPost] {
    Array(guides.dropFirst(3))
  }

  var isCacheValid: Bool {
    guard let lastFetched = lastFetchedAt else { return false }
    return Date().timeIntervalSince(lastFetched) < cacheValidityDuration
  }

  // MARK: - Actions

  /// Fetch guides with optional force refresh
  func fetchGuides(forceRefresh: Bool = false) async {
    // Skip if cache is valid and not forcing refresh
    if !forceRefresh && isCacheValid && !guides.isEmpty {
      logger.debug("Using cached guides (\(self.guides.count) items)")
      return
    }

    // If already loading and force refresh requested, reset to allow retry
    if isLoading && forceRefresh {
      isLoading = false
    }

    guard !isLoading else {
      logger.debug("Fetch already in progress, skipping")
      return
    }

    isLoading = true
    error = nil
    defer { isLoading = false }

    do {
      let fetchedGuides = try await APIClient.shared.fetchGuides(limit: 30)
      guides = fetchedGuides
      lastFetchedAt = Date()
      logger.info("Fetched \(fetchedGuides.count) guides")
    } catch is CancellationError {
      logger.debug("Fetch guides cancelled")
    } catch let urlError as URLError {
      error = .network(urlError)
      logger.error("Network error: \(urlError.localizedDescription)")
    } catch let decodingError as DecodingError {
      error = .decoding(decodingError)
      logger.error("Decoding error: \(String(describing: decodingError))")
    } catch {
      self.error = .unknown(error)
      logger.error("Unknown error: \(error.localizedDescription)")
    }
  }

  /// Get a single guide by ID
  func guide(byId id: String) -> BlogPost? {
    guides.first { $0.id == id }
  }

  /// Search guides by title
  func searchGuides(query: String) -> [BlogPost] {
    guard !query.isEmpty else { return guides }
    return guides.filter { $0.title.localizedCaseInsensitiveContains(query) }
  }

  /// Clear cache and reset state
  func clearCache() {
    guides = []
    lastFetchedAt = nil
    error = nil
    logger.info("Cache cleared")
  }

  // MARK: - Search

  /// Search guides with filters
  func search(
    query: String = "",
    destination: String? = nil,
    hasAiData: Bool = false,
    daysAgo: Int? = nil
  ) async {
    guard !isSearching else { return }

    isSearching = true
    defer { isSearching = false }

    do {
      searchResults = try await APIClient.shared.searchGuides(
        query: query.isEmpty ? nil : query,
        destination: destination,
        hasAiData: hasAiData ? true : nil,
        daysAgo: daysAgo
      )
      logger.info("Search returned \(self.searchResults.count) results")
    } catch is CancellationError {
      logger.debug("Search cancelled")
    } catch {
      logger.error("Search error: \(error.localizedDescription)")
      searchResults = []
    }
  }

  /// Fetch popular destinations
  func fetchPopularDestinations() async {
    do {
      popularDestinations = try await APIClient.shared.fetchPopularDestinations()
      logger.info("Fetched \(self.popularDestinations.count) popular destinations")
    } catch {
      logger.error("Fetch destinations error: \(error.localizedDescription)")
    }
  }

  /// Clear search results
  func clearSearch() {
    searchResults = []
  }
}

// MARK: - Store Error

enum StoreError: LocalizedError {
  case network(URLError)
  case decoding(DecodingError)
  case unknown(Error)

  var errorDescription: String? {
    switch self {
    case .network(let error):
      switch error.code {
      case .notConnectedToInternet:
        return "无网络连接，请检查网络设置"
      case .timedOut:
        return "请求超时，请稍后重试"
      case .cannotConnectToHost:
        return "无法连接到服务器"
      default:
        return "网络错误: \(error.localizedDescription)"
      }
    case .decoding:
      return "数据解析失败，请稍后重试"
    case .unknown(let error):
      return error.localizedDescription
    }
  }

  var recoverySuggestion: String? {
    switch self {
    case .network:
      return "请检查网络连接后重试"
    case .decoding:
      return "请联系开发者或稍后重试"
    case .unknown:
      return "请稍后重试"
    }
  }
}
