import Foundation

/// API client for flight-related operations
actor FlightAPIClient {
  static let shared = FlightAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Flight APIs

  /// Lookup flight by number and date (public API)
  func lookupFlight(flightNumber: String, date: String) async throws -> FlightInfo {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/flights/lookup"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "flightNumber", value: flightNumber),
      URLQueryItem(name: "date", value: date),
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightLookupResponse.self, from: data)

    guard let flightInfo = result.data else {
      throw APIError.notFound
    }

    return flightInfo
  }

  /// Search flights by route (public API)
  func searchFlightsByRoute(
    departureAirport: String,
    arrivalAirport: String,
    date: String? = nil,
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> FlightSearchResult {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/flights/search"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "departureAirport", value: departureAirport),
      URLQueryItem(name: "arrivalAirport", value: arrivalAirport),
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]
    if let date = date {
      queryItems.append(URLQueryItem(name: "date", value: date))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(FlightSearchResponse.self, from: data)
    return FlightSearchResult(data: result.data, total: result.meta.totalCount)
  }

  /// Fetch user's flight bookings (protected API)
  func fetchFlightBookings(
    page: Int = 1,
    pageSize: Int = 20,
    status: BookingStatus? = nil,
    upcoming: Bool? = nil,
    itineraryId: String? = nil
  ) async throws -> FlightBookingsResult {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/flights/bookings"),
      resolvingAgainstBaseURL: false
    )!

    var queryItems = [
      URLQueryItem(name: "page", value: String(page)),
      URLQueryItem(name: "pageSize", value: String(pageSize)),
    ]
    if let status = status {
      queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
    }
    if let upcoming = upcoming {
      queryItems.append(URLQueryItem(name: "upcoming", value: upcoming ? "true" : "false"))
    }
    if let itineraryId = itineraryId {
      queryItems.append(URLQueryItem(name: "itineraryId", value: itineraryId))
    }
    components.queryItems = queryItems

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return FlightBookingsResult(data: result.data, total: result.meta?.totalCount ?? result.data.count)
  }

  /// Fetch upcoming flights for user
  func fetchUpcomingFlights(limit: Int = 5) async throws -> FlightBookingsResult {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/flights/upcoming"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return FlightBookingsResult(data: result.data, total: result.data.count)
  }

  /// Create a new flight booking
  func createFlightBooking(_ input: CreateFlightBookingInput) async throws -> CreateFlightBookingResponse {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings")

    let data = try await network.postWithRetry(url: url, body: input)
    return try decoder.decode(CreateFlightBookingResponse.self, from: data)
  }

  /// Update a flight booking
  func updateFlightBooking(_ bookingId: String, input: UpdateFlightBookingInput) async throws -> FlightBooking {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)")

    let data = try await network.patchWithRetry(url: url, body: input)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Delete a flight booking
  func deleteFlightBooking(_ bookingId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)")
    _ = try await network.deleteWithRetry(url: url)
  }

  /// Link flight booking to itinerary
  func linkFlightToItinerary(bookingId: String, itineraryId: String) async throws -> FlightBooking {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/link")

    let body = LinkFlightItineraryRequest(itineraryId: itineraryId)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Unlink flight booking from itinerary
  func unlinkFlightFromItinerary(bookingId: String) async throws -> FlightBooking {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/unlink")

    let data = try await network.postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Check in for a flight
  func checkInFlight(bookingId: String, seatNumber: String? = nil) async throws -> FlightBooking {
    let url = await baseURL.appendingPathComponent("v1/flights/bookings/\(bookingId)/check-in")

    let body = CheckInFlightRequest(seatNumber: seatNumber)
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(FlightBookingDetailResponse.self, from: data)
    return result.data
  }

  /// Fetch flight bookings for a specific itinerary
  func fetchFlightBookingsForItinerary(_ itineraryId: String) async throws -> [FlightBooking] {
    let url = await baseURL.appendingPathComponent("v1/flights/itinerary/\(itineraryId)/bookings")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightBookingsListResponse.self, from: data)
    return result.data
  }

  /// Get flight status for a booking
  func getFlightStatus(bookingId: String) async throws -> FlightStatusData {
    let url = await baseURL.appendingPathComponent("v1/flights/status/\(bookingId)")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(FlightStatusResponse.self, from: data)

    guard let statusData = result.data else {
      throw APIError.notFound
    }

    return statusData
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Lookup flight by number and date (public API)
  func lookupFlight(flightNumber: String, date: String) async throws -> FlightInfo {
    try await FlightAPIClient.shared.lookupFlight(flightNumber: flightNumber, date: date)
  }

  /// Search flights by route (public API)
  func searchFlightsByRoute(
    departureAirport: String,
    arrivalAirport: String,
    date: String? = nil,
    page: Int = 1,
    pageSize: Int = 20
  ) async throws -> FlightSearchResult {
    try await FlightAPIClient.shared.searchFlightsByRoute(
      departureAirport: departureAirport,
      arrivalAirport: arrivalAirport,
      date: date,
      page: page,
      pageSize: pageSize
    )
  }

  /// Fetch user's flight bookings (protected API)
  func fetchFlightBookings(
    page: Int = 1,
    pageSize: Int = 20,
    status: BookingStatus? = nil,
    upcoming: Bool? = nil,
    itineraryId: String? = nil
  ) async throws -> FlightBookingsResult {
    try await FlightAPIClient.shared.fetchFlightBookings(
      page: page,
      pageSize: pageSize,
      status: status,
      upcoming: upcoming,
      itineraryId: itineraryId
    )
  }

  /// Fetch upcoming flights for user
  func fetchUpcomingFlights(limit: Int = 5) async throws -> FlightBookingsResult {
    try await FlightAPIClient.shared.fetchUpcomingFlights(limit: limit)
  }

  /// Create a new flight booking
  func createFlightBooking(_ input: CreateFlightBookingInput) async throws -> CreateFlightBookingResponse {
    try await FlightAPIClient.shared.createFlightBooking(input)
  }

  /// Update a flight booking
  func updateFlightBooking(_ bookingId: String, input: UpdateFlightBookingInput) async throws -> FlightBooking {
    try await FlightAPIClient.shared.updateFlightBooking(bookingId, input: input)
  }

  /// Delete a flight booking
  func deleteFlightBooking(_ bookingId: String) async throws {
    try await FlightAPIClient.shared.deleteFlightBooking(bookingId)
  }

  /// Link flight booking to itinerary
  func linkFlightToItinerary(bookingId: String, itineraryId: String) async throws -> FlightBooking {
    try await FlightAPIClient.shared.linkFlightToItinerary(bookingId: bookingId, itineraryId: itineraryId)
  }

  /// Unlink flight booking from itinerary
  func unlinkFlightFromItinerary(bookingId: String) async throws -> FlightBooking {
    try await FlightAPIClient.shared.unlinkFlightFromItinerary(bookingId: bookingId)
  }

  /// Check in for a flight
  func checkInFlight(bookingId: String, seatNumber: String? = nil) async throws -> FlightBooking {
    try await FlightAPIClient.shared.checkInFlight(bookingId: bookingId, seatNumber: seatNumber)
  }

  /// Fetch flight bookings for a specific itinerary
  func fetchFlightBookingsForItinerary(_ itineraryId: String) async throws -> [FlightBooking] {
    try await FlightAPIClient.shared.fetchFlightBookingsForItinerary(itineraryId)
  }

  /// Get flight status for a booking
  func getFlightStatus(bookingId: String) async throws -> FlightStatusData {
    try await FlightAPIClient.shared.getFlightStatus(bookingId: bookingId)
  }
}
