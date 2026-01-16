import Foundation

// MARK: - Share Platform

/// Supported sharing platforms
enum SharePlatform: String, Codable, CaseIterable {
  case wechat
  case weibo
  case xiaohongshu
  case qq
  case douyin
  case copyLink = "copy_link"
  case systemShare = "system_share"
  case generic

  var displayName: String {
    switch self {
    case .wechat: return "微信"
    case .weibo: return "微博"
    case .xiaohongshu: return "小红书"
    case .qq: return "QQ"
    case .douyin: return "抖音"
    case .copyLink: return "复制链接"
    case .systemShare: return "系统分享"
    case .generic: return "其他"
    }
  }

  var iconName: String {
    switch self {
    case .wechat: return "message.fill"
    case .weibo: return "text.bubble.fill"
    case .xiaohongshu: return "book.fill"
    case .qq: return "bubble.left.and.bubble.right.fill"
    case .douyin: return "music.note"
    case .copyLink: return "link"
    case .systemShare: return "square.and.arrow.up"
    case .generic: return "ellipsis.circle"
    }
  }
}

// MARK: - Share Permission

/// Permission levels for share links
enum SharePermission: String, Codable, CaseIterable {
  case `public`
  case unlisted
  case `private`
  case password

  var displayName: String {
    switch self {
    case .public: return "公开"
    case .unlisted: return "仅链接可见"
    case .private: return "私密"
    case .password: return "密码保护"
    }
  }

  var description: String {
    switch self {
    case .public: return "任何人都可以查看"
    case .unlisted: return "只有拥有链接的人可以查看"
    case .private: return "仅自己可见"
    case .password: return "需要密码才能查看"
    }
  }
}

// MARK: - Share Event Type

/// Types of share-related events
enum ShareEventType: String, Codable {
  case share
  case click
  case view
  case save
}

// MARK: - Resource Type

/// Types of resources that can be shared
enum ShareResourceType: String, Codable {
  case itinerary
  case travelGuide
  case travelNote
}

// MARK: - Share Link

/// A managed share link with permissions and tracking
struct ShareLink: Codable, Identifiable {
  let id: String
  let resourceType: ShareResourceType
  let resourceId: String
  let ownerId: String
  let shareCode: String
  let shareUrl: String
  let platform: SharePlatform
  let permission: SharePermission
  let hasPassword: Bool
  let expiresAt: TimeInterval?
  let maxViews: Int?
  let allowDownload: Bool
  let allowCopy: Bool
  let viewCount: Int
  let clickCount: Int
  let saveCount: Int
  let isActive: Bool
  let createdAt: TimeInterval
  let updatedAt: TimeInterval
  let lastAccessedAt: TimeInterval?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case ownerId = "owner_id"
    case shareCode = "share_code"
    case shareUrl = "share_url"
    case platform
    case permission
    case hasPassword = "has_password"
    case expiresAt = "expires_at"
    case maxViews = "max_views"
    case allowDownload = "allow_download"
    case allowCopy = "allow_copy"
    case viewCount = "view_count"
    case clickCount = "click_count"
    case saveCount = "save_count"
    case isActive = "is_active"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case lastAccessedAt = "last_accessed_at"
  }

  /// Check if the share link has expired
  var isExpired: Bool {
    guard let expiresAt else { return false }
    return Date(timeIntervalSince1970: expiresAt / 1000) < Date()
  }

  /// Check if the share link has reached max views
  var hasReachedMaxViews: Bool {
    guard let maxViews else { return false }
    return viewCount >= maxViews
  }

  /// Total engagement count
  var totalEngagement: Int {
    viewCount + clickCount + saveCount
  }
}

// MARK: - Share Event

/// A share event record
struct ShareEvent: Codable, Identifiable {
  let id: String
  let resourceType: ShareResourceType
  let resourceId: String
  let sharerId: String?
  let shareLinkId: String?
  let platform: SharePlatform
  let eventType: ShareEventType
  let shareUrl: String?
  let createdAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case sharerId = "sharer_id"
    case shareLinkId = "share_link_id"
    case platform
    case eventType = "event_type"
    case shareUrl = "share_url"
    case createdAt = "created_at"
  }
}

// MARK: - Share Statistics

/// Statistics for a shared resource
struct ShareStats: Codable {
  let resourceType: ShareResourceType
  let resourceId: String
  let totals: ShareTotals
  let byPlatform: [String: PlatformStats]
  let recentShares: [ShareEvent]

  enum CodingKeys: String, CodingKey {
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case totals
    case byPlatform = "by_platform"
    case recentShares = "recent_shares"
  }
}

/// Total share statistics
struct ShareTotals: Codable {
  let shares: Int
  let clicks: Int
  let views: Int
  let saves: Int
  let activeLinks: Int

  enum CodingKeys: String, CodingKey {
    case shares, clicks, views, saves
    case activeLinks = "active_links"
  }
}

/// Statistics per platform
struct PlatformStats: Codable {
  let shares: Int
  let clicks: Int
  let views: Int
  let saves: Int
  let lastShareAt: TimeInterval?

  enum CodingKeys: String, CodingKey {
    case shares, clicks, views, saves
    case lastShareAt = "last_share_at"
  }
}

// MARK: - Top Shared Resource

/// A top shared resource entry
struct TopSharedResource: Codable, Identifiable {
  var id: String { "\(resourceType)-\(resourceId)" }
  let resourceType: String
  let resourceId: String
  let shareCount: Int

  enum CodingKeys: String, CodingKey {
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case shareCount = "share_count"
  }
}

// MARK: - Share Link Access Verification

/// Result of verifying access to a share link
struct ShareAccessVerification: Codable {
  let valid: Bool
  let error: String?
  let requiresPassword: Bool?
  let resourceType: ShareResourceType?
  let resourceId: String?
  let permission: SharePermission?
  let allowDownload: Bool?
  let allowCopy: Bool?

  enum CodingKeys: String, CodingKey {
    case valid, error
    case requiresPassword = "requires_password"
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case permission
    case allowDownload = "allow_download"
    case allowCopy = "allow_copy"
  }
}

// MARK: - Create Share Link Request

/// Request to create a new share link
struct CreateShareLinkRequest: Encodable {
  let resourceType: ShareResourceType
  let resourceId: String
  let platform: SharePlatform
  let permission: SharePermission?
  let password: String?
  let expiresInDays: Int?
  let maxViews: Int?
  let allowDownload: Bool?
  let allowCopy: Bool?

  enum CodingKeys: String, CodingKey {
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case platform
    case permission
    case password
    case expiresInDays = "expires_in_days"
    case maxViews = "max_views"
    case allowDownload = "allow_download"
    case allowCopy = "allow_copy"
  }
}

// MARK: - Create Share Link Response

/// Response from creating a share link
struct CreateShareLinkResult: Codable {
  let id: String
  let shareCode: String
  let shareUrl: String

  enum CodingKeys: String, CodingKey {
    case id
    case shareCode = "share_code"
    case shareUrl = "share_url"
  }
}

// MARK: - Update Share Link Request

/// Request to update a share link
struct UpdateShareLinkRequest: Encodable {
  let permission: SharePermission?
  let password: String?
  let expiresInDays: Int?
  let maxViews: Int?
  let allowDownload: Bool?
  let allowCopy: Bool?
  let isActive: Bool?

  enum CodingKeys: String, CodingKey {
    case permission
    case password
    case expiresInDays = "expires_in_days"
    case maxViews = "max_views"
    case allowDownload = "allow_download"
    case allowCopy = "allow_copy"
    case isActive = "is_active"
  }
}

// MARK: - Share History Item

/// An item in the user's share history
struct ShareHistoryItem: Codable, Identifiable {
  let id: String
  let resourceType: ShareResourceType
  let resourceId: String
  let platform: SharePlatform
  let eventType: ShareEventType
  let createdAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case resourceType = "resource_type"
    case resourceId = "resource_id"
    case platform
    case eventType = "event_type"
    case createdAt = "created_at"
  }
}

// MARK: - API Response Wrappers

struct ShareLinkResponse: Codable {
  let success: Bool
  let data: ShareLink?
}

struct ShareLinksResponse: Codable {
  let success: Bool
  let data: [ShareLink]
}

struct CreateShareLinkResponse: Codable {
  let success: Bool
  let data: CreateShareLinkResult?
}

struct ShareStatsResponse: Codable {
  let success: Bool
  let data: ShareStats?
}

struct ShareHistoryResponse: Codable {
  let success: Bool
  let data: [ShareHistoryItem]
  let meta: ShareHistoryMeta?
}

struct ShareHistoryMeta: Codable {
  let hasMore: Bool
  let nextCursor: String?

  enum CodingKeys: String, CodingKey {
    case hasMore = "has_more"
    case nextCursor = "next_cursor"
  }
}

struct ShareAccessResponse: Codable {
  let success: Bool
  let data: ShareAccessVerification?
}

struct TopSharedResponse: Codable {
  let success: Bool
  let data: [TopSharedResource]
}

struct ShareSuccessResponse: Codable {
  let success: Bool
}
