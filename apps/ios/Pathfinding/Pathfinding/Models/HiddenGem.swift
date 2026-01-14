import Foundation

// MARK: - Hidden Gem POI

/// A hidden gem point of interest - off-the-beaten-path location
struct HiddenGemPoi: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let nameEn: String?
  let category: PoiCategory
  let cityId: String
  let address: String?
  let latitude: Double
  let longitude: Double
  let rating: Double?
  let ratingCount: Int?
  let priceLevel: Int?
  let imageUrls: [String]?
  let source: String

  // Hidden gem specific fields
  let isHiddenGem: Bool
  let hiddenGemScore: Double?
  let hiddenGemRating: Double?
  let hiddenGemRatingCount: Int?
  let localRecommendation: LocalRecommendation?
  let popularityLevel: PopularityLevel?

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case nameEn = "name_en"
    case category
    case cityId = "city_id"
    case address
    case latitude
    case longitude
    case rating
    case ratingCount = "rating_count"
    case priceLevel = "price_level"
    case imageUrls = "image_urls"
    case source
    case isHiddenGem = "is_hidden_gem"
    case hiddenGemScore = "hidden_gem_score"
    case hiddenGemRating = "hidden_gem_rating"
    case hiddenGemRatingCount = "hidden_gem_rating_count"
    case localRecommendation = "local_recommendation"
    case popularityLevel = "popularity_level"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: HiddenGemPoi, rhs: HiddenGemPoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - POI Category

enum PoiCategory: String, Codable, CaseIterable {
  case attraction
  case restaurant
  case hotel
  case shopping
  case other

  var displayName: String {
    switch self {
    case .attraction: return "景点"
    case .restaurant: return "餐厅"
    case .hotel: return "酒店"
    case .shopping: return "购物"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .attraction: return "star.fill"
    case .restaurant: return "fork.knife"
    case .hotel: return "bed.double.fill"
    case .shopping: return "bag.fill"
    case .other: return "mappin.circle.fill"
    }
  }

  var color: String {
    switch self {
    case .attraction: return "orange"
    case .restaurant: return "red"
    case .hotel: return "blue"
    case .shopping: return "purple"
    case .other: return "gray"
    }
  }
}

// MARK: - Popularity Level

enum PopularityLevel: String, Codable, CaseIterable {
  case hidden
  case emerging
  case moderate
  case popular
  case crowded

  var displayName: String {
    switch self {
    case .hidden: return "小众秘境"
    case .emerging: return "崭露头角"
    case .moderate: return "知名度适中"
    case .popular: return "热门景点"
    case .crowded: return "人满为患"
    }
  }

  var icon: String {
    switch self {
    case .hidden: return "eye.slash.fill"
    case .emerging: return "sunrise.fill"
    case .moderate: return "person.2.fill"
    case .popular: return "star.fill"
    case .crowded: return "person.3.fill"
    }
  }

  var color: String {
    switch self {
    case .hidden: return "green"
    case .emerging: return "teal"
    case .moderate: return "blue"
    case .popular: return "orange"
    case .crowded: return "red"
    }
  }
}

// MARK: - Local Recommendation

struct LocalRecommendation: Codable, Hashable {
  let isLocalRecommended: Bool
  let localTips: String?
  let bestTimeToVisit: String?
  let localSecrets: [String]?
  let recommendedBy: String?

  enum CodingKeys: String, CodingKey {
    case isLocalRecommended = "is_local_recommended"
    case localTips = "local_tips"
    case bestTimeToVisit = "best_time_to_visit"
    case localSecrets = "local_secrets"
    case recommendedBy = "recommended_by"
  }
}

// MARK: - User Submitted POI

struct UserSubmittedPoi: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let name: String
  let nameEn: String?
  let category: PoiCategory
  let cityId: String
  let address: String?
  let latitude: Double
  let longitude: Double
  let description: String
  let localTips: String?
  let bestTimeToVisit: String?
  let priceRange: String?
  let imageUrls: [String]?
  let howDiscovered: String?
  let localSecrets: [String]?
  let avoidTimes: String?
  let status: SubmissionStatus
  let moderatorNotes: String?
  let reviewedBy: String?
  let reviewedAt: Double?
  let mergedPoiId: String?
  let upvotes: Int
  let downvotes: Int
  let viewCount: Int
  let createdAt: Double
  let updatedAt: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case name
    case nameEn = "name_en"
    case category
    case cityId = "city_id"
    case address
    case latitude
    case longitude
    case description
    case localTips = "local_tips"
    case bestTimeToVisit = "best_time_to_visit"
    case priceRange = "price_range"
    case imageUrls = "image_urls"
    case howDiscovered = "how_discovered"
    case localSecrets = "local_secrets"
    case avoidTimes = "avoid_times"
    case status
    case moderatorNotes = "moderator_notes"
    case reviewedBy = "reviewed_by"
    case reviewedAt = "reviewed_at"
    case mergedPoiId = "merged_poi_id"
    case upvotes
    case downvotes
    case viewCount = "view_count"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  /// Net votes (upvotes - downvotes)
  var netVotes: Int { upvotes - downvotes }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: UserSubmittedPoi, rhs: UserSubmittedPoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Submission Status

enum SubmissionStatus: String, Codable {
  case pending
  case approved
  case rejected
  case merged

  var displayName: String {
    switch self {
    case .pending: return "待审核"
    case .approved: return "已通过"
    case .rejected: return "已拒绝"
    case .merged: return "已合并"
    }
  }

  var icon: String {
    switch self {
    case .pending: return "clock.fill"
    case .approved: return "checkmark.circle.fill"
    case .rejected: return "xmark.circle.fill"
    case .merged: return "arrow.triangle.merge"
    }
  }

  var color: String {
    switch self {
    case .pending: return "orange"
    case .approved: return "green"
    case .rejected: return "red"
    case .merged: return "blue"
    }
  }
}

// MARK: - Hidden Gem Rating

struct HiddenGemRating: Codable, Identifiable, Hashable {
  let id: String
  let poiId: String
  let userId: String
  let rating: Int
  let review: String?
  let visitDate: String?
  let wouldRecommend: Bool
  let createdAt: Double
  let updatedAt: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case poiId = "poi_id"
    case userId = "user_id"
    case rating
    case review
    case visitDate = "visit_date"
    case wouldRecommend = "would_recommend"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: HiddenGemRating, rhs: HiddenGemRating) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - API Response Types

struct HiddenGemsListResponse: Codable {
  let data: [HiddenGemPoi]
}

struct UserSubmittedPoisListResponse: Codable {
  let data: [UserSubmittedPoi]
}

struct HiddenGemRatingsResponse: Codable {
  let data: [HiddenGemRating]
}

struct SubmitHiddenGemResponse: Codable {
  let data: SubmitResult

  struct SubmitResult: Codable {
    let id: String
  }
}

struct HiddenGemVoteResponse: Codable {
  let data: VoteResult

  struct VoteResult: Codable {
    let action: String
    let voteType: String

    enum CodingKeys: String, CodingKey {
      case action
      case voteType = "vote_type"
    }
  }
}

// MARK: - Request Types

struct SubmitHiddenGemRequest: Codable {
  let name: String
  let nameEn: String?
  let category: PoiCategory
  let cityId: String
  let address: String?
  let latitude: Double
  let longitude: Double
  let description: String
  let localTips: String?
  let bestTimeToVisit: String?
  let priceRange: String?
  let imageUrls: [String]?
  let howDiscovered: String?
  let localSecrets: [String]?
  let avoidTimes: String?

  enum CodingKeys: String, CodingKey {
    case name
    case nameEn = "name_en"
    case category
    case cityId = "city_id"
    case address
    case latitude
    case longitude
    case description
    case localTips = "local_tips"
    case bestTimeToVisit = "best_time_to_visit"
    case priceRange = "price_range"
    case imageUrls = "image_urls"
    case howDiscovered = "how_discovered"
    case localSecrets = "local_secrets"
    case avoidTimes = "avoid_times"
  }
}

struct RateHiddenGemRequest: Codable {
  let rating: Int
  let review: String?
  let visitDate: String?
  let wouldRecommend: Bool

  enum CodingKeys: String, CodingKey {
    case rating
    case review
    case visitDate = "visit_date"
    case wouldRecommend = "would_recommend"
  }
}

struct VoteRequest: Codable {
  let voteType: String

  enum CodingKeys: String, CodingKey {
    case voteType = "vote_type"
  }
}
