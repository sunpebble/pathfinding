import Foundation

// MARK: - Safety Rating

/// Safety rating for a destination
struct SafetyRating: Codable, Identifiable {
  let id: String
  let destinationName: String
  let destinationNameEn: String?
  let countryCode: String
  let cityId: String?
  let overallRating: Double
  let crimeRating: Double
  let healthRating: Double
  let naturalDisasterRating: Double
  let transportRating: Double
  let womenSafetyRating: Double?
  let lgbtqSafetyRating: Double?
  let summary: String
  let summaryEn: String?
  let generalTips: [String]
  let emergencyNumbers: EmergencyNumbers?
  let source: String
  let sourceUrl: String?
  let lastVerifiedAt: TimeInterval
  let createdAt: TimeInterval
  let updatedAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case id
    case destinationName = "destination_name"
    case destinationNameEn = "destination_name_en"
    case countryCode = "country_code"
    case cityId = "city_id"
    case overallRating = "overall_rating"
    case crimeRating = "crime_rating"
    case healthRating = "health_rating"
    case naturalDisasterRating = "natural_disaster_rating"
    case transportRating = "transport_rating"
    case womenSafetyRating = "women_safety_rating"
    case lgbtqSafetyRating = "lgbtq_safety_rating"
    case summary
    case summaryEn = "summary_en"
    case generalTips = "general_tips"
    case emergencyNumbers = "emergency_numbers"
    case source
    case sourceUrl = "source_url"
    case lastVerifiedAt = "last_verified_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  /// Get safety level description based on overall rating
  var safetyLevel: SafetyLevel {
    switch overallRating {
    case 4.5...: return .verySafe
    case 3.5..<4.5: return .safe
    case 2.5..<3.5: return .moderate
    case 1.5..<2.5: return .dangerous
    default: return .veryDangerous
    }
  }
}

enum SafetyLevel: String, CaseIterable {
  case verySafe = "very_safe"
  case safe = "safe"
  case moderate = "moderate"
  case dangerous = "dangerous"
  case veryDangerous = "very_dangerous"

  var displayName: String {
    switch self {
    case .verySafe: return "非常安全"
    case .safe: return "安全"
    case .moderate: return "一般"
    case .dangerous: return "危险"
    case .veryDangerous: return "非常危险"
    }
  }

  var icon: String {
    switch self {
    case .verySafe: return "checkmark.shield.fill"
    case .safe: return "shield.fill"
    case .moderate: return "exclamationmark.shield.fill"
    case .dangerous: return "xmark.shield.fill"
    case .veryDangerous: return "exclamationmark.triangle.fill"
    }
  }

  var color: String {
    switch self {
    case .verySafe: return "green"
    case .safe: return "blue"
    case .moderate: return "yellow"
    case .dangerous: return "orange"
    case .veryDangerous: return "red"
    }
  }
}

struct EmergencyNumbers: Codable {
  let police: String?
  let ambulance: String?
  let fire: String?
  let touristHotline: String?

  enum CodingKeys: String, CodingKey {
    case police
    case ambulance
    case fire
    case touristHotline = "tourist_hotline"
  }
}

// MARK: - Safety Alert

/// Travel warning or safety alert
struct SafetyAlert: Codable, Identifiable {
  let id: String
  let destinationName: String
  let countryCode: String
  let cityId: String?
  let affectedAreas: [String]?
  let alertType: AlertType
  let severity: SafetyAlertSeverity
  let title: String
  let titleEn: String?
  let description: String
  let descriptionEn: String?
  let recommendations: [String]
  let avoidAreas: [String]?
  let startDate: TimeInterval
  let endDate: TimeInterval?
  let isActive: Bool
  let source: String
  let sourceUrl: String?
  let officialAdvisoryLevel: String?
  let createdAt: TimeInterval
  let updatedAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case id
    case destinationName = "destination_name"
    case countryCode = "country_code"
    case cityId = "city_id"
    case affectedAreas = "affected_areas"
    case alertType = "alert_type"
    case severity
    case title
    case titleEn = "title_en"
    case description
    case descriptionEn = "description_en"
    case recommendations
    case avoidAreas = "avoid_areas"
    case startDate = "start_date"
    case endDate = "end_date"
    case isActive = "is_active"
    case source
    case sourceUrl = "source_url"
    case officialAdvisoryLevel = "official_advisory_level"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}

enum AlertType: String, Codable, CaseIterable {
  case travelAdvisory = "travel_advisory"
  case healthWarning = "health_warning"
  case naturalDisaster = "natural_disaster"
  case civilUnrest = "civil_unrest"
  case terrorism = "terrorism"
  case crimeSpike = "crime_spike"
  case scamWarning = "scam_warning"
  case other = "other"

  var displayName: String {
    switch self {
    case .travelAdvisory: return "旅行警告"
    case .healthWarning: return "健康警告"
    case .naturalDisaster: return "自然灾害"
    case .civilUnrest: return "社会动荡"
    case .terrorism: return "恐怖威胁"
    case .crimeSpike: return "犯罪高发"
    case .scamWarning: return "诈骗警告"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .travelAdvisory: return "airplane.circle.fill"
    case .healthWarning: return "cross.circle.fill"
    case .naturalDisaster: return "hurricane"
    case .civilUnrest: return "person.3.fill"
    case .terrorism: return "exclamationmark.triangle.fill"
    case .crimeSpike: return "lock.shield.fill"
    case .scamWarning: return "exclamationmark.bubble.fill"
    case .other: return "info.circle.fill"
    }
  }
}

enum SafetyAlertSeverity: String, Codable, CaseIterable {
  case info = "info"
  case low = "low"
  case medium = "medium"
  case high = "high"
  case critical = "critical"

  var displayName: String {
    switch self {
    case .info: return "信息"
    case .low: return "低风险"
    case .medium: return "中风险"
    case .high: return "高风险"
    case .critical: return "极高风险"
    }
  }

  var color: String {
    switch self {
    case .info: return "blue"
    case .low: return "green"
    case .medium: return "yellow"
    case .high: return "orange"
    case .critical: return "red"
    }
  }
}

// MARK: - Danger Zone

/// Specific dangerous area to avoid or be cautious about
struct DangerZone: Codable, Identifiable {
  let id: String
  let destinationName: String
  let countryCode: String
  let cityId: String?
  let zoneName: String
  let zoneNameEn: String?
  let latitude: Double
  let longitude: Double
  let radiusMeters: Double?
  let polygon: [Coordinate]?
  let dangerLevel: DangerLevel
  let dangerTypes: [DangerType]
  let description: String
  let descriptionEn: String?
  let precautions: [String]
  let dangerousTimes: DangerousTimes?
  let source: String
  let reportCount: Int
  let isVerified: Bool
  let isActive: Bool
  let createdAt: TimeInterval
  let updatedAt: TimeInterval
  var distance: Double?  // Distance from user's location (km)

  enum CodingKeys: String, CodingKey {
    case id
    case destinationName = "destination_name"
    case countryCode = "country_code"
    case cityId = "city_id"
    case zoneName = "zone_name"
    case zoneNameEn = "zone_name_en"
    case latitude
    case longitude
    case radiusMeters = "radius_meters"
    case polygon
    case dangerLevel = "danger_level"
    case dangerTypes = "danger_types"
    case description
    case descriptionEn = "description_en"
    case precautions
    case dangerousTimes = "dangerous_times"
    case source
    case reportCount = "report_count"
    case isVerified = "is_verified"
    case isActive = "is_active"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case distance
  }
}

struct Coordinate: Codable {
  let lat: Double
  let lng: Double
}

enum DangerLevel: String, Codable, CaseIterable {
  case caution = "caution"
  case avoidNight = "avoid_night"
  case avoidAlone = "avoid_alone"
  case highRisk = "high_risk"
  case noGo = "no_go"

  var displayName: String {
    switch self {
    case .caution: return "注意安全"
    case .avoidNight: return "避免夜间前往"
    case .avoidAlone: return "避免单独前往"
    case .highRisk: return "高风险区域"
    case .noGo: return "禁止进入"
    }
  }

  var icon: String {
    switch self {
    case .caution: return "exclamationmark.circle.fill"
    case .avoidNight: return "moon.fill"
    case .avoidAlone: return "person.fill.xmark"
    case .highRisk: return "exclamationmark.triangle.fill"
    case .noGo: return "nosign"
    }
  }

  var color: String {
    switch self {
    case .caution: return "yellow"
    case .avoidNight: return "purple"
    case .avoidAlone: return "orange"
    case .highRisk: return "red"
    case .noGo: return "red"
    }
  }
}

enum DangerType: String, Codable, CaseIterable {
  case crime = "crime"
  case scam = "scam"
  case traffic = "traffic"
  case naturalHazard = "natural_hazard"
  case political = "political"
  case health = "health"
  case other = "other"

  var displayName: String {
    switch self {
    case .crime: return "犯罪"
    case .scam: return "诈骗"
    case .traffic: return "交通"
    case .naturalHazard: return "自然灾害"
    case .political: return "政治"
    case .health: return "健康"
    case .other: return "其他"
    }
  }
}

struct DangerousTimes: Codable {
  let allDay: Bool
  let nightOnly: Bool?
  let specificHours: String?
  let specificDays: [String]?

  enum CodingKeys: String, CodingKey {
    case allDay = "all_day"
    case nightOnly = "night_only"
    case specificHours = "specific_hours"
    case specificDays = "specific_days"
  }
}

// MARK: - Incident Report

/// User-reported safety incident
struct SafetyIncidentReport: Codable, Identifiable {
  let id: String
  let userId: String
  let isAnonymous: Bool
  let destinationName: String
  let countryCode: String
  let cityId: String?
  let specificLocation: String?
  let latitude: Double?
  let longitude: Double?
  let incidentType: IncidentType
  let severity: IncidentSeverity
  let title: String
  let description: String
  let incidentDate: TimeInterval
  let wasPoliceInvolved: Bool?
  let wasResolved: Bool?
  let resolutionNotes: String?
  let status: IncidentStatus
  let helpfulCount: Int
  let createdAt: TimeInterval
  let updatedAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case isAnonymous = "is_anonymous"
    case destinationName = "destination_name"
    case countryCode = "country_code"
    case cityId = "city_id"
    case specificLocation = "specific_location"
    case latitude
    case longitude
    case incidentType = "incident_type"
    case severity
    case title
    case description
    case incidentDate = "incident_date"
    case wasPoliceInvolved = "was_police_involved"
    case wasResolved = "was_resolved"
    case resolutionNotes = "resolution_notes"
    case status
    case helpfulCount = "helpful_count"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}

enum IncidentType: String, Codable, CaseIterable {
  case theft = "theft"
  case assault = "assault"
  case scam = "scam"
  case harassment = "harassment"
  case trafficAccident = "traffic_accident"
  case naturalDisaster = "natural_disaster"
  case healthIssue = "health_issue"
  case policeIssue = "police_issue"
  case other = "other"

  var displayName: String {
    switch self {
    case .theft: return "盗窃"
    case .assault: return "袭击"
    case .scam: return "诈骗"
    case .harassment: return "骚扰"
    case .trafficAccident: return "交通事故"
    case .naturalDisaster: return "自然灾害"
    case .healthIssue: return "健康问题"
    case .policeIssue: return "警察问题"
    case .other: return "其他"
    }
  }

  var icon: String {
    switch self {
    case .theft: return "bag.fill.badge.minus"
    case .assault: return "figure.walk.motion"
    case .scam: return "exclamationmark.bubble.fill"
    case .harassment: return "hand.raised.fill"
    case .trafficAccident: return "car.fill"
    case .naturalDisaster: return "hurricane"
    case .healthIssue: return "cross.circle.fill"
    case .policeIssue: return "person.badge.shield.checkmark.fill"
    case .other: return "questionmark.circle.fill"
    }
  }
}

enum IncidentSeverity: String, Codable, CaseIterable {
  case minor = "minor"
  case moderate = "moderate"
  case severe = "severe"
  case critical = "critical"

  var displayName: String {
    switch self {
    case .minor: return "轻微"
    case .moderate: return "中等"
    case .severe: return "严重"
    case .critical: return "极其严重"
    }
  }

  var color: String {
    switch self {
    case .minor: return "yellow"
    case .moderate: return "orange"
    case .severe: return "red"
    case .critical: return "red"
    }
  }
}

enum IncidentStatus: String, Codable, CaseIterable {
  case pending = "pending"
  case verified = "verified"
  case rejected = "rejected"
  case resolved = "resolved"

  var displayName: String {
    switch self {
    case .pending: return "待审核"
    case .verified: return "已验证"
    case .rejected: return "已拒绝"
    case .resolved: return "已解决"
    }
  }
}

// MARK: - Destination Safety Info

/// Comprehensive safety information for a destination
struct DestinationSafetyInfo: Codable {
  let rating: SafetyRating?
  let alerts: [SafetyAlert]
  let dangerZones: [DangerZone]
  let recentIncidents: [SafetyIncidentReport]
  let hasActiveAlerts: Bool
  let hasCriticalAlerts: Bool
  let dangerZoneCount: Int

  enum CodingKeys: String, CodingKey {
    case rating
    case alerts
    case dangerZones = "danger_zones"
    case recentIncidents = "recent_incidents"
    case hasActiveAlerts = "has_active_alerts"
    case hasCriticalAlerts = "has_critical_alerts"
    case dangerZoneCount = "danger_zone_count"
  }
}

// MARK: - API Responses

struct SafetyRatingResponse: Codable {
  let data: SafetyRating?
}

struct SafetyRatingsListResponse: Codable {
  let data: [SafetyRating]
}

struct SafetyAlertsResponse: Codable {
  let data: [SafetyAlert]
}

struct SafetyAlertResponse: Codable {
  let data: SafetyAlert
}

struct DangerZonesResponse: Codable {
  let data: [DangerZone]
}

struct IncidentReportsResponse: Codable {
  let data: [SafetyIncidentReport]
}

struct DestinationSafetyInfoResponse: Codable {
  let data: DestinationSafetyInfo
}
