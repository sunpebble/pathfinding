import Foundation
import Observation
import OSLog

/// Flight booking store - manages flight bookings for the user
@MainActor
@Observable
final class FlightStore {
  static let shared = FlightStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "FlightStore")

  // MARK: - Properties

  /// All bookings (loaded from API)
  var bookings: [FlightBooking] = []

  /// Upcoming flights only
  var upcomingFlights: [FlightBooking] {
    bookings.filter { $0.isUpcoming }.sorted { $0.departureTime < $1.departureTime }
  }

  /// Past flights
  var pastFlights: [FlightBooking] {
    bookings.filter { !$0.isUpcoming }.sorted { $0.departureTime > $1.departureTime }
  }

  /// Loading state
  var isLoading = false

  /// Error message
  var errorMessage: String?

  /// Currently selected booking for detail view
  var selectedBooking: FlightBooking?

  /// Pagination
  private var currentPage = 1
  private var hasMore = true
  private let pageSize = 20

  private init() {}

  // MARK: - API Methods

  /// Load all bookings for the current user
  func loadBookings(forceRefresh: Bool = false) async {
    if forceRefresh {
      currentPage = 1
      hasMore = true
      bookings = []
    }

    guard !isLoading else { return }
    isLoading = true
    errorMessage = nil

    do {
      let response = try await FlightAPIClient.shared.fetchFlightBookings(
        page: currentPage,
        pageSize: pageSize
      )
      if currentPage == 1 {
        bookings = response.data
      } else {
        bookings.append(contentsOf: response.data)
      }
      hasMore = response.data.count >= pageSize
      logger.info("Loaded \(response.data.count) flight bookings")
    } catch {
      logger.error("Failed to load bookings: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Load more bookings (pagination)
  func loadMoreIfNeeded() async {
    guard hasMore && !isLoading else { return }
    currentPage += 1
    await loadBookings()
  }

  /// Get upcoming flights (quick access)
  func loadUpcomingFlights(limit: Int = 5) async {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await FlightAPIClient.shared.fetchUpcomingFlights(limit: limit)
      // Merge with existing bookings
      for flight in response.data {
        if !bookings.contains(where: { $0.id == flight.id }) {
          bookings.append(flight)
        }
      }
      logger.info("Loaded \(response.data.count) upcoming flights")
    } catch {
      logger.error("Failed to load upcoming flights: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Lookup flight by number and date
  func lookupFlight(flightNumber: String, date: String) async -> FlightInfo? {
    do {
      let flight = try await FlightAPIClient.shared.lookupFlight(
        flightNumber: flightNumber,
        date: date
      )
      return flight
    } catch {
      logger.error("Failed to lookup flight: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return nil
    }
  }

  /// Create a new flight booking
  func createBooking(_ input: CreateFlightBookingInput) async -> FlightBooking? {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await FlightAPIClient.shared.createFlightBooking(input)
      // Refresh bookings to get the new one with full data
      await loadBookings(forceRefresh: true)
      if let bookingId = response.data?.bookingId {
        logger.info("Created flight booking: \(bookingId)")
        return bookings.first { $0.id == bookingId }
      }
      return nil
    } catch {
      logger.error("Failed to create booking: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return nil
    }
  }

  /// Update a flight booking
  func updateBooking(_ bookingId: String, input: UpdateFlightBookingInput) async -> Bool {
    isLoading = true
    errorMessage = nil

    do {
      let updated = try await FlightAPIClient.shared.updateFlightBooking(bookingId, input: input)
      // Update local cache
      if let index = bookings.firstIndex(where: { $0.id == bookingId }) {
        bookings[index] = updated
      }
      logger.info("Updated flight booking: \(bookingId)")
      isLoading = false
      return true
    } catch {
      logger.error("Failed to update booking: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return false
    }
  }

  /// Delete a flight booking
  func deleteBooking(_ bookingId: String) async -> Bool {
    isLoading = true
    errorMessage = nil

    do {
      try await FlightAPIClient.shared.deleteFlightBooking(bookingId)
      // Remove from local cache
      bookings.removeAll { $0.id == bookingId }
      logger.info("Deleted flight booking: \(bookingId)")
      isLoading = false
      return true
    } catch {
      logger.error("Failed to delete booking: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return false
    }
  }

  /// Link booking to an itinerary
  func linkToItinerary(bookingId: String, itineraryId: String) async -> Bool {
    do {
      let updated = try await FlightAPIClient.shared.linkFlightToItinerary(
        bookingId: bookingId,
        itineraryId: itineraryId
      )
      // Update local cache
      if let index = bookings.firstIndex(where: { $0.id == bookingId }) {
        bookings[index] = updated
      }
      logger.info("Linked booking \(bookingId) to itinerary \(itineraryId)")
      return true
    } catch {
      logger.error("Failed to link booking: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Unlink booking from itinerary
  func unlinkFromItinerary(bookingId: String) async -> Bool {
    do {
      let updated = try await FlightAPIClient.shared.unlinkFlightFromItinerary(bookingId: bookingId)
      // Update local cache
      if let index = bookings.firstIndex(where: { $0.id == bookingId }) {
        bookings[index] = updated
      }
      logger.info("Unlinked booking \(bookingId) from itinerary")
      return true
    } catch {
      logger.error("Failed to unlink booking: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Check in for a flight
  func checkIn(bookingId: String, seatNumber: String? = nil) async -> Bool {
    do {
      let updated = try await FlightAPIClient.shared.checkInFlight(
        bookingId: bookingId,
        seatNumber: seatNumber
      )
      // Update local cache
      if let index = bookings.firstIndex(where: { $0.id == bookingId }) {
        bookings[index] = updated
      }
      logger.info("Checked in for flight: \(bookingId)")
      return true
    } catch {
      logger.error("Failed to check in: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Get bookings for a specific itinerary
  func getBookingsForItinerary(_ itineraryId: String) async -> [FlightBooking] {
    do {
      let bookings = try await FlightAPIClient.shared.fetchFlightBookingsForItinerary(itineraryId)
      return bookings
    } catch {
      logger.error("Failed to get bookings for itinerary: \(error.localizedDescription)")
      return []
    }
  }

  /// Get flight status for a booking
  func getFlightStatus(_ bookingId: String) async -> FlightStatusData? {
    do {
      let status = try await FlightAPIClient.shared.getFlightStatus(bookingId: bookingId)
      return status
    } catch {
      logger.error("Failed to get flight status: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Helper Methods

  /// Clear all data
  func clear() {
    bookings = []
    currentPage = 1
    hasMore = true
    errorMessage = nil
    selectedBooking = nil
  }

  /// Get booking by ID
  func getBooking(_ id: String) -> FlightBooking? {
    bookings.first { $0.id == id }
  }
}

// Note: Input types (CreateFlightBookingInput, UpdateFlightBookingInput) and
// Response types (FlightBookingsListResponse, CreateFlightBookingResponse) are
// defined in Models/Flight.swift
