import Foundation

// MARK: - Time Slot

/// A single time slot with open and close times
struct TimeSlot: Codable, Hashable, Identifiable {
  var id: String { "\(open)-\(close)" }
  let open: String // HH:MM format
  let close: String // HH:MM format
}

// MARK: - Business Hours

/// Weekly business hours for a POI
struct BusinessHours: Codable, Hashable {
  var monday: [TimeSlot]?
  var tuesday: [TimeSlot]?
  var wednesday: [TimeSlot]?
  var thursday: [TimeSlot]?
  var friday: [TimeSlot]?
  var saturday: [TimeSlot]?
  var sunday: [TimeSlot]?
  var timezone: String?
  var notes: String?

  /// Get hours for a specific day
  func hours(for day: DayOfWeek) -> [TimeSlot]? {
    switch day {
    case .sunday: return sunday
    case .monday: return monday
    case .tuesday: return tuesday
    case .wednesday: return wednesday
    case .thursday: return thursday
    case .friday: return friday
    case .saturday: return saturday
    }
  }

  /// Check if any hours are set
  var hasHours: Bool {
    [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
      .contains { $0 != nil && !($0?.isEmpty ?? true) }
  }
}

// MARK: - Day of Week

enum DayOfWeek: Int, CaseIterable, Identifiable {
  case sunday = 0
  case monday = 1
  case tuesday = 2
  case wednesday = 3
  case thursday = 4
  case friday = 5
  case saturday = 6

  var id: Int { rawValue }

  var localizedName: String {
    switch self {
    case .sunday: return "周日"
    case .monday: return "周一"
    case .tuesday: return "周二"
    case .wednesday: return "周三"
    case .thursday: return "周四"
    case .friday: return "周五"
    case .saturday: return "周六"
    }
  }

  var shortName: String {
    switch self {
    case .sunday: return "日"
    case .monday: return "一"
    case .tuesday: return "二"
    case .wednesday: return "三"
    case .thursday: return "四"
    case .friday: return "五"
    case .saturday: return "六"
    }
  }

  static var today: DayOfWeek {
    let weekday = Calendar.current.component(.weekday, from: Date())
    return DayOfWeek(rawValue: weekday - 1) ?? .sunday
  }
}

// MARK: - Best Visit Time

/// Recommendations for the best time to visit a POI
struct BestVisitTime: Codable, Hashable {
  var recommendedTime: String?
  var reason: String?
  var avoidTimes: [String]?
  var peakHours: [String]?
  var seasonalNotes: String?

  enum CodingKeys: String, CodingKey {
    case recommendedTime = "recommended_time"
    case reason
    case avoidTimes = "avoid_times"
    case peakHours = "peak_hours"
    case seasonalNotes = "seasonal_notes"
  }
}

// MARK: - Holiday Hours

/// Special hours for holidays
struct HolidayHours: Codable, Identifiable, Hashable {
  let id: String
  let poiId: String
  let holidayName: String
  let holidayNameEn: String?
  let startDate: String
  let endDate: String
  let isClosed: Bool
  let hours: [TimeSlot]?
  let notes: String?
  let isRecurring: Bool

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case poiId = "poi_id"
    case holidayName = "holiday_name"
    case holidayNameEn = "holiday_name_en"
    case startDate = "start_date"
    case endDate = "end_date"
    case isClosed = "is_closed"
    case hours
    case notes
    case isRecurring = "is_recurring"
  }
}

// MARK: - Open Status

/// Current open/closed status of a POI
struct OpenStatus: Codable, Hashable {
  let isOpen: Bool
  let nextOpenTime: String?
  let nextCloseTime: String?
  let currentDay: String
  let todayHours: [TimeSlot]?
  let holidayInfo: HolidayInfo?

  enum CodingKeys: String, CodingKey {
    case isOpen = "is_open"
    case nextOpenTime = "next_open_time"
    case nextCloseTime = "next_close_time"
    case currentDay = "current_day"
    case todayHours = "today_hours"
    case holidayInfo = "holiday_info"
  }
}

// MARK: - Holiday Info

/// Holiday information affecting current status
struct HolidayInfo: Codable, Hashable {
  let holidayName: String
  let holidayNameEn: String?
  let isClosed: Bool
  let hours: [TimeSlot]?
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case holidayName = "holiday_name"
    case holidayNameEn = "holiday_name_en"
    case isClosed = "is_closed"
    case hours
    case notes
  }
}

// MARK: - Business Hours Reminder

/// Reminder for POI business hours
struct BusinessHoursReminder: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let poiId: String
  let itineraryItemId: String?
  let reminderType: ReminderType
  let minutesBefore: Int
  let scheduledTime: Int
  let isTriggered: Bool
  let triggeredAt: Int?
  let createdAt: Int

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case poiId = "poi_id"
    case itineraryItemId = "itinerary_item_id"
    case reminderType = "reminder_type"
    case minutesBefore = "minutes_before"
    case scheduledTime = "scheduled_time"
    case isTriggered = "is_triggered"
    case triggeredAt = "triggered_at"
    case createdAt = "created_at"
  }

  enum ReminderType: String, Codable, CaseIterable {
    case opening
    case closing
    case bestTime = "best_time"

    var localizedName: String {
      switch self {
      case .opening: return "开门提醒"
      case .closing: return "关门提醒"
      case .bestTime: return "最佳时间提醒"
      }
    }

    var icon: String {
      switch self {
      case .opening: return "door.left.hand.open"
      case .closing: return "door.left.hand.closed"
      case .bestTime: return "star.fill"
      }
    }
  }
}

// MARK: - POI with Business Hours Response

/// API response for POI with business hours
struct PoiWithBusinessHoursResponse: Codable {
  let success: Bool
  let data: PoiWithBusinessHours?
  let error: APIError?

  struct APIError: Codable {
    let message: String
  }
}

/// POI data with business hours and open status
struct PoiWithBusinessHours: Codable {
  let poi: PoiData
  let openStatus: OpenStatus
  let bestVisitTime: BestVisitTime?

  enum CodingKeys: String, CodingKey {
    case poi
    case openStatus = "open_status"
    case bestVisitTime = "best_visit_time"
  }
}

/// Basic POI data
struct PoiData: Codable, Identifiable {
  let id: String
  let name: String
  let nameEn: String?
  let category: String
  let address: String?
  let latitude: Double
  let longitude: Double
  let businessHours: BusinessHours?
  let phone: String?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case nameEn = "name_en"
    case category
    case address
    case latitude
    case longitude
    case businessHours = "business_hours"
    case phone
  }
}

// MARK: - Time Helpers

extension TimeSlot {
  /// Format the time slot for display
  var displayString: String {
    "\(open) - \(close)"
  }

  /// Check if current time is within this slot
  func isCurrentlyOpen() -> Bool {
    let now = Date()
    let calendar = Calendar.current
    let currentMinutes = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)

    guard let openMinutes = parseTimeToMinutes(open),
          let closeMinutes = parseTimeToMinutes(close) else {
      return false
    }

    // Handle overnight hours (e.g., 22:00 - 02:00)
    if closeMinutes < openMinutes {
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes
    }

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  }

  private func parseTimeToMinutes(_ time: String) -> Int? {
    let components = time.split(separator: ":")
    guard components.count == 2,
          let hours = Int(components[0]),
          let minutes = Int(components[1]) else {
      return nil
    }
    return hours * 60 + minutes
  }
}
