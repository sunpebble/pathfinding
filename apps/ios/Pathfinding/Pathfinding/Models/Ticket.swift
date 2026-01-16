import Foundation

// MARK: - Ticket Type

enum TicketType: String, Codable, CaseIterable {
  case adult = "adult"
  case student = "student"
  case senior = "senior"
  case child = "child"
  case group = "group"
  case family = "family"
  case vip = "vip"
  case free = "free"
  case other = "other"

  var displayName: String {
    switch self {
    case .adult: return "成人票"
    case .student: return "学生票"
    case .senior: return "老人票"
    case .child: return "儿童票"
    case .group: return "团体票"
    case .family: return "家庭票"
    case .vip: return "VIP票"
    case .free: return "免费"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .adult: return "person"
    case .student: return "graduationcap"
    case .senior: return "figure.walk.arrival"
    case .child: return "figure.child"
    case .group: return "person.3"
    case .family: return "figure.2.and.child.holdinghands"
    case .vip: return "star.circle"
    case .free: return "gift"
    case .other: return "ticket"
    }
  }

  var color: String {
    switch self {
    case .adult: return "blue"
    case .student: return "green"
    case .senior: return "purple"
    case .child: return "orange"
    case .group: return "indigo"
    case .family: return "pink"
    case .vip: return "yellow"
    case .free: return "teal"
    case .other: return "gray"
    }
  }
}

// MARK: - Stock Status

enum StockStatus: String, Codable, CaseIterable {
  case inStock = "in_stock"
  case lowStock = "low_stock"
  case soldOut = "sold_out"
  case unknown = "unknown"

  var displayName: String {
    switch self {
    case .inStock: return "有票"
    case .lowStock: return "少量"
    case .soldOut: return "售罄"
    case .unknown: return "未知"
    }
  }

  var icon: String {
    switch self {
    case .inStock: return "checkmark.circle.fill"
    case .lowStock: return "exclamationmark.circle.fill"
    case .soldOut: return "xmark.circle.fill"
    case .unknown: return "questionmark.circle"
    }
  }

  var color: String {
    switch self {
    case .inStock: return "green"
    case .lowStock: return "orange"
    case .soldOut: return "red"
    case .unknown: return "gray"
    }
  }
}

// MARK: - Reminder Type

enum TicketReminderType: String, Codable, CaseIterable {
  case reservationOpen = "reservation_open"
  case bookingReminder = "booking_reminder"
  case visitReminder = "visit_reminder"
  case priceDrop = "price_drop"
  case stockAvailable = "stock_available"

  var displayName: String {
    switch self {
    case .reservationOpen: return "开放预约"
    case .bookingReminder: return "购票提醒"
    case .visitReminder: return "参观提醒"
    case .priceDrop: return "降价提醒"
    case .stockAvailable: return "有票提醒"
    }
  }

  var icon: String {
    switch self {
    case .reservationOpen: return "calendar.badge.clock"
    case .bookingReminder: return "ticket"
    case .visitReminder: return "figure.walk"
    case .priceDrop: return "arrow.down.circle"
    case .stockAvailable: return "bell.badge"
    }
  }
}

// MARK: - Age Range

struct AgeRange: Codable, Hashable {
  let minAge: Int?
  let maxAge: Int?

  enum CodingKeys: String, CodingKey {
    case minAge = "min_age"
    case maxAge = "max_age"
  }

  var displayRange: String {
    if let min = minAge, let max = maxAge {
      return "\(min)-\(max)岁"
    } else if let min = minAge {
      return "\(min)岁以上"
    } else if let max = maxAge {
      return "\(max)岁以下"
    }
    return "不限年龄"
  }
}

// MARK: - POI Ticket

struct PoiTicket: Codable, Identifiable, Hashable {
  let id: String
  let poiId: String
  let ticketName: String
  let ticketType: String
  let price: Double
  let originalPrice: Double?
  let currency: String
  let discountInfo: String?
  let discountPercentage: Double?
  let eligibilityRequirements: String?
  let ageRange: AgeRange?
  let validFrom: Double?
  let validUntil: Double?
  let validDays: Int?
  let purchaseUrl: String?
  let purchasePlatform: String?
  let requiresReservation: Bool
  let reservationUrl: String?
  let reservationTips: String?
  let advanceBookingDays: Int?
  let usageInstructions: String?
  let includedServices: [String]?
  let excludedServices: [String]?
  let isActive: Bool
  let stockStatus: String?
  let sortOrder: Int
  let isRecommended: Bool?
  let source: String?
  let lastSyncedAt: Double?
  let createdAt: Double
  let updatedAt: Double

  enum CodingKeys: String, CodingKey {
    case id
    case poiId = "poi_id"
    case ticketName = "ticket_name"
    case ticketType = "ticket_type"
    case price
    case originalPrice = "original_price"
    case currency
    case discountInfo = "discount_info"
    case discountPercentage = "discount_percentage"
    case eligibilityRequirements = "eligibility_requirements"
    case ageRange = "age_range"
    case validFrom = "valid_from"
    case validUntil = "valid_until"
    case validDays = "valid_days"
    case purchaseUrl = "purchase_url"
    case purchasePlatform = "purchase_platform"
    case requiresReservation = "requires_reservation"
    case reservationUrl = "reservation_url"
    case reservationTips = "reservation_tips"
    case advanceBookingDays = "advance_booking_days"
    case usageInstructions = "usage_instructions"
    case includedServices = "included_services"
    case excludedServices = "excluded_services"
    case isActive = "is_active"
    case stockStatus = "stock_status"
    case sortOrder = "sort_order"
    case isRecommended = "is_recommended"
    case source
    case lastSyncedAt = "last_synced_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // Computed properties
  var ticketTypeEnum: TicketType? {
    TicketType(rawValue: ticketType)
  }

  var stockStatusEnum: StockStatus? {
    guard let status = stockStatus else { return nil }
    return StockStatus(rawValue: status)
  }

  var formattedPrice: String {
    if price == 0 {
      return "免费"
    }
    return String(format: "%@%.0f", currencySymbol, price)
  }

  var formattedOriginalPrice: String? {
    guard let original = originalPrice, original > price else { return nil }
    return String(format: "%@%.0f", currencySymbol, original)
  }

  var currencySymbol: String {
    switch currency.uppercased() {
    case "CNY", "RMB": return "¥"
    case "USD": return "$"
    case "EUR": return "E"
    case "GBP": return "L"
    case "JPY": return "¥"
    default: return "¥"
    }
  }

  var discountBadge: String? {
    if let percentage = discountPercentage, percentage > 0 {
      return String(format: "%.0f%%OFF", percentage)
    }
    if let original = originalPrice, original > price, price > 0 {
      let discount = (1 - price / original) * 100
      return String(format: "%.0f%%OFF", discount)
    }
    return nil
  }

  var validityDescription: String? {
    if let days = validDays {
      return "购买后\(days)天内有效"
    }
    if let from = validFrom, let until = validUntil {
      let fromDate = Date(timeIntervalSince1970: from / 1000)
      let untilDate = Date(timeIntervalSince1970: until / 1000)
      let formatter = DateFormatter()
      formatter.dateFormat = "MM/dd"
      return "\(formatter.string(from: fromDate)) - \(formatter.string(from: untilDate))"
    }
    return nil
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: PoiTicket, rhs: PoiTicket) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Ticket Price Range

struct TicketPriceRange: Codable, Hashable {
  let minPrice: Double
  let maxPrice: Double
  let currency: String
  let hasFreeTickets: Bool
  let ticketCount: Int

  enum CodingKeys: String, CodingKey {
    case minPrice = "min_price"
    case maxPrice = "max_price"
    case currency
    case hasFreeTickets = "has_free_tickets"
    case ticketCount = "ticket_count"
  }

  var formattedRange: String {
    let symbol = currency.uppercased() == "CNY" ? "¥" : currency
    if hasFreeTickets && minPrice == 0 {
      if maxPrice == 0 {
        return "免费"
      }
      return String(format: "免费 - %@%.0f", symbol, maxPrice)
    }
    if minPrice == maxPrice {
      return String(format: "%@%.0f", symbol, minPrice)
    }
    return String(format: "%@%.0f - %@%.0f", symbol, minPrice, symbol, maxPrice)
  }
}

// MARK: - Ticket Reminder

struct TicketReminder: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let poiId: String
  let ticketId: String?
  let itineraryId: String?
  let reminderType: String
  let reminderTime: Double
  let message: String?
  let isTriggered: Bool
  let triggeredAt: Double?
  let isRead: Bool
  let readAt: Double?
  let createdAt: Double
  let updatedAt: Double

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case poiId = "poi_id"
    case ticketId = "ticket_id"
    case itineraryId = "itinerary_id"
    case reminderType = "reminder_type"
    case reminderTime = "reminder_time"
    case message
    case isTriggered = "is_triggered"
    case triggeredAt = "triggered_at"
    case isRead = "is_read"
    case readAt = "read_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  var reminderTypeEnum: TicketReminderType? {
    TicketReminderType(rawValue: reminderType)
  }

  var reminderDate: Date {
    Date(timeIntervalSince1970: reminderTime / 1000)
  }

  var formattedReminderTime: String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm"
    return formatter.string(from: reminderDate)
  }

  var isPast: Bool {
    reminderDate < Date()
  }

  var isUpcoming: Bool {
    !isTriggered && reminderDate > Date()
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: TicketReminder, rhs: TicketReminder) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Create Ticket Reminder Request

struct CreateTicketReminderRequest: Codable {
  let poiId: String
  let ticketId: String?
  let itineraryId: String?
  let reminderType: String
  let reminderTime: Double
  let message: String?

  enum CodingKeys: String, CodingKey {
    case poiId = "poi_id"
    case ticketId = "ticket_id"
    case itineraryId = "itinerary_id"
    case reminderType = "reminder_type"
    case reminderTime = "reminder_time"
    case message
  }
}

// MARK: - Update Ticket Reminder Request

struct UpdateTicketReminderRequest: Codable {
  let reminderTime: Double?
  let message: String?
  let reminderType: String?

  enum CodingKeys: String, CodingKey {
    case reminderTime = "reminder_time"
    case message
    case reminderType = "reminder_type"
  }
}

// MARK: - API Response Types

struct PoiTicketListResponse: Codable {
  let data: [PoiTicket]
}

struct PoiTicketResponse: Codable {
  let data: PoiTicket
}

struct TicketPriceRangeResponse: Codable {
  let data: TicketPriceRange?
}

struct TicketReminderListResponse: Codable {
  let data: [TicketReminder]
}

struct TicketReminderResponse: Codable {
  let data: TicketReminder
}

struct TicketUnreadCountResponse: Codable {
  let data: UnreadCount

  struct UnreadCount: Codable {
    let count: Int
  }
}

// MARK: - Saved Ticket (Local Storage)

struct SavedTicket: Codable, Identifiable, Hashable {
  let id: UUID
  let ticket: PoiTicket
  let poiName: String
  let savedAt: Date
  let notes: String?

  init(ticket: PoiTicket, poiName: String, notes: String? = nil) {
    self.id = UUID()
    self.ticket = ticket
    self.poiName = poiName
    self.savedAt = Date()
    self.notes = notes
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: SavedTicket, rhs: SavedTicket) -> Bool {
    lhs.id == rhs.id
  }
}
