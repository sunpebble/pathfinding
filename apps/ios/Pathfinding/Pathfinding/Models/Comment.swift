import Foundation

// MARK: - Comment Model

/// Itinerary comment model
struct ItineraryComment: Codable, Identifiable, Hashable {
  let id: String
  let itineraryId: String
  let userId: String
  let parentId: String?
  let content: String
  let likesCount: Int
  let repliesCount: Int
  let isEdited: Bool
  let isDeleted: Bool
  let createdAt: Double
  let updatedAt: Double?

  // Enriched fields from server
  let authorName: String?
  let authorAvatar: String?
  var isLikedByUser: Bool?

  enum CodingKeys: String, CodingKey {
    case id
    case itineraryId = "itinerary_id"
    case userId = "user_id"
    case parentId = "parent_id"
    case content
    case likesCount = "likes_count"
    case repliesCount = "replies_count"
    case isEdited = "is_edited"
    case isDeleted = "is_deleted"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case authorName = "author_name"
    case authorAvatar = "author_avatar"
    case isLikedByUser = "is_liked_by_user"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var updatedDate: Date? {
    guard let updatedAt else { return nil }
    return Date(timeIntervalSince1970: updatedAt / 1000)
  }

  var timeAgo: String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: createdDate, relativeTo: Date())
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ItineraryComment, rhs: ItineraryComment) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Notification Model

/// User notification model
struct UserNotification: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let type: NotificationType
  let referenceType: String
  let referenceId: String
  let actorId: String
  let message: String
  let isRead: Bool
  let createdAt: Double
  let readAt: Double?

  // Enriched fields
  let actorName: String?
  let actorAvatar: String?

  enum NotificationType: String, Codable {
    case comment
    case reply
    case like
    case mention
    case newFollower = "new_follower"
    case followingItinerary = "following_itinerary"
  }

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case type
    case referenceType = "reference_type"
    case referenceId = "reference_id"
    case actorId = "actor_id"
    case message
    case isRead = "is_read"
    case createdAt = "created_at"
    case readAt = "read_at"
    case actorName = "actor_name"
    case actorAvatar = "actor_avatar"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var timeAgo: String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: createdDate, relativeTo: Date())
  }

  var icon: String {
    switch type {
    case .comment:
      return "bubble.left.fill"
    case .reply:
      return "arrowshape.turn.up.left.fill"
    case .like:
      return "heart.fill"
    case .mention:
      return "at"
    case .newFollower:
      return "person.fill.badge.plus"
    case .followingItinerary:
      return "map.fill"
    }
  }

  var iconColor: String {
    switch type {
    case .comment:
      return "blue"
    case .reply:
      return "green"
    case .like:
      return "red"
    case .mention:
      return "purple"
    case .newFollower:
      return "orange"
    case .followingItinerary:
      return "indigo"
    }
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: UserNotification, rhs: UserNotification) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - API Response Types

/// Comment list response
struct CommentListResponse: Codable {
  let success: Bool
  let data: [ItineraryComment]
  let meta: CommentPaginationMeta?
}

/// Single comment response
struct CommentResponse: Codable {
  let success: Bool
  let data: ItineraryComment?
}

/// Like toggle response
struct CommentLikeToggleResponse: Codable {
  let success: Bool
  let data: LikeResult

  struct LikeResult: Codable {
    let liked: Bool
    let likesCount: Int

    enum CodingKeys: String, CodingKey {
      case liked
      case likesCount = "likes_count"
    }
  }
}

/// Notification list response
struct NotificationListResponse: Codable {
  let success: Bool
  let data: [UserNotification]
  let meta: CommentPaginationMeta?
}

/// Unread count response
struct UnreadCountResponse: Codable {
  let success: Bool
  let data: UnreadCount

  struct UnreadCount: Codable {
    let count: Int
  }
}

/// Pagination metadata
struct CommentPaginationMeta: Codable {
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

// MARK: - Report Reason

enum CommentReportReason: String, CaseIterable, Codable {
  case spam = "spam"
  case harassment = "harassment"
  case inappropriate = "inappropriate"
  case misinformation = "misinformation"
  case other = "other"

  var displayName: String {
    switch self {
    case .spam:
      return "Spam"
    case .harassment:
      return "Harassment"
    case .inappropriate:
      return "Inappropriate Content"
    case .misinformation:
      return "Misinformation"
    case .other:
      return "Other"
    }
  }

  var icon: String {
    switch self {
    case .spam:
      return "envelope.badge.fill"
    case .harassment:
      return "exclamationmark.shield.fill"
    case .inappropriate:
      return "eye.slash.fill"
    case .misinformation:
      return "info.circle.fill"
    case .other:
      return "ellipsis.circle.fill"
    }
  }
}
