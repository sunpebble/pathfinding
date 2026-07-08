import Foundation

/// 保存的行程数据模型
struct SavedItinerary: Identifiable, Codable, Hashable {
  let id: UUID
  let blogId: String
  var title: String
  let coverImage: String?
  var days: [AiDay]
  let savedAt: Date
  /// The planned start date of the itinerary (day 1).  Defaults to `savedAt` for
  /// older records that were persisted before this field existed.
  var startDate: Date
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

  init(id: UUID = UUID(), title: String, destination: String?, daysCount: Int, startDate: Date = Date()) {
    self.id = id
    self.blogId = "manual-\(id.uuidString)"
    self.title = title
    self.destination = destination
    self.coverImage = nil
    self.days = (1...max(1, daysCount)).map { AiDay(dayNumber: $0, theme: nil, pois: []) }
    self.savedAt = Date()
    self.startDate = startDate
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
    self.startDate = Date()
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

  // MARK: - Codable (backward-compatible decode: `startDate` defaults to `savedAt`)

  enum CodingKeys: String, CodingKey {
    case id, blogId, title, coverImage, days, savedAt, startDate
    case authorName, sourcePlatform, aiSummary, aiTips, imageUrls, destination
    case apiItineraryId, copiedFromId, originalAuthor, copyType, selectedDays
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = try c.decode(UUID.self, forKey: .id)
    blogId = try c.decode(String.self, forKey: .blogId)
    title = try c.decode(String.self, forKey: .title)
    coverImage = try c.decodeIfPresent(String.self, forKey: .coverImage)
    days = try c.decode([AiDay].self, forKey: .days)
    savedAt = try c.decode(Date.self, forKey: .savedAt)
    // Fall back to savedAt for records persisted before this field existed.
    startDate = (try? c.decodeIfPresent(Date.self, forKey: .startDate)) ?? savedAt
    authorName = try c.decodeIfPresent(String.self, forKey: .authorName)
    sourcePlatform = try c.decodeIfPresent(String.self, forKey: .sourcePlatform)
    aiSummary = try c.decodeIfPresent(String.self, forKey: .aiSummary)
    aiTips = try c.decodeIfPresent([String].self, forKey: .aiTips)
    imageUrls = try c.decodeIfPresent([String].self, forKey: .imageUrls)
    destination = try c.decodeIfPresent(String.self, forKey: .destination)
    apiItineraryId = try c.decodeIfPresent(String.self, forKey: .apiItineraryId)
    copiedFromId = try c.decodeIfPresent(String.self, forKey: .copiedFromId)
    originalAuthor = try c.decodeIfPresent(SavedItineraryOriginalAuthor.self, forKey: .originalAuthor)
    copyType = try c.decodeIfPresent(String.self, forKey: .copyType)
    selectedDays = try c.decodeIfPresent([Int].self, forKey: .selectedDays)
  }
}

// MARK: - Original Author Info

/// Original author information for copied itineraries
struct SavedItineraryOriginalAuthor: Codable, Hashable {
  let userId: String?
  let displayName: String?
  let avatarUrl: String?
}

// MARK: - Preview / Test Fixtures

#if DEBUG
extension SavedItinerary {
  /// Representative sample used in previews and unit tests (tasks 10, 15, 16).
  /// Includes an `apiItineraryId` so `.analysis` destination is available.
  static var previewSample: SavedItinerary {
    var itinerary = SavedItinerary(
      id: UUID(uuidString: "DEADBEEF-0000-0000-0000-000000000001")!,
      title: "北京三日精华游",
      destination: "北京",
      daysCount: 2,
      startDate: Calendar.current.date(
        from: DateComponents(year: 2025, month: 9, day: 1)
      )!
    )
    itinerary.apiItineraryId = "preview-api-itinerary-id"
    itinerary.days = [
      AiDay(
        dayNumber: 1,
        theme: "故宫与天安门",
        pois: [
          AiPoi(
            name: "天安门广场",
            type: "景点",
            description: "中国最大广场",
            latitude: 39.9054,
            longitude: 116.3976,
            address: "北京市东城区天安门广场"
          ),
          AiPoi(
            name: "故宫博物院",
            type: "景点",
            description: "明清两代皇宫",
            latitude: 39.9163,
            longitude: 116.3972,
            address: "北京市东城区景山前街4号"
          ),
        ]
      ),
      AiDay(
        dayNumber: 2,
        theme: "长城一日游",
        pois: [
          AiPoi(
            name: "慕田峪长城",
            type: "景点",
            description: "保存完好的长城段落",
            latitude: 40.4319,
            longitude: 116.5694,
            address: "北京市怀柔区慕田峪村"
          ),
        ]
      ),
    ]
    return itinerary
  }
}
#endif
