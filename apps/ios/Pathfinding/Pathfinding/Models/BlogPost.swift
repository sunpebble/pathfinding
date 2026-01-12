import Foundation

/// Travel guide blog post model
struct BlogPost: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let authorName: String?
  let content: String?
  let summary: String?
  let coverImageUrl: String?
  let imageUrls: [String]?
  let sourcePlatform: String?
  let qualityScore: Double?
  let viewsCount: Int?
  let likesCount: Int?
  let savesCount: Int?
  let createdAt: String?

  // AI-enhanced fields
  let aiSummary: String?
  let aiTips: [String]?
  let aiBestTime: String?
  let aiDuration: String?
  let aiBudget: String?
  var aiDays: [AiDay]?
  let aiProcessedAt: String?

  // Match actual API snake_case field names
  enum CodingKeys: String, CodingKey {
    case id
    case title
    case authorName = "author_name"
    case content
    case summary
    case coverImageUrl = "cover_image_url"
    case imageUrls = "image_urls"
    case sourcePlatform = "source_platform"
    case qualityScore = "quality_score"
    case viewsCount = "views_count"
    case likesCount = "likes_count"
    case savesCount = "saves_count"
    case createdAt = "created_at"
    case aiSummary = "ai_summary"
    case aiTips = "ai_tips"
    case aiBestTime = "ai_best_time"
    case aiDuration = "ai_duration"
    case aiBudget = "ai_budget"
    case aiDays = "ai_days"
    case aiProcessedAt = "ai_processed_at"
  }

  // MARK: - Convenience Accessors

  var author: String? { authorName }
  var coverImage: String? { coverImageUrl }
  var platform: String { sourcePlatform ?? "unknown" }
  var viewCount: Int? { viewsCount }
  var likeCount: Int? { likesCount }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: BlogPost, rhs: BlogPost) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - AI Day

/// AI-extracted day structure
struct AiDay: Codable, Identifiable, Hashable {
  var id: Int { dayNumber }
  var dayNumber: Int
  var theme: String?
  var pois: [AiPoi]
  
  // Hashable conformance for var properties
  func hash(into hasher: inout Hasher) {
    hasher.combine(dayNumber)
    hasher.combine(theme)
    hasher.combine(pois)
  }
  
  static func == (lhs: AiDay, rhs: AiDay) -> Bool {
    lhs.dayNumber == rhs.dayNumber && lhs.pois == rhs.pois && lhs.theme == rhs.theme
  }
}

// MARK: - AI POI

/// AI-extracted point of interest
struct AiPoi: Codable, Identifiable, Hashable {
  var id: String = UUID().uuidString
  var name: String
  var type: String?
  var description: String?
  var latitude: Double?
  var longitude: Double?
  var address: String?
  var time: String? // User-added time
  
  enum CodingKeys: String, CodingKey {
    case name, type, description, latitude, longitude, address, time
  }
  
  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }
  
  static func == (lhs: AiPoi, rhs: AiPoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - API Response

/// API response wrapper
struct BlogListResponse: Codable {
  let data: [BlogPost]
  let pagination: Pagination?
}

struct Pagination: Codable {
  let total: Int
  let limit: Int
  let offset: Int
}
