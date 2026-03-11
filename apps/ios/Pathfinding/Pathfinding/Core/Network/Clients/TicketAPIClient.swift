import Foundation

/// API client for ticket-related operations
actor TicketAPIClient {
  static let shared = TicketAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Ticket APIs

  /// Fetch tickets for a POI
  func fetchPoiTickets(poiId: String, activeOnly: Bool = true) async throws -> [PoiTicket] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "activeOnly", value: activeOnly ? "true" : "false")
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketListResponse.self, from: data)
    return result.data
  }

  /// Fetch price range for a POI
  func fetchTicketPriceRange(poiId: String) async throws -> TicketPriceRange? {
    let url = await baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets/price-range")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(TicketPriceRangeResponse.self, from: data)
    return result.data
  }

  /// Fetch recommended tickets for a POI
  func fetchRecommendedTickets(poiId: String, limit: Int = 5) async throws -> [PoiTicket] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/pois/\(poiId)/tickets/recommended"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketListResponse.self, from: data)
    return result.data
  }

  /// Fetch a single ticket by ID
  func fetchTicketById(ticketId: String) async throws -> PoiTicket {
    let url = await baseURL.appendingPathComponent("v1/tickets/\(ticketId)")

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(PoiTicketResponse.self, from: data)
    return result.data
  }

  /// Fetch user's ticket reminders
  func fetchTicketReminders(includeTriggered: Bool = false, limit: Int = 50) async throws -> [TicketReminder] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/ticket-reminders"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "includeTriggered", value: includeTriggered ? "true" : "false"),
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketReminderListResponse.self, from: data)
    return result.data
  }

  /// Fetch upcoming reminders
  func fetchUpcomingReminders(days: Int = 7) async throws -> [TicketReminder] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/ticket-reminders/upcoming"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "days", value: String(days))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketReminderListResponse.self, from: data)
    return result.data
  }

  /// Fetch unread reminder count
  func fetchTicketReminderUnreadCount() async throws -> Int {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders/unread-count")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try decoder.decode(TicketUnreadCountResponse.self, from: data)
    return result.data.count
  }

  /// Create a new ticket reminder
  func createTicketReminder(request: CreateTicketReminderRequest) async throws -> TicketReminder {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders")

    let data = try await network.postWithRetry(url: url, body: request)
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Update a ticket reminder
  func updateTicketReminder(reminderId: String, request: UpdateTicketReminderRequest) async throws -> TicketReminder {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)")

    let data = try await network.patchWithRetry(url: url, body: request)
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Mark a reminder as read
  func markTicketReminderRead(reminderId: String) async throws -> TicketReminder {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)/read")

    let data = try await network.postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(TicketReminderResponse.self, from: data)
    return result.data
  }

  /// Mark all reminders as read
  func markAllTicketRemindersRead() async throws -> Int {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders/read-all")

    let data = try await network.postWithRetry(url: url, body: EmptyBody())
    let result = try decoder.decode(MarkAllReadResponse.self, from: data)
    return result.data.count
  }

  /// Delete a ticket reminder
  func deleteTicketReminder(reminderId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/ticket-reminders/\(reminderId)")
    _ = try await network.deleteWithRetry(url: url)
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch tickets for a POI
  func fetchPoiTickets(poiId: String, activeOnly: Bool = true) async throws -> [PoiTicket] {
    try await TicketAPIClient.shared.fetchPoiTickets(poiId: poiId, activeOnly: activeOnly)
  }

  /// Fetch price range for a POI
  func fetchTicketPriceRange(poiId: String) async throws -> TicketPriceRange? {
    try await TicketAPIClient.shared.fetchTicketPriceRange(poiId: poiId)
  }

  /// Fetch recommended tickets for a POI
  func fetchRecommendedTickets(poiId: String, limit: Int = 5) async throws -> [PoiTicket] {
    try await TicketAPIClient.shared.fetchRecommendedTickets(poiId: poiId, limit: limit)
  }

  /// Fetch a single ticket by ID
  func fetchTicketById(ticketId: String) async throws -> PoiTicket {
    try await TicketAPIClient.shared.fetchTicketById(ticketId: ticketId)
  }

  /// Fetch user's ticket reminders
  func fetchTicketReminders(includeTriggered: Bool = false, limit: Int = 50) async throws -> [TicketReminder] {
    try await TicketAPIClient.shared.fetchTicketReminders(includeTriggered: includeTriggered, limit: limit)
  }

  /// Fetch upcoming reminders
  func fetchUpcomingReminders(days: Int = 7) async throws -> [TicketReminder] {
    try await TicketAPIClient.shared.fetchUpcomingReminders(days: days)
  }

  /// Fetch unread reminder count
  func fetchTicketReminderUnreadCount() async throws -> Int {
    try await TicketAPIClient.shared.fetchTicketReminderUnreadCount()
  }

  /// Create a new ticket reminder
  func createTicketReminder(request: CreateTicketReminderRequest) async throws -> TicketReminder {
    try await TicketAPIClient.shared.createTicketReminder(request: request)
  }

  /// Update a ticket reminder
  func updateTicketReminder(reminderId: String, request: UpdateTicketReminderRequest) async throws -> TicketReminder {
    try await TicketAPIClient.shared.updateTicketReminder(reminderId: reminderId, request: request)
  }

  /// Mark a reminder as read
  func markTicketReminderRead(reminderId: String) async throws -> TicketReminder {
    try await TicketAPIClient.shared.markTicketReminderRead(reminderId: reminderId)
  }

  /// Mark all reminders as read
  func markAllTicketRemindersRead() async throws -> Int {
    try await TicketAPIClient.shared.markAllTicketRemindersRead()
  }

  /// Delete a ticket reminder
  func deleteTicketReminder(reminderId: String) async throws {
    try await TicketAPIClient.shared.deleteTicketReminder(reminderId: reminderId)
  }
}
