import Foundation

/// City model with timezone information
struct City: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let nameEn: String?
  let timezone: String // IANA timezone identifier (e.g., "Asia/Shanghai")
  let countryCode: String
  let latitude: Double
  let longitude: Double
  let utcOffset: Int? // Standard UTC offset in minutes (e.g., 480 for +08:00)
  let dstOffset: Int? // DST UTC offset in minutes (if applicable)
  let observesDst: Bool?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case nameEn = "name_en"
    case timezone
    case countryCode = "country_code"
    case latitude
    case longitude
    case utcOffset = "utc_offset"
    case dstOffset = "dst_offset"
    case observesDst = "observes_dst"
  }

  // MARK: - Computed Properties

  /// Display name (prefer English name if available)
  var displayName: String {
    nameEn ?? name
  }

  /// Formatted UTC offset string (e.g., "+08:00")
  var formattedUtcOffset: String {
    guard let offset = utcOffset else {
      return formatTimezoneOffset(timezone: timezone)
    }
    return formatMinutesOffset(offset)
  }

  /// Current local time in this city's timezone
  var currentLocalTime: Date {
    Date()
  }

  /// Format current time as string
  func formattedCurrentTime(format: TimeDisplayFormat = .hour24, showSeconds: Bool = false) -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)

    switch format {
    case .hour12:
      formatter.dateFormat = showSeconds ? "h:mm:ss a" : "h:mm a"
    case .hour24:
      formatter.dateFormat = showSeconds ? "HH:mm:ss" : "HH:mm"
    }

    return formatter.string(from: Date())
  }

  /// Format current date as string
  func formattedCurrentDate() -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "M月d日 EEEE"
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: Date())
  }

  // MARK: - Private Helpers

  private func formatMinutesOffset(_ minutes: Int) -> String {
    let sign = minutes >= 0 ? "+" : "-"
    let absMinutes = abs(minutes)
    let hours = absMinutes / 60
    let mins = absMinutes % 60
    return mins > 0 ? "\(sign)\(hours):\(String(format: "%02d", mins))" : "\(sign)\(hours):00"
  }

  private func formatTimezoneOffset(timezone: String) -> String {
    guard let tz = TimeZone(identifier: timezone) else { return "" }
    let seconds = tz.secondsFromGMT()
    let hours = seconds / 3600
    let minutes = abs(seconds / 60) % 60
    let sign = hours >= 0 ? "+" : ""
    return minutes > 0 ? "\(sign)\(hours):\(String(format: "%02d", minutes))" : "\(sign)\(hours):00"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: City, rhs: City) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Time Display Format

enum TimeDisplayFormat: String, Codable {
  case hour12 = "12h"
  case hour24 = "24h"
}

// MARK: - User Timezone Settings

struct UserTimezoneSettings: Codable {
  let userId: String?
  let homeTimezone: String
  let homeCityId: String?
  let displayFormat: TimeDisplayFormat
  let showSeconds: Bool
  let autoDetect: Bool
  let savedClocks: [SavedClock]
  let createdAt: Int?
  let updatedAt: Int?

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case homeTimezone = "home_timezone"
    case homeCityId = "home_city_id"
    case displayFormat = "display_format"
    case showSeconds = "show_seconds"
    case autoDetect = "auto_detect"
    case savedClocks = "saved_clocks"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  /// Default settings
  static var `default`: UserTimezoneSettings {
    UserTimezoneSettings(
      userId: nil,
      homeTimezone: TimeZone.current.identifier,
      homeCityId: nil,
      displayFormat: .hour24,
      showSeconds: false,
      autoDetect: true,
      savedClocks: [],
      createdAt: nil,
      updatedAt: nil
    )
  }
}

// MARK: - Saved Clock

struct SavedClock: Codable, Identifiable, Hashable {
  let cityId: String
  let label: String?
  let sortOrder: Int

  var id: String { cityId }

  enum CodingKeys: String, CodingKey {
    case cityId = "city_id"
    case label
    case sortOrder = "sort_order"
  }
}

// MARK: - World Clock Item

struct WorldClockItem: Codable, Identifiable, Hashable {
  let city: City
  let label: String?
  let sortOrder: Int

  var id: String { city.id }

  /// Display label (custom label or city name)
  var displayLabel: String {
    label ?? city.displayName
  }
}

// MARK: - World Clock Response

struct WorldClockResponse: Codable {
  let settings: WorldClockSettings?
  let homeCity: City?
  let clocks: [WorldClockItem]

  enum CodingKeys: String, CodingKey {
    case settings
    case homeCity = "home_city"
    case clocks
  }
}

struct WorldClockSettings: Codable {
  let homeTimezone: String
  let displayFormat: TimeDisplayFormat
  let showSeconds: Bool
  let autoDetect: Bool

  enum CodingKeys: String, CodingKey {
    case homeTimezone = "home_timezone"
    case displayFormat = "display_format"
    case showSeconds = "show_seconds"
    case autoDetect = "auto_detect"
  }
}

// MARK: - Time Difference

struct TimeDifference: Codable {
  let hours: Int
  let minutes: Int
  let isAhead: Bool
  let formatted: String
  let totalMinutes: Int

  enum CodingKeys: String, CodingKey {
    case hours
    case minutes
    case isAhead = "is_ahead"
    case formatted
    case totalMinutes = "total_minutes"
  }

  /// Human-readable description
  var description: String {
    if hours == 0 && minutes == 0 {
      return "相同时区"
    }

    let hourText = hours > 0 ? "\(hours)小时" : ""
    let minuteText = minutes > 0 ? "\(minutes)分钟" : ""
    let separator = hours > 0 && minutes > 0 ? "" : ""
    let direction = isAhead ? "快" : "慢"

    return "\(direction)\(hourText)\(separator)\(minuteText)"
  }
}

// MARK: - Time Conversion Result

struct TimeConversionResult: Codable {
  let sourceTime: String
  let sourceTimezone: String
  let targetTime: String
  let targetTimezone: String
  let difference: TimeDifference

  enum CodingKeys: String, CodingKey {
    case sourceTime = "source_time"
    case sourceTimezone = "source_timezone"
    case targetTime = "target_time"
    case targetTimezone = "target_timezone"
    case difference
  }
}

// MARK: - Current Time Result

struct CurrentTimeResult: Codable {
  let timezone: String
  let time: String
  let date: String
  let hour: String
  let minute: String
  let second: String
  let dayPeriod: String?
  let error: String?

  enum CodingKeys: String, CodingKey {
    case timezone
    case time
    case date
    case hour
    case minute
    case second
    case dayPeriod = "day_period"
    case error
  }
}

// MARK: - API Response Wrappers

struct CitiesResponse: Codable {
  let data: [City]
}

struct CityResponse: Codable {
  let data: City
}

struct TimezoneSettingsResponse: Codable {
  let data: UserTimezoneSettings?
}

struct WorldClockDataResponse: Codable {
  let data: WorldClockResponse
}

struct TimeConversionResponse: Codable {
  let data: TimeConversionResult
}

struct CurrentTimesResponse: Codable {
  let data: [CurrentTimeResult]
}

struct TimezoneIdResponse: Codable {
  let data: TimezoneIdData
}

struct TimezoneIdData: Codable {
  let id: String
}
