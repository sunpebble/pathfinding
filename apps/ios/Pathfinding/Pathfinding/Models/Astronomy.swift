import Foundation

// MARK: - Sun Times

struct SunTimes: Codable, Identifiable {
  var id: String { date }

  let date: String
  let latitude: Double
  let longitude: Double
  let timezone: String

  // Core sun times
  let sunrise: String
  let sunset: String
  let solarNoon: String

  // Twilight times
  let civilDawn: String
  let civilDusk: String
  let nauticalDawn: String
  let nauticalDusk: String
  let astronomicalDawn: String
  let astronomicalDusk: String

  // Photography golden/blue hours
  let goldenHourMorningStart: String
  let goldenHourMorningEnd: String
  let goldenHourEveningStart: String
  let goldenHourEveningEnd: String
  let blueHourMorningStart: String
  let blueHourMorningEnd: String
  let blueHourEveningStart: String
  let blueHourEveningEnd: String

  // Day length
  let dayLengthMinutes: Int

  /// Format day length as hours and minutes
  var formattedDayLength: String {
    let hours = dayLengthMinutes / 60
    let minutes = dayLengthMinutes % 60
    return "\(hours)h \(minutes)m"
  }
}

// MARK: - Moon Phase

struct MoonPhase: Codable, Identifiable {
  var id: String { date }

  let date: String
  let phase: MoonPhaseName
  let illumination: Double // 0-100 percentage
  let age: Double // Days since new moon
  let emoji: String

  /// Illumination as percentage string
  var illuminationPercent: String {
    "\(Int(illumination))%"
  }

  /// Whether the moon is waxing (growing)
  var isWaxing: Bool {
    switch phase {
    case .newMoon, .waxingCrescent, .firstQuarter, .waxingGibbous:
      return true
    case .fullMoon, .waningGibbous, .lastQuarter, .waningCrescent:
      return false
    }
  }

  /// Days until full moon (approximate)
  var daysUntilFullMoon: Int {
    let fullMoonAge = 14.765
    if age <= fullMoonAge {
      return Int(fullMoonAge - age)
    } else {
      return Int(29.53 - age + fullMoonAge)
    }
  }

  /// Days until new moon (approximate)
  var daysUntilNewMoon: Int {
    return Int(29.53 - age)
  }
}

enum MoonPhaseName: String, Codable {
  case newMoon = "new_moon"
  case waxingCrescent = "waxing_crescent"
  case firstQuarter = "first_quarter"
  case waxingGibbous = "waxing_gibbous"
  case fullMoon = "full_moon"
  case waningGibbous = "waning_gibbous"
  case lastQuarter = "last_quarter"
  case waningCrescent = "waning_crescent"

  var displayName: String {
    switch self {
    case .newMoon: return "新月"
    case .waxingCrescent: return "娥眉月"
    case .firstQuarter: return "上弦月"
    case .waxingGibbous: return "盈凸月"
    case .fullMoon: return "满月"
    case .waningGibbous: return "亏凸月"
    case .lastQuarter: return "下弦月"
    case .waningCrescent: return "残月"
    }
  }
}

// MARK: - Astronomical Event

struct AstronomicalEvent: Codable, Identifiable {
  let id: String
  let type: AstronomicalEventType
  let name: String
  let nameZh: String
  let description: String
  let descriptionZh: String
  let startDate: String
  let endDate: String?
  let peakDate: String?
  let visibility: EventVisibility
  let bestViewingLocations: [String]?
  let tips: [String]?
  let tipsZh: [String]?

  /// Display name (Chinese)
  var displayName: String {
    nameZh.isEmpty ? name : nameZh
  }

  /// Display description (Chinese)
  var displayDescription: String {
    descriptionZh.isEmpty ? description : descriptionZh
  }
}

enum AstronomicalEventType: String, Codable {
  case solarEclipse = "solar_eclipse"
  case lunarEclipse = "lunar_eclipse"
  case meteorShower = "meteor_shower"
  case planetConjunction = "planet_conjunction"
  case supermoon = "supermoon"
  case blueMoon = "blue_moon"
  case equinox = "equinox"
  case solstice = "solstice"

  var displayName: String {
    switch self {
    case .solarEclipse: return "日食"
    case .lunarEclipse: return "月食"
    case .meteorShower: return "流星雨"
    case .planetConjunction: return "行星合相"
    case .supermoon: return "超级月亮"
    case .blueMoon: return "蓝月亮"
    case .equinox: return "昼夜平分"
    case .solstice: return "至日"
    }
  }

  var icon: String {
    switch self {
    case .solarEclipse: return "sun.max.trianglebadge.exclamationmark"
    case .lunarEclipse: return "moon.circle"
    case .meteorShower: return "sparkles"
    case .planetConjunction: return "globe.americas"
    case .supermoon: return "moon.fill"
    case .blueMoon: return "moon.haze.fill"
    case .equinox: return "circle.lefthalf.filled"
    case .solstice: return "sun.horizon"
    }
  }

  var color: String {
    switch self {
    case .solarEclipse: return "orange"
    case .lunarEclipse: return "purple"
    case .meteorShower: return "blue"
    case .planetConjunction: return "green"
    case .supermoon: return "yellow"
    case .blueMoon: return "cyan"
    case .equinox: return "teal"
    case .solstice: return "red"
    }
  }
}

enum EventVisibility: String, Codable {
  case global = "global"
  case northernHemisphere = "northern_hemisphere"
  case southernHemisphere = "southern_hemisphere"
  case regional = "regional"

  var displayName: String {
    switch self {
    case .global: return "全球可见"
    case .northernHemisphere: return "北半球可见"
    case .southernHemisphere: return "南半球可见"
    case .regional: return "部分地区可见"
    }
  }
}

// MARK: - Stargazing Spot

struct StargazingSpot: Codable, Identifiable {
  let id: String
  let name: String
  let nameZh: String
  let description: String?
  let descriptionZh: String?
  let latitude: Double
  let longitude: Double
  let address: String?
  let lightPollutionLevel: LightPollutionLevel
  let bortleScale: Int // 1-9, lower is better
  let altitude: Double?
  let bestSeasons: [String]?
  let facilities: [String]?
  let tips: [String]?
  let tipsZh: [String]?
  let imageUrl: String?
  let distanceKm: Double?

  /// Display name (Chinese preferred)
  var displayName: String {
    nameZh.isEmpty ? name : nameZh
  }

  /// Display description (Chinese preferred)
  var displayDescription: String? {
    if let zh = descriptionZh, !zh.isEmpty {
      return zh
    }
    return description
  }

  /// Bortle scale description
  var bortleDescription: String {
    switch bortleScale {
    case 1: return "极佳黑暗天空"
    case 2: return "典型黑暗天空"
    case 3: return "乡村天空"
    case 4: return "乡村/郊区过渡"
    case 5: return "郊区天空"
    case 6: return "明亮郊区天空"
    case 7: return "郊区/城市过渡"
    case 8: return "城市天空"
    case 9: return "市中心天空"
    default: return "未知"
    }
  }

  /// Format distance
  var formattedDistance: String? {
    guard let distance = distanceKm else { return nil }
    if distance < 1 {
      return "\(Int(distance * 1000))m"
    }
    return String(format: "%.1fkm", distance)
  }

  /// Best seasons as readable string
  var bestSeasonsDescription: String? {
    guard let seasons = bestSeasons, !seasons.isEmpty else { return nil }
    return seasons.joined(separator: "、")
  }
}

enum LightPollutionLevel: String, Codable {
  case excellent = "excellent"
  case good = "good"
  case moderate = "moderate"
  case poor = "poor"

  var displayName: String {
    switch self {
    case .excellent: return "极佳"
    case .good: return "良好"
    case .moderate: return "一般"
    case .poor: return "较差"
    }
  }

  var color: String {
    switch self {
    case .excellent: return "green"
    case .good: return "blue"
    case .moderate: return "orange"
    case .poor: return "red"
    }
  }
}

// MARK: - Photography Reminder

struct PhotographyReminder: Codable, Identifiable {
  let id: String
  let type: PhotographyReminderType
  let locationName: String
  let latitude: Double
  let longitude: Double
  let date: String
  let startTime: String
  let endTime: String
  let notifyMinutesBefore: Int
}

enum PhotographyReminderType: String, Codable {
  case goldenHourMorning = "golden_hour_morning"
  case goldenHourEvening = "golden_hour_evening"
  case blueHourMorning = "blue_hour_morning"
  case blueHourEvening = "blue_hour_evening"
  case sunrise = "sunrise"
  case sunset = "sunset"

  var displayName: String {
    switch self {
    case .goldenHourMorning: return "晨间黄金时段"
    case .goldenHourEvening: return "傍晚黄金时段"
    case .blueHourMorning: return "晨间蓝调时刻"
    case .blueHourEvening: return "傍晚蓝调时刻"
    case .sunrise: return "日出"
    case .sunset: return "日落"
    }
  }

  var icon: String {
    switch self {
    case .goldenHourMorning, .goldenHourEvening: return "sun.and.horizon"
    case .blueHourMorning, .blueHourEvening: return "moon.and.stars"
    case .sunrise: return "sunrise"
    case .sunset: return "sunset"
    }
  }
}

// MARK: - API Response Wrappers

struct SunTimesResponse: Codable {
  let data: SunTimes
}

struct MoonPhaseResponse: Codable {
  let data: MoonPhase
}

struct AstronomicalEventsResponse: Codable {
  let data: [AstronomicalEvent]
}

struct StargazingSpotsResponse: Codable {
  let data: [StargazingSpot]
}
