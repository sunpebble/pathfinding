import Foundation
import WatchConnectivity
import Observation

// MARK: - WatchConnectivity Manager (iPhone Side)

/// Manages communication between iPhone and Apple Watch
@MainActor
@Observable
final class WatchConnectivityManager: NSObject {
  static let shared = WatchConnectivityManager()

  // MARK: - State

  private(set) var isReachable: Bool = false
  private(set) var isPaired: Bool = false
  private(set) var isWatchAppInstalled: Bool = false
  private(set) var lastSyncDate: Date?

  // MARK: - Data Providers

  private var itineraryProvider: (() -> WatchItinerary?)?
  private var flightsProvider: (() -> [WatchFlight])?
  private var emergencyContactsProvider: (() -> [WatchEmergencyContact])?
  private var emergencyServicesProvider: (() -> WatchEmergencyServices)?

  // MARK: - Callbacks

  var onNoteReceived: ((WatchNote) -> Void)?
  var onPOIVisitedUpdate: ((String, Bool) -> Void)?
  var onSOSTriggered: ((CLLocationCoordinate2D?) -> Void)?

  // MARK: - Private

  private var session: WCSession?

  // MARK: - Initialization

  private override init() {
    super.init()
  }

  /// Start the WatchConnectivity session
  func startSession() {
    guard WCSession.isSupported() else {
      print("[WatchConnectivity] Not supported on this device")
      return
    }

    session = WCSession.default
    session?.delegate = self
    session?.activate()
    print("[WatchConnectivity] Session activation requested")
  }

  // MARK: - Configuration

  /// Configure data providers for Watch requests
  func configure(
    itineraryProvider: @escaping () -> WatchItinerary?,
    flightsProvider: @escaping () -> [WatchFlight],
    emergencyContactsProvider: @escaping () -> [WatchEmergencyContact],
    emergencyServicesProvider: @escaping () -> WatchEmergencyServices
  ) {
    self.itineraryProvider = itineraryProvider
    self.flightsProvider = flightsProvider
    self.emergencyContactsProvider = emergencyContactsProvider
    self.emergencyServicesProvider = emergencyServicesProvider
  }

  // MARK: - Send Data to Watch

  /// Update the application context (persistent data)
  func updateApplicationContext() {
    guard let session = session, session.activationState == .activated else {
      print("[WatchConnectivity] Session not activated")
      return
    }

    let context = WatchAppContext(
      lastSyncDate: Date(),
      todayItinerary: itineraryProvider?(),
      upcomingFlights: flightsProvider?() ?? [],
      emergencyContacts: emergencyContactsProvider?() ?? [],
      emergencyServices: emergencyServicesProvider?() ?? .china,
      recentNotes: []
    )

    do {
      try session.updateApplicationContext(context.toDictionary())
      lastSyncDate = Date()
      print("[WatchConnectivity] Application context updated")
    } catch {
      print("[WatchConnectivity] Failed to update context: \(error)")
    }
  }

  /// Send message to Watch (requires reachability)
  func sendMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil) {
    guard let session = session, session.isReachable else {
      print("[WatchConnectivity] Watch not reachable")
      return
    }

    session.sendMessage(message, replyHandler: replyHandler) { error in
      print("[WatchConnectivity] Message failed: \(error)")
    }
  }

  /// Send today's itinerary to Watch
  func sendTodayItinerary() {
    guard let itinerary = itineraryProvider?() else { return }

    do {
      let data = try JSONEncoder().encode(itinerary)
      let message: [String: Any] = [
        WatchMessageKey.todayItinerary.rawValue: data
      ]
      sendMessage(message)
    } catch {
      print("[WatchConnectivity] Failed to encode itinerary: \(error)")
    }
  }

  /// Send flight updates to Watch
  func sendFlightUpdates() {
    guard let flights = flightsProvider?() else { return }

    do {
      let data = try JSONEncoder().encode(flights)
      let message: [String: Any] = [
        WatchMessageKey.flights.rawValue: data
      ]
      sendMessage(message)
    } catch {
      print("[WatchConnectivity] Failed to encode flights: \(error)")
    }
  }

  /// Transfer file to Watch
  func transferFile(_ fileURL: URL, metadata: [String: Any]? = nil) {
    guard let session = session, session.activationState == .activated else { return }
    session.transferFile(fileURL, metadata: metadata)
  }

  /// Send complication update
  func transferCurrentComplicationUserInfo(_ userInfo: [String: Any]) {
    guard let session = session, session.activationState == .activated else { return }
    session.transferCurrentComplicationUserInfo(userInfo)
  }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    Task { @MainActor in
      if let error = error {
        print("[WatchConnectivity] Activation failed: \(error)")
        return
      }

      self.isPaired = session.isPaired
      self.isWatchAppInstalled = session.isWatchAppInstalled
      self.isReachable = session.isReachable

      print("[WatchConnectivity] Activated - Paired: \(self.isPaired), Installed: \(self.isWatchAppInstalled), Reachable: \(self.isReachable)")

      // Send initial context
      self.updateApplicationContext()
    }
  }

  nonisolated func sessionDidBecomeInactive(_ session: WCSession) {
    print("[WatchConnectivity] Session became inactive")
  }

  nonisolated func sessionDidDeactivate(_ session: WCSession) {
    print("[WatchConnectivity] Session deactivated")
    // Reactivate for switching watches
    Task { @MainActor in
      self.session?.activate()
    }
  }

  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    Task { @MainActor in
      self.isReachable = session.isReachable
      print("[WatchConnectivity] Reachability changed: \(session.isReachable)")
    }
  }

  nonisolated func sessionWatchStateDidChange(_ session: WCSession) {
    Task { @MainActor in
      self.isPaired = session.isPaired
      self.isWatchAppInstalled = session.isWatchAppInstalled
      print("[WatchConnectivity] Watch state changed - Paired: \(session.isPaired), Installed: \(session.isWatchAppInstalled)")
    }
  }

  // MARK: - Receive Messages

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    Task { @MainActor in
      handleMessage(message)
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    Task { @MainActor in
      let reply = handleMessageWithReply(message)
      replyHandler(reply)
    }
  }

  @MainActor
  private func handleMessage(_ message: [String: Any]) {
    // Handle POI visited update
    if let poiId = message[WatchMessageKey.poiId.rawValue] as? String,
       let visited = message[WatchMessageKey.visited.rawValue] as? Bool {
      onPOIVisitedUpdate?(poiId, visited)
    }

    // Handle note received
    if let noteData = message[WatchMessageKey.noteData.rawValue] as? Data,
       let note = try? JSONDecoder().decode(WatchNote.self, from: noteData) {
      onNoteReceived?(note)
    }

    // Handle SOS triggered
    if message[WatchMessageKey.triggerSOS.rawValue] != nil {
      var coordinate: CLLocationCoordinate2D?
      if let locationData = message[WatchMessageKey.location.rawValue] as? [String: Double],
         let lat = locationData["latitude"],
         let lon = locationData["longitude"] {
        coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
      }
      onSOSTriggered?(coordinate)
    }
  }

  @MainActor
  private func handleMessageWithReply(_ message: [String: Any]) -> [String: Any] {
    var reply: [String: Any] = [:]

    // Request today's itinerary
    if message[WatchMessageKey.requestTodayItinerary.rawValue] != nil {
      if let itinerary = itineraryProvider?(),
         let data = try? JSONEncoder().encode(itinerary) {
        reply[WatchMessageKey.itineraryData.rawValue] = data
      }
    }

    // Request flights
    if message[WatchMessageKey.requestFlights.rawValue] != nil {
      if let flights = flightsProvider?(),
         let data = try? JSONEncoder().encode(flights) {
        reply[WatchMessageKey.flightData.rawValue] = data
      }
    }

    // Request emergency contacts
    if message[WatchMessageKey.requestEmergencyContacts.rawValue] != nil {
      if let contacts = emergencyContactsProvider?(),
         let data = try? JSONEncoder().encode(contacts) {
        reply[WatchMessageKey.contactData.rawValue] = data
      }
      if let services = emergencyServicesProvider?(),
         let data = try? JSONEncoder().encode(services) {
        reply[WatchMessageKey.serviceData.rawValue] = data
      }
    }

    return reply
  }

  // MARK: - Receive User Info

  nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    Task { @MainActor in
      handleMessage(userInfo)
    }
  }

  // MARK: - Receive Application Context

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    Task { @MainActor in
      // Watch sent context update (usually notes or visited POIs)
      handleMessage(applicationContext)
    }
  }
}

// MARK: - CLLocationCoordinate2D Extension

import CoreLocation

extension CLLocationCoordinate2D {
  var dictionaryRepresentation: [String: Double] {
    ["latitude": latitude, "longitude": longitude]
  }
}
