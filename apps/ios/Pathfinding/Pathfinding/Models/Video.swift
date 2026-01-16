import Foundation
import CoreLocation

// MARK: - Video Visibility

enum VideoVisibility: String, Codable, CaseIterable {
  case `private` = "private"
  case `public` = "public"
  case followers = "followers"

  var displayName: String {
    switch self {
    case .private: return "仅自己可见"
    case .public: return "公开"
    case .followers: return "仅关注者可见"
    }
  }

  var icon: String {
    switch self {
    case .private: return "lock.fill"
    case .public: return "globe"
    case .followers: return "person.2.fill"
    }
  }
}

// MARK: - Video Category

enum VideoCategory: String, Codable, CaseIterable {
  case vlog
  case scenery
  case food
  case activity
  case transportation
  case accommodation
  case tips
  case other

  var displayName: String {
    switch self {
    case .vlog: return "旅行Vlog"
    case .scenery: return "风景"
    case .food: return "美食"
    case .activity: return "活动"
    case .transportation: return "交通"
    case .accommodation: return "住宿"
    case .tips: return "攻略"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .vlog: return "video.fill"
    case .scenery: return "mountain.2.fill"
    case .food: return "fork.knife"
    case .activity: return "figure.walk"
    case .transportation: return "car.fill"
    case .accommodation: return "bed.double.fill"
    case .tips: return "lightbulb.fill"
    case .other: return "film"
    }
  }
}

// MARK: - Video Quality

enum VideoQuality: String, Codable, CaseIterable {
  case low = "480p"
  case medium = "720p"
  case high = "1080p"
  case ultra = "4k"

  var displayName: String {
    switch self {
    case .low: return "480p (省流量)"
    case .medium: return "720p (标清)"
    case .high: return "1080p (高清)"
    case .ultra: return "4K (超清)"
    }
  }

  var maxDuration: TimeInterval {
    switch self {
    case .low: return 300 // 5 minutes
    case .medium: return 180 // 3 minutes
    case .high: return 120 // 2 minutes
    case .ultra: return 60 // 1 minute
    }
  }
}

// MARK: - Video Filter

enum VideoFilter: String, Codable, CaseIterable, Identifiable {
  case none
  case vivid
  case warm
  case cool
  case noir
  case vintage
  case chrome
  case fade
  case instant
  case process
  case transfer

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .none: return "原图"
    case .vivid: return "鲜艳"
    case .warm: return "暖色"
    case .cool: return "冷色"
    case .noir: return "黑白"
    case .vintage: return "复古"
    case .chrome: return "铬黄"
    case .fade: return "褪色"
    case .instant: return "即时"
    case .process: return "冲印"
    case .transfer: return "转印"
    }
  }

  var ciFilterName: String? {
    switch self {
    case .none: return nil
    case .vivid: return "CIPhotoEffectChrome"
    case .warm: return "CIPhotoEffectProcess"
    case .cool: return "CIPhotoEffectTransfer"
    case .noir: return "CIPhotoEffectNoir"
    case .vintage: return "CISepiaTone"
    case .chrome: return "CIPhotoEffectChrome"
    case .fade: return "CIPhotoEffectFade"
    case .instant: return "CIPhotoEffectInstant"
    case .process: return "CIPhotoEffectProcess"
    case .transfer: return "CIPhotoEffectTransfer"
    }
  }
}

// MARK: - Video Text Overlay

struct VideoTextOverlay: Identifiable, Codable, Hashable {
  let id: UUID
  var text: String
  var position: CGPoint
  var fontSize: CGFloat
  var fontName: String
  var textColor: String // Hex color
  var backgroundColor: String? // Optional background color
  var rotation: Double
  var startTime: TimeInterval
  var endTime: TimeInterval

  init(
    id: UUID = UUID(),
    text: String,
    position: CGPoint = CGPoint(x: 0.5, y: 0.5),
    fontSize: CGFloat = 24,
    fontName: String = "PingFangSC-Regular",
    textColor: String = "#FFFFFF",
    backgroundColor: String? = nil,
    rotation: Double = 0,
    startTime: TimeInterval = 0,
    endTime: TimeInterval = .infinity
  ) {
    self.id = id
    self.text = text
    self.position = position
    self.fontSize = fontSize
    self.fontName = fontName
    self.textColor = textColor
    self.backgroundColor = backgroundColor
    self.rotation = rotation
    self.startTime = startTime
    self.endTime = endTime
  }
}

// MARK: - Video Location

struct VideoLocation: Codable, Equatable {
  let latitude: Double
  let longitude: Double
  let address: String?

  var coordinate: CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
  }
}

// MARK: - Travel Video Model

struct TravelVideo: Identifiable, Codable, Hashable {
  let id: UUID
  var title: String
  let fileName: String
  let thumbnailFileName: String?
  let duration: TimeInterval
  let fileSize: Int64 // in bytes
  let width: Int
  let height: Int
  let quality: VideoQuality
  let createdAt: Date
  var updatedAt: Date?

  // Association
  var itineraryId: String?
  var poiId: String?
  var dayNumber: Int?

  // Metadata
  var category: VideoCategory
  var visibility: VideoVisibility
  var description: String?
  var tags: [String]
  var location: VideoLocation?

  // Editing
  var filter: VideoFilter
  var textOverlays: [VideoTextOverlay]
  var trimStart: TimeInterval?
  var trimEnd: TimeInterval?

  // Social
  var likesCount: Int
  var viewsCount: Int
  var commentsCount: Int

  // Sync status
  var isUploaded: Bool
  var remoteId: String?

  init(
    id: UUID = UUID(),
    title: String,
    fileName: String,
    thumbnailFileName: String? = nil,
    duration: TimeInterval,
    fileSize: Int64,
    width: Int,
    height: Int,
    quality: VideoQuality = .high,
    createdAt: Date = Date(),
    updatedAt: Date? = nil,
    itineraryId: String? = nil,
    poiId: String? = nil,
    dayNumber: Int? = nil,
    category: VideoCategory = .vlog,
    visibility: VideoVisibility = .private,
    description: String? = nil,
    tags: [String] = [],
    location: VideoLocation? = nil,
    filter: VideoFilter = .none,
    textOverlays: [VideoTextOverlay] = [],
    trimStart: TimeInterval? = nil,
    trimEnd: TimeInterval? = nil,
    likesCount: Int = 0,
    viewsCount: Int = 0,
    commentsCount: Int = 0,
    isUploaded: Bool = false,
    remoteId: String? = nil
  ) {
    self.id = id
    self.title = title
    self.fileName = fileName
    self.thumbnailFileName = thumbnailFileName
    self.duration = duration
    self.fileSize = fileSize
    self.width = width
    self.height = height
    self.quality = quality
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.itineraryId = itineraryId
    self.poiId = poiId
    self.dayNumber = dayNumber
    self.category = category
    self.visibility = visibility
    self.description = description
    self.tags = tags
    self.location = location
    self.filter = filter
    self.textOverlays = textOverlays
    self.trimStart = trimStart
    self.trimEnd = trimEnd
    self.likesCount = likesCount
    self.viewsCount = viewsCount
    self.commentsCount = commentsCount
    self.isUploaded = isUploaded
    self.remoteId = remoteId
  }

  // MARK: - Computed Properties

  var formattedDuration: String {
    let minutes = Int(duration) / 60
    let seconds = Int(duration) % 60
    return String(format: "%d:%02d", minutes, seconds)
  }

  var formattedFileSize: String {
    ByteCountFormatter.string(fromByteCount: fileSize, countStyle: .file)
  }

  var formattedDate: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: createdAt)
  }

  var shortDate: String {
    let formatter = DateFormatter()
    formatter.dateFormat = "MM/dd HH:mm"
    return formatter.string(from: createdAt)
  }

  var aspectRatio: CGFloat {
    guard height > 0 else { return 16 / 9 }
    return CGFloat(width) / CGFloat(height)
  }

  var isPortrait: Bool {
    height > width
  }

  var isAssociated: Bool {
    itineraryId != nil || poiId != nil
  }

  var effectiveDuration: TimeInterval {
    let start = trimStart ?? 0
    let end = trimEnd ?? duration
    return end - start
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: TravelVideo, rhs: TravelVideo) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Video Album

struct VideoAlbum: Identifiable, Codable, Hashable {
  let id: UUID
  var name: String
  var description: String?
  var coverVideoId: UUID?
  var videoIds: [UUID]
  let createdAt: Date
  var updatedAt: Date?

  // Association
  var itineraryId: String?

  init(
    id: UUID = UUID(),
    name: String,
    description: String? = nil,
    coverVideoId: UUID? = nil,
    videoIds: [UUID] = [],
    createdAt: Date = Date(),
    updatedAt: Date? = nil,
    itineraryId: String? = nil
  ) {
    self.id = id
    self.name = name
    self.description = description
    self.coverVideoId = coverVideoId
    self.videoIds = videoIds
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.itineraryId = itineraryId
  }

  var videoCount: Int {
    videoIds.count
  }

  var formattedDate: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: createdAt)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: VideoAlbum, rhs: VideoAlbum) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Video Export Settings

struct VideoExportSettings: Codable {
  var quality: VideoQuality
  var includeWatermark: Bool
  var watermarkText: String?
  var includeLocation: Bool
  var includeDate: Bool

  init(
    quality: VideoQuality = .high,
    includeWatermark: Bool = true,
    watermarkText: String? = "探路 Pathfinding",
    includeLocation: Bool = true,
    includeDate: Bool = true
  ) {
    self.quality = quality
    self.includeWatermark = includeWatermark
    self.watermarkText = watermarkText
    self.includeLocation = includeLocation
    self.includeDate = includeDate
  }
}

// MARK: - Preview Helpers

extension TravelVideo {
  static let preview = TravelVideo(
    id: UUID(),
    title: "上海外滩日落",
    fileName: "video_preview.mp4",
    thumbnailFileName: "video_preview_thumb.jpg",
    duration: 45.5,
    fileSize: 25_600_000,
    width: 1920,
    height: 1080,
    quality: .high,
    category: .scenery,
    visibility: .public,
    description: "美丽的外滩日落景色",
    tags: ["上海", "外滩", "日落"],
    location: VideoLocation(latitude: 31.2304, longitude: 121.4737, address: "上海市黄浦区外滩"),
    likesCount: 128,
    viewsCount: 1024,
    commentsCount: 32
  )

  static let previewList: [TravelVideo] = [
    preview,
    TravelVideo(
      id: UUID(),
      title: "西湖泛舟",
      fileName: "video_2.mp4",
      duration: 32.0,
      fileSize: 18_500_000,
      width: 1080,
      height: 1920,
      quality: .high,
      category: .activity,
      visibility: .public,
      tags: ["杭州", "西湖"],
      likesCount: 56,
      viewsCount: 512,
      commentsCount: 8
    ),
    TravelVideo(
      id: UUID(),
      title: "成都美食探店",
      fileName: "video_3.mp4",
      duration: 68.0,
      fileSize: 45_000_000,
      width: 1920,
      height: 1080,
      quality: .high,
      category: .food,
      visibility: .followers,
      tags: ["成都", "美食", "火锅"],
      likesCount: 256,
      viewsCount: 2048,
      commentsCount: 64
    ),
  ]
}

extension VideoAlbum {
  static let preview = VideoAlbum(
    id: UUID(),
    name: "上海之旅",
    description: "2024年春节上海三日游",
    videoIds: TravelVideo.previewList.map { $0.id }
  )
}
