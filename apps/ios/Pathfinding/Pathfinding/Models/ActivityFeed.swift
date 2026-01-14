import Foundation

// MARK: - Activity Types

/// Activity type enum matching backend types
enum ActivityType: String, Codable, CaseIterable {
  case newItinerary = "new_itinerary"
  case updateItinerary = "update_itinerary"
  case likeItinerary = "like_itinerary"
  case commentItinerary = "comment_itinerary"
  case copyItinerary = "copy_itinerary"
  case followUser = "follow_user"

  var displayName: String {
    switch self {
    case .newItinerary:
      return "发布了行程"
    case .updateItinerary:
      return "更新了行程"
    case .likeItinerary:
      return "点赞了行程"
    case .commentItinerary:
      return "评论了行程"
    case .copyItinerary:
      return "收藏了行程"
    case .followUser:
      return "关注了用户"
    }
  }

  var icon: String {
    switch self {
    case .newItinerary:
      return "plus.circle.fill"
    case .updateItinerary:
      return "pencil.circle.fill"
    case .likeItinerary:
      return "heart.fill"
    case .commentItinerary:
      return "bubble.left.fill"
    case .copyItinerary:
      return "doc.on.doc.fill"
    case .followUser:
      return "person.badge.plus.fill"
    }
  }

  var iconColor: String {
    switch self {
    case .newItinerary:
      return "green"
    case .updateItinerary:
      return "blue"
    case .likeItinerary:
      return "red"
    case .commentItinerary:
      return "orange"
    case .copyItinerary:
      return "purple"
    case .followUser:
      return "indigo"
    }
  }
}

/// Target type for activity
enum ActivityTargetType: String, Codable {
  case itinerary
  case user
}

/// Visibility level for activities
enum ActivityVisibility: String, Codable {
  case `public`
  case followers
}

// MARK: - Activity Model

/// Activity item in the feed
struct Activity: Identifiable, Codable, Hashable {
  let id: String
  let actorId: String
  let actorName: String?
  let actorAvatarUrl: String?
  let activityType: ActivityType
  let targetType: ActivityTargetType
  let targetId: String
  let targetTitle: String?
  let targetCoverUrl: String?
  let targetDestination: String?
  let visibility: ActivityVisibility
  let likesCount: Int
  let commentsCount: Int
  let createdAt: Double
  let updatedAt: Double?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case actorId = "actor_id"
    case actorName = "actor_name"
    case actorAvatarUrl = "actor_avatar_url"
    case activityType = "activity_type"
    case targetType = "target_type"
    case targetId = "target_id"
    case targetTitle = "target_title"
    case targetCoverUrl = "target_cover_url"
    case targetDestination = "target_destination"
    case visibility
    case likesCount = "likes_count"
    case commentsCount = "comments_count"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  var formattedDate: String {
    let date = Date(timeIntervalSince1970: createdAt / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.localizedString(for: date, relativeTo: Date())
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: Activity, rhs: Activity) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - User Follow Models

/// User profile for followers/following lists
struct UserProfile: Identifiable, Codable, Hashable {
  let id: String
  let userId: String
  let displayName: String?
  let avatarUrl: String?
  let bio: String?
  let followersCount: Int?
  let followingCount: Int?
  let itinerariesCount: Int?
  let createdAt: Double?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case displayName = "display_name"
    case avatarUrl = "avatar_url"
    case bio
    case followersCount = "followers_count"
    case followingCount = "following_count"
    case itinerariesCount = "itineraries_count"
    case createdAt = "created_at"
  }

  var displayNameOrDefault: String {
    displayName ?? "用户"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: UserProfile, rhs: UserProfile) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - API Response Models

/// Response wrapper for activity feed
struct ActivityFeedResponse: Codable {
  let success: Bool
  let data: [Activity]
  let meta: ActivityFeedMeta?
}

/// Metadata for paginated feed
struct ActivityFeedMeta: Codable {
  let hasMore: Bool
  let nextCursor: Double?

  enum CodingKeys: String, CodingKey {
    case hasMore = "has_more"
    case nextCursor = "next_cursor"
  }
}

/// Response for trending feed (no pagination)
struct TrendingFeedResponse: Codable {
  let success: Bool
  let data: [Activity]
}

/// Response for followers/following lists
struct UserListResponse: Codable {
  let success: Bool
  let data: [UserProfile]
  let meta: UserListMeta?
}

/// Metadata for user lists
struct UserListMeta: Codable {
  let hasMore: Bool
  let nextCursor: Double?

  enum CodingKeys: String, CodingKey {
    case hasMore = "has_more"
    case nextCursor = "next_cursor"
  }
}

/// Response for follow action
struct FollowResponse: Codable {
  let success: Bool
  let data: FollowData
  let message: String?
}

struct FollowData: Codable {
  let followId: String?
  let alreadyFollowing: Bool?
  let wasFollowing: Bool?

  enum CodingKeys: String, CodingKey {
    case followId = "follow_id"
    case alreadyFollowing = "already_following"
    case wasFollowing = "was_following"
  }
}

/// Response for isFollowing check
struct IsFollowingResponse: Codable {
  let success: Bool
  let data: IsFollowingData
}

struct IsFollowingData: Codable {
  let isFollowing: Bool

  enum CodingKeys: String, CodingKey {
    case isFollowing = "is_following"
  }
}
