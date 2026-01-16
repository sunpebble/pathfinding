import Foundation

// MARK: - User Profile for Follow System

/// Represents a user in the follow system
struct FollowUser: Codable, Identifiable, Hashable {
  let id: String
  let displayName: String?
  let avatarUrl: String?
  let bio: String?
  let followersCount: Int
  let followingCount: Int
  let followedAt: Int?
  let isFollowedByCurrentUser: Bool?
  let isMutual: Bool?

  enum CodingKeys: String, CodingKey {
    case id
    case displayName = "display_name"
    case avatarUrl = "avatar_url"
    case bio
    case followersCount = "followers_count"
    case followingCount = "following_count"
    case followedAt = "followed_at"
    case isFollowedByCurrentUser = "is_followed_by_current_user"
    case isMutual = "is_mutual"
  }

  // Computed property for display
  var displayNameOrDefault: String {
    displayName ?? "Unknown User"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FollowUser, rhs: FollowUser) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Follow Recommendation

/// Represents a recommended user to follow
struct FollowRecommendation: Codable, Identifiable, Hashable {
  let id: String
  let displayName: String?
  let avatarUrl: String?
  let bio: String?
  let followersCount: Int
  let followingCount: Int
  let score: Double
  let reasons: [String]
  let followsYou: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case displayName = "display_name"
    case avatarUrl = "avatar_url"
    case bio
    case followersCount = "followers_count"
    case followingCount = "following_count"
    case score
    case reasons
    case followsYou = "follows_you"
  }

  var displayNameOrDefault: String {
    displayName ?? "Unknown User"
  }

  var reasonsText: String {
    reasons.joined(separator: " | ")
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FollowRecommendation, rhs: FollowRecommendation) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Follow Status

/// Represents the follow relationship status between two users
struct FollowStatus: Codable {
  let isFollowing: Bool
  let isFollowedBy: Bool
  let isMutual: Bool

  enum CodingKeys: String, CodingKey {
    case isFollowing = "is_following"
    case isFollowedBy = "is_followed_by"
    case isMutual = "is_mutual"
  }
}

// MARK: - Follow Statistics

/// Follow statistics for a user
struct FollowStats: Codable {
  let followersCount: Int
  let followingCount: Int

  enum CodingKeys: String, CodingKey {
    case followersCount = "followers_count"
    case followingCount = "following_count"
  }
}

// MARK: - API Response Types

struct FollowListResponse: Codable {
  let success: Bool
  let data: [FollowUser]
  let meta: FollowPaginationMeta?
}

struct FollowRecommendationsResponse: Codable {
  let success: Bool
  let data: [FollowRecommendation]
}

struct FollowStatusResponse: Codable {
  let success: Bool
  let data: FollowStatus
}

struct FollowStatsResponse: Codable {
  let success: Bool
  let data: FollowStats
}

struct FollowActionResponse: Codable {
  let success: Bool
  let message: String?
  let data: FollowActionData?
}

struct FollowActionData: Codable {
  let followId: String?
  let alreadyFollowing: Bool?
  let wasFollowing: Bool?

  enum CodingKeys: String, CodingKey {
    case followId = "follow_id"
    case alreadyFollowing = "already_following"
    case wasFollowing = "was_following"
  }
}

struct BatchFollowStatusResponse: Codable {
  let success: Bool
  let data: [String: FollowStatus]
}

struct FollowPaginationMeta: Codable {
  let total: Int
  let page: Int
  let pageSize: Int
  let totalPages: Int

  enum CodingKeys: String, CodingKey {
    case total
    case page
    case pageSize = "page_size"
    case totalPages = "total_pages"
  }
}

// MARK: - Mutual Follow Status

struct MutualFollowStatus: Codable {
  let aFollowsB: Bool
  let bFollowsA: Bool
  let isMutual: Bool

  enum CodingKeys: String, CodingKey {
    case aFollowsB = "a_follows_b"
    case bFollowsA = "b_follows_a"
    case isMutual = "is_mutual"
  }
}

struct MutualFollowStatusResponse: Codable {
  let success: Bool
  let data: MutualFollowStatus
}
