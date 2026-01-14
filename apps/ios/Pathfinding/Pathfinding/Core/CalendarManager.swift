import CoreLocation
import EventKit
import Foundation
import OSLog

/// Calendar synchronization manager using EventKit
/// Supports Apple Calendar with full bidirectional sync, flights, hotels, and POI events
@MainActor
@Observable
final class CalendarManager {
  static let shared = CalendarManager()

  // MARK: - Properties

  private let eventStore = EKEventStore()
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "CalendarManager")

  /// Current authorization status for calendar access
  private(set) var authorizationStatus: EKAuthorizationStatus = .notDetermined

  /// Whether calendar access is authorized
  var isAuthorized: Bool {
    authorizationStatus == .fullAccess || authorizationStatus == .authorized
  }

  /// Available calendars for syncing
  private(set) var availableCalendars: [EKCalendar] = []

  /// Selected calendar for syncing (defaults to default calendar)
  var selectedCalendarId: String? {
    didSet {
      UserDefaults.standard.set(selectedCalendarId, forKey: "selectedCalendarId")
    }
  }

  /// Sync status for each itinerary (keyed by itinerary UUID)
  private(set) var syncedItineraries: [String: CalendarSyncInfo] = [:]

  /// Sync status for flights (keyed by flight booking ID)
  private(set) var syncedFlights: [String: FlightCalendarSyncInfo] = [:]

  /// Sync status for hotels (keyed by hotel booking ID)
  private(set) var syncedHotels: [String: HotelCalendarSyncInfo] = [:]

  /// Calendar change observer for bidirectional sync
  private var calendarChangeObserver: NSObjectProtocol?

  /// Whether bidirectional sync is enabled
  var bidirectionalSyncEnabled: Bool {
    get { UserDefaults.standard.bool(forKey: "bidirectionalSyncEnabled") }
    set {
      UserDefaults.standard.set(newValue, forKey: "bidirectionalSyncEnabled")
      if newValue {
        startObservingCalendarChanges()
      } else {
        stopObservingCalendarChanges()
      }
    }
  }

  /// Default reminder minutes before event
  var defaultReminderMinutes: Int {
    get { UserDefaults.standard.integer(forKey: "calendarReminderMinutes") }
    set { UserDefaults.standard.set(newValue, forKey: "calendarReminderMinutes") }
  }

  /// Whether to sync flights automatically
  var autoSyncFlights: Bool {
    get { UserDefaults.standard.bool(forKey: "autoSyncFlights") }
    set { UserDefaults.standard.set(newValue, forKey: "autoSyncFlights") }
  }

  /// Whether to sync hotels automatically
  var autoSyncHotels: Bool {
    get { UserDefaults.standard.bool(forKey: "autoSyncHotels") }
    set { UserDefaults.standard.set(newValue, forKey: "autoSyncHotels") }
  }

  // MARK: - Initialization

  private init() {
    // Set defaults if not already set
    if UserDefaults.standard.object(forKey: "calendarReminderMinutes") == nil {
      UserDefaults.standard.set(30, forKey: "calendarReminderMinutes")
    }

    updateAuthorizationStatus()
    loadSyncedItineraries()
    loadSyncedFlights()
    loadSyncedHotels()
    loadSelectedCalendar()

    if bidirectionalSyncEnabled && isAuthorized {
      startObservingCalendarChanges()
    }
  }

  deinit {
    stopObservingCalendarChanges()
  }

  // MARK: - Authorization

  /// Request calendar access permission
  func requestAccess() async -> Bool {
    do {
      if #available(iOS 17.0, *) {
        let granted = try await eventStore.requestFullAccessToEvents()
        updateAuthorizationStatus()
        if granted {
          loadAvailableCalendars()
        }
        return granted
      } else {
        let granted = try await eventStore.requestAccess(to: .event)
        updateAuthorizationStatus()
        if granted {
          loadAvailableCalendars()
        }
        return granted
      }
    } catch {
      logger.error("Failed to request calendar access: \(error.localizedDescription)")
      return false
    }
  }

  /// Update the current authorization status
  private func updateAuthorizationStatus() {
    authorizationStatus = EKEventStore.authorizationStatus(for: .event)
    logger.info("Calendar authorization status: \(String(describing: self.authorizationStatus))")
  }

  /// Load available calendars
  func loadAvailableCalendars() {
    availableCalendars = eventStore.calendars(for: .event).filter { $0.allowsContentModifications }
    logger.info("Found \(self.availableCalendars.count) writable calendars")
  }

  /// Load previously selected calendar
  private func loadSelectedCalendar() {
    selectedCalendarId = UserDefaults.standard.string(forKey: "selectedCalendarId")
  }

  /// Get the calendar to use for syncing
  private func getTargetCalendar() -> EKCalendar? {
    if let selectedId = selectedCalendarId,
      let calendar = eventStore.calendar(withIdentifier: selectedId)
    {
      return calendar
    }
    return eventStore.defaultCalendarForNewEvents
  }

  // MARK: - Bidirectional Sync

  /// Start observing calendar changes for bidirectional sync
  private func startObservingCalendarChanges() {
    guard calendarChangeObserver == nil else { return }

    calendarChangeObserver = NotificationCenter.default.addObserver(
      forName: .EKEventStoreChanged,
      object: eventStore,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        await self?.handleCalendarChanges()
      }
    }

    logger.info("Started observing calendar changes for bidirectional sync")
  }

  /// Stop observing calendar changes
  private func stopObservingCalendarChanges() {
    if let observer = calendarChangeObserver {
      NotificationCenter.default.removeObserver(observer)
      calendarChangeObserver = nil
      logger.info("Stopped observing calendar changes")
    }
  }

  /// Handle calendar changes from external sources
  private func handleCalendarChanges() async {
    guard bidirectionalSyncEnabled else { return }

    logger.debug("Detected calendar changes, checking for updates...")

    // Check for deleted or modified itinerary events
    for (itineraryId, syncInfo) in syncedItineraries {
      var updatedEventIds: [String] = []
      var hasChanges = false

      for eventId in syncInfo.eventIds {
        if let event = eventStore.event(withIdentifier: eventId) {
          updatedEventIds.append(eventId)

          // Check if event was modified externally
          if let lastModified = event.lastModifiedDate,
            lastModified > syncInfo.syncedAt
          {
            hasChanges = true
            logger.debug("Event \(eventId) was modified externally")
          }
        } else {
          // Event was deleted
          hasChanges = true
          logger.debug("Event \(eventId) was deleted externally")
        }
      }

      if hasChanges {
        // Update sync info with remaining events
        var updatedInfo = syncInfo
        updatedInfo = CalendarSyncInfo(
          itineraryId: syncInfo.itineraryId,
          calendarId: syncInfo.calendarId,
          eventIds: updatedEventIds,
          syncedAt: Date(),
          startDate: syncInfo.startDate,
          enableReminders: syncInfo.enableReminders,
          reminderMinutes: syncInfo.reminderMinutes
        )
        syncedItineraries[itineraryId] = updatedInfo
        saveSyncedItineraries()

        // Notify about changes
        NotificationCenter.default.post(
          name: .calendarSyncUpdated,
          object: nil,
          userInfo: ["itineraryId": itineraryId]
        )
      }
    }

    // Check flight events
    for (flightId, syncInfo) in syncedFlights {
      if let eventId = syncInfo.eventId,
        eventStore.event(withIdentifier: eventId) == nil
      {
        // Event was deleted externally
        syncedFlights.removeValue(forKey: flightId)
        saveSyncedFlights()
        logger.debug("Flight event \(eventId) was deleted externally")
      }
    }

    // Check hotel events
    for (hotelId, syncInfo) in syncedHotels {
      var hasChanges = false
      for eventId in syncInfo.eventIds {
        if eventStore.event(withIdentifier: eventId) == nil {
          hasChanges = true
          break
        }
      }
      if hasChanges {
        syncedHotels.removeValue(forKey: hotelId)
        saveSyncedHotels()
        logger.debug("Hotel events were modified/deleted externally")
      }
    }
  }

  // MARK: - Itinerary Sync Operations

  /// Sync an itinerary to the calendar
  func syncItinerary(
    _ itinerary: SavedItinerary,
    startDate: Date = Date(),
    enableReminders: Bool = true,
    reminderMinutes: Int = 30
  ) async -> Result<CalendarSyncInfo, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let calendar = getTargetCalendar() else {
      return .failure(.noCalendarAvailable)
    }

    // First, remove any existing events for this itinerary
    if let existingSync = syncedItineraries[itinerary.id.uuidString] {
      await removeEvents(for: existingSync)
    }

    var eventIds: [String] = []

    // Create events for each day
    for day in itinerary.days {
      let dayDate = Calendar.current.date(
        byAdding: .day,
        value: day.dayNumber - 1,
        to: startDate
      ) ?? startDate

      // Create event for each POI
      for (index, poi) in day.pois.enumerated() {
        let event = EKEvent(eventStore: eventStore)
        event.calendar = calendar

        // Set title with day number and POI name
        let dayPrefix = "Day \(day.dayNumber)"
        if let theme = day.theme {
          event.title = "[\(dayPrefix): \(theme)] \(poi.name)"
        } else {
          event.title = "[\(dayPrefix)] \(poi.name)"
        }

        // Set times
        let (startTime, endTime) = calculateEventTimes(
          for: poi,
          dayDate: dayDate,
          poiIndex: index,
          totalPois: day.pois.count
        )
        event.startDate = startTime
        event.endDate = endTime
        event.isAllDay = false

        // Set location if available
        if let lat = poi.latitude, let lng = poi.longitude, lat != 0, lng != 0 {
          let location = EKStructuredLocation(title: poi.address ?? poi.name)
          location.geoLocation = CLLocation(latitude: lat, longitude: lng)
          event.structuredLocation = location
        } else if let address = poi.address {
          event.location = address
        }

        // Set notes with POI details
        var notes: [String] = []
        if let description = poi.description {
          notes.append(description)
        }
        if let type = poi.type {
          notes.append("Type: \(type)")
        }
        if let duration = poi.duration {
          notes.append("Suggested duration: \(duration)")
        }
        if let priceInfo = poi.priceInfo {
          notes.append("Price: \(priceInfo)")
        }
        if let openingHours = poi.openingHours {
          notes.append("Hours: \(openingHours)")
        }
        if let tips = poi.tips {
          notes.append("Tips: \(tips)")
        }
        notes.append("")
        notes.append("Synced from Pathfinding")
        if !notes.isEmpty {
          event.notes = notes.joined(separator: "\n")
        }

        // Add reminder if enabled
        if enableReminders {
          let alarm = EKAlarm(relativeOffset: TimeInterval(-reminderMinutes * 60))
          event.addAlarm(alarm)
        }

        // Save event
        do {
          try eventStore.save(event, span: .thisEvent)
          if let eventId = event.eventIdentifier {
            eventIds.append(eventId)
          }
          logger.debug("Created event: \(event.title ?? "Unknown")")
        } catch {
          logger.error("Failed to save event: \(error.localizedDescription)")
          // Continue with other events even if one fails
        }
      }
    }

    // Create sync info
    let syncInfo = CalendarSyncInfo(
      itineraryId: itinerary.id.uuidString,
      calendarId: calendar.calendarIdentifier,
      eventIds: eventIds,
      syncedAt: Date(),
      startDate: startDate,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    // Save sync info
    syncedItineraries[itinerary.id.uuidString] = syncInfo
    saveSyncedItineraries()

    logger.info("Synced itinerary '\(itinerary.title)' with \(eventIds.count) events")
    return .success(syncInfo)
  }

  /// Calculate start and end times for a POI event
  private func calculateEventTimes(
    for poi: AiPoi,
    dayDate: Date,
    poiIndex: Int,
    totalPois: Int
  ) -> (start: Date, end: Date) {
    let calendar = Calendar.current

    // Try to parse time from POI if available
    if let timeString = poi.time {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      if let parsedTime = timeFormatter.date(from: timeString) {
        let timeComponents = calendar.dateComponents([.hour, .minute], from: parsedTime)
        if let start = calendar.date(
          bySettingHour: timeComponents.hour ?? 9,
          minute: timeComponents.minute ?? 0,
          second: 0,
          of: dayDate
        ) {
          // Parse duration or default to 1 hour
          var durationMinutes = 60
          if let durationStr = poi.duration {
            durationMinutes = parseDurationToMinutes(durationStr)
          }
          let end = calendar.date(byAdding: .minute, value: durationMinutes, to: start) ?? start
          return (start, end)
        }
      }
    }

    // Default scheduling: distribute POIs throughout the day (9 AM - 6 PM)
    let startHour = 9
    let endHour = 18
    let totalMinutes = (endHour - startHour) * 60
    let minutesPerPoi = totalPois > 1 ? totalMinutes / totalPois : 60

    let poiStartMinutes = poiIndex * minutesPerPoi
    let startMinute = poiStartMinutes % 60
    let startHourOffset = poiStartMinutes / 60

    guard
      let start = calendar.date(
        bySettingHour: startHour + startHourOffset,
        minute: startMinute,
        second: 0,
        of: dayDate
      )
    else {
      let fallbackStart =
        calendar.date(bySettingHour: 9, minute: 0, second: 0, of: dayDate) ?? dayDate
      return (fallbackStart, calendar.date(byAdding: .hour, value: 1, to: fallbackStart) ?? fallbackStart)
    }

    let end = calendar.date(byAdding: .minute, value: minutesPerPoi, to: start) ?? start
    return (start, end)
  }

  /// Parse duration string to minutes
  private func parseDurationToMinutes(_ duration: String) -> Int {
    let lowered = duration.lowercased()

    // Try to extract hours
    if let range = lowered.range(of: #"(\d+)\s*(?:小时|hour|hr|h)"#, options: .regularExpression) {
      let match = String(lowered[range])
      if let hours = Int(match.filter { $0.isNumber }) {
        return hours * 60
      }
    }

    // Try to extract minutes
    if let range = lowered.range(of: #"(\d+)\s*(?:分钟|minute|min|m)"#, options: .regularExpression)
    {
      let match = String(lowered[range])
      if let minutes = Int(match.filter { $0.isNumber }) {
        return minutes
      }
    }

    // Default to 1 hour
    return 60
  }

  /// Remove synced events for an itinerary
  func unsyncItinerary(_ itineraryId: String) async -> Result<Void, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let syncInfo = syncedItineraries[itineraryId] else {
      return .failure(.notSynced)
    }

    await removeEvents(for: syncInfo)

    // Remove sync info
    syncedItineraries.removeValue(forKey: itineraryId)
    saveSyncedItineraries()

    logger.info("Unsynced itinerary: \(itineraryId)")
    return .success(())
  }

  /// Remove events for a sync info
  private func removeEvents(for syncInfo: CalendarSyncInfo) async {
    for eventId in syncInfo.eventIds {
      if let event = eventStore.event(withIdentifier: eventId) {
        do {
          try eventStore.remove(event, span: .thisEvent)
          logger.debug("Removed event: \(eventId)")
        } catch {
          logger.error("Failed to remove event \(eventId): \(error.localizedDescription)")
        }
      }
    }
  }

  /// Check if an itinerary is synced
  func isSynced(_ itineraryId: String) -> Bool {
    syncedItineraries[itineraryId] != nil
  }

  /// Get sync info for an itinerary
  func getSyncInfo(_ itineraryId: String) -> CalendarSyncInfo? {
    syncedItineraries[itineraryId]
  }

  // MARK: - Flight Sync Operations

  /// Sync a flight booking to the calendar
  func syncFlight(
    _ booking: FlightBooking,
    enableReminders: Bool = true,
    reminderMinutes: Int = 120  // 2 hours before flight
  ) async -> Result<FlightCalendarSyncInfo, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let calendar = getTargetCalendar() else {
      return .failure(.noCalendarAvailable)
    }

    // Remove existing event if synced
    if let existingSync = syncedFlights[booking.id],
      let eventId = existingSync.eventId,
      let event = eventStore.event(withIdentifier: eventId)
    {
      do {
        try eventStore.remove(event, span: .thisEvent)
      } catch {
        logger.error("Failed to remove existing flight event: \(error.localizedDescription)")
      }
    }

    let event = EKEvent(eventStore: eventStore)
    event.calendar = calendar

    // Set title with flight number and route
    let flightNumber = booking.flight?.flightNumber ?? "Flight"
    let route = booking.displayRoute
    event.title = "\(flightNumber): \(route)"

    // Set times
    event.startDate = booking.departureDate
    event.endDate = booking.arrivalDate
    event.isAllDay = false

    // Set departure location
    if let flight = booking.flight {
      let departureLocation = flight.departureAirportName ?? flight.departureAirport
      let arrivalLocation = flight.arrivalAirportName ?? flight.arrivalAirport
      event.location = "\(departureLocation) -> \(arrivalLocation)"
    }

    // Set notes
    var notes: [String] = []
    notes.append("Confirmation: \(booking.confirmationCode)")
    notes.append("Passenger: \(booking.passengerName)")
    if let seat = booking.seatNumber {
      notes.append("Seat: \(seat)")
    }
    notes.append("Class: \(booking.cabinClass.displayName)")
    if let terminal = booking.flight?.departureTerminal {
      notes.append("Terminal: \(terminal)")
    }
    if let gate = booking.flight?.departureGate {
      notes.append("Gate: \(gate)")
    }
    if let baggage = booking.baggageAllowance {
      notes.append("Baggage: \(baggage)")
    }
    notes.append("")
    notes.append("Synced from Pathfinding")
    event.notes = notes.joined(separator: "\n")

    // Add reminders
    if enableReminders {
      // Main reminder
      let mainAlarm = EKAlarm(relativeOffset: TimeInterval(-reminderMinutes * 60))
      event.addAlarm(mainAlarm)

      // Day before reminder for flights
      let dayBeforeAlarm = EKAlarm(relativeOffset: TimeInterval(-24 * 60 * 60))
      event.addAlarm(dayBeforeAlarm)

      // Check-in reminder (24 hours before)
      if booking.canCheckIn {
        let checkInAlarm = EKAlarm(relativeOffset: TimeInterval(-24 * 60 * 60))
        event.addAlarm(checkInAlarm)
      }
    }

    // Save event
    do {
      try eventStore.save(event, span: .thisEvent)
    } catch {
      logger.error("Failed to save flight event: \(error.localizedDescription)")
      return .failure(.saveFailed(error))
    }

    guard let eventId = event.eventIdentifier else {
      return .failure(.saveFailed(NSError(domain: "CalendarManager", code: -1)))
    }

    let syncInfo = FlightCalendarSyncInfo(
      flightBookingId: booking.id,
      calendarId: calendar.calendarIdentifier,
      eventId: eventId,
      syncedAt: Date(),
      flightNumber: flightNumber,
      departureDate: booking.departureDate,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    syncedFlights[booking.id] = syncInfo
    saveSyncedFlights()

    logger.info("Synced flight \(flightNumber) to calendar")
    return .success(syncInfo)
  }

  /// Remove synced flight from calendar
  func unsyncFlight(_ bookingId: String) async -> Result<Void, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let syncInfo = syncedFlights[bookingId],
      let eventId = syncInfo.eventId
    else {
      return .failure(.notSynced)
    }

    if let event = eventStore.event(withIdentifier: eventId) {
      do {
        try eventStore.remove(event, span: .thisEvent)
      } catch {
        logger.error("Failed to remove flight event: \(error.localizedDescription)")
        return .failure(.saveFailed(error))
      }
    }

    syncedFlights.removeValue(forKey: bookingId)
    saveSyncedFlights()

    logger.info("Unsynced flight: \(bookingId)")
    return .success(())
  }

  /// Check if a flight is synced
  func isFlightSynced(_ bookingId: String) -> Bool {
    syncedFlights[bookingId] != nil
  }

  // MARK: - Hotel Sync Operations

  /// Sync a hotel booking to the calendar
  func syncHotel(
    _ booking: HotelBooking,
    enableReminders: Bool = true,
    reminderMinutes: Int = 60
  ) async -> Result<HotelCalendarSyncInfo, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let calendar = getTargetCalendar() else {
      return .failure(.noCalendarAvailable)
    }

    // Remove existing events if synced
    if let existingSync = syncedHotels[booking.id] {
      for eventId in existingSync.eventIds {
        if let event = eventStore.event(withIdentifier: eventId) {
          do {
            try eventStore.remove(event, span: .thisEvent)
          } catch {
            logger.error("Failed to remove existing hotel event: \(error.localizedDescription)")
          }
        }
      }
    }

    var eventIds: [String] = []
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    guard let checkInDate = dateFormatter.date(from: booking.checkInDate),
      let checkOutDate = dateFormatter.date(from: booking.checkOutDate)
    else {
      return .failure(.saveFailed(NSError(domain: "CalendarManager", code: -2)))
    }

    // Create check-in event
    let checkInEvent = EKEvent(eventStore: eventStore)
    checkInEvent.calendar = calendar
    checkInEvent.title = "Check-in: \(booking.hotelName)"

    // Set check-in time (default 15:00 if not specified)
    var checkInDateTime = checkInDate
    if let timeStr = booking.checkInTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      if let time = timeFormatter.date(from: timeStr) {
        let components = Calendar.current.dateComponents([.hour, .minute], from: time)
        checkInDateTime =
          Calendar.current.date(
            bySettingHour: components.hour ?? 15,
            minute: components.minute ?? 0,
            second: 0,
            of: checkInDate
          ) ?? checkInDate
      }
    } else {
      checkInDateTime =
        Calendar.current.date(bySettingHour: 15, minute: 0, second: 0, of: checkInDate) ?? checkInDate
    }

    checkInEvent.startDate = checkInDateTime
    checkInEvent.endDate = Calendar.current.date(byAdding: .hour, value: 1, to: checkInDateTime)
      ?? checkInDateTime
    checkInEvent.isAllDay = false

    // Set location
    if let address = booking.address {
      if let lat = booking.latitude, let lng = booking.longitude {
        let location = EKStructuredLocation(title: address)
        location.geoLocation = CLLocation(latitude: lat, longitude: lng)
        checkInEvent.structuredLocation = location
      } else {
        checkInEvent.location = address
      }
    }

    // Set notes
    var checkInNotes: [String] = []
    if let confirmation = booking.confirmationNumber {
      checkInNotes.append("Confirmation: \(confirmation)")
    }
    if let roomType = booking.roomType {
      checkInNotes.append("Room: \(roomType)")
    }
    if let phone = booking.hotelPhone {
      checkInNotes.append("Phone: \(phone)")
    }
    checkInNotes.append("Check-out: \(booking.formattedCheckOutDate)")
    checkInNotes.append("")
    checkInNotes.append("Synced from Pathfinding")
    checkInEvent.notes = checkInNotes.joined(separator: "\n")

    if enableReminders {
      let alarm = EKAlarm(relativeOffset: TimeInterval(-reminderMinutes * 60))
      checkInEvent.addAlarm(alarm)
    }

    do {
      try eventStore.save(checkInEvent, span: .thisEvent)
      if let eventId = checkInEvent.eventIdentifier {
        eventIds.append(eventId)
      }
    } catch {
      logger.error("Failed to save check-in event: \(error.localizedDescription)")
    }

    // Create check-out event
    let checkOutEvent = EKEvent(eventStore: eventStore)
    checkOutEvent.calendar = calendar
    checkOutEvent.title = "Check-out: \(booking.hotelName)"

    // Set check-out time (default 11:00 if not specified)
    var checkOutDateTime = checkOutDate
    if let timeStr = booking.checkOutTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      if let time = timeFormatter.date(from: timeStr) {
        let components = Calendar.current.dateComponents([.hour, .minute], from: time)
        checkOutDateTime =
          Calendar.current.date(
            bySettingHour: components.hour ?? 11,
            minute: components.minute ?? 0,
            second: 0,
            of: checkOutDate
          ) ?? checkOutDate
      }
    } else {
      checkOutDateTime =
        Calendar.current.date(bySettingHour: 11, minute: 0, second: 0, of: checkOutDate)
        ?? checkOutDate
    }

    checkOutEvent.startDate = checkOutDateTime
    checkOutEvent.endDate = Calendar.current.date(byAdding: .hour, value: 1, to: checkOutDateTime)
      ?? checkOutDateTime
    checkOutEvent.isAllDay = false

    if let address = booking.address {
      checkOutEvent.location = address
    }

    var checkOutNotes: [String] = []
    checkOutNotes.append("Remember to check out before \(booking.checkOutTime ?? "11:00")")
    if let confirmation = booking.confirmationNumber {
      checkOutNotes.append("Confirmation: \(confirmation)")
    }
    checkOutNotes.append("")
    checkOutNotes.append("Synced from Pathfinding")
    checkOutEvent.notes = checkOutNotes.joined(separator: "\n")

    if enableReminders {
      let alarm = EKAlarm(relativeOffset: TimeInterval(-60 * 60))  // 1 hour before
      checkOutEvent.addAlarm(alarm)
    }

    do {
      try eventStore.save(checkOutEvent, span: .thisEvent)
      if let eventId = checkOutEvent.eventIdentifier {
        eventIds.append(eventId)
      }
    } catch {
      logger.error("Failed to save check-out event: \(error.localizedDescription)")
    }

    let syncInfo = HotelCalendarSyncInfo(
      hotelBookingId: booking.id,
      calendarId: calendar.calendarIdentifier,
      eventIds: eventIds,
      syncedAt: Date(),
      hotelName: booking.hotelName,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    syncedHotels[booking.id] = syncInfo
    saveSyncedHotels()

    logger.info("Synced hotel \(booking.hotelName) to calendar with \(eventIds.count) events")
    return .success(syncInfo)
  }

  /// Remove synced hotel from calendar
  func unsyncHotel(_ bookingId: String) async -> Result<Void, CalendarError> {
    guard isAuthorized else {
      return .failure(.notAuthorized)
    }

    guard let syncInfo = syncedHotels[bookingId] else {
      return .failure(.notSynced)
    }

    for eventId in syncInfo.eventIds {
      if let event = eventStore.event(withIdentifier: eventId) {
        do {
          try eventStore.remove(event, span: .thisEvent)
        } catch {
          logger.error("Failed to remove hotel event: \(error.localizedDescription)")
        }
      }
    }

    syncedHotels.removeValue(forKey: bookingId)
    saveSyncedHotels()

    logger.info("Unsynced hotel: \(bookingId)")
    return .success(())
  }

  /// Check if a hotel is synced
  func isHotelSynced(_ bookingId: String) -> Bool {
    syncedHotels[bookingId] != nil
  }

  // MARK: - Bulk Sync Operations

  /// Sync all upcoming flights
  func syncAllFlights(_ bookings: [FlightBooking]) async -> Int {
    var syncedCount = 0
    for booking in bookings where booking.isUpcoming {
      let result = await syncFlight(booking)
      if case .success = result {
        syncedCount += 1
      }
    }
    return syncedCount
  }

  /// Sync all upcoming hotels
  func syncAllHotels(_ bookings: [HotelBooking]) async -> Int {
    var syncedCount = 0
    let today = Date()
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    for booking in bookings {
      if let checkInDate = dateFormatter.date(from: booking.checkInDate),
        checkInDate > today
      {
        let result = await syncHotel(booking)
        if case .success = result {
          syncedCount += 1
        }
      }
    }
    return syncedCount
  }

  // MARK: - iCal Export

  /// Generate iCal data for an itinerary
  func generateICalData(
    for itinerary: SavedItinerary,
    startDate: Date = Date()
  ) -> String {
    var icalLines: [String] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pathfinding//Travel Itinerary//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:\(escapeICalText(itinerary.title))",
    ]

    let uid = UUID().uuidString

    for day in itinerary.days {
      let dayDate = Calendar.current.date(
        byAdding: .day,
        value: day.dayNumber - 1,
        to: startDate
      ) ?? startDate

      for (index, poi) in day.pois.enumerated() {
        let (startTime, endTime) = calculateEventTimes(
          for: poi,
          dayDate: dayDate,
          poiIndex: index,
          totalPois: day.pois.count
        )

        let eventUid = "\(uid)-day\(day.dayNumber)-poi\(index)@pathfinding.org"
        let dayPrefix = "Day \(day.dayNumber)"
        let title =
          day.theme != nil
          ? "[\(dayPrefix): \(day.theme!)] \(poi.name)"
          : "[\(dayPrefix)] \(poi.name)"

        icalLines.append("BEGIN:VEVENT")
        icalLines.append("UID:\(eventUid)")
        icalLines.append("DTSTAMP:\(formatICalDate(Date()))")
        icalLines.append("DTSTART:\(formatICalDate(startTime))")
        icalLines.append("DTEND:\(formatICalDate(endTime))")
        icalLines.append("SUMMARY:\(escapeICalText(title))")

        if let address = poi.address {
          icalLines.append("LOCATION:\(escapeICalText(address))")
        }

        if let lat = poi.latitude, let lng = poi.longitude, lat != 0, lng != 0 {
          icalLines.append("GEO:\(lat);\(lng)")
        }

        var description: [String] = []
        if let desc = poi.description { description.append(desc) }
        if let type = poi.type { description.append("Type: \(type)") }
        if let duration = poi.duration { description.append("Duration: \(duration)") }
        if let priceInfo = poi.priceInfo { description.append("Price: \(priceInfo)") }
        if let tips = poi.tips { description.append("Tips: \(tips)") }

        if !description.isEmpty {
          icalLines.append("DESCRIPTION:\(escapeICalText(description.joined(separator: "\\n")))")
        }

        // Add reminder
        icalLines.append("BEGIN:VALARM")
        icalLines.append("TRIGGER:-PT\(defaultReminderMinutes)M")
        icalLines.append("ACTION:DISPLAY")
        icalLines.append("DESCRIPTION:Reminder")
        icalLines.append("END:VALARM")

        icalLines.append("END:VEVENT")
      }
    }

    icalLines.append("END:VCALENDAR")
    return icalLines.joined(separator: "\r\n")
  }

  /// Generate iCal data for a flight booking
  func generateFlightICalData(_ booking: FlightBooking) -> String {
    var icalLines: [String] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pathfinding//Flight Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ]

    let uid = UUID().uuidString
    let flightNumber = booking.flight?.flightNumber ?? "Flight"

    icalLines.append("BEGIN:VEVENT")
    icalLines.append("UID:\(uid)@pathfinding.org")
    icalLines.append("DTSTAMP:\(formatICalDate(Date()))")
    icalLines.append("DTSTART:\(formatICalDate(booking.departureDate))")
    icalLines.append("DTEND:\(formatICalDate(booking.arrivalDate))")
    icalLines.append("SUMMARY:\(escapeICalText("\(flightNumber): \(booking.displayRoute)"))")

    if let flight = booking.flight {
      let location = "\(flight.departureAirport) -> \(flight.arrivalAirport)"
      icalLines.append("LOCATION:\(escapeICalText(location))")
    }

    var description: [String] = []
    description.append("Confirmation: \(booking.confirmationCode)")
    description.append("Passenger: \(booking.passengerName)")
    if let seat = booking.seatNumber { description.append("Seat: \(seat)") }
    description.append("Class: \(booking.cabinClass.displayName)")
    icalLines.append("DESCRIPTION:\(escapeICalText(description.joined(separator: "\\n")))")

    icalLines.append("BEGIN:VALARM")
    icalLines.append("TRIGGER:-PT2H")
    icalLines.append("ACTION:DISPLAY")
    icalLines.append("DESCRIPTION:Flight Reminder")
    icalLines.append("END:VALARM")

    icalLines.append("END:VEVENT")
    icalLines.append("END:VCALENDAR")

    return icalLines.joined(separator: "\r\n")
  }

  /// Format date for iCal
  private func formatICalDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
    formatter.timeZone = TimeZone(identifier: "UTC")
    return formatter.string(from: date)
  }

  /// Escape text for iCal format
  private func escapeICalText(_ text: String) -> String {
    text
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: ";", with: "\\;")
      .replacingOccurrences(of: ",", with: "\\,")
      .replacingOccurrences(of: "\n", with: "\\n")
  }

  /// Export itinerary to a temporary iCal file
  func exportToFile(_ itinerary: SavedItinerary, startDate: Date = Date()) -> URL? {
    let icalData = generateICalData(for: itinerary, startDate: startDate)

    let fileName = "\(itinerary.title.replacingOccurrences(of: " ", with: "_")).ics"
    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

    do {
      try icalData.write(to: tempURL, atomically: true, encoding: .utf8)
      logger.info("Exported iCal to: \(tempURL.path)")
      return tempURL
    } catch {
      logger.error("Failed to export iCal: \(error.localizedDescription)")
      return nil
    }
  }

  /// Export flight to a temporary iCal file
  func exportFlightToFile(_ booking: FlightBooking) -> URL? {
    let icalData = generateFlightICalData(booking)

    let flightNumber = booking.flight?.flightNumber ?? "flight"
    let fileName = "\(flightNumber)_\(booking.confirmationCode).ics"
    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

    do {
      try icalData.write(to: tempURL, atomically: true, encoding: .utf8)
      logger.info("Exported flight iCal to: \(tempURL.path)")
      return tempURL
    } catch {
      logger.error("Failed to export flight iCal: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Persistence

  private let syncedItinerariesKey = "syncedCalendarItineraries"
  private let syncedFlightsKey = "syncedCalendarFlights"
  private let syncedHotelsKey = "syncedCalendarHotels"

  private func loadSyncedItineraries() {
    guard let data = UserDefaults.standard.data(forKey: syncedItinerariesKey),
      let decoded = try? JSONDecoder().decode([String: CalendarSyncInfo].self, from: data)
    else {
      return
    }
    syncedItineraries = decoded
    logger.info("Loaded \(self.syncedItineraries.count) synced itineraries")
  }

  private func saveSyncedItineraries() {
    guard let data = try? JSONEncoder().encode(syncedItineraries) else { return }
    UserDefaults.standard.set(data, forKey: syncedItinerariesKey)
  }

  private func loadSyncedFlights() {
    guard let data = UserDefaults.standard.data(forKey: syncedFlightsKey),
      let decoded = try? JSONDecoder().decode([String: FlightCalendarSyncInfo].self, from: data)
    else {
      return
    }
    syncedFlights = decoded
    logger.info("Loaded \(self.syncedFlights.count) synced flights")
  }

  private func saveSyncedFlights() {
    guard let data = try? JSONEncoder().encode(syncedFlights) else { return }
    UserDefaults.standard.set(data, forKey: syncedFlightsKey)
  }

  private func loadSyncedHotels() {
    guard let data = UserDefaults.standard.data(forKey: syncedHotelsKey),
      let decoded = try? JSONDecoder().decode([String: HotelCalendarSyncInfo].self, from: data)
    else {
      return
    }
    syncedHotels = decoded
    logger.info("Loaded \(self.syncedHotels.count) synced hotels")
  }

  private func saveSyncedHotels() {
    guard let data = try? JSONEncoder().encode(syncedHotels) else { return }
    UserDefaults.standard.set(data, forKey: syncedHotelsKey)
  }

  // MARK: - Statistics

  /// Get total synced events count
  var totalSyncedEventsCount: Int {
    let itineraryEvents = syncedItineraries.values.reduce(0) { $0 + $1.eventIds.count }
    let flightEvents = syncedFlights.count
    let hotelEvents = syncedHotels.values.reduce(0) { $0 + $1.eventIds.count }
    return itineraryEvents + flightEvents + hotelEvents
  }

  /// Get sync statistics
  var syncStatistics: CalendarSyncStatistics {
    CalendarSyncStatistics(
      syncedItineraries: syncedItineraries.count,
      syncedFlights: syncedFlights.count,
      syncedHotels: syncedHotels.count,
      totalEvents: totalSyncedEventsCount
    )
  }
}

// MARK: - Supporting Types

/// Information about a synced itinerary
struct CalendarSyncInfo: Codable, Equatable {
  let itineraryId: String
  let calendarId: String
  let eventIds: [String]
  let syncedAt: Date
  let startDate: Date
  let enableReminders: Bool
  let reminderMinutes: Int
}

/// Information about a synced flight
struct FlightCalendarSyncInfo: Codable, Equatable {
  let flightBookingId: String
  let calendarId: String
  let eventId: String?
  let syncedAt: Date
  let flightNumber: String
  let departureDate: Date
  let enableReminders: Bool
  let reminderMinutes: Int
}

/// Information about a synced hotel
struct HotelCalendarSyncInfo: Codable, Equatable {
  let hotelBookingId: String
  let calendarId: String
  let eventIds: [String]
  let syncedAt: Date
  let hotelName: String
  let checkInDate: Date
  let checkOutDate: Date
  let enableReminders: Bool
  let reminderMinutes: Int
}

/// Calendar sync statistics
struct CalendarSyncStatistics {
  let syncedItineraries: Int
  let syncedFlights: Int
  let syncedHotels: Int
  let totalEvents: Int
}

/// Calendar operation errors
enum CalendarError: LocalizedError {
  case notAuthorized
  case noCalendarAvailable
  case notSynced
  case saveFailed(Error)

  var errorDescription: String? {
    switch self {
    case .notAuthorized:
      return "Calendar access not authorized. Please enable in Settings."
    case .noCalendarAvailable:
      return "No writable calendar available."
    case .notSynced:
      return "This item is not synced to calendar."
    case .saveFailed(let error):
      return "Failed to save event: \(error.localizedDescription)"
    }
  }
}

// MARK: - Notifications

extension Notification.Name {
  static let calendarSyncUpdated = Notification.Name("calendarSyncUpdated")
}
