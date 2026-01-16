import Foundation
@preconcurrency import WatchConnectivity
import Observation

// MARK: - Sendable Dictionary Wrapper

/// A wrapper to make [String: Any] dictionary sendable across actor boundaries
struct WatchSendableDict: @unchecked Sendable {
  let value: [String: Any]

  init(_ value: [String: Any]) {
    self.value = value
  }
}

/// A wrapper to make reply handler sendable across actor boundaries
final class WatchSendableReplyHandler: @unchecked Sendable {
  let handler: ([String: Any]) -> Void

  init(_ handler: @escaping ([String: Any]) -> Void) {
    self.handler = handler
  }

  func reply(_ dict: [String: Any]) {
    handler(dict)
  }
}

// MARK: - WatchConnectivity Manager (Watch Side)

/// Manages communication between Watch and iPhone
@MainActor
@Observable
final class WatchSessionManager: NSObject {
  static let shared = WatchSessionManager()

  // MARK: - State

  private(set) var isReachable: Bool = false
  private(set) var isCompanionAppInstalled: Bool = false
  private(set) var lastSyncDate: Date?

  // MARK: - Data

  private(set) var todayItinerary: WatchItinerary?
  private(set) var upcomingFlights: [WatchFlight] = []
  private(set) var emergencyContacts: [WatchEmergencyContact] = []
  private(set) var emergencyServices: WatchEmergencyServices = .china
  private(set) var recentNotes: [WatchNote] = []

  // MARK: - Private

  private var session: WCSession?

  // MARK: - Initialization

  private override init() {
    super.init()
  }

  /// Start the WatchConnectivity session
  func startSession() {
    guard WCSession.isSupported() else {
      print("[WatchSession] Not supported")
      return
    }

    session = WCSession.default
    session?.delegate = self
    session?.activate()
  }

  // MARK: - Request Data from iPhone

  /// Request today's itinerary from iPhone
  func requestTodayItinerary() {
    let message: [String: Any] = [WatchMessageKey.requestTodayItinerary.rawValue: true]

    sendMessage(message) { [weak self] reply in
      Task { @MainActor in
        if let data = reply[WatchMessageKey.itineraryData.rawValue] as? Data,
           let itinerary = try? JSONDecoder().decode(WatchItinerary.self, from: data) {
          self?.todayItinerary = itinerary
          self?.lastSyncDate = Date()
        }
      }
    }
  }

  /// Request flight updates from iPhone
  func requestFlights() {
    let message: [String: Any] = [WatchMessageKey.requestFlights.rawValue: true]

    sendMessage(message) { [weak self] reply in
      Task { @MainActor in
        if let data = reply[WatchMessageKey.flightData.rawValue] as? Data,
           let flights = try? JSONDecoder().decode([WatchFlight].self, from: data) {
          self?.upcomingFlights = flights
        }
      }
    }
  }

  /// Request emergency contacts from iPhone
  func requestEmergencyContacts() {
    let message: [String: Any] = [WatchMessageKey.requestEmergencyContacts.rawValue: true]

    sendMessage(message) { [weak self] reply in
      Task { @MainActor in
        if let contactData = reply[WatchMessageKey.contactData.rawValue] as? Data,
           let contacts = try? JSONDecoder().decode([WatchEmergencyContact].self, from: contactData) {
          self?.emergencyContacts = contacts
        }
        if let serviceData = reply[WatchMessageKey.serviceData.rawValue] as? Data,
           let services = try? JSONDecoder().decode(WatchEmergencyServices.self, from: serviceData) {
          self?.emergencyServices = services
        }
      }
    }
  }

  // MARK: - Send Data to iPhone

  /// Mark POI as visited
  func markPOIVisited(poiId: String, visited: Bool) {
    // Update local state
    if let index = todayItinerary?.pois.firstIndex(where: { $0.id == poiId }) {
      todayItinerary?.pois[index].isVisited = visited
    }

    // Send to iPhone
    let message: [String: Any] = [
      WatchMessageKey.markPOIVisited.rawValue: true,
      WatchMessageKey.poiId.rawValue: poiId,
      WatchMessageKey.visited.rawValue: visited
    ]
    sendMessage(message)
  }

  /// Save a quick note
  func saveNote(_ note: WatchNote) {
    // Add to local notes
    recentNotes.insert(note, at: 0)
    if recentNotes.count > 10 {
      recentNotes = Array(recentNotes.prefix(10))
    }

    // Send to iPhone
    if let noteData = try? JSONEncoder().encode(note) {
      let message: [String: Any] = [
        WatchMessageKey.saveNote.rawValue: true,
        WatchMessageKey.noteData.rawValue: noteData
      ]
      sendMessage(message)
    }
  }

  /// Trigger SOS emergency
  func triggerSOS(location: (latitude: Double, longitude: Double)?) {
    var message: [String: Any] = [WatchMessageKey.triggerSOS.rawValue: true]

    if let location = location {
      message[WatchMessageKey.location.rawValue] = [
        "latitude": location.latitude,
        "longitude": location.longitude
      ]
    }

    // Use user info transfer for reliability (doesn't require reachability)
    if let session = session {
      session.transferUserInfo(message)
    }

    // Also try immediate message
    sendMessage(message)
  }

  // MARK: - Private Helpers

  private func sendMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil) {
    guard let session = session, session.isReachable else {
      print("[WatchSession] iPhone not reachable, using user info transfer")
      // Fall back to user info for non-time-sensitive data
      session?.transferUserInfo(message)
      return
    }

    session.sendMessage(message, replyHandler: replyHandler) { error in
      print("[WatchSession] Message failed: \(error)")
    }
  }

  private func loadFromContext(_ context: [String: Any]) {
    guard let appContext = WatchAppContext.from(dictionary: context) else { return }

    todayItinerary = appContext.todayItinerary
    upcomingFlights = appContext.upcomingFlights
    emergencyContacts = appContext.emergencyContacts
    emergencyServices = appContext.emergencyServices
    recentNotes = appContext.recentNotes
    lastSyncDate = appContext.lastSyncDate
  }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    Task { @MainActor in
      if let error = error {
        print("[WatchSession] Activation failed: \(error)")
        return
      }

      #if os(iOS)
      self.isCompanionAppInstalled = session.isWatchAppInstalled
      #else
      self.isCompanionAppInstalled = session.isCompanionAppInstalled
      #endif
      self.isReachable = session.isReachable

      print("[WatchSession] Activated - Reachable: \(self.isReachable)")

      // Load any existing context
      self.loadFromContext(session.receivedApplicationContext)

      // Request fresh data
      self.requestTodayItinerary()
      self.requestFlights()
      self.requestEmergencyContacts()
    }
  }

  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    Task { @MainActor in
      self.isReachable = session.isReachable
      print("[WatchSession] Reachability changed: \(session.isReachable)")

      if session.isReachable {
        // Refresh data when iPhone becomes reachable
        self.requestTodayItinerary()
      }
    }
  }

  // MARK: - Receive Messages

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    let wrapped = WatchSendableDict(message)
    Task { @MainActor in
      handleMessage(wrapped.value)
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    let wrapped = WatchSendableDict(message)
    let wrappedHandler = WatchSendableReplyHandler(replyHandler)
    Task { @MainActor in
      handleMessage(wrapped.value)
      wrappedHandler.reply(["received": true])
    }
  }

  @MainActor
  private func handleMessage(_ message: [String: Any]) {
    // Handle itinerary update
    if let data = message[WatchMessageKey.todayItinerary.rawValue] as? Data,
       let itinerary = try? JSONDecoder().decode(WatchItinerary.self, from: data) {
      todayItinerary = itinerary
      lastSyncDate = Date()
    }

    // Handle flights update
    if let data = message[WatchMessageKey.flights.rawValue] as? Data,
       let flights = try? JSONDecoder().decode([WatchFlight].self, from: data) {
      upcomingFlights = flights
    }
  }

  // MARK: - Receive Application Context

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    let wrapped = WatchSendableDict(applicationContext)
    Task { @MainActor in
      loadFromContext(wrapped.value)
      print("[WatchSession] Received application context update")
    }
  }

  // MARK: - Receive User Info

  nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    let wrapped = WatchSendableDict(userInfo)
    Task { @MainActor in
      handleMessage(wrapped.value)
    }
  }

  #if os(iOS)
  nonisolated func sessionDidBecomeInactive(_ session: WCSession) {
    print("[WatchSession] Session became inactive")
  }

  nonisolated func sessionDidDeactivate(_ session: WCSession) {
    print("[WatchSession] Session deactivated")
    // Reactivate the session
    session.activate()
  }
  #endif
}
