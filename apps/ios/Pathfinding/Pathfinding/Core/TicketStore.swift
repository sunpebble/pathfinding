import Foundation
import Observation
import OSLog

/// Ticket Store - Manages POI ticket information and reminders
@MainActor
@Observable
final class TicketStore {
  static let shared = TicketStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "TicketStore")
  private let savedTicketsKey = "savedTickets"

  // MARK: - Properties

  /// Tickets for current POI
  var tickets: [PoiTicket] = []

  /// Price range for current POI
  var priceRange: TicketPriceRange?

  /// User's ticket reminders
  var reminders: [TicketReminder] = []

  /// Upcoming reminders (next 7 days)
  var upcomingReminders: [TicketReminder] = []

  /// Unread reminder count
  var unreadCount: Int = 0

  /// Locally saved tickets (for offline access)
  var savedTickets: [SavedTicket] = []

  /// Loading states
  var isLoadingTickets = false
  var isLoadingReminders = false

  /// Error state
  var errorMessage: String?

  private init() {
    loadSavedTickets()
  }

  // MARK: - Ticket API Methods

  /// Fetch tickets for a POI
  func fetchTickets(poiId: String, activeOnly: Bool = true) async {
    isLoadingTickets = true
    errorMessage = nil

    do {
      let fetchedTickets = try await APIClient.shared.fetchPoiTickets(
        poiId: poiId,
        activeOnly: activeOnly
      )
      tickets = fetchedTickets
      logger.info("Fetched \(fetchedTickets.count) tickets for POI \(poiId)")
    } catch {
      logger.error("Failed to fetch tickets: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingTickets = false
  }

  /// Fetch price range for a POI
  func fetchPriceRange(poiId: String) async {
    do {
      priceRange = try await APIClient.shared.fetchTicketPriceRange(poiId: poiId)
      logger.info("Fetched price range for POI \(poiId)")
    } catch {
      logger.error("Failed to fetch price range: \(error.localizedDescription)")
    }
  }

  /// Fetch recommended tickets for a POI
  func fetchRecommendedTickets(poiId: String, limit: Int = 5) async -> [PoiTicket] {
    do {
      let recommended = try await APIClient.shared.fetchRecommendedTickets(
        poiId: poiId,
        limit: limit
      )
      logger.info("Fetched \(recommended.count) recommended tickets")
      return recommended
    } catch {
      logger.error("Failed to fetch recommended tickets: \(error.localizedDescription)")
      return []
    }
  }

  /// Get a single ticket by ID
  func fetchTicket(ticketId: String) async -> PoiTicket? {
    do {
      let ticket = try await APIClient.shared.fetchTicketById(ticketId: ticketId)
      return ticket
    } catch {
      logger.error("Failed to fetch ticket: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Reminder API Methods

  /// Fetch user's reminders
  func fetchReminders(includeTriggered: Bool = false, limit: Int = 50) async {
    isLoadingReminders = true

    do {
      reminders = try await APIClient.shared.fetchTicketReminders(
        includeTriggered: includeTriggered,
        limit: limit
      )
      logger.info("Fetched \(reminders.count) reminders")
    } catch {
      logger.error("Failed to fetch reminders: \(error.localizedDescription)")
    }

    isLoadingReminders = false
  }

  /// Fetch upcoming reminders
  func fetchUpcomingReminders(days: Int = 7) async {
    do {
      upcomingReminders = try await APIClient.shared.fetchUpcomingReminders(days: days)
      logger.info("Fetched \(upcomingReminders.count) upcoming reminders")
    } catch {
      logger.error("Failed to fetch upcoming reminders: \(error.localizedDescription)")
    }
  }

  /// Fetch unread reminder count
  func fetchUnreadCount() async {
    do {
      unreadCount = try await APIClient.shared.fetchTicketReminderUnreadCount()
      logger.info("Unread reminder count: \(unreadCount)")
    } catch {
      logger.error("Failed to fetch unread count: \(error.localizedDescription)")
    }
  }

  /// Create a new reminder
  func createReminder(
    poiId: String,
    ticketId: String? = nil,
    itineraryId: String? = nil,
    reminderType: TicketReminderType,
    reminderTime: Date,
    message: String? = nil
  ) async -> TicketReminder? {
    do {
      let request = CreateTicketReminderRequest(
        poiId: poiId,
        ticketId: ticketId,
        itineraryId: itineraryId,
        reminderType: reminderType.rawValue,
        reminderTime: reminderTime.timeIntervalSince1970 * 1000,
        message: message
      )

      let reminder = try await APIClient.shared.createTicketReminder(request: request)
      reminders.insert(reminder, at: 0)
      logger.info("Created reminder for POI \(poiId)")
      return reminder
    } catch {
      logger.error("Failed to create reminder: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return nil
    }
  }

  /// Update a reminder
  func updateReminder(
    reminderId: String,
    reminderTime: Date? = nil,
    message: String? = nil,
    reminderType: TicketReminderType? = nil
  ) async -> Bool {
    do {
      let request = UpdateTicketReminderRequest(
        reminderTime: reminderTime.map { $0.timeIntervalSince1970 * 1000 },
        message: message,
        reminderType: reminderType?.rawValue
      )

      let updated = try await APIClient.shared.updateTicketReminder(
        reminderId: reminderId,
        request: request
      )

      if let index = reminders.firstIndex(where: { $0.id == reminderId }) {
        reminders[index] = updated
      }

      logger.info("Updated reminder \(reminderId)")
      return true
    } catch {
      logger.error("Failed to update reminder: \(error.localizedDescription)")
      return false
    }
  }

  /// Mark a reminder as read
  func markReminderRead(reminderId: String) async {
    do {
      let updated = try await APIClient.shared.markTicketReminderRead(reminderId: reminderId)

      if let index = reminders.firstIndex(where: { $0.id == reminderId }) {
        reminders[index] = updated
      }

      if unreadCount > 0 {
        unreadCount -= 1
      }

      logger.info("Marked reminder \(reminderId) as read")
    } catch {
      logger.error("Failed to mark reminder as read: \(error.localizedDescription)")
    }
  }

  /// Mark all reminders as read
  func markAllRemindersRead() async {
    do {
      let count = try await APIClient.shared.markAllTicketRemindersRead()
      unreadCount = 0

      // Update local state
      for i in reminders.indices {
        if reminders[i].isTriggered && !reminders[i].isRead {
          // Create updated reminder (since TicketReminder is a struct)
          var updated = reminders[i]
          // Note: We can't directly modify isRead since it's let,
          // so we'll refetch reminders
        }
      }

      // Refetch to get updated state
      await fetchReminders(includeTriggered: true)

      logger.info("Marked \(count) reminders as read")
    } catch {
      logger.error("Failed to mark all reminders as read: \(error.localizedDescription)")
    }
  }

  /// Delete a reminder
  func deleteReminder(reminderId: String) async -> Bool {
    do {
      try await APIClient.shared.deleteTicketReminder(reminderId: reminderId)
      reminders.removeAll { $0.id == reminderId }
      upcomingReminders.removeAll { $0.id == reminderId }
      logger.info("Deleted reminder \(reminderId)")
      return true
    } catch {
      logger.error("Failed to delete reminder: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Local Storage Methods

  /// Save a ticket locally for offline access
  func saveTicketLocally(ticket: PoiTicket, poiName: String, notes: String? = nil) {
    let savedTicket = SavedTicket(ticket: ticket, poiName: poiName, notes: notes)

    // Check if already saved
    if !savedTickets.contains(where: { $0.ticket.id == ticket.id }) {
      savedTickets.insert(savedTicket, at: 0)
      persistSavedTickets()
      logger.info("Saved ticket \(ticket.id) locally")
    }
  }

  /// Remove a locally saved ticket
  func removeSavedTicket(id: UUID) {
    savedTickets.removeAll { $0.id == id }
    persistSavedTickets()
    logger.info("Removed saved ticket \(id)")
  }

  /// Check if a ticket is saved locally
  func isTicketSaved(ticketId: String) -> Bool {
    savedTickets.contains { $0.ticket.id == ticketId }
  }

  /// Load saved tickets from UserDefaults
  private func loadSavedTickets() {
    guard let data = UserDefaults.standard.data(forKey: savedTicketsKey),
          let decoded = try? JSONDecoder().decode([SavedTicket].self, from: data)
    else { return }
    savedTickets = decoded
    logger.info("Loaded \(savedTickets.count) saved tickets")
  }

  /// Persist saved tickets to UserDefaults
  private func persistSavedTickets() {
    guard let data = try? JSONEncoder().encode(savedTickets) else { return }
    UserDefaults.standard.set(data, forKey: savedTicketsKey)
  }

  // MARK: - Utility Methods

  /// Clear all ticket data (for logout)
  func clearAll() {
    tickets = []
    priceRange = nil
    reminders = []
    upcomingReminders = []
    unreadCount = 0
    errorMessage = nil
  }

  /// Get tickets grouped by type
  func ticketsGroupedByType() -> [TicketType: [PoiTicket]] {
    var grouped: [TicketType: [PoiTicket]] = [:]

    for ticket in tickets {
      if let type = ticket.ticketTypeEnum {
        if grouped[type] == nil {
          grouped[type] = []
        }
        grouped[type]?.append(ticket)
      }
    }

    return grouped
  }

  /// Get the cheapest ticket
  var cheapestTicket: PoiTicket? {
    tickets.filter { $0.isActive }.min { $0.price < $1.price }
  }

  /// Get recommended tickets
  var recommendedTickets: [PoiTicket] {
    tickets.filter { $0.isRecommended == true && $0.isActive }
  }

  /// Check if there are any discounted tickets
  var hasDiscountedTickets: Bool {
    tickets.contains { $0.discountBadge != nil }
  }
}
