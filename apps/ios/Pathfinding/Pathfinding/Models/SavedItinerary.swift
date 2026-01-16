import Foundation

/// 保存的行程数据模型
struct SavedItinerary: Identifiable, Codable, Hashable {
  let id: UUID
  let blogId: String
  var title: String
  let coverImage: String?
  var days: [AiDay]
  let savedAt: Date
  let authorName: String?
  let sourcePlatform: String?
  let aiSummary: String?
  let aiTips: [String]?
  let imageUrls: [String]?
  var destination: String?

  // MARK: - Copy Metadata

  /// API itinerary ID if synced with backend
  var apiItineraryId: String?

  /// Original itinerary ID this was copied from (for copied itineraries)
  var copiedFromId: String?

  /// Original author information (for copied itineraries)
  var originalAuthor: SavedItineraryOriginalAuthor?

  /// Copy type: "full" or "partial"
  var copyType: String?

  /// Selected days for partial copies
  var selectedDays: [Int]?

  // MARK: - Initializers

  init(id: UUID = UUID(), from guide: BlogPost) {
    self.id = id
    self.blogId = guide.id
    self.title = guide.title
    self.coverImage = guide.coverImage
    self.days = guide.aiDays ?? []
    self.savedAt = Date()
    self.authorName = guide.authorName
    self.sourcePlatform = guide.sourcePlatform
    self.aiSummary = guide.aiSummary
    self.aiTips = guide.aiTips
    self.imageUrls = guide.imageUrls
    self.destination = nil // Default nil for imported
    self.apiItineraryId = nil
    self.copiedFromId = nil
    self.originalAuthor = nil
    self.copyType = nil
    self.selectedDays = nil
  }

  init(id: UUID = UUID(), title: String, destination: String?, daysCount: Int) {
    self.id = id
    self.blogId = "manual-\(id.uuidString)"
    self.title = title
    self.destination = destination
    self.coverImage = nil
    self.days = (1...max(1, daysCount)).map { AiDay(dayNumber: $0, theme: nil, pois: []) }
    self.savedAt = Date()
    self.authorName = "我自己"
    self.sourcePlatform = nil
    self.aiSummary = nil
    self.aiTips = nil
    self.imageUrls = nil
    self.apiItineraryId = nil
    self.copiedFromId = nil
    self.originalAuthor = nil
    self.copyType = nil
    self.selectedDays = nil
  }

  /// Initialize from API response after copying
  init(from apiItinerary: APIItinerary) {
    self.id = UUID()
    self.blogId = apiItinerary.id
    self.title = apiItinerary.title
    self.coverImage = apiItinerary.coverImageUrl
    self.days = apiItinerary.days?.map { apiDay in
      AiDay(
        dayNumber: apiDay.dayNumber,
        theme: nil,
        pois: apiDay.items?.compactMap { item in
          guard let poi = item.poi else { return nil }
          return AiPoi(
            name: poi.name,
            type: poi.category,
            description: nil,
            latitude: poi.latitude,
            longitude: poi.longitude,
            address: poi.address
          )
        } ?? []
      )
    } ?? []
    self.savedAt = Date()
    self.authorName = apiItinerary.originalAuthor?.displayName
    self.sourcePlatform = nil
    self.aiSummary = nil
    self.aiTips = nil
    self.imageUrls = nil
    self.destination = apiItinerary.cityName
    self.apiItineraryId = apiItinerary.id
    self.copiedFromId = apiItinerary.copiedFromId
    self.originalAuthor = apiItinerary.originalAuthor.map {
      SavedItineraryOriginalAuthor(
        userId: $0.userId,
        displayName: $0.displayName,
        avatarUrl: $0.avatarUrl
      )
    }
    self.copyType = nil
    self.selectedDays = nil
  }

  // MARK: - Computed Properties

  /// Check if this itinerary was copied from another
  var isCopied: Bool {
    copiedFromId != nil
  }

  /// Check if this itinerary is synced with backend
  var isSyncedWithAPI: Bool {
    apiItineraryId != nil
  }
}

// MARK: - Original Author Info

/// Original author information for copied itineraries
struct SavedItineraryOriginalAuthor: Codable, Hashable {
  let userId: String?
  let displayName: String?
  let avatarUrl: String?
}
