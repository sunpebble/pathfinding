import Foundation

// MARK: - App Group Constants

/// App Group identifier for sharing data between main app and widgets
/// Shared constants for both main app and widget extension
public enum WidgetAppGroupConstants {
  public static let suiteName = "group.com.sunpebble.trips"

  // UserDefaults keys for widget data
  public static let upcomingItineraryKey = "widget_upcoming_itinerary"
  public static let todayItineraryKey = "widget_today_itinerary"
  public static let weatherDataKey = "widget_weather_data"
  public static let exchangeRateKey = "widget_exchange_rate"
  public static let lastUpdateKey = "widget_last_update"
}

// MARK: - Widget Data Models

/// Itinerary data for countdown widget
public struct SharedWidgetItineraryData: Codable, Hashable, Sendable {
  public let id: String
  public let title: String
  public let destination: String?
  public let startDate: Date
  public let endDate: Date
  public let daysCount: Int
  public let coverImageUrl: String?
  public let totalPois: Int

  public init(
    id: String,
    title: String,
    destination: String?,
    startDate: Date,
    endDate: Date,
    daysCount: Int,
    coverImageUrl: String?,
    totalPois: Int
  ) {
    self.id = id
    self.title = title
    self.destination = destination
    self.startDate = startDate
    self.endDate = endDate
    self.daysCount = daysCount
    self.coverImageUrl = coverImageUrl
    self.totalPois = totalPois
  }

  /// Days until trip starts (negative if in progress or past)
  public var daysUntilStart: Int {
    let calendar = Calendar.current
    let now = calendar.startOfDay(for: Date())
    let start = calendar.startOfDay(for: startDate)
    return calendar.dateComponents([.day], from: now, to: start).day ?? 0
  }

  /// Whether the trip is in progress
  public var isInProgress: Bool {
    let now = Date()
    return now >= startDate && now <= endDate
  }

  /// Current day number if trip is in progress
  public var currentDayNumber: Int? {
    guard isInProgress else { return nil }
    let calendar = Calendar.current
    let start = calendar.startOfDay(for: startDate)
    let now = calendar.startOfDay(for: Date())
    let days = calendar.dateComponents([.day], from: start, to: now).day ?? 0
    return days + 1
  }

  /// Whether the trip has ended
  public var hasEnded: Bool {
    Date() > endDate
  }

  /// Formatted date range
  public var formattedDateRange: String {
    let formatter = DateFormatter()
    formatter.dateFormat = "M/d"
    return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
  }
}

/// Today's itinerary data for today widget
public struct SharedWidgetTodayData: Codable, Hashable, Sendable {
  public let itineraryTitle: String
  public let destination: String?
  public let dayNumber: Int
  public let totalDays: Int
  public let theme: String?
  public let pois: [SharedWidgetPoiData]
  public let date: Date

  public init(
    itineraryTitle: String,
    destination: String?,
    dayNumber: Int,
    totalDays: Int,
    theme: String?,
    pois: [SharedWidgetPoiData],
    date: Date
  ) {
    self.itineraryTitle = itineraryTitle
    self.destination = destination
    self.dayNumber = dayNumber
    self.totalDays = totalDays
    self.theme = theme
    self.pois = pois
    self.date = date
  }

  /// Formatted day info
  public var dayInfo: String {
    "Day \(dayNumber)/\(totalDays)"
  }
}

/// POI data for widgets
public struct SharedWidgetPoiData: Codable, Hashable, Identifiable, Sendable {
  public let id: String
  public let name: String
  public let type: String?
  public let time: String?
  public let duration: String?
  public let address: String?

  public init(
    id: String,
    name: String,
    type: String?,
    time: String?,
    duration: String?,
    address: String?
  ) {
    self.id = id
    self.name = name
    self.type = type
    self.time = time
    self.duration = duration
    self.address = address
  }

  /// Icon for POI type
  public var icon: String {
    switch type?.lowercased() {
    case "attraction", "scenic", "景点":
      return "mappin.and.ellipse"
    case "restaurant", "food", "餐厅", "美食":
      return "fork.knife"
    case "hotel", "accommodation", "酒店", "住宿":
      return "bed.double.fill"
    case "transportation", "交通":
      return "car.fill"
    case "shopping", "购物":
      return "bag.fill"
    case "entertainment", "娱乐":
      return "star.fill"
    default:
      return "mappin.circle.fill"
    }
  }
}

/// Weather data for weather widget
public struct SharedWidgetWeatherData: Codable, Hashable, Sendable {
  public let location: String
  public let condition: String
  public let conditionIcon: String
  public let temperature: Double
  public let tempMin: Double
  public let tempMax: Double
  public let humidity: Int
  public let windSpeed: Double
  public let precipitation: Double
  public let uvIndex: Double
  public let sunrise: String
  public let sunset: String
  public let updatedAt: Date

  public init(
    location: String,
    condition: String,
    conditionIcon: String,
    temperature: Double,
    tempMin: Double,
    tempMax: Double,
    humidity: Int,
    windSpeed: Double,
    precipitation: Double,
    uvIndex: Double,
    sunrise: String,
    sunset: String,
    updatedAt: Date
  ) {
    self.location = location
    self.condition = condition
    self.conditionIcon = conditionIcon
    self.temperature = temperature
    self.tempMin = tempMin
    self.tempMax = tempMax
    self.humidity = humidity
    self.windSpeed = windSpeed
    self.precipitation = precipitation
    self.uvIndex = uvIndex
    self.sunrise = sunrise
    self.sunset = sunset
    self.updatedAt = updatedAt
  }

  /// Formatted temperature
  public var formattedTemp: String {
    "\(Int(temperature))"
  }

  /// Formatted temperature range
  public var tempRange: String {
    "\(Int(tempMin))° - \(Int(tempMax))°"
  }

  /// Weather condition display name
  public var conditionName: String {
    switch condition.lowercased() {
    case "clear": return "晴"
    case "clouds": return "多云"
    case "rain": return "雨"
    case "drizzle": return "小雨"
    case "thunderstorm": return "雷暴"
    case "snow": return "雪"
    case "mist", "fog": return "雾"
    case "haze": return "霾"
    default: return condition
    }
  }

  /// SF Symbol for weather condition
  public var sfSymbol: String {
    switch condition.lowercased() {
    case "clear": return "sun.max.fill"
    case "clouds": return "cloud.fill"
    case "rain": return "cloud.rain.fill"
    case "drizzle": return "cloud.drizzle.fill"
    case "thunderstorm": return "cloud.bolt.rain.fill"
    case "snow": return "cloud.snow.fill"
    case "mist", "fog": return "cloud.fog.fill"
    case "haze": return "sun.haze.fill"
    default: return "cloud.fill"
    }
  }
}

/// Exchange rate data for exchange rate widget
public struct SharedWidgetExchangeRateData: Codable, Hashable, Sendable {
  public let baseCurrency: String
  public let targetCurrency: String
  public let rate: Double
  public let inverseRate: Double
  public let change24h: Double?
  public let changePercent24h: Double?
  public let updatedAt: Date

  public init(
    baseCurrency: String,
    targetCurrency: String,
    rate: Double,
    inverseRate: Double,
    change24h: Double?,
    changePercent24h: Double?,
    updatedAt: Date
  ) {
    self.baseCurrency = baseCurrency
    self.targetCurrency = targetCurrency
    self.rate = rate
    self.inverseRate = inverseRate
    self.change24h = change24h
    self.changePercent24h = changePercent24h
    self.updatedAt = updatedAt
  }

  /// Formatted rate
  public var formattedRate: String {
    String(format: "%.4f", rate)
  }

  /// Formatted inverse rate
  public var formattedInverseRate: String {
    String(format: "%.4f", inverseRate)
  }

  /// Whether rate increased in 24h
  public var isIncreased: Bool {
    (change24h ?? 0) > 0
  }

  /// Formatted change
  public var formattedChange: String {
    guard let change = change24h else { return "--" }
    let sign = change >= 0 ? "+" : ""
    return "\(sign)\(String(format: "%.4f", change))"
  }

  /// Formatted change percent
  public var formattedChangePercent: String {
    guard let percent = changePercent24h else { return "--" }
    let sign = percent >= 0 ? "+" : ""
    return "\(sign)\(String(format: "%.2f", percent))%"
  }
}

// MARK: - Sample Data for Previews

extension SharedWidgetItineraryData {
  public static let sample = SharedWidgetItineraryData(
    id: "sample-1",
    title: "东京五日游",
    destination: "东京",
    startDate: Calendar.current.date(byAdding: .day, value: 5, to: Date())!,
    endDate: Calendar.current.date(byAdding: .day, value: 10, to: Date())!,
    daysCount: 5,
    coverImageUrl: nil,
    totalPois: 25
  )

  public static let inProgressSample = SharedWidgetItineraryData(
    id: "sample-2",
    title: "大阪三日游",
    destination: "大阪",
    startDate: Calendar.current.date(byAdding: .day, value: -1, to: Date())!,
    endDate: Calendar.current.date(byAdding: .day, value: 2, to: Date())!,
    daysCount: 3,
    coverImageUrl: nil,
    totalPois: 15
  )
}

extension SharedWidgetTodayData {
  public static let sample = SharedWidgetTodayData(
    itineraryTitle: "东京五日游",
    destination: "东京",
    dayNumber: 2,
    totalDays: 5,
    theme: "浅草寺与晴空塔",
    pois: [
      SharedWidgetPoiData(id: "1", name: "浅草寺", type: "attraction", time: "09:00", duration: "2小时", address: "东京都台东区浅草"),
      SharedWidgetPoiData(id: "2", name: "仲见世商店街", type: "shopping", time: "11:00", duration: "1小时", address: nil),
      SharedWidgetPoiData(id: "3", name: "东京晴空塔", type: "attraction", time: "13:00", duration: "2小时", address: nil),
      SharedWidgetPoiData(id: "4", name: "隅田公园", type: "attraction", time: "15:30", duration: "1小时", address: nil)
    ],
    date: Date()
  )
}

extension SharedWidgetWeatherData {
  public static let sample = SharedWidgetWeatherData(
    location: "东京",
    condition: "clear",
    conditionIcon: "sun.max.fill",
    temperature: 22,
    tempMin: 18,
    tempMax: 25,
    humidity: 65,
    windSpeed: 3.5,
    precipitation: 0,
    uvIndex: 6,
    sunrise: "05:30",
    sunset: "18:45",
    updatedAt: Date()
  )
}

extension SharedWidgetExchangeRateData {
  public static let sample = SharedWidgetExchangeRateData(
    baseCurrency: "CNY",
    targetCurrency: "JPY",
    rate: 21.5432,
    inverseRate: 0.0464,
    change24h: 0.0523,
    changePercent24h: 0.24,
    updatedAt: Date()
  )
}
