import Foundation

// MARK: - Luggage Status

/// Luggage status enumeration
enum LuggageStatus: String, Codable, CaseIterable {
  case checkedIn = "checked_in"
  case inTransit = "in_transit"
  case arrived
  case claimed
  case delayed
  case lost
  case found
  case damaged

  var displayName: String {
    switch self {
    case .checkedIn: return "已托运"
    case .inTransit: return "运输中"
    case .arrived: return "已到达"
    case .claimed: return "已提取"
    case .delayed: return "延误"
    case .lost: return "丢失"
    case .found: return "已找回"
    case .damaged: return "损坏"
    }
  }

  var color: String {
    switch self {
    case .checkedIn: return "blue"
    case .inTransit: return "purple"
    case .arrived: return "green"
    case .claimed: return "gray"
    case .delayed: return "orange"
    case .lost: return "red"
    case .found: return "teal"
    case .damaged: return "red"
    }
  }

  var icon: String {
    switch self {
    case .checkedIn: return "suitcase"
    case .inTransit: return "airplane"
    case .arrived: return "checkmark.circle"
    case .claimed: return "hand.raised"
    case .delayed: return "clock.badge.exclamationmark"
    case .lost: return "exclamationmark.triangle"
    case .found: return "magnifyingglass"
    case .damaged: return "xmark.circle"
    }
  }
}

// MARK: - Luggage Size

/// Luggage size enumeration
enum LuggageSize: String, Codable, CaseIterable {
  case cabin
  case medium
  case large
  case oversized

  var displayName: String {
    switch self {
    case .cabin: return "登机箱"
    case .medium: return "中型"
    case .large: return "大型"
    case .oversized: return "超大件"
    }
  }

  var dimensions: String {
    switch self {
    case .cabin: return "约 55x40x20 cm"
    case .medium: return "约 68x45x25 cm"
    case .large: return "约 78x50x30 cm"
    case .oversized: return "超过标准尺寸"
    }
  }

  var icon: String {
    switch self {
    case .cabin: return "bag"
    case .medium: return "suitcase"
    case .large: return "suitcase.fill"
    case .oversized: return "shippingbox"
    }
  }
}

// MARK: - Luggage

/// Luggage model
struct Luggage: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let flightBookingId: String?
  let itineraryId: String?
  let tagNumber: String?
  let description: String
  let color: String?
  let brand: String?
  let size: LuggageSize?
  let weight: Double?
  let dimensions: String?
  let features: [String]?
  let tagPhotoUrl: String?
  let luggagePhotoUrls: [String]?
  let status: LuggageStatus
  let lastKnownLocation: String?
  let lossReportFiled: Bool?
  let lossReportNumber: String?
  let lossReportDate: Int64?
  let lossReportNotes: String?
  let airlineCode: String?
  let airlineName: String?
  let airlineTrackingUrl: String?
  let airlineContactPhone: String?
  let airlineContactEmail: String?
  let reminderEnabled: Bool?
  let reminderTime: Int?
  let createdAt: Int64
  let updatedAt: Int64

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case flightBookingId = "flight_booking_id"
    case itineraryId = "itinerary_id"
    case tagNumber = "tag_number"
    case description
    case color
    case brand
    case size
    case weight
    case dimensions
    case features
    case tagPhotoUrl = "tag_photo_url"
    case luggagePhotoUrls = "luggage_photo_urls"
    case status
    case lastKnownLocation = "last_known_location"
    case lossReportFiled = "loss_report_filed"
    case lossReportNumber = "loss_report_number"
    case lossReportDate = "loss_report_date"
    case lossReportNotes = "loss_report_notes"
    case airlineCode = "airline_code"
    case airlineName = "airline_name"
    case airlineTrackingUrl = "airline_tracking_url"
    case airlineContactPhone = "airline_contact_phone"
    case airlineContactEmail = "airline_contact_email"
    case reminderEnabled = "reminder_enabled"
    case reminderTime = "reminder_time"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: Double(createdAt) / 1000)
  }

  var updatedDate: Date {
    Date(timeIntervalSince1970: Double(updatedAt) / 1000)
  }

  var lossReportFiledDate: Date? {
    guard let ts = lossReportDate else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var hasLossReport: Bool {
    lossReportFiled == true || lossReportNumber != nil
  }

  var isActive: Bool {
    status != .claimed
  }

  var displayName: String {
    if let brand = brand, !brand.isEmpty {
      return "\(brand) \(description)"
    }
    return description
  }

  var displayFeatures: String {
    guard let features = features, !features.isEmpty else { return "" }
    return features.joined(separator: ", ")
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: Luggage, rhs: Luggage) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Luggage Stats

/// Luggage statistics
struct LuggageStats: Codable {
  let total: Int
  let active: Int
  let claimed: Int
  let lost: Int
  let delayed: Int
  let damaged: Int

  enum CodingKeys: String, CodingKey {
    case total
    case active
    case claimed
    case lost
    case delayed
    case damaged
  }
}

// MARK: - Airline Info

/// Airline baggage tracking information
struct AirlineBaggageInfo: Codable, Identifiable {
  let code: String
  let name: String
  let nameEn: String
  let trackingUrl: String
  let phone: String

  enum CodingKeys: String, CodingKey {
    case code
    case name
    case nameEn = "name_en"
    case trackingUrl = "tracking_url"
    case phone
  }

  var id: String { code }
}

// MARK: - Loss Report Guide

/// Loss report guide step
struct LossReportStep: Codable, Identifiable {
  let step: Int
  let title: String
  let description: String

  var id: Int { step }
}

/// Loss report guide
struct LossReportGuide: Codable {
  let title: String
  let steps: [LossReportStep]
  let requiredDocuments: [String]
  let tips: [String]
  let worldTracerUrl: String

  enum CodingKeys: String, CodingKey {
    case title
    case steps
    case requiredDocuments = "required_documents"
    case tips
    case worldTracerUrl = "world_tracer_url"
  }
}

// MARK: - Loss Report Template

/// Loss report template for specific airlines
struct LossReportTemplate: Codable, Identifiable {
  let id: String
  let airlineCode: String
  let airlineName: String
  let airlineNameEn: String?
  let baggageServicePhone: String?
  let baggageServiceEmail: String?
  let baggageServiceUrl: String?
  let trackingUrl: String?
  let reportInstructions: String?
  let reportInstructionsEn: String?
  let requiredDocuments: [String]?
  let compensationPolicy: String?
  let compensationPolicyEn: String?
  let maxCompensationAmount: Double?
  let claimDeadlineDays: Int?

  enum CodingKeys: String, CodingKey {
    case id
    case airlineCode = "airline_code"
    case airlineName = "airline_name"
    case airlineNameEn = "airline_name_en"
    case baggageServicePhone = "baggage_service_phone"
    case baggageServiceEmail = "baggage_service_email"
    case baggageServiceUrl = "baggage_service_url"
    case trackingUrl = "tracking_url"
    case reportInstructions = "report_instructions"
    case reportInstructionsEn = "report_instructions_en"
    case requiredDocuments = "required_documents"
    case compensationPolicy = "compensation_policy"
    case compensationPolicyEn = "compensation_policy_en"
    case maxCompensationAmount = "max_compensation_amount"
    case claimDeadlineDays = "claim_deadline_days"
  }
}

// MARK: - Create Luggage Input

/// Input for creating a new luggage entry
struct CreateLuggageInput: Encodable {
  let flightBookingId: String?
  let itineraryId: String?
  let tagNumber: String?
  let description: String
  let color: String?
  let brand: String?
  let size: LuggageSize?
  let weight: Double?
  let dimensions: String?
  let features: [String]?
  let tagPhotoUrl: String?
  let luggagePhotoUrls: [String]?
  let status: LuggageStatus?
  let airlineCode: String?
  let airlineName: String?
  let airlineTrackingUrl: String?
  let airlineContactPhone: String?
  let airlineContactEmail: String?
  let reminderEnabled: Bool?
  let reminderTime: Int?

  enum CodingKeys: String, CodingKey {
    case flightBookingId = "flight_booking_id"
    case itineraryId = "itinerary_id"
    case tagNumber = "tag_number"
    case description
    case color
    case brand
    case size
    case weight
    case dimensions
    case features
    case tagPhotoUrl = "tag_photo_url"
    case luggagePhotoUrls = "luggage_photo_urls"
    case status
    case airlineCode = "airline_code"
    case airlineName = "airline_name"
    case airlineTrackingUrl = "airline_tracking_url"
    case airlineContactPhone = "airline_contact_phone"
    case airlineContactEmail = "airline_contact_email"
    case reminderEnabled = "reminder_enabled"
    case reminderTime = "reminder_time"
  }
}

// MARK: - Update Luggage Input

/// Input for updating a luggage entry
struct UpdateLuggageInput: Encodable {
  var flightBookingId: String?
  var itineraryId: String?
  var tagNumber: String?
  var description: String?
  var color: String?
  var brand: String?
  var size: LuggageSize?
  var weight: Double?
  var dimensions: String?
  var features: [String]?
  var tagPhotoUrl: String?
  var luggagePhotoUrls: [String]?
  var status: LuggageStatus?
  var lastKnownLocation: String?
  var airlineCode: String?
  var airlineName: String?
  var airlineTrackingUrl: String?
  var airlineContactPhone: String?
  var airlineContactEmail: String?
  var reminderEnabled: Bool?
  var reminderTime: Int?

  enum CodingKeys: String, CodingKey {
    case flightBookingId = "flight_booking_id"
    case itineraryId = "itinerary_id"
    case tagNumber = "tag_number"
    case description
    case color
    case brand
    case size
    case weight
    case dimensions
    case features
    case tagPhotoUrl = "tag_photo_url"
    case luggagePhotoUrls = "luggage_photo_urls"
    case status
    case lastKnownLocation = "last_known_location"
    case airlineCode = "airline_code"
    case airlineName = "airline_name"
    case airlineTrackingUrl = "airline_tracking_url"
    case airlineContactPhone = "airline_contact_phone"
    case airlineContactEmail = "airline_contact_email"
    case reminderEnabled = "reminder_enabled"
    case reminderTime = "reminder_time"
  }
}

// MARK: - API Response Models

/// Luggage list response
struct LuggageListResponse: Codable {
  let success: Bool
  let data: [Luggage]
  let meta: LuggageMeta

  struct LuggageMeta: Codable {
    let page: Int
    let pageSize: Int
    let totalCount: Int
    let totalPages: Int

    enum CodingKeys: String, CodingKey {
      case page
      case pageSize = "page_size"
      case totalCount = "total_count"
      case totalPages = "total_pages"
    }
  }
}

/// Single luggage response
struct LuggageResponse: Codable {
  let success: Bool
  let data: Luggage
}

/// Luggage stats response
struct LuggageStatsResponse: Codable {
  let success: Bool
  let data: LuggageStats
}

/// Airlines list response
struct AirlinesResponse: Codable {
  let success: Bool
  let data: [AirlineBaggageInfo]
}

/// Loss report guide response
struct LossReportGuideResponse: Codable {
  let success: Bool
  let data: LossReportGuide
}

/// Loss report templates response
struct LossReportTemplatesResponse: Codable {
  let success: Bool
  let data: [LossReportTemplate]
}

/// Single loss report template response
struct LossReportTemplateResponse: Codable {
  let success: Bool
  let data: LossReportTemplate?
}
