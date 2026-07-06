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

  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "GuideStore")

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
      let fetchedGuides = try await GuideAPIClient.shared.fetchGuides(limit: 30)
      guides = fetchedGuides
      lastFetchedAt = Date()
      logger.info("Fetched \(fetchedGuides.count) guides")
    } catch is CancellationError {
      logger.debug("Fetch guides cancelled")
    } catch let urlError as URLError {
      error = .network(urlError)
      logger.error("Network error: \(urlError.localizedDescription)")
      loadMockGuidesIfNeeded()
    } catch let decodingError as DecodingError {
      error = .decoding(decodingError)
      logger.error("Decoding error: \(String(describing: decodingError))")
    } catch {
      self.error = .unknown(error)
      logger.error("Unknown error: \(error.localizedDescription)")
      loadMockGuidesIfNeeded()
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
      searchResults = try await GuideAPIClient.shared.searchGuides(
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
      popularDestinations = try await GuideAPIClient.shared.fetchPopularDestinations()
      logger.info("Fetched \(self.popularDestinations.count) popular destinations")
    } catch {
      logger.error("Fetch destinations error: \(error.localizedDescription)")
      loadMockDestinationsIfNeeded()
    }
  }

  /// Clear search results
  func clearSearch() {
    searchResults = []
  }

  // MARK: - Mock Data Fallback (Debug Only)

  /// Load mock guides when API is unavailable (development without backend)
  private func loadMockGuidesIfNeeded() {
    #if DEBUG
      guard guides.isEmpty else { return }
      logger.info("Loading mock guides for development")
      guides = Self.mockGuides
      lastFetchedAt = Date()
      error = nil
    #endif
  }

  /// Load mock destinations when API is unavailable
  private func loadMockDestinationsIfNeeded() {
    #if DEBUG
      guard popularDestinations.isEmpty else { return }
      logger.info("Loading mock destinations for development")
      popularDestinations = Self.mockDestinations
    #endif
  }

  #if DEBUG
    static let mockGuides: [BlogPost] = [
      BlogPost(
        id: "mock-1",
        title: "Tokyo 3-Day Budget Travel Guide",
        authorName: "Travel Explorer",
        content: nil,
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "A comprehensive guide to exploring Tokyo on a budget, covering Shibuya, Asakusa, and Akihabara.",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "xiaohongshu",
        qualityScore: 4.5,
        viewsCount: 12_580,
        likesCount: 3_420,
        savesCount: 1_890,
        createdAt: "2024-12-01T10:00:00Z",
        destinations: ["Tokyo"],
        aiSummary: "Budget-friendly Tokyo itinerary covering major districts with tips on transport passes and affordable dining.",
        aiTips: ["Buy a 72-hour metro pass", "Visit Tsukiji outer market for cheap sushi", "Free observation decks at Tokyo Metropolitan Government Building"],
        aiBestTime: "March-May (cherry blossom) or Oct-Nov (autumn foliage)",
        aiDuration: "3 days",
        aiBudget: "¥50,000-80,000",
        aiDays: nil,
        aiProcessedAt: nil
      ),
      BlogPost(
        id: "mock-2",
        title: "Bali Hidden Gems: 7 Days Off the Beaten Path",
        authorName: "Island Wanderer",
        content: nil,
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "Discover the less-visited side of Bali with waterfalls, rice terraces, and local villages.",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "mafengwo",
        qualityScore: 4.2,
        viewsCount: 8_320,
        likesCount: 2_150,
        savesCount: 1_430,
        createdAt: "2024-11-15T08:30:00Z",
        destinations: ["Bali"],
        aiSummary: "Off-the-beaten-path Bali guide featuring Sidemen valley, Munduk waterfalls, and authentic village experiences.",
        aiTips: ["Rent a scooter for flexibility", "Visit Tirta Gangga water palace early morning", "Try local warungs for authentic food"],
        aiBestTime: "April-October (dry season)",
        aiDuration: "7 days",
        aiBudget: "$500-800",
        aiDays: nil,
        aiProcessedAt: nil
      ),
      BlogPost(
        id: "mock-3",
        title: "Bangkok Street Food Ultimate Guide",
        authorName: "Foodie Nomad",
        content: nil,
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "Your complete guide to the best street food spots in Bangkok, from Chinatown to Chatuchak.",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "xiaohongshu",
        qualityScore: 4.8,
        viewsCount: 25_600,
        likesCount: 8_900,
        savesCount: 5_200,
        createdAt: "2024-12-10T14:00:00Z",
        destinations: ["Bangkok"],
        aiSummary: "Definitive Bangkok street food guide with must-try dishes, best stalls, and food market recommendations.",
        aiTips: ["Yaowarat Road (Chinatown) is best after 6pm", "Always check that food is cooked fresh", "Bring cash - most stalls don't accept cards"],
        aiBestTime: "November-February (cool season)",
        aiDuration: "3-5 days",
        aiBudget: "฿3,000-5,000",
        aiDays: nil,
        aiProcessedAt: nil
      ),
      BlogPost(
        id: "mock-4",
        title: "Kyoto Temple Trail: Culture & History",
        authorName: "Heritage Seeker",
        content: nil,
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "Walk through Kyoto's most beautiful temples and shrines with this curated 4-day itinerary.",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "mafengwo",
        qualityScore: 4.6,
        viewsCount: 15_200,
        likesCount: 4_800,
        savesCount: 3_100,
        createdAt: "2024-11-28T09:00:00Z",
        destinations: ["Kyoto"],
        aiSummary: "Curated Kyoto temple trail covering Kinkaku-ji, Fushimi Inari, Arashiyama bamboo grove, and hidden zen gardens.",
        aiTips: ["Start at Fushimi Inari at sunrise to avoid crowds", "Get a bus day pass (¥700)", "Wear comfortable shoes for temple stairs"],
        aiBestTime: "March-May or October-November",
        aiDuration: "4 days",
        aiBudget: "¥60,000-100,000",
        aiDays: nil,
        aiProcessedAt: nil
      ),
      BlogPost(
        id: "mock-5",
        title: "Singapore on a Weekend",
        authorName: "City Hopper",
        content: nil,
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "Make the most of a short Singapore trip with this efficient 2-day itinerary.",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "xiaohongshu",
        qualityScore: 4.0,
        viewsCount: 6_800,
        likesCount: 1_900,
        savesCount: 980,
        createdAt: "2024-12-05T12:00:00Z",
        destinations: ["Singapore"],
        aiSummary: "Efficient 2-day Singapore guide covering Marina Bay, hawker centres, Gardens by the Bay, and Sentosa.",
        aiTips: ["Use EZ-Link card for public transport", "Hawker centres are the best value for food", "Gardens by the Bay light show is free"],
        aiBestTime: "Year-round (indoor attractions for rainy days)",
        aiDuration: "2 days",
        aiBudget: "SGD 300-500",
        aiDays: nil,
        aiProcessedAt: nil
      ),
    ]

    static let mockDestinations: [PopularDestination] = [
      PopularDestination(name: "Tokyo", count: 156),
      PopularDestination(name: "Bangkok", count: 132),
      PopularDestination(name: "Bali", count: 98),
      PopularDestination(name: "Kyoto", count: 87),
      PopularDestination(name: "Singapore", count: 76),
      PopularDestination(name: "Seoul", count: 65),
      PopularDestination(name: "Chiang Mai", count: 54),
      PopularDestination(name: "Osaka", count: 48),
    ]
  #endif
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
