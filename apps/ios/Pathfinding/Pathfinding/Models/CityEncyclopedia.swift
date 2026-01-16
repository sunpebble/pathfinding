import Foundation

// MARK: - Travel Season

enum TravelSeason: String, Codable, CaseIterable {
  case spring
  case summer
  case autumn
  case winter
  case allYear = "all_year"

  var displayName: String {
    switch self {
    case .spring: return "春季"
    case .summer: return "夏季"
    case .autumn: return "秋季"
    case .winter: return "冬季"
    case .allYear: return "全年"
    }
  }

  var icon: String {
    switch self {
    case .spring: return "leaf.fill"
    case .summer: return "sun.max.fill"
    case .autumn: return "leaf.arrow.circlepath"
    case .winter: return "snowflake"
    case .allYear: return "calendar"
    }
  }
}

// MARK: - Crowd Level

enum CrowdLevel: String, Codable {
  case low
  case medium
  case high

  var displayName: String {
    switch self {
    case .low: return "淡季"
    case .medium: return "平季"
    case .high: return "旺季"
    }
  }

  var color: String {
    switch self {
    case .low: return "green"
    case .medium: return "yellow"
    case .high: return "red"
    }
  }
}

// MARK: - Price Level

enum PriceLevel: String, Codable {
  case low
  case medium
  case high

  var displayName: String {
    switch self {
    case .low: return "低价位"
    case .medium: return "中等价位"
    case .high: return "高价位"
    }
  }

  var icon: String {
    switch self {
    case .low: return "dollarsign"
    case .medium: return "dollarsign.circle"
    case .high: return "dollarsign.circle.fill"
    }
  }
}

// MARK: - Water Safety

enum WaterSafety: String, Codable {
  case safe
  case boil
  case bottled

  var displayName: String {
    switch self {
    case .safe: return "可直接饮用"
    case .boil: return "需煮沸"
    case .bottled: return "建议瓶装水"
    }
  }

  var icon: String {
    switch self {
    case .safe: return "drop.fill"
    case .boil: return "flame.fill"
    case .bottled: return "waterbottle.fill"
    }
  }
}

// MARK: - Custom Importance

enum CustomImportance: String, Codable {
  case low
  case medium
  case high

  var displayName: String {
    switch self {
    case .low: return "了解即可"
    case .medium: return "较重要"
    case .high: return "非常重要"
    }
  }
}

// MARK: - Custom Category

enum CustomCategory: String, Codable, CaseIterable {
  case etiquette
  case religion
  case dining
  case dress
  case gift
  case gesture
  case general

  var displayName: String {
    switch self {
    case .etiquette: return "礼仪"
    case .religion: return "宗教"
    case .dining: return "餐饮"
    case .dress: return "着装"
    case .gift: return "送礼"
    case .gesture: return "手势"
    case .general: return "综合"
    }
  }

  var icon: String {
    switch self {
    case .etiquette: return "hand.wave.fill"
    case .religion: return "building.columns.fill"
    case .dining: return "fork.knife"
    case .dress: return "tshirt.fill"
    case .gift: return "gift.fill"
    case .gesture: return "hand.raised.fill"
    case .general: return "info.circle.fill"
    }
  }
}

// MARK: - City Basic Info

struct CityBasicInfo: Codable {
  let population: Int?
  let populationYear: Int?
  let area: Double?
  let elevation: Double?
  let climate: String?
  let climateEn: String?
  let motto: String?
  let mottoEn: String?
  let nicknames: [String]?
  let nicknamesEn: [String]?

  enum CodingKeys: String, CodingKey {
    case population
    case populationYear = "population_year"
    case area
    case elevation
    case climate
    case climateEn = "climate_en"
    case motto
    case mottoEn = "motto_en"
    case nicknames
    case nicknamesEn = "nicknames_en"
  }

  /// Formatted population string (e.g., "2,100万")
  var formattedPopulation: String? {
    guard let pop = population else { return nil }
    if pop >= 10_000_000 {
      return String(format: "%.0f万", Double(pop) / 10000)
    } else if pop >= 10000 {
      return String(format: "%.1f万", Double(pop) / 10000)
    } else {
      return "\(pop)"
    }
  }

  /// Formatted area string (e.g., "2,188 km²")
  var formattedArea: String? {
    guard let a = area else { return nil }
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 0
    return "\(formatter.string(from: NSNumber(value: a)) ?? "\(Int(a))") km²"
  }

  /// Formatted elevation string (e.g., "40 m")
  var formattedElevation: String? {
    guard let e = elevation else { return nil }
    return "\(Int(e)) m"
  }
}

// MARK: - City History

struct CityHistory: Codable {
  let foundedYear: Int?
  let historicalNames: [String]?
  let briefHistory: String
  let briefHistoryEn: String?
  let culturalHighlights: [String]
  let culturalHighlightsEn: [String]?
  let famousFor: [String]
  let famousForEn: [String]?
  let worldHeritageSites: [String]?

  enum CodingKeys: String, CodingKey {
    case foundedYear = "founded_year"
    case historicalNames = "historical_names"
    case briefHistory = "brief_history"
    case briefHistoryEn = "brief_history_en"
    case culturalHighlights = "cultural_highlights"
    case culturalHighlightsEn = "cultural_highlights_en"
    case famousFor = "famous_for"
    case famousForEn = "famous_for_en"
    case worldHeritageSites = "world_heritage_sites"
  }

  /// Formatted founded year (e.g., "公元前660年")
  var formattedFoundedYear: String? {
    guard let year = foundedYear else { return nil }
    if year < 0 {
      return "公元前\(abs(year))年"
    } else {
      return "公元\(year)年"
    }
  }
}

// MARK: - Best Travel Time

struct BestTravelTime: Codable {
  let seasons: [TravelSeason]
  let months: [Int]
  let description: String
  let descriptionEn: String?
  let weatherNotes: String?
  let crowdLevel: CrowdLevel?
  let priceLevel: PriceLevel?

  enum CodingKeys: String, CodingKey {
    case seasons
    case months
    case description
    case descriptionEn = "description_en"
    case weatherNotes = "weather_notes"
    case crowdLevel = "crowd_level"
    case priceLevel = "price_level"
  }

  /// Formatted months string (e.g., "3-5月, 9-11月")
  var formattedMonths: String {
    let sortedMonths = months.sorted()
    var ranges: [[Int]] = []
    var currentRange: [Int] = []

    for month in sortedMonths {
      if currentRange.isEmpty {
        currentRange = [month]
      } else if month == currentRange.last! + 1 {
        currentRange.append(month)
      } else {
        ranges.append(currentRange)
        currentRange = [month]
      }
    }
    if !currentRange.isEmpty {
      ranges.append(currentRange)
    }

    return ranges.map { range in
      if range.count == 1 {
        return "\(range[0])月"
      } else {
        return "\(range.first!)-\(range.last!)月"
      }
    }.joined(separator: ", ")
  }
}

// MARK: - Local Custom

struct LocalCustom: Codable, Identifiable {
  let category: CustomCategory
  let title: String
  let titleEn: String?
  let description: String
  let descriptionEn: String?
  let isTaboo: Bool
  let importance: CustomImportance

  var id: String { "\(category.rawValue)_\(title)" }

  enum CodingKeys: String, CodingKey {
    case category
    case title
    case titleEn = "title_en"
    case description
    case descriptionEn = "description_en"
    case isTaboo = "is_taboo"
    case importance
  }
}

// MARK: - Practical Info

struct PracticalInfo: Codable {
  let voltage: String
  let plugType: [String]
  let currency: String
  let currencySymbol: String
  let currencyNameLocal: String
  let currencyNameEn: String
  let tippingCustom: String
  let tippingCustomEn: String?
  let waterSafety: WaterSafety
  let waterSafetyNote: String?
  let visaRequired: Bool?
  let visaNote: String?
  let languageOfficial: [String]
  let languageCommon: [String]
  let emergencyNumber: String
  let ambulanceNumber: String
  let fireNumber: String
  let touristHotline: String?

  enum CodingKeys: String, CodingKey {
    case voltage
    case plugType = "plug_type"
    case currency
    case currencySymbol = "currency_symbol"
    case currencyNameLocal = "currency_name_local"
    case currencyNameEn = "currency_name_en"
    case tippingCustom = "tipping_custom"
    case tippingCustomEn = "tipping_custom_en"
    case waterSafety = "water_safety"
    case waterSafetyNote = "water_safety_note"
    case visaRequired = "visa_required"
    case visaNote = "visa_note"
    case languageOfficial = "language_official"
    case languageCommon = "language_common"
    case emergencyNumber = "emergency_number"
    case ambulanceNumber = "ambulance_number"
    case fireNumber = "fire_number"
    case touristHotline = "tourist_hotline"
  }

  /// Formatted plug types (e.g., "A, B 型")
  var formattedPlugTypes: String {
    plugType.map { "\($0)型" }.joined(separator: ", ")
  }
}

// MARK: - City Encyclopedia

struct CityEncyclopedia: Codable, Identifiable {
  let id: String
  let cityId: String
  let basicInfo: CityBasicInfo?
  let history: CityHistory?
  let bestTravelTime: BestTravelTime?
  let customs: [LocalCustom]
  let practicalInfo: PracticalInfo?
  let sources: [String]?
  let lastUpdatedAt: Int
  let createdAt: Int

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case cityId = "city_id"
    case basicInfo = "basic_info"
    case history
    case bestTravelTime = "best_travel_time"
    case customs
    case practicalInfo = "practical_info"
    case sources
    case lastUpdatedAt = "last_updated_at"
    case createdAt = "created_at"
  }

  /// Formatted last updated date
  var formattedLastUpdated: String {
    let date = Date(timeIntervalSince1970: Double(lastUpdatedAt) / 1000)
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: date)
  }

  /// Get taboo customs
  var tabooCustems: [LocalCustom] {
    customs.filter { $0.isTaboo }
  }

  /// Get non-taboo customs
  var normalCustoms: [LocalCustom] {
    customs.filter { !$0.isTaboo }
  }

  /// Group customs by category
  var customsByCategory: [CustomCategory: [LocalCustom]] {
    Dictionary(grouping: customs, by: { $0.category })
  }
}

// MARK: - City With Encyclopedia

struct CityWithEncyclopedia: Codable, Identifiable {
  let id: String
  let name: String
  let nameEn: String?
  let timezone: String
  let countryCode: String
  let latitude: Double
  let longitude: Double
  let utcOffset: Int?
  let dstOffset: Int?
  let observesDst: Bool?
  let encyclopedia: CityEncyclopedia?
  let hasEncyclopedia: Bool

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
    case encyclopedia
    case hasEncyclopedia = "has_encyclopedia"
  }

  /// Display name (prefer Chinese name)
  var displayName: String {
    name
  }

  /// English display name
  var displayNameEn: String? {
    nameEn
  }
}

// MARK: - API Response Wrappers

struct CityEncyclopediaResponse: Codable {
  let data: CityWithEncyclopedia
}

struct CitiesWithEncyclopediaResponse: Codable {
  let data: [CityWithEncyclopedia]
}

struct EncyclopediaCreateResponse: Codable {
  let data: EncyclopediaIdData
}

struct EncyclopediaIdData: Codable {
  let id: String
}
