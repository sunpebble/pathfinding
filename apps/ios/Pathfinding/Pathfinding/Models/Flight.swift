import Foundation

// MARK: - Flight Status

/// Flight status enumeration
enum FlightStatus: String, Codable, CaseIterable {
  case scheduled
  case delayed
  case boarding
  case departed
  case inAir = "in_air"
  case landed
  case arrived
  case cancelled
  case diverted

  var displayName: String {
    switch self {
    case .scheduled: return "计划中"
    case .delayed: return "延误"
    case .boarding: return "登机中"
    case .departed: return "已起飞"
    case .inAir: return "飞行中"
    case .landed: return "已降落"
    case .arrived: return "已到达"
    case .cancelled: return "已取消"
    case .diverted: return "已改航"
    }
  }

  var color: String {
    switch self {
    case .scheduled: return "blue"
    case .delayed, .diverted: return "orange"
    case .boarding: return "purple"
    case .departed, .inAir: return "green"
    case .landed, .arrived: return "gray"
    case .cancelled: return "red"
    }
  }

  var icon: String {
    switch self {
    case .scheduled: return "clock"
    case .delayed: return "clock.badge.exclamationmark"
    case .boarding: return "figure.walk"
    case .departed, .inAir: return "airplane"
    case .landed: return "airplane.arrival"
    case .arrived: return "checkmark.circle"
    case .cancelled: return "xmark.circle"
    case .diverted: return "arrow.triangle.branch"
    }
  }
}

// MARK: - Booking Status

/// Booking status enumeration
enum BookingStatus: String, Codable, CaseIterable {
  case confirmed
  case pending
  case cancelled
  case checkedIn = "checked_in"
  case boarded
  case completed

  var displayName: String {
    switch self {
    case .confirmed: return "已确认"
    case .pending: return "待确认"
    case .cancelled: return "已取消"
    case .checkedIn: return "已值机"
    case .boarded: return "已登机"
    case .completed: return "已完成"
    }
  }

  var color: String {
    switch self {
    case .confirmed, .checkedIn, .boarded: return "green"
    case .pending: return "orange"
    case .cancelled: return "red"
    case .completed: return "gray"
    }
  }
}

// MARK: - Cabin Class

/// Cabin class enumeration
enum CabinClass: String, Codable, CaseIterable {
  case economy
  case premiumEconomy = "premium_economy"
  case business
  case first

  var displayName: String {
    switch self {
    case .economy: return "经济舱"
    case .premiumEconomy: return "超级经济舱"
    case .business: return "商务舱"
    case .first: return "头等舱"
    }
  }

  var icon: String {
    switch self {
    case .economy: return "airplane"
    case .premiumEconomy: return "airplane.circle"
    case .business: return "star"
    case .first: return "crown"
    }
  }
}

// MARK: - Flight Info

/// Flight information model
struct FlightInfo: Codable, Identifiable, Hashable {
  let id: String?
  let flightNumber: String
  let airline: String
  let airlineCode: String
  let departureAirport: String
  let departureAirportName: String?
  let departureCity: String?
  let departureTerminal: String?
  let departureGate: String?
  let arrivalAirport: String
  let arrivalAirportName: String?
  let arrivalCity: String?
  let arrivalTerminal: String?
  let arrivalGate: String?
  let departureDate: String
  let scheduledDeparture: Int64
  let scheduledArrival: Int64
  let estimatedDeparture: Int64?
  let estimatedArrival: Int64?
  let actualDeparture: Int64?
  let actualArrival: Int64?
  let status: FlightStatus
  let aircraftType: String?
  let duration: Int?
  let distance: Int?
  let codeshares: [String]?
  let delayReason: String?
  let lastUpdated: Int64

  enum CodingKeys: String, CodingKey {
    case id
    case flightNumber = "flight_number"
    case airline
    case airlineCode = "airline_code"
    case departureAirport = "departure_airport"
    case departureAirportName = "departure_airport_name"
    case departureCity = "departure_city"
    case departureTerminal = "departure_terminal"
    case departureGate = "departure_gate"
    case arrivalAirport = "arrival_airport"
    case arrivalAirportName = "arrival_airport_name"
    case arrivalCity = "arrival_city"
    case arrivalTerminal = "arrival_terminal"
    case arrivalGate = "arrival_gate"
    case departureDate = "departure_date"
    case scheduledDeparture = "scheduled_departure"
    case scheduledArrival = "scheduled_arrival"
    case estimatedDeparture = "estimated_departure"
    case estimatedArrival = "estimated_arrival"
    case actualDeparture = "actual_departure"
    case actualArrival = "actual_arrival"
    case status
    case aircraftType = "aircraft_type"
    case duration
    case distance
    case codeshares
    case delayReason = "delay_reason"
    case lastUpdated = "last_updated"
  }

  // MARK: - Computed Properties

  var scheduledDepartureDate: Date {
    Date(timeIntervalSince1970: Double(scheduledDeparture) / 1000)
  }

  var scheduledArrivalDate: Date {
    Date(timeIntervalSince1970: Double(scheduledArrival) / 1000)
  }

  var estimatedDepartureDate: Date? {
    guard let ts = estimatedDeparture else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var estimatedArrivalDate: Date? {
    guard let ts = estimatedArrival else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var actualDepartureDate: Date? {
    guard let ts = actualDeparture else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var actualArrivalDate: Date? {
    guard let ts = actualArrival else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var effectiveDepartureDate: Date {
    actualDepartureDate ?? estimatedDepartureDate ?? scheduledDepartureDate
  }

  var effectiveArrivalDate: Date {
    actualArrivalDate ?? estimatedArrivalDate ?? scheduledArrivalDate
  }

  var durationFormatted: String {
    guard let duration = duration else { return "--" }
    let hours = duration / 60
    let minutes = duration % 60
    if hours > 0 {
      return "\(hours)h \(minutes)m"
    }
    return "\(minutes)m"
  }

  var distanceFormatted: String {
    guard let distance = distance else { return "--" }
    return "\(distance) km"
  }

  var isDelayed: Bool {
    status == .delayed || delayReason != nil
  }

  var delayMinutes: Int? {
    guard let estimated = estimatedDeparture else { return nil }
    let diff = estimated - scheduledDeparture
    return diff > 0 ? Int(diff / 60000) : nil
  }

  // MARK: - Identifiable

  var identifier: String {
    id ?? "\(flightNumber)_\(departureDate)"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(identifier)
  }

  static func == (lhs: FlightInfo, rhs: FlightInfo) -> Bool {
    lhs.identifier == rhs.identifier
  }
}

// MARK: - Flight Booking

/// Flight booking model
struct FlightBooking: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let flightId: String
  let confirmationCode: String
  let passengerName: String
  let passengerEmail: String?
  let passengerPhone: String?
  let seatNumber: String?
  let cabinClass: CabinClass
  let status: BookingStatus
  let departureTime: Int64
  let arrivalTime: Int64
  let ticketNumber: String?
  let mealPreference: String?
  let specialRequests: String?
  let baggageAllowance: String?
  let frequentFlyerNumber: String?
  let itineraryId: String?
  let notes: String?
  let importedFrom: String?
  let checkInTime: Int64?
  let createdAt: Int64
  let updatedAt: Int64

  // Enriched flight data (from API response)
  var flight: FlightInfo?

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case flightId = "flight_id"
    case confirmationCode = "confirmation_code"
    case passengerName = "passenger_name"
    case passengerEmail = "passenger_email"
    case passengerPhone = "passenger_phone"
    case seatNumber = "seat_number"
    case cabinClass = "cabin_class"
    case status
    case departureTime = "departure_time"
    case arrivalTime = "arrival_time"
    case ticketNumber = "ticket_number"
    case mealPreference = "meal_preference"
    case specialRequests = "special_requests"
    case baggageAllowance = "baggage_allowance"
    case frequentFlyerNumber = "frequent_flyer_number"
    case itineraryId = "itinerary_id"
    case notes
    case importedFrom = "imported_from"
    case checkInTime = "check_in_time"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case flight
  }

  // MARK: - Computed Properties

  var departureDate: Date {
    Date(timeIntervalSince1970: Double(departureTime) / 1000)
  }

  var arrivalDate: Date {
    Date(timeIntervalSince1970: Double(arrivalTime) / 1000)
  }

  var checkInDate: Date? {
    guard let ts = checkInTime else { return nil }
    return Date(timeIntervalSince1970: Double(ts) / 1000)
  }

  var isUpcoming: Bool {
    departureDate > Date()
  }

  var canCheckIn: Bool {
    guard status == .confirmed else { return false }
    let hoursUntilDeparture = departureDate.timeIntervalSinceNow / 3600
    return hoursUntilDeparture <= 24 && hoursUntilDeparture > 0
  }

  var displayFlightNumber: String {
    flight?.flightNumber ?? "Unknown"
  }

  var displayRoute: String {
    guard let flight = flight else { return "--" }
    return "\(flight.departureCity ?? flight.departureAirport) - \(flight.arrivalCity ?? flight.arrivalAirport)"
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FlightBooking, rhs: FlightBooking) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Parsed Booking (from email)

/// Parsed booking information from email
struct ParsedBooking: Codable {
  let flightNumber: String
  let confirmationCode: String
  let passengerName: String?
  let passengerEmail: String?
  let departureDate: String?
  let departureTime: String?
  let arrivalTime: String?
  let departureAirport: String?
  let arrivalAirport: String?
  let seatNumber: String?
  let cabinClass: CabinClass?
  let ticketNumber: String?
  let baggageAllowance: String?

  enum CodingKeys: String, CodingKey {
    case flightNumber = "flight_number"
    case confirmationCode = "confirmation_code"
    case passengerName = "passenger_name"
    case passengerEmail = "passenger_email"
    case departureDate = "departure_date"
    case departureTime = "departure_time"
    case arrivalTime = "arrival_time"
    case departureAirport = "departure_airport"
    case arrivalAirport = "arrival_airport"
    case seatNumber = "seat_number"
    case cabinClass = "cabin_class"
    case ticketNumber = "ticket_number"
    case baggageAllowance = "baggage_allowance"
  }
}

// MARK: - API Response Models

/// Flight lookup response
struct FlightLookupResponse: Codable {
  let success: Bool
  let data: FlightInfo?
  let error: String?
  let message: String?
}

/// Flight status response
struct FlightStatusResponse: Codable {
  let success: Bool
  let data: FlightStatusData?
  let error: String?
  let message: String?
}

struct FlightStatusData: Codable {
  let status: FlightStatus
  let estimatedDeparture: Int64?
  let estimatedArrival: Int64?
  let gate: String?
  let delayReason: String?

  enum CodingKeys: String, CodingKey {
    case status
    case estimatedDeparture = "estimated_departure"
    case estimatedArrival = "estimated_arrival"
    case gate
    case delayReason = "delay_reason"
  }
}

/// Bookings list response
struct FlightBookingsResponse: Codable {
  let success: Bool
  let data: [FlightBooking]
  let total: Int
  let page: Int?
  let pageSize: Int?

  enum CodingKeys: String, CodingKey {
    case success
    case data
    case total
    case page
    case pageSize = "page_size"
  }
}

/// Create booking response
struct CreateBookingResponse: Codable {
  let success: Bool
  let data: CreateBookingData?
  let error: String?
  let message: String?
}

struct CreateBookingData: Codable {
  let bookingId: String
  let flightInfo: FlightInfo

  enum CodingKeys: String, CodingKey {
    case bookingId = "booking_id"
    case flightInfo = "flight_info"
  }
}

/// Parse email response
struct ParseEmailResponse: Codable {
  let success: Bool
  let data: ParseEmailData?
  let error: String?
  let message: String?
}

struct ParseEmailData: Codable {
  let parsed: ParsedBooking
  let message: String?
}

/// Link itinerary response
struct LinkItineraryResponse: Codable {
  let success: Bool
  let message: String?
  let error: String?
}

// MARK: - Additional API Response/Request Types

/// Flight search response (from route search)
struct FlightSearchResponse: Codable {
  let success: Bool
  let data: [FlightInfo]
  let meta: FlightSearchMeta

  struct FlightSearchMeta: Codable {
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

/// Flight search result (simplified for internal use)
struct FlightSearchResult {
  let data: [FlightInfo]
  let total: Int
}

/// Flight bookings result (simplified for internal use)
struct FlightBookingsResult {
  let data: [FlightBooking]
  let total: Int
}

/// Flight booking detail response (single booking)
struct FlightBookingDetailResponse: Codable {
  let success: Bool
  let data: FlightBooking
  let message: String?
}

/// Request to link a flight to an itinerary
struct LinkFlightItineraryRequest: Codable {
  let itineraryId: String

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
  }
}

/// Request to check in for a flight
struct CheckInFlightRequest: Codable {
  let seatNumber: String?
  let boardingGroup: String?
  let boardingPosition: Int?

  init(seatNumber: String? = nil, boardingGroup: String? = nil, boardingPosition: Int? = nil) {
    self.seatNumber = seatNumber
    self.boardingGroup = boardingGroup
    self.boardingPosition = boardingPosition
  }

  enum CodingKeys: String, CodingKey {
    case seatNumber = "seat_number"
    case boardingGroup = "boarding_group"
    case boardingPosition = "boarding_position"
  }
}

/// Input for creating a flight booking
struct CreateFlightBookingInput: Codable {
  let flightNumber: String
  let departureDate: String
  let confirmationCode: String
  let passengerName: String
  let passengerEmail: String?
  let passengerPhone: String?
  let seatNumber: String?
  let cabinClass: CabinClass?
  let ticketNumber: String?
  let mealPreference: String?
  let specialRequests: String?
  let baggageAllowance: String?
  let frequentFlyerNumber: String?
  let itineraryId: String?
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case flightNumber = "flight_number"
    case departureDate = "departure_date"
    case confirmationCode = "confirmation_code"
    case passengerName = "passenger_name"
    case passengerEmail = "passenger_email"
    case passengerPhone = "passenger_phone"
    case seatNumber = "seat_number"
    case cabinClass = "cabin_class"
    case ticketNumber = "ticket_number"
    case mealPreference = "meal_preference"
    case specialRequests = "special_requests"
    case baggageAllowance = "baggage_allowance"
    case frequentFlyerNumber = "frequent_flyer_number"
    case itineraryId = "itinerary_id"
    case notes
  }
}

/// Input for updating a flight booking
struct UpdateFlightBookingInput: Codable {
  var seatNumber: String?
  var cabinClass: CabinClass?
  var mealPreference: String?
  var specialRequests: String?
  var baggageAllowance: String?
  var frequentFlyerNumber: String?
  var notes: String?
  var status: BookingStatus?

  enum CodingKeys: String, CodingKey {
    case seatNumber = "seat_number"
    case cabinClass = "cabin_class"
    case mealPreference = "meal_preference"
    case specialRequests = "special_requests"
    case baggageAllowance = "baggage_allowance"
    case frequentFlyerNumber = "frequent_flyer_number"
    case notes
    case status
  }
}

// Note: CreateFlightBookingResponse is an alias for CreateBookingResponse (defined above)
typealias CreateFlightBookingResponse = CreateBookingResponse

/// Flight bookings list response with pagination meta
/// Note: This is different from FlightBookingsResponse - it uses a nested meta object
struct FlightBookingsListResponse: Codable {
  let success: Bool
  let data: [FlightBooking]
  let meta: FlightBookingsMeta?

  struct FlightBookingsMeta: Codable {
    let page: Int?
    let pageSize: Int?
    let totalCount: Int
    let totalPages: Int?

    enum CodingKeys: String, CodingKey {
      case page
      case pageSize = "page_size"
      case totalCount = "total_count"
      case totalPages = "total_pages"
    }
  }
}
