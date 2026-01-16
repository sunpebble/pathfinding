import Foundation

// MARK: - Booking Status

enum HotelBookingStatus: String, Codable, CaseIterable {
  case confirmed = "confirmed"
  case pending = "pending"
  case cancelled = "cancelled"
  case completed = "completed"

  var displayName: String {
    switch self {
    case .confirmed: return "已确认"
    case .pending: return "待确认"
    case .cancelled: return "已取消"
    case .completed: return "已完成"
    }
  }

  var icon: String {
    switch self {
    case .confirmed: return "checkmark.circle.fill"
    case .pending: return "clock.fill"
    case .cancelled: return "xmark.circle.fill"
    case .completed: return "flag.checkered"
    }
  }

  var color: String {
    switch self {
    case .confirmed: return "green"
    case .pending: return "orange"
    case .cancelled: return "red"
    case .completed: return "blue"
    }
  }
}

// MARK: - Import Source

enum HotelImportSource: String, Codable {
  case manual = "manual"
  case email = "email"
  case importFile = "import"

  var displayName: String {
    switch self {
    case .manual: return "手动添加"
    case .email: return "邮件导入"
    case .importFile: return "文件导入"
    }
  }
}

// MARK: - Hotel Booking Model

struct HotelBooking: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let itineraryId: String?

  // Basic hotel information
  let hotelName: String
  let address: String?
  let latitude: Double?
  let longitude: Double?

  // Booking details
  let checkInDate: String
  let checkOutDate: String
  let checkInTime: String?
  let checkOutTime: String?

  // Room details
  let roomType: String?
  let roomCount: Int
  let guestCount: Int?

  // Price information
  let totalPrice: Double?
  let currency: String?
  let pricePerNight: Double?

  // Confirmation details
  let confirmationNumber: String?
  let bookingPlatform: String?
  let bookingUrl: String?

  // Contact information
  let hotelPhone: String?
  let hotelEmail: String?

  // Additional info
  let notes: String?
  let amenities: [String]?
  let images: [String]?

  // Import source
  let importSource: String?
  let rawEmailContent: String?

  // Status
  let status: String?

  // Timestamps
  let createdAt: String?
  let updatedAt: String?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case itineraryId = "itinerary_id"
    case hotelName = "hotel_name"
    case address, latitude, longitude
    case checkInDate = "check_in_date"
    case checkOutDate = "check_out_date"
    case checkInTime = "check_in_time"
    case checkOutTime = "check_out_time"
    case roomType = "room_type"
    case roomCount = "room_count"
    case guestCount = "guest_count"
    case totalPrice = "total_price"
    case currency
    case pricePerNight = "price_per_night"
    case confirmationNumber = "confirmation_number"
    case bookingPlatform = "booking_platform"
    case bookingUrl = "booking_url"
    case hotelPhone = "hotel_phone"
    case hotelEmail = "hotel_email"
    case notes, amenities, images
    case importSource = "import_source"
    case rawEmailContent = "raw_email_content"
    case status
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // Fallback for API that returns "id" directly
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)

    // Handle both _id and id
    if let convexId = try? container.decode(String.self, forKey: .id) {
      self.id = convexId
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.id = try altContainer.decode(String.self, forKey: .id)
    }

    // Try both snake_case and camelCase for userId
    if let uid = try? container.decode(String.self, forKey: .userId) {
      self.userId = uid
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.userId = try altContainer.decode(String.self, forKey: .userId)
    }

    self.itineraryId = try? container.decode(String.self, forKey: .itineraryId)

    // Try both cases for hotelName
    if let name = try? container.decode(String.self, forKey: .hotelName) {
      self.hotelName = name
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.hotelName = try altContainer.decode(String.self, forKey: .hotelName)
    }

    self.address = try? container.decode(String.self, forKey: .address)
    self.latitude = try? container.decode(Double.self, forKey: .latitude)
    self.longitude = try? container.decode(Double.self, forKey: .longitude)

    // Try both cases for checkInDate
    if let date = try? container.decode(String.self, forKey: .checkInDate) {
      self.checkInDate = date
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.checkInDate = try altContainer.decode(String.self, forKey: .checkInDate)
    }

    // Try both cases for checkOutDate
    if let date = try? container.decode(String.self, forKey: .checkOutDate) {
      self.checkOutDate = date
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.checkOutDate = try altContainer.decode(String.self, forKey: .checkOutDate)
    }

    self.checkInTime = try? container.decode(String.self, forKey: .checkInTime)
    self.checkOutTime = try? container.decode(String.self, forKey: .checkOutTime)
    self.roomType = try? container.decode(String.self, forKey: .roomType)

    // Try both cases for roomCount
    if let count = try? container.decode(Int.self, forKey: .roomCount) {
      self.roomCount = count
    } else {
      let altContainer = try decoder.container(keyedBy: AlternativeCodingKeys.self)
      self.roomCount = (try? altContainer.decode(Int.self, forKey: .roomCount)) ?? 1
    }

    self.guestCount = try? container.decode(Int.self, forKey: .guestCount)
    self.totalPrice = try? container.decode(Double.self, forKey: .totalPrice)
    self.currency = try? container.decode(String.self, forKey: .currency)
    self.pricePerNight = try? container.decode(Double.self, forKey: .pricePerNight)
    self.confirmationNumber = try? container.decode(String.self, forKey: .confirmationNumber)
    self.bookingPlatform = try? container.decode(String.self, forKey: .bookingPlatform)
    self.bookingUrl = try? container.decode(String.self, forKey: .bookingUrl)
    self.hotelPhone = try? container.decode(String.self, forKey: .hotelPhone)
    self.hotelEmail = try? container.decode(String.self, forKey: .hotelEmail)
    self.notes = try? container.decode(String.self, forKey: .notes)
    self.amenities = try? container.decode([String].self, forKey: .amenities)
    self.images = try? container.decode([String].self, forKey: .images)
    self.importSource = try? container.decode(String.self, forKey: .importSource)
    self.rawEmailContent = try? container.decode(String.self, forKey: .rawEmailContent)
    self.status = try? container.decode(String.self, forKey: .status)
    self.createdAt = try? container.decode(String.self, forKey: .createdAt)
    self.updatedAt = try? container.decode(String.self, forKey: .updatedAt)
  }

  private enum AlternativeCodingKeys: String, CodingKey {
    case id
    case userId
    case hotelName
    case checkInDate
    case checkOutDate
    case roomCount
  }

  // Computed properties
  var bookingStatus: HotelBookingStatus {
    HotelBookingStatus(rawValue: status ?? "confirmed") ?? .confirmed
  }

  var importSourceType: HotelImportSource {
    HotelImportSource(rawValue: importSource ?? "manual") ?? .manual
  }

  var formattedPrice: String {
    guard let price = totalPrice else { return "-" }
    let currencySymbol = currency == "USD" ? "$" : "¥"
    return String(format: "%@%.0f", currencySymbol, price)
  }

  var formattedPricePerNight: String {
    guard let price = pricePerNight else { return "-" }
    let currencySymbol = currency == "USD" ? "$" : "¥"
    return String(format: "%@%.0f/晚", currencySymbol, price)
  }

  var numberOfNights: Int {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    guard let checkIn = formatter.date(from: checkInDate),
          let checkOut = formatter.date(from: checkOutDate)
    else {
      return 1
    }
    let days = Calendar.current.dateComponents([.day], from: checkIn, to: checkOut).day ?? 1
    return max(1, days)
  }

  var formattedCheckInDate: String {
    formatDate(checkInDate)
  }

  var formattedCheckOutDate: String {
    formatDate(checkOutDate)
  }

  var hasLocation: Bool {
    latitude != nil && longitude != nil
  }

  private func formatDate(_ dateString: String) -> String {
    let inputFormatter = DateFormatter()
    inputFormatter.dateFormat = "yyyy-MM-dd"

    let outputFormatter = DateFormatter()
    outputFormatter.locale = Locale(identifier: "zh_CN")
    outputFormatter.dateFormat = "M月d日 EEE"

    guard let date = inputFormatter.date(from: dateString) else {
      return dateString
    }
    return outputFormatter.string(from: date)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: HotelBooking, rhs: HotelBooking) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Create/Update Input

struct CreateHotelBookingInput: Codable {
  let hotelName: String
  let itineraryId: String?
  let address: String?
  let latitude: Double?
  let longitude: Double?
  let checkInDate: String
  let checkOutDate: String
  let checkInTime: String?
  let checkOutTime: String?
  let roomType: String?
  let roomCount: Int
  let guestCount: Int?
  let totalPrice: Double?
  let currency: String?
  let pricePerNight: Double?
  let confirmationNumber: String?
  let bookingPlatform: String?
  let bookingUrl: String?
  let hotelPhone: String?
  let hotelEmail: String?
  let notes: String?
  let amenities: [String]?
  let status: String?

  enum CodingKeys: String, CodingKey {
    case hotelName
    case itineraryId
    case address, latitude, longitude
    case checkInDate
    case checkOutDate
    case checkInTime
    case checkOutTime
    case roomType
    case roomCount
    case guestCount
    case totalPrice
    case currency
    case pricePerNight
    case confirmationNumber
    case bookingPlatform
    case bookingUrl
    case hotelPhone
    case hotelEmail
    case notes, amenities, status
  }
}

struct UpdateHotelBookingInput: Codable {
  var hotelName: String?
  var itineraryId: String?
  var address: String?
  var latitude: Double?
  var longitude: Double?
  var checkInDate: String?
  var checkOutDate: String?
  var checkInTime: String?
  var checkOutTime: String?
  var roomType: String?
  var roomCount: Int?
  var guestCount: Int?
  var totalPrice: Double?
  var currency: String?
  var pricePerNight: Double?
  var confirmationNumber: String?
  var bookingPlatform: String?
  var bookingUrl: String?
  var hotelPhone: String?
  var hotelEmail: String?
  var notes: String?
  var amenities: [String]?
  var status: String?
}

// MARK: - Email Parse Result

struct EmailParseResult: Codable {
  let bookingId: String
  let needsManualReview: Bool
  let message: String

  enum CodingKeys: String, CodingKey {
    case bookingId = "booking_id"
    case needsManualReview = "needs_manual_review"
    case message
  }
}

// MARK: - API Response Types

struct HotelBookingListResponse: Codable {
  let success: Bool
  let data: [HotelBooking]
  let meta: HotelBookingPaginationMeta?
}

struct HotelBookingSingleResponse: Codable {
  let success: Bool
  let data: HotelBooking?
}

struct HotelBookingUpcomingResponse: Codable {
  let success: Bool
  let data: [HotelBooking]
}

struct EmailParseResponse: Codable {
  let success: Bool
  let data: EmailParseResult
}

struct HotelBookingPaginationMeta: Codable {
  let page: Int
  let pageSize: Int
  let totalCount: Int
  let totalPages: Int

  enum CodingKeys: String, CodingKey {
    case page
    case pageSize
    case totalCount
    case totalPages
  }
}

// MARK: - Hotel Review (for future use)

struct HotelReview: Codable, Identifiable, Hashable {
  let id: String
  let hotelBookingId: String
  let userId: String
  let rating: Double
  let title: String?
  let content: String?
  let pros: [String]?
  let cons: [String]?
  let photos: [String]?
  let stayDate: String?
  let createdAt: String

  enum CodingKeys: String, CodingKey {
    case id
    case hotelBookingId = "hotel_booking_id"
    case userId = "user_id"
    case rating, title, content, pros, cons, photos
    case stayDate = "stay_date"
    case createdAt = "created_at"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: HotelReview, rhs: HotelReview) -> Bool {
    lhs.id == rhs.id
  }
}
