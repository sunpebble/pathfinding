import Foundation

// MARK: - Event Type

enum LocalEventType: String, Codable, CaseIterable {
  case festival = "festival"
  case concert = "concert"
  case exhibition = "exhibition"
  case sports = "sports"
  case food = "food"
  case cultural = "cultural"
  case market = "market"
  case performance = "performance"
  case religious = "religious"
  case seasonal = "seasonal"
  case localCustom = "local_custom"
  case other = "other"

  var displayName: String {
    switch self {
    case .festival: return "节日"
    case .concert: return "演唱会"
    case .exhibition: return "展览"
    case .sports: return "体育"
    case .food: return "美食"
    case .cultural: return "文化"
    case .market: return "市集"
    case .performance: return "演出"
    case .religious: return "宗教"
    case .seasonal: return "季节性"
    case .localCustom: return "民俗"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .festival: return "party.popper"
    case .concert: return "music.mic"
    case .exhibition: return "photo.artframe"
    case .sports: return "sportscourt"
    case .food: return "fork.knife"
    case .cultural: return "theatermasks"
    case .market: return "bag"
    case .performance: return "ticket"
    case .religious: return "building.columns"
    case .seasonal: return "leaf"
    case .localCustom: return "figure.dance"
    case .other: return "star"
    }
  }

  var color: String {
    switch self {
    case .festival: return "orange"
    case .concert: return "purple"
    case .exhibition: return "blue"
    case .sports: return "green"
    case .food: return "red"
    case .cultural: return "indigo"
    case .market: return "teal"
    case .performance: return "pink"
    case .religious: return "yellow"
    case .seasonal: return "mint"
    case .localCustom: return "brown"
    case .other: return "gray"
    }
  }
}

// MARK: - Event Status

enum LocalEventStatus: String, Codable {
  case upcoming = "upcoming"
  case ongoing = "ongoing"
  case ended = "ended"
  case cancelled = "cancelled"

  var displayName: String {
    switch self {
    case .upcoming: return "即将开始"
    case .ongoing: return "进行中"
    case .ended: return "已结束"
    case .cancelled: return "已取消"
    }
  }

  var color: String {
    switch self {
    case .upcoming: return "blue"
    case .ongoing: return "green"
    case .ended: return "gray"
    case .cancelled: return "red"
    }
  }
}

// MARK: - Reminder Type

enum EventReminderType: String, Codable {
  case eventStart = "event_start"
  case bookingOpen = "booking_open"
  case custom = "custom"

  var displayName: String {
    switch self {
    case .eventStart: return "活动开始"
    case .bookingOpen: return "开始售票"
    case .custom: return "自定义"
    }
  }
}

// MARK: - Local Event

struct LocalEvent: Codable, Identifiable {
  let id: String
  let name: String
  let nameEn: String?
  let description: String
  let descriptionEn: String?
  let cityId: String
  let venue: String?
  let venueAddress: String?
  let latitude: Double?
  let longitude: Double?
  let eventType: LocalEventType
  let startDate: String
  let endDate: String
  let startTime: String?
  let endTime: String?
  let isAllDay: Bool
  let isRecurring: Bool
  let isFree: Bool
  let ticketPrice: Double?
  let ticketPriceMax: Double?
  let currency: String?
  let ticketUrl: String?
  let requiresBooking: Bool?
  let coverImageUrl: String?
  let imageUrls: [String]?
  let highlights: [String]?
  let tips: [String]?
  let tags: [String]?
  let organizerName: String?
  let organizerPhone: String?
  let organizerEmail: String?
  let officialWebsite: String?
  let status: LocalEventStatus
  let viewCount: Int?
  let saveCount: Int?
  let isVerified: Bool?
  let isFeatured: Bool?
  let createdAt: Int?
  let updatedAt: Int?

  // Joined data
  let city: CityInfo?
  let favoriteNotes: String?
  let favoritedAt: Int?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case nameEn = "name_en"
    case description
    case descriptionEn = "description_en"
    case cityId = "city_id"
    case venue
    case venueAddress = "venue_address"
    case latitude
    case longitude
    case eventType = "event_type"
    case startDate = "start_date"
    case endDate = "end_date"
    case startTime = "start_time"
    case endTime = "end_time"
    case isAllDay = "is_all_day"
    case isRecurring = "is_recurring"
    case isFree = "is_free"
    case ticketPrice = "ticket_price"
    case ticketPriceMax = "ticket_price_max"
    case currency
    case ticketUrl = "ticket_url"
    case requiresBooking = "requires_booking"
    case coverImageUrl = "cover_image_url"
    case imageUrls = "image_urls"
    case highlights
    case tips
    case tags
    case organizerName = "organizer_name"
    case organizerPhone = "organizer_phone"
    case organizerEmail = "organizer_email"
    case officialWebsite = "official_website"
    case status
    case viewCount = "view_count"
    case saveCount = "save_count"
    case isVerified = "is_verified"
    case isFeatured = "is_featured"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case city
    case favoriteNotes = "favorite_notes"
    case favoritedAt = "favorited_at"
  }

  /// Display name (Chinese preferred)
  var displayName: String {
    name
  }

  /// Display description
  var displayDescription: String {
    description
  }

  /// Formatted date range
  var dateRangeText: String {
    if startDate == endDate {
      return formatDate(startDate)
    }
    return "\(formatDate(startDate)) - \(formatDate(endDate))"
  }

  /// Formatted time range
  var timeRangeText: String? {
    if isAllDay {
      return "全天"
    }
    guard let start = startTime else { return nil }
    if let end = endTime {
      return "\(start) - \(end)"
    }
    return start
  }

  /// Price display text
  var priceText: String {
    if isFree {
      return "免费"
    }
    guard let price = ticketPrice else { return "价格待定" }
    let currencySymbol = currency == "CNY" ? "¥" : (currency ?? "¥")
    if let maxPrice = ticketPriceMax, maxPrice > price {
      return "\(currencySymbol)\(Int(price)) - \(currencySymbol)\(Int(maxPrice))"
    }
    return "\(currencySymbol)\(Int(price))"
  }

  /// Check if event has location
  var hasLocation: Bool {
    latitude != nil && longitude != nil
  }

  /// Days until event starts
  var daysUntilStart: Int? {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    guard let eventDate = formatter.date(from: startDate) else { return nil }
    let today = Calendar.current.startOfDay(for: Date())
    let eventDay = Calendar.current.startOfDay(for: eventDate)
    let components = Calendar.current.dateComponents([.day], from: today, to: eventDay)
    return components.day
  }

  /// Countdown text
  var countdownText: String? {
    guard let days = daysUntilStart else { return nil }
    if days < 0 {
      return nil
    } else if days == 0 {
      return "今天"
    } else if days == 1 {
      return "明天"
    } else if days <= 7 {
      return "\(days)天后"
    } else if days <= 30 {
      let weeks = days / 7
      return "\(weeks)周后"
    } else {
      let months = days / 30
      return "\(months)个月后"
    }
  }

  private func formatDate(_ dateString: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    guard let date = formatter.date(from: dateString) else { return dateString }
    formatter.dateFormat = "M月d日"
    return formatter.string(from: date)
  }
}

// MARK: - City Info (for joined data)

struct CityInfo: Codable {
  let id: String
  let name: String
  let nameEn: String?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case nameEn = "name_en"
  }
}

// MARK: - Event Reminder

struct EventReminder: Codable, Identifiable {
  let id: String
  let userId: String
  let eventId: String
  let reminderType: EventReminderType
  let reminderTime: Int
  let minutesBefore: Int?
  let message: String?
  let isTriggered: Bool
  let isRead: Bool
  let triggeredAt: Int?
  let readAt: Int?
  let createdAt: Int
  let updatedAt: Int

  // Joined data
  let event: LocalEvent?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case eventId = "event_id"
    case reminderType = "reminder_type"
    case reminderTime = "reminder_time"
    case minutesBefore = "minutes_before"
    case message
    case isTriggered = "is_triggered"
    case isRead = "is_read"
    case triggeredAt = "triggered_at"
    case readAt = "read_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case event
  }

  /// Formatted reminder time
  var formattedReminderTime: String {
    let date = Date(timeIntervalSince1970: Double(reminderTime) / 1000)
    let formatter = DateFormatter()
    formatter.dateFormat = "M月d日 HH:mm"
    return formatter.string(from: date)
  }
}

// MARK: - API Response Wrappers

struct LocalEventsListResponse: Codable {
  let data: [LocalEvent]
  let total: Int
}

struct LocalEventResponse: Codable {
  let data: LocalEvent
}

struct LocalEventsResponse: Codable {
  let data: [LocalEvent]
}

struct EventFavoriteResponse: Codable {
  let id: String
}

struct EventFavoriteCheckResponse: Codable {
  let isFavorited: Bool

  enum CodingKeys: String, CodingKey {
    case isFavorited = "is_favorited"
  }
}

struct EventReminderResponse: Codable {
  let id: String
}

struct EventRemindersResponse: Codable {
  let data: [EventReminder]
}

// MARK: - Create/Update DTOs

struct CreateEventReminderRequest: Codable {
  let reminderType: EventReminderType
  let reminderTime: Int
  let minutesBefore: Int?
  let message: String?

  enum CodingKeys: String, CodingKey {
    case reminderType = "reminder_type"
    case reminderTime = "reminder_time"
    case minutesBefore = "minutes_before"
    case message
  }
}
