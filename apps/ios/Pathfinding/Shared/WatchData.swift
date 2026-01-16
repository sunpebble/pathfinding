import Foundation

// MARK: - Watch Data Models
// Lightweight models for Watch-iPhone data transfer via WatchConnectivity

/// Simplified itinerary for Watch display
struct WatchItinerary: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let destination: String?
  let date: Date
  var pois: [WatchPOI]

  /// Create from SavedItinerary for today's date
  init(id: String, title: String, destination: String?, date: Date, pois: [WatchPOI]) {
    self.id = id
    self.title = title
    self.destination = destination
    self.date = date
    self.pois = pois
  }

  /// Total POI count
  var totalPOIs: Int { pois.count }

  /// Completed POI count (visited)
  var completedPOIs: Int { pois.filter { $0.isVisited }.count }

  /// Progress percentage
  var progress: Double {
    guard totalPOIs > 0 else { return 0 }
    return Double(completedPOIs) / Double(totalPOIs)
  }
}

/// POI data with navigation info for Watch
struct WatchPOI: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let type: String
  let address: String?
  let latitude: Double?
  let longitude: Double?
  let orderIndex: Int
  let startTime: String?
  let endTime: String?
  var isVisited: Bool
  var notes: String?

  /// POI type icon name for SF Symbols
  var iconName: String {
    switch type.lowercased() {
    case "attraction", "景点":
      return "star.fill"
    case "restaurant", "餐厅", "美食":
      return "fork.knife"
    case "hotel", "酒店", "住宿":
      return "bed.double.fill"
    case "transportation", "交通":
      return "car.fill"
    case "shopping", "购物":
      return "bag.fill"
    case "entertainment", "娱乐":
      return "theatermasks.fill"
    default:
      return "mappin.circle.fill"
    }
  }

  /// Has valid coordinates for navigation
  var hasCoordinates: Bool {
    latitude != nil && longitude != nil
  }
}

/// Flight alert data for Watch
struct WatchFlight: Codable, Identifiable, Hashable {
  let id: String
  let flightNumber: String
  let airline: String?
  let departureCity: String
  let arrivalCity: String
  let departureTime: Date
  let arrivalTime: Date?
  let departureAirport: String?
  let arrivalAirport: String?
  let terminal: String?
  let gate: String?
  let status: WatchFlightStatus
  let delayMinutes: Int?

  /// Time until departure
  var timeUntilDeparture: TimeInterval {
    departureTime.timeIntervalSinceNow
  }

  /// Is departure imminent (within 2 hours)
  var isDepartureImminent: Bool {
    timeUntilDeparture > 0 && timeUntilDeparture < 7200
  }

  /// Formatted departure time
  var formattedDepartureTime: String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: departureTime)
  }
}

/// Flight status for Watch
enum WatchFlightStatus: String, Codable {
  case scheduled = "scheduled"
  case boarding = "boarding"
  case departed = "departed"
  case delayed = "delayed"
  case cancelled = "cancelled"
  case arrived = "arrived"
  case unknown = "unknown"

  var displayName: String {
    switch self {
    case .scheduled: return "准时"
    case .boarding: return "登机中"
    case .departed: return "已起飞"
    case .delayed: return "延误"
    case .cancelled: return "取消"
    case .arrived: return "已到达"
    case .unknown: return "未知"
    }
  }

  var color: String {
    switch self {
    case .scheduled: return "green"
    case .boarding: return "blue"
    case .departed: return "blue"
    case .delayed: return "orange"
    case .cancelled: return "red"
    case .arrived: return "green"
    case .unknown: return "gray"
    }
  }
}

/// Quick note structure for Watch
struct WatchNote: Codable, Identifiable, Hashable {
  let id: String
  let content: String
  let createdAt: Date
  let itineraryId: String?
  let poiId: String?
  let type: WatchNoteType

  init(id: String = UUID().uuidString, content: String, itineraryId: String? = nil, poiId: String? = nil, type: WatchNoteType = .text) {
    self.id = id
    self.content = content
    self.createdAt = Date()
    self.itineraryId = itineraryId
    self.poiId = poiId
    self.type = type
  }
}

/// Note type for Watch
enum WatchNoteType: String, Codable {
  case text = "text"
  case voice = "voice"
  case photo = "photo"
}

/// Emergency contact info for Watch
struct WatchEmergencyContact: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let phone: String
  let relationship: String?
  let isPrimary: Bool

  init(id: String = UUID().uuidString, name: String, phone: String, relationship: String? = nil, isPrimary: Bool = false) {
    self.id = id
    self.name = name
    self.phone = phone
    self.relationship = relationship
    self.isPrimary = isPrimary
  }
}

/// Emergency services info for current location
struct WatchEmergencyServices: Codable {
  let police: String
  let ambulance: String
  let fire: String
  let countryCode: String
  let countryName: String

  /// Default China emergency numbers
  static let china = WatchEmergencyServices(
    police: "110",
    ambulance: "120",
    fire: "119",
    countryCode: "CN",
    countryName: "中国"
  )

  /// Default international emergency
  static let international = WatchEmergencyServices(
    police: "112",
    ambulance: "112",
    fire: "112",
    countryCode: "INT",
    countryName: "国际"
  )
}

// MARK: - Watch Communication Keys

/// Keys for WatchConnectivity message passing
enum WatchMessageKey: String {
  // Requests from Watch
  case requestTodayItinerary = "request_today_itinerary"
  case requestFlights = "request_flights"
  case requestEmergencyContacts = "request_emergency_contacts"
  case markPOIVisited = "mark_poi_visited"
  case saveNote = "save_note"
  case triggerSOS = "trigger_sos"

  // Responses from iPhone
  case todayItinerary = "today_itinerary"
  case flights = "flights"
  case emergencyContacts = "emergency_contacts"
  case emergencyServices = "emergency_services"
  case updateSuccess = "update_success"
  case sosTriggered = "sos_triggered"

  // Data keys
  case itineraryData = "itinerary_data"
  case flightData = "flight_data"
  case contactData = "contact_data"
  case serviceData = "service_data"
  case noteData = "note_data"
  case poiId = "poi_id"
  case visited = "visited"
  case location = "location"
}

// MARK: - Watch Context

/// Application context shared between Watch and iPhone
struct WatchAppContext: Codable {
  let lastSyncDate: Date
  let todayItinerary: WatchItinerary?
  let upcomingFlights: [WatchFlight]
  let emergencyContacts: [WatchEmergencyContact]
  let emergencyServices: WatchEmergencyServices
  let recentNotes: [WatchNote]

  init(
    lastSyncDate: Date = Date(),
    todayItinerary: WatchItinerary? = nil,
    upcomingFlights: [WatchFlight] = [],
    emergencyContacts: [WatchEmergencyContact] = [],
    emergencyServices: WatchEmergencyServices = .china,
    recentNotes: [WatchNote] = []
  ) {
    self.lastSyncDate = lastSyncDate
    self.todayItinerary = todayItinerary
    self.upcomingFlights = upcomingFlights
    self.emergencyContacts = emergencyContacts
    self.emergencyServices = emergencyServices
    self.recentNotes = recentNotes
  }

  /// Convert to dictionary for WatchConnectivity
  func toDictionary() -> [String: Any] {
    guard let data = try? JSONEncoder().encode(self),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return [:]
    }
    return dict
  }

  /// Create from dictionary
  static func from(dictionary: [String: Any]) -> WatchAppContext? {
    guard let data = try? JSONSerialization.data(withJSONObject: dictionary),
          let context = try? JSONDecoder().decode(WatchAppContext.self, from: data) else {
      return nil
    }
    return context
  }
}
