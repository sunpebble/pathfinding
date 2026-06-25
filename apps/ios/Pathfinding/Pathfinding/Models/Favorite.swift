import Foundation

// MARK: - Like Models

/// Represents a like on an itinerary
struct ItineraryLike: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let itineraryId: String
  let createdAt: Double

  // Enriched itinerary data (for listByUser)
  let itinerary: LikedItinerary?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case itineraryId = "itinerary_id"
    case createdAt = "created_at"
    case itinerary
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var timeAgo: String {
    createdDate.relativeFormatted(localeIdentifier: nil)
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ItineraryLike, rhs: ItineraryLike) -> Bool {
    lhs.id == rhs.id
  }
}

/// Simplified itinerary data for liked items list
struct LikedItinerary: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let destination: String?
  let coverImageUrl: String?
  let likesCount: Int
  let favoritesCount: Int
  let authorName: String?
  let authorAvatar: String?

  enum CodingKeys: String, CodingKey {
    case id
    case title
    case destination
    case coverImageUrl = "cover_image_url"
    case likesCount = "likes_count"
    case favoritesCount = "favorites_count"
    case authorName = "author_name"
    case authorAvatar = "author_avatar"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: LikedItinerary, rhs: LikedItinerary) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Favorite Models

/// Represents a favorited itinerary
struct ItineraryFavorite: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let itineraryId: String
  let collectionId: String?
  let notes: String?
  let createdAt: Double
  let updatedAt: Double?

  // Enriched data
  let itinerary: LikedItinerary?
  let collection: FavoriteCollectionSummary?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case itineraryId = "itinerary_id"
    case collectionId = "collection_id"
    case notes
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case itinerary
    case collection
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
    createdDate.relativeFormatted(localeIdentifier: nil)
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ItineraryFavorite, rhs: ItineraryFavorite) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Collection Models

/// Favorite collection for organizing saved itineraries
struct FavoriteCollection: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let name: String
  let description: String?
  let coverImageUrl: String?
  let isDefault: Bool
  let itemCount: Int
  let sortOrder: Int
  let createdAt: Double
  let updatedAt: Double?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case name
    case description
    case coverImageUrl = "cover_image_url"
    case isDefault = "is_default"
    case itemCount = "item_count"
    case sortOrder = "sort_order"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var icon: String {
    isDefault ? "heart.fill" : "folder.fill"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FavoriteCollection, rhs: FavoriteCollection) -> Bool {
    lhs.id == rhs.id
  }
}

/// Summary of a collection (for embedding in other models)
struct FavoriteCollectionSummary: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let isDefault: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case isDefault = "is_default"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FavoriteCollectionSummary, rhs: FavoriteCollectionSummary) -> Bool {
    lhs.id == rhs.id
  }
}

/// Collection with its items for detail view
struct FavoriteCollectionWithItems: Codable, Identifiable {
  let id: String
  let userId: String
  let name: String
  let description: String?
  let coverImageUrl: String?
  let isDefault: Bool
  let itemCount: Int
  let sortOrder: Int
  let createdAt: Double
  let updatedAt: Double?
  let items: [ItineraryFavorite]

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case name
    case description
    case coverImageUrl = "cover_image_url"
    case isDefault = "is_default"
    case itemCount = "item_count"
    case sortOrder = "sort_order"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case items
  }
}

// MARK: - Pagination

/// Pagination metadata for favorite/like list responses
struct FavoritePaginationMeta: Codable {
  let total: Int
  let page: Int
  let limit: Int
  let hasMore: Bool

  enum CodingKeys: String, CodingKey {
    case total
    case page
    case limit
    case hasMore = "has_more"
  }
}

// MARK: - API Response Types

/// Like toggle response
struct ItineraryLikeToggleResponse: Codable {
  let success: Bool
  let data: LikeToggleResult

  struct LikeToggleResult: Codable {
    let liked: Bool
    let likesCount: Int

    enum CodingKeys: String, CodingKey {
      case liked
      case likesCount = "likes_count"
    }
  }
}

/// Like check response
struct ItineraryLikeCheckResponse: Codable {
  let success: Bool
  let data: LikeCheckResult

  struct LikeCheckResult: Codable {
    let liked: Bool
  }
}

/// Like count response
struct ItineraryLikeCountResponse: Codable {
  let success: Bool
  let data: LikeCountResult

  struct LikeCountResult: Codable {
    let count: Int
  }
}

/// Likes list response
struct ItineraryLikesListResponse: Codable {
  let success: Bool
  let data: [ItineraryLike]
  let meta: FavoritePaginationMeta?
}

/// Batch check likes response
struct BatchLikesCheckResponse: Codable {
  let success: Bool
  let data: [String: Bool]
}

/// Favorite add response
struct FavoriteAddResponse: Codable {
  let success: Bool
  let data: FavoriteAddResult

  struct FavoriteAddResult: Codable {
    let favoriteId: String

    enum CodingKeys: String, CodingKey {
      case favoriteId = "favorite_id"
    }
  }
}

/// Favorite toggle response
struct FavoriteToggleResponse: Codable {
  let success: Bool
  let data: FavoriteToggleResult

  struct FavoriteToggleResult: Codable {
    let favorited: Bool
    let favoritesCount: Int

    enum CodingKeys: String, CodingKey {
      case favorited
      case favoritesCount = "favorites_count"
    }
  }
}

/// Favorite check response
struct FavoriteCheckResponse: Codable {
  let success: Bool
  let data: FavoriteCheckResult

  struct FavoriteCheckResult: Codable {
    let favorited: Bool
    let collectionId: String?

    enum CodingKeys: String, CodingKey {
      case favorited
      case collectionId = "collection_id"
    }
  }
}

/// Favorite count response
struct FavoriteCountResponse: Codable {
  let success: Bool
  let data: FavoriteCountResult

  struct FavoriteCountResult: Codable {
    let count: Int
  }
}

/// Favorites list response
struct FavoritesListResponse: Codable {
  let success: Bool
  let data: [ItineraryFavorite]
  let meta: FavoritePaginationMeta?
}

/// Batch check favorites response
struct BatchFavoritesCheckResponse: Codable {
  let success: Bool
  let data: [String: Bool]
}

/// Collections list response
struct CollectionsListResponse: Codable {
  let success: Bool
  let data: [FavoriteCollection]
}

/// Single collection response
struct CollectionResponse: Codable {
  let success: Bool
  let data: FavoriteCollectionWithItems
}

/// Collection create response
struct CollectionCreateResponse: Codable {
  let success: Bool
  let data: CollectionIdResult

  struct CollectionIdResult: Codable {
    let collectionId: String

    enum CodingKeys: String, CodingKey {
      case collectionId = "collection_id"
    }
  }
}

/// Generic success response
struct GenericSuccessResponse: Codable {
  let success: Bool
  let message: String?
}

// MARK: - Request Models

/// Request to add favorite
struct AddFavoriteRequest: Encodable {
  let collectionId: String?
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case collectionId = "collection_id"
    case notes
  }
}

/// Request to move favorite to another collection
struct MoveFavoriteRequest: Encodable {
  let collectionId: String

  enum CodingKeys: String, CodingKey {
    case collectionId = "collection_id"
  }
}

/// Request to update favorite notes
struct UpdateFavoriteNotesRequest: Encodable {
  let notes: String?
}

/// Request to create collection
struct CreateCollectionRequest: Encodable {
  let name: String
  let description: String?
  let coverImageUrl: String?

  enum CodingKeys: String, CodingKey {
    case name
    case description
    case coverImageUrl = "cover_image_url"
  }
}

/// Request to update collection
struct UpdateCollectionRequest: Encodable {
  let name: String?
  let description: String?
  let coverImageUrl: String?

  enum CodingKeys: String, CodingKey {
    case name
    case description
    case coverImageUrl = "cover_image_url"
  }
}

/// Request to reorder collections
struct ReorderCollectionsRequest: Encodable {
  let orderedIds: [String]

  enum CodingKeys: String, CodingKey {
    case orderedIds = "ordered_ids"
  }
}

/// Request for batch checking likes/favorites
struct BatchCheckRequest: Encodable {
  let itineraryIds: [String]

  enum CodingKeys: String, CodingKey {
    case itineraryIds = "itinerary_ids"
  }
}
