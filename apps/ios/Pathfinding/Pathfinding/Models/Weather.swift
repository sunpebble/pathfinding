import Foundation

// MARK: - Weather Condition

enum WeatherCondition: String, Codable {
  case clear
  case clouds
  case rain
  case drizzle
  case thunderstorm
  case snow
  case mist
  case fog
  case haze
  case dust
  case smoke

  var displayName: String {
    switch self {
    case .clear: return "晴"
    case .clouds: return "多云"
    case .rain: return "雨"
    case .drizzle: return "小雨"
    case .thunderstorm: return "雷暴"
    case .snow: return "雪"
    case .mist: return "薄雾"
    case .fog: return "雾"
    case .haze: return "霾"
    case .dust: return "沙尘"
    case .smoke: return "烟雾"
    }
  }

  var icon: String {
    switch self {
    case .clear: return "sun.max.fill"
    case .clouds: return "cloud.fill"
    case .rain: return "cloud.rain.fill"
    case .drizzle: return "cloud.drizzle.fill"
    case .thunderstorm: return "cloud.bolt.rain.fill"
    case .snow: return "cloud.snow.fill"
    case .mist: return "cloud.fog.fill"
    case .fog: return "cloud.fog.fill"
    case .haze: return "sun.haze.fill"
    case .dust: return "sun.dust.fill"
    case .smoke: return "smoke.fill"
    }
  }

  var color: String {
    switch self {
    case .clear: return "orange"
    case .clouds: return "gray"
    case .rain, .drizzle: return "blue"
    case .thunderstorm: return "purple"
    case .snow: return "cyan"
    case .mist, .fog: return "gray"
    case .haze, .dust, .smoke: return "brown"
    }
  }
}

// MARK: - Daily Weather

struct DailyWeather: Codable, Identifiable {
  var id: String { date }

  let date: String // ISO date string YYYY-MM-DD
  let timestamp: Int // Unix timestamp
  let condition: WeatherCondition
  let conditionDescription: String
  let icon: String
  let tempMin: Double // Celsius
  let tempMax: Double // Celsius
  let tempMorning: Double
  let tempDay: Double
  let tempEvening: Double
  let tempNight: Double
  let feelsLikeDay: Double
  let humidity: Int // Percentage
  let windSpeed: Double // m/s
  let windDirection: Int // Degrees
  let precipitation: Double // mm
  let precipitationProbability: Double // 0-1
  let uvIndex: Double
  let sunrise: Int // Unix timestamp
  let sunset: Int // Unix timestamp
  let cloudiness: Int // Percentage
  let pressure: Int // hPa

  /// Format temperature range
  var temperatureRange: String {
    "\(Int(tempMin))° - \(Int(tempMax))°"
  }

  /// Format average temperature
  var averageTemperature: String {
    let avg = (tempMin + tempMax) / 2
    return "\(Int(avg))°"
  }

  /// Format precipitation probability as percentage
  var precipitationPercent: String {
    "\(Int(precipitationProbability * 100))%"
  }

  /// Format wind speed
  var formattedWindSpeed: String {
    String(format: "%.1f m/s", windSpeed)
  }

  /// Wind direction as compass direction
  var windDirectionCompass: String {
    let directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
    let index = Int((Double(windDirection) + 22.5) / 45.0) % 8
    return directions[index]
  }

  /// Format sunrise time
  var sunriseTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(sunrise))
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: date)
  }

  /// Format sunset time
  var sunsetTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(sunset))
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: date)
  }

  /// UV index description
  var uvIndexDescription: String {
    switch uvIndex {
    case 0..<3: return "低"
    case 3..<6: return "中等"
    case 6..<8: return "高"
    case 8..<11: return "很高"
    default: return "极高"
    }
  }

  /// UV index color
  var uvIndexColor: String {
    switch uvIndex {
    case 0..<3: return "green"
    case 3..<6: return "yellow"
    case 6..<8: return "orange"
    case 8..<11: return "red"
    default: return "purple"
    }
  }

  /// Format date as weekday
  var weekday: String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    guard let parsedDate = dateFormatter.date(from: date) else { return "" }

    let weekdayFormatter = DateFormatter()
    weekdayFormatter.locale = Locale(identifier: "zh_CN")
    weekdayFormatter.dateFormat = "EEEE"
    return weekdayFormatter.string(from: parsedDate)
  }

  /// Format date as short date
  var shortDate: String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    guard let parsedDate = dateFormatter.date(from: date) else { return date }

    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "M/d"
    return outputFormatter.string(from: parsedDate)
  }

  /// Check if this is today
  var isToday: Bool {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let todayString = dateFormatter.string(from: Date())
    return date == todayString
  }
}

// MARK: - Weather Alert

struct WeatherAlert: Codable, Identifiable {
  var id: String { "\(event)-\(start)" }

  let event: String
  let sender: String
  let start: Int // Unix timestamp
  let end: Int // Unix timestamp
  let description: String
  let severity: AlertSeverity

  /// Format start time
  var startTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(start))
    let formatter = DateFormatter()
    formatter.dateFormat = "M/d HH:mm"
    return formatter.string(from: date)
  }

  /// Format end time
  var endTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(end))
    let formatter = DateFormatter()
    formatter.dateFormat = "M/d HH:mm"
    return formatter.string(from: date)
  }

  /// Check if alert is currently active
  var isActive: Bool {
    let now = Int(Date().timeIntervalSince1970)
    return now >= start && now <= end
  }
}

enum AlertSeverity: String, Codable {
  case minor
  case moderate
  case severe
  case extreme

  var displayName: String {
    switch self {
    case .minor: return "轻微"
    case .moderate: return "中等"
    case .severe: return "严重"
    case .extreme: return "极端"
    }
  }

  var color: String {
    switch self {
    case .minor: return "yellow"
    case .moderate: return "orange"
    case .severe: return "red"
    case .extreme: return "purple"
    }
  }

  var icon: String {
    switch self {
    case .minor: return "exclamationmark.circle"
    case .moderate: return "exclamationmark.triangle"
    case .severe: return "exclamationmark.triangle.fill"
    case .extreme: return "exclamationmark.octagon.fill"
    }
  }
}

// MARK: - Weather Forecast

struct WeatherForecast: Codable {
  let latitude: Double
  let longitude: Double
  let timezone: String
  let timezoneOffset: Int
  let current: DailyWeather?
  let daily: [DailyWeather]
  let alerts: [WeatherAlert]
  let fetchedAt: Int

  /// Check if data is stale (older than 1 hour)
  var isStale: Bool {
    let now = Int(Date().timeIntervalSince1970 * 1000)
    let oneHourMs = 60 * 60 * 1000
    return now - fetchedAt > oneHourMs
  }

  /// Get weather for a specific date
  func weather(for date: String) -> DailyWeather? {
    daily.first { $0.date == date }
  }

  /// Get today's weather
  var todayWeather: DailyWeather? {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let todayString = dateFormatter.string(from: Date())
    return weather(for: todayString)
  }

  /// Check if there are severe alerts
  var hasSevereAlerts: Bool {
    alerts.contains { $0.severity == .severe || $0.severity == .extreme }
  }

  /// Get active alerts only
  var activeAlerts: [WeatherAlert] {
    alerts.filter { $0.isActive }
  }
}

// MARK: - Clothing Suggestion

struct ClothingSuggestion: Codable, Identifiable {
  var id: String { category }

  let category: String
  let items: [String]
  let reason: String

  /// Icon for clothing category
  var icon: String {
    switch category {
    case "保暖外套": return "jacket"
    case "外套": return "tshirt"
    case "轻便服装": return "tshirt.fill"
    case "夏季服装": return "sun.max"
    case "雨具": return "umbrella.fill"
    case "防晒用品": return "sun.max.trianglebadge.exclamationmark"
    case "防风装备": return "wind"
    default: return "tshirt"
    }
  }
}

// MARK: - Activity Suitability

struct ActivitySuitability: Codable, Identifiable {
  var id: String { activity }

  let activity: String
  let suitability: SuitabilityLevel
  let reason: String
  let icon: String

  /// SF Symbol name for the activity
  var sfSymbol: String {
    switch icon {
    case "sun.max": return "sun.max.fill"
    case "cloud.sun": return "cloud.sun.fill"
    case "cloud.rain": return "cloud.rain.fill"
    case "cloud": return "cloud.fill"
    case "camera": return "camera.fill"
    case "figure.hiking": return "figure.hiking"
    case "building.2": return "building.2.fill"
    case "beach.umbrella": return "beach.umbrella.fill"
    default: return icon
    }
  }
}

enum SuitabilityLevel: String, Codable {
  case excellent
  case good
  case fair
  case poor

  var displayName: String {
    switch self {
    case .excellent: return "非常适合"
    case .good: return "适合"
    case .fair: return "一般"
    case .poor: return "不适合"
    }
  }

  var color: String {
    switch self {
    case .excellent: return "green"
    case .good: return "blue"
    case .fair: return "orange"
    case .poor: return "red"
    }
  }

  var score: Int {
    switch self {
    case .excellent: return 4
    case .good: return 3
    case .fair: return 2
    case .poor: return 1
    }
  }
}

// MARK: - Weather Recommendation

struct WeatherRecommendation: Codable, Identifiable {
  var id: String { date }

  let date: String
  let clothing: [ClothingSuggestion]
  let activities: [ActivitySuitability]
  let tips: [String]
}

// MARK: - Itinerary Weather

struct ItineraryWeatherDay: Codable, Identifiable {
  var id: Int { dayNumber }

  let dayNumber: Int
  let weather: DailyWeather
  let recommendation: WeatherRecommendation
}

struct ItineraryWeather: Codable {
  let guideId: String
  let location: WeatherLocation
  let timezone: String
  let alerts: [WeatherAlert]
  let days: [ItineraryWeatherDay]

  /// Check if any day has poor outdoor conditions
  var hasUnfavorableDays: Bool {
    days.contains { day in
      day.weather.condition == .rain ||
      day.weather.condition == .thunderstorm ||
      day.weather.condition == .snow
    }
  }
}

struct WeatherLocation: Codable {
  let latitude: Double
  let longitude: Double
}

// MARK: - API Response Wrappers

struct WeatherForecastResponse: Codable {
  let data: WeatherForecast
  let cached: Bool?
}

struct DailyWeatherResponse: Codable {
  let data: [DailyWeather]
  let dateRange: DateRange?
  let count: Int

  enum CodingKeys: String, CodingKey {
    case data
    case dateRange = "date_range"
    case count
  }
}

struct DateRange: Codable {
  let start: String
  let end: String
}

struct WeatherRecommendationResponse: Codable {
  let data: WeatherRecommendationData
}

struct WeatherRecommendationData: Codable {
  let weather: DailyWeather
  let recommendation: WeatherRecommendation
}

struct WeatherAlertsResponse: Codable {
  let data: WeatherAlertsData
}

struct WeatherAlertsData: Codable {
  let alerts: [WeatherAlert]
  let count: Int
  let hasSevere: Bool

  enum CodingKeys: String, CodingKey {
    case alerts
    case count
    case hasSevere = "has_severe"
  }
}

struct ItineraryWeatherResponse: Codable {
  let data: ItineraryWeather
}
