import Foundation

/// Travel note (游记) model for user-generated travel content
struct TravelNote: Codable, Identifiable, Hashable {
  let id: String
  let authorId: String
  let title: String
  let content: String
  let visibility: NoteVisibility
  let itineraryId: String?
  let location: String?
  let travelDate: String?
  let likesCount: Int
  let commentsCount: Int
  let viewsCount: Int
  let savesCount: Int
  let isEdited: Bool
  let createdAt: Int
  let updatedAt: Int

  // Enriched fields from API
  let imageCount: Int?
  let coverImage: String?
  let tags: [String]?
  let authorName: String?
  let authorAvatar: String?

  // Detail view fields
  let images: [NoteImage]?
  let itinerary: NoteItinerary?
  let pois: [NotePoi]?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case authorId = "authorId"
    case title
    case content
    case visibility
    case itineraryId = "itineraryId"
    case location
    case travelDate = "travelDate"
    case likesCount = "likesCount"
    case commentsCount = "commentsCount"
    case viewsCount = "viewsCount"
    case savesCount = "savesCount"
    case isEdited = "isEdited"
    case createdAt = "createdAt"
    case updatedAt = "updatedAt"
    case imageCount = "imageCount"
    case coverImage = "coverImage"
    case tags
    case authorName = "authorName"
    case authorAvatar = "authorAvatar"
    case images
    case itinerary
    case pois
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: TravelNote, rhs: TravelNote) -> Bool {
    lhs.id == rhs.id
  }

  // MARK: - Convenience

  var formattedDate: String {
    Date(timeIntervalSince1970: Double(createdAt) / 1000).relativeFormatted()
  }

  var formattedTravelDate: String? {
    guard let travelDate = travelDate else { return nil }
    let inputFormatter = DateFormatter()
    inputFormatter.dateFormat = "yyyy-MM-dd"
    guard let date = inputFormatter.date(from: travelDate) else { return nil }

    let outputFormatter = DateFormatter()
    outputFormatter.locale = Locale(identifier: "zh_CN")
    outputFormatter.dateFormat = "yyyy年M月d日"
    return outputFormatter.string(from: date)
  }
}

// MARK: - Note Visibility

enum NoteVisibility: String, Codable, CaseIterable {
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

// MARK: - Note Image

struct NoteImage: Codable, Identifiable, Hashable {
  let id: String
  let url: String
  let caption: String?
  let isCover: Bool
  let orderIndex: Int

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: NoteImage, rhs: NoteImage) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Note Itinerary

struct NoteItinerary: Codable, Hashable {
  let id: String
  let title: String
}

// MARK: - Note POI

struct NotePoi: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let type: String?
  let latitude: Double?
  let longitude: Double?
  let address: String?
  let notePoiId: String?
  let mentionIndex: Int?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case type
    case latitude
    case longitude
    case address
    case notePoiId = "notePoiId"
    case mentionIndex = "mentionIndex"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: NotePoi, rhs: NotePoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Note Comment

struct NoteComment: Codable, Identifiable, Hashable {
  let id: String
  let noteId: String
  let userId: String
  let content: String
  let parentId: String?
  let likesCount: Int
  let repliesCount: Int
  let isEdited: Bool
  let isDeleted: Bool
  let createdAt: Int
  let updatedAt: Int?
  let userName: String?
  let userAvatar: String?
  let replies: [NoteComment]?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case noteId = "noteId"
    case userId = "userId"
    case content
    case parentId = "parentId"
    case likesCount = "likesCount"
    case repliesCount = "repliesCount"
    case isEdited = "isEdited"
    case isDeleted = "isDeleted"
    case createdAt = "createdAt"
    case updatedAt = "updatedAt"
    case userName = "userName"
    case userAvatar = "userAvatar"
    case replies
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: NoteComment, rhs: NoteComment) -> Bool {
    lhs.id == rhs.id
  }

  var formattedDate: String {
    Date(timeIntervalSince1970: Double(createdAt) / 1000).relativeFormatted()
  }
}

// MARK: - Popular Tag

struct PopularTag: Codable, Identifiable, Hashable {
  var id: String { tag }
  let tag: String
  let count: Int
}

// MARK: - API Responses

struct TravelNoteListResponse: Codable {
  let success: Bool
  let data: [TravelNote]
  let meta: TravelNotePaginationMeta
}

struct TravelNoteDetailResponse: Codable {
  let success: Bool
  let data: TravelNote
}

struct TravelNoteCommentListResponse: Codable {
  let success: Bool
  let data: [NoteComment]
  let meta: TravelNotePaginationMeta
}

struct PopularTagsResponse: Codable {
  let success: Bool
  let data: [PopularTag]
}

struct LikeToggleResponse: Codable {
  let success: Bool
  let data: LikeResult
}

struct LikeResult: Codable {
  let liked: Bool
}

struct LikeCheckResponse: Codable {
  let success: Bool
  let data: LikeResult
}

struct TravelNotePaginationMeta: Codable {
  let page: Int
  let pageSize: Int
  let totalCount: Int
  let totalPages: Int
}

// MARK: - Create/Update Input

struct CreateTravelNoteInput: Codable {
  let title: String
  let content: String
  let visibility: String
  let itineraryId: String?
  let location: String?
  let travelDate: String?
  let tags: [String]?
  let images: [CreateNoteImageInput]?
}

struct CreateNoteImageInput: Codable {
  let url: String
  let caption: String?
  let isCover: Bool?
  let orderIndex: Int
}

struct UpdateTravelNoteInput: Codable {
  let title: String?
  let content: String?
  let visibility: String?
  let itineraryId: String?
  let location: String?
  let travelDate: String?
  let tags: [String]?
}
