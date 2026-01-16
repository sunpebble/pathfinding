import Foundation

// MARK: - API Itinerary Model

/// Itinerary model from API (Convex)
struct APIItinerary: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let title: String
  let cityId: String
  let startDate: String
  let endDate: String
  let visibility: String
  let coverImageUrl: String?
  let copiedFromId: String?

  // Enriched data
  let cityName: String?
  let daysCount: Int?
  let days: [APIItineraryDay]?
  let collaborators: [APICollaborator]?

  // Original author info (for copied itineraries)
  let originalAuthor: OriginalAuthorInfo?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case title
    case cityId = "city_id"
    case startDate = "start_date"
    case endDate = "end_date"
    case visibility
    case coverImageUrl = "cover_image_url"
    case copiedFromId = "copied_from_id"
    case cityName = "city_name"
    case daysCount = "days_count"
    case days
    case collaborators
    case originalAuthor = "original_author"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: APIItinerary, rhs: APIItinerary) -> Bool {
    lhs.id == rhs.id
  }
}

/// Original author info for copied itineraries
struct OriginalAuthorInfo: Codable, Hashable {
  let userId: String?
  let displayName: String?
  let avatarUrl: String?

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case displayName = "display_name"
    case avatarUrl = "avatar_url"
  }
}

/// Itinerary day from API
struct APIItineraryDay: Codable, Identifiable, Hashable {
  let id: String
  let itineraryId: String
  let dayNumber: Int
  let date: String
  let items: [APIItineraryItem]?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case itineraryId = "itinerary_id"
    case dayNumber = "day_number"
    case date
    case items
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: APIItineraryDay, rhs: APIItineraryDay) -> Bool {
    lhs.id == rhs.id
  }
}

/// Itinerary item from API
struct APIItineraryItem: Codable, Identifiable, Hashable {
  let id: String
  let dayId: String
  let poiId: String
  let orderIndex: Int
  let startTime: String?
  let endTime: String?
  let transportMode: String?
  let notes: String?
  let poi: APIPoi?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case dayId = "day_id"
    case poiId = "poi_id"
    case orderIndex = "order_index"
    case startTime = "start_time"
    case endTime = "end_time"
    case transportMode = "transport_mode"
    case notes
    case poi
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: APIItineraryItem, rhs: APIItineraryItem) -> Bool {
    lhs.id == rhs.id
  }
}

/// POI from API (minimal version)
struct APIPoi: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let category: String?
  let address: String?
  let latitude: Double?
  let longitude: Double?
  let rating: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case category
    case address
    case latitude
    case longitude
    case rating
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: APIPoi, rhs: APIPoi) -> Bool {
    lhs.id == rhs.id
  }
}

/// Collaborator from API
struct APICollaborator: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let itineraryId: String
  let role: String

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case itineraryId = "itinerary_id"
    case role
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: APICollaborator, rhs: APICollaborator) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Copy History

/// Copy history record from API
struct CopyHistoryRecord: Codable, Identifiable, Hashable {
  let id: String
  let originalItineraryId: String
  let copiedItineraryId: String
  let userId: String
  let copyType: String // "full" or "partial"
  let selectedDays: [Int]?
  let originalStartDate: String
  let newStartDate: String
  let dateOffset: Int
  let createdAt: Int // Unix timestamp

  // Enriched data
  let originalItinerary: CopyHistoryItineraryInfo?
  let copiedItinerary: CopyHistoryItineraryInfo?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case originalItineraryId = "original_itinerary_id"
    case copiedItineraryId = "copied_itinerary_id"
    case userId = "user_id"
    case copyType = "copy_type"
    case selectedDays = "selected_days"
    case originalStartDate = "original_start_date"
    case newStartDate = "new_start_date"
    case dateOffset = "date_offset"
    case createdAt = "created_at"
    case originalItinerary = "original_itinerary"
    case copiedItinerary = "copied_itinerary"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: CopyHistoryRecord, rhs: CopyHistoryRecord) -> Bool {
    lhs.id == rhs.id
  }
}

/// Brief itinerary info in copy history
struct CopyHistoryItineraryInfo: Codable, Hashable {
  let id: String
  let title: String
  let startDate: String
  let endDate: String

  enum CodingKeys: String, CodingKey {
    case id
    case title
    case startDate = "start_date"
    case endDate = "end_date"
  }
}

// MARK: - Copy Stats

/// Copy statistics for an itinerary
struct ItineraryCopyStats: Codable {
  let copyCount: Int
  let recentCopies: [RecentCopy]

  enum CodingKeys: String, CodingKey {
    case copyCount = "copy_count"
    case recentCopies = "recent_copies"
  }
}

/// Recent copy info
struct RecentCopy: Codable, Hashable {
  let copiedAt: Int // Unix timestamp
  let copyType: String

  enum CodingKeys: String, CodingKey {
    case copiedAt = "copied_at"
    case copyType = "copy_type"
  }
}

// MARK: - API Request/Response Types

/// Request to copy an itinerary
struct CopyItineraryRequest: Encodable {
  let startDate: String

  enum CodingKeys: String, CodingKey {
    case startDate = "start_date"
  }
}

/// Request to copy an itinerary partially
struct CopyItineraryPartialRequest: Encodable {
  let startDate: String
  let selectedDays: [Int]
  let title: String?

  enum CodingKeys: String, CodingKey {
    case startDate = "start_date"
    case selectedDays = "selected_days"
    case title
  }
}

/// Response wrapper for copy itinerary
struct CopyItineraryResponse: Codable {
  let success: Bool
  let data: APIItinerary
}

/// Response wrapper for copy history
struct CopyHistoryResponse: Codable {
  let success: Bool
  let data: [CopyHistoryRecord]
  let meta: PaginationMeta
}

/// Response wrapper for copy stats
struct CopyStatsResponse: Codable {
  let success: Bool
  let data: ItineraryCopyStats
}

/// Response wrapper for public itineraries
struct PublicItinerariesResponse: Codable {
  let success: Bool
  let data: [APIItinerary]
  let meta: PaginationMeta
}

/// Pagination metadata
struct PaginationMeta: Codable {
  let page: Int
  let pageSize: Int
  let totalCount: Int
  let totalPages: Int

  enum CodingKeys: String, CodingKey {
    case page
    case pageSize = "page_size"
    case totalCount = "total_count"
    case totalPages = "total_pages"
  }
}

// MARK: - Result Types

/// Result for copy history query
struct CopyHistoryResult {
  let data: [CopyHistoryRecord]
  let total: Int
}

/// Result for public itineraries query
struct PublicItinerariesResult {
  let data: [APIItinerary]
  let total: Int
}
