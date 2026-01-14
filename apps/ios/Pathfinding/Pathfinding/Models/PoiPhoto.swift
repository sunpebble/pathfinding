import Foundation

// MARK: - Photo Status

enum PhotoStatus: String, Codable, CaseIterable {
  case pending
  case approved
  case rejected
  case hidden

  var displayName: String {
    switch self {
    case .pending: return "待审核"
    case .approved: return "已通过"
    case .rejected: return "已拒绝"
    case .hidden: return "已隐藏"
    }
  }
}

// MARK: - Photo Category

enum PhotoCategory: String, Codable, CaseIterable {
  case interior
  case exterior
  case food
  case scenery
  case activity
  case detail
  case other

  var displayName: String {
    switch self {
    case .interior: return "室内"
    case .exterior: return "室外"
    case .food: return "美食"
    case .scenery: return "风景"
    case .activity: return "活动"
    case .detail: return "细节"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .interior: return "building.2"
    case .exterior: return "sun.max"
    case .food: return "fork.knife"
    case .scenery: return "mountain.2"
    case .activity: return "figure.walk"
    case .detail: return "magnifyingglass"
    case .other: return "photo"
    }
  }
}

// MARK: - Photo Location

struct PhotoLocation: Codable, Equatable {
  let latitude: Double
  let longitude: Double
}

// MARK: - POI Photo Model

struct PoiPhoto: Identifiable, Codable, Equatable {
  let id: String
  let poiId: String
  let userId: String
  let userName: String?
  let userAvatarUrl: String?
  let imageUrl: String
  let thumbnailUrl: String?
  let caption: String?
  let category: PhotoCategory?
  let width: Int?
  let height: Int?
  let takenAt: Date?
  let location: PhotoLocation?
  let likesCount: Int
  let viewsCount: Int
  let isFeatured: Bool
  let featuredAt: Date?
  let status: PhotoStatus
  let createdAt: Date
  let updatedAt: Date?

  enum CodingKeys: String, CodingKey {
    case id
    case poiId = "poi_id"
    case userId = "user_id"
    case userName = "user_name"
    case userAvatarUrl = "user_avatar_url"
    case imageUrl = "image_url"
    case thumbnailUrl = "thumbnail_url"
    case caption
    case category
    case width
    case height
    case takenAt = "taken_at"
    case location
    case likesCount = "likes_count"
    case viewsCount = "views_count"
    case isFeatured = "is_featured"
    case featuredAt = "featured_at"
    case status
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  /// Aspect ratio for layout calculations
  var aspectRatio: CGFloat {
    guard let width = width, let height = height, height > 0 else {
      return 1.0
    }
    return CGFloat(width) / CGFloat(height)
  }

  /// Display URL (thumbnail if available, otherwise full image)
  var displayUrl: String {
    thumbnailUrl ?? imageUrl
  }

  /// Whether this photo belongs to the current user
  func isOwnedBy(userId: String) -> Bool {
    self.userId == userId
  }
}

// MARK: - Photo Stats

struct PoiPhotoStats: Codable {
  let totalPhotos: Int
  let featuredCount: Int
  let totalLikes: Int
  let totalViews: Int
  let pendingCount: Int
  let categoryBreakdown: [String: Int]

  enum CodingKeys: String, CodingKey {
    case totalPhotos = "total_photos"
    case featuredCount = "featured_count"
    case totalLikes = "total_likes"
    case totalViews = "total_views"
    case pendingCount = "pending_count"
    case categoryBreakdown = "category_breakdown"
  }
}

// MARK: - Photo Upload Request

struct PhotoUploadRequest: Encodable {
  let poiId: String
  let imageUrl: String
  let thumbnailUrl: String?
  let caption: String?
  let category: PhotoCategory?
  let width: Int?
  let height: Int?
  let takenAt: Date?
  let location: PhotoLocation?

  enum CodingKeys: String, CodingKey {
    case poiId = "poi_id"
    case imageUrl = "image_url"
    case thumbnailUrl = "thumbnail_url"
    case caption
    case category
    case width
    case height
    case takenAt = "taken_at"
    case location
  }
}

// MARK: - Photo List Response

struct PhotoListResponse: Codable {
  let data: [PoiPhoto]
  let nextCursor: String?
  let hasMore: Bool

  enum CodingKeys: String, CodingKey {
    case data
    case nextCursor = "next_cursor"
    case hasMore = "has_more"
  }
}

// MARK: - Single Photo Response

struct PhotoResponse: Codable {
  let data: PoiPhoto
}

// MARK: - Photo Stats Response

struct PhotoStatsResponse: Codable {
  let data: PoiPhotoStats
}

// MARK: - Photo Upload Response

struct PhotoUploadResponse: Codable {
  let data: PhotoUploadData

  struct PhotoUploadData: Codable {
    let id: String
  }
}

// MARK: - Like Status Response

struct LikeStatusResponse: Codable {
  let data: LikeStatusData

  struct LikeStatusData: Codable {
    let hasLiked: Bool

    enum CodingKeys: String, CodingKey {
      case hasLiked = "has_liked"
    }
  }
}

// MARK: - Best Photo Spot

struct BestPhotoSpot: Identifiable, Codable, Equatable {
  let id: String
  let poiId: String
  let name: String
  let description: String?
  let latitude: Double
  let longitude: Double
  let bestTime: String?
  let tips: [String]
  let samplePhotos: [String]
  let createdBy: String
  let createdAt: Date
  let likesCount: Int

  enum CodingKeys: String, CodingKey {
    case id
    case poiId = "poi_id"
    case name
    case description
    case latitude
    case longitude
    case bestTime = "best_time"
    case tips
    case samplePhotos = "sample_photos"
    case createdBy = "created_by"
    case createdAt = "created_at"
    case likesCount = "likes_count"
  }
}

// MARK: - Preview Helpers

extension PoiPhoto {
  static let preview = PoiPhoto(
    id: "photo-1",
    poiId: "poi-1",
    userId: "user-1",
    userName: "旅行者小明",
    userAvatarUrl: nil,
    imageUrl: "https://example.com/photo1.jpg",
    thumbnailUrl: "https://example.com/photo1_thumb.jpg",
    caption: "美丽的日落景色",
    category: .scenery,
    width: 1920,
    height: 1080,
    takenAt: Date(),
    location: PhotoLocation(latitude: 31.2304, longitude: 121.4737),
    likesCount: 42,
    viewsCount: 256,
    isFeatured: true,
    featuredAt: Date(),
    status: .approved,
    createdAt: Date(),
    updatedAt: nil
  )

  static let previewList: [PoiPhoto] = [
    preview,
    PoiPhoto(
      id: "photo-2",
      poiId: "poi-1",
      userId: "user-2",
      userName: "摄影爱好者",
      userAvatarUrl: nil,
      imageUrl: "https://example.com/photo2.jpg",
      thumbnailUrl: nil,
      caption: "特色美食",
      category: .food,
      width: 1080,
      height: 1920,
      takenAt: nil,
      location: nil,
      likesCount: 18,
      viewsCount: 89,
      isFeatured: false,
      featuredAt: nil,
      status: .approved,
      createdAt: Date().addingTimeInterval(-3600),
      updatedAt: nil
    ),
    PoiPhoto(
      id: "photo-3",
      poiId: "poi-1",
      userId: "user-3",
      userName: "探险家",
      userAvatarUrl: nil,
      imageUrl: "https://example.com/photo3.jpg",
      thumbnailUrl: nil,
      caption: nil,
      category: .activity,
      width: 1200,
      height: 1200,
      takenAt: nil,
      location: nil,
      likesCount: 5,
      viewsCount: 32,
      isFeatured: false,
      featuredAt: nil,
      status: .approved,
      createdAt: Date().addingTimeInterval(-7200),
      updatedAt: nil
    ),
  ]
}

extension BestPhotoSpot {
  static let preview = BestPhotoSpot(
    id: "spot-1",
    poiId: "poi-1",
    name: "观景台最佳位置",
    description: "这里可以拍到最美的全景照片",
    latitude: 31.2304,
    longitude: 121.4737,
    bestTime: "日落前30分钟",
    tips: ["使用广角镜头", "建议使用三脚架", "注意安全"],
    samplePhotos: ["https://example.com/sample1.jpg"],
    createdBy: "user-1",
    createdAt: Date(),
    likesCount: 15
  )
}
