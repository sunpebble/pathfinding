import Foundation
import CoreLocation
import simd

// MARK: - AR Navigation State

/// State of the AR navigation session
enum ARNavigationState: Equatable {
  case initializing
  case tracking
  case limited(reason: TrackingLimitedReason)
  case paused
  case error(message: String)

  static func == (lhs: ARNavigationState, rhs: ARNavigationState) -> Bool {
    switch (lhs, rhs) {
    case (.initializing, .initializing): return true
    case (.tracking, .tracking): return true
    case (.limited(let lReason), .limited(let rReason)): return lReason == rReason
    case (.paused, .paused): return true
    case (.error(let lMsg), .error(let rMsg)): return lMsg == rMsg
    default: return false
    }
  }
}

/// Reason for limited AR tracking
enum TrackingLimitedReason: String {
  case initializing = "正在初始化"
  case excessiveMotion = "移动过快"
  case insufficientFeatures = "特征不足"
  case relocalizing = "重新定位中"
}

// MARK: - AR POI Model

/// POI with AR navigation data
struct ARPoi: Identifiable, Hashable {
  let id: String
  let name: String
  let type: String?
  let description: String?
  let coordinate: CLLocationCoordinate2D
  let address: String?

  /// Distance from user in meters
  var distance: Double = 0

  /// Bearing angle from user in degrees (0-360)
  var bearing: Double = 0

  /// Whether this POI is currently visible in AR view
  var isVisible: Bool = false

  /// Position in AR world coordinates
  var arPosition: simd_float3 = .zero

  /// Initialize from AiPoi
  init(from poi: AiPoi) {
    self.id = poi.id
    self.name = poi.name
    self.type = poi.type
    self.description = poi.description
    self.coordinate = CLLocationCoordinate2D(
      latitude: poi.latitude ?? 0,
      longitude: poi.longitude ?? 0
    )
    self.address = poi.address
  }

  /// Initialize directly
  init(
    id: String = UUID().uuidString,
    name: String,
    type: String? = nil,
    description: String? = nil,
    coordinate: CLLocationCoordinate2D,
    address: String? = nil
  ) {
    self.id = id
    self.name = name
    self.type = type
    self.description = description
    self.coordinate = coordinate
    self.address = address
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ARPoi, rhs: ARPoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - AR Navigation Route

/// A route for AR navigation containing multiple POIs
struct ARNavigationRoute: Identifiable {
  let id: String
  let name: String
  var pois: [ARPoi]
  var currentIndex: Int = 0

  /// Current target POI
  var currentTarget: ARPoi? {
    guard currentIndex < pois.count else { return nil }
    return pois[currentIndex]
  }

  /// Remaining POIs after current
  var remainingPois: [ARPoi] {
    guard currentIndex < pois.count else { return [] }
    return Array(pois.suffix(from: currentIndex))
  }

  /// Progress percentage (0-1)
  var progress: Double {
    guard !pois.isEmpty else { return 0 }
    return Double(currentIndex) / Double(pois.count)
  }

  /// Initialize from AiDay
  init(from day: AiDay) {
    self.id = "day-\(day.dayNumber)"
    self.name = day.theme ?? "第\(day.dayNumber)天"
    self.pois = day.pois.compactMap { poi in
      guard let lat = poi.latitude, let lng = poi.longitude,
            lat != 0, lng != 0 else { return nil }
      return ARPoi(from: poi)
    }
  }

  /// Move to next POI
  mutating func moveToNext() -> Bool {
    guard currentIndex < pois.count - 1 else { return false }
    currentIndex += 1
    return true
  }

  /// Move to previous POI
  mutating func moveToPrevious() -> Bool {
    guard currentIndex > 0 else { return false }
    currentIndex -= 1
    return true
  }

  /// Select specific POI by index
  mutating func selectPoi(at index: Int) {
    guard index >= 0 && index < pois.count else { return }
    currentIndex = index
  }
}

// MARK: - AR Photo

/// Captured AR photo with POI context
struct ARPhoto: Identifiable, Codable {
  let id: String
  let imageData: Data
  let capturedAt: Date
  let poiName: String?
  let poiId: String?
  let latitude: Double?
  let longitude: Double?
  let heading: Double?

  init(
    id: String = UUID().uuidString,
    imageData: Data,
    capturedAt: Date = Date(),
    poi: ARPoi? = nil,
    heading: Double? = nil
  ) {
    self.id = id
    self.imageData = imageData
    self.capturedAt = capturedAt
    self.poiName = poi?.name
    self.poiId = poi?.id
    self.latitude = poi?.coordinate.latitude
    self.longitude = poi?.coordinate.longitude
    self.heading = heading
  }
}

// MARK: - AR Settings

/// Settings for AR navigation
struct ARNavigationSettings: Codable {
  /// Maximum distance to show POIs (in meters)
  var maxPoiDistance: Double = 500

  /// Minimum distance to consider POI reached (in meters)
  var arrivalThreshold: Double = 20

  /// Show distance labels
  var showDistanceLabels: Bool = true

  /// Show direction arrows
  var showDirectionArrows: Bool = true

  /// Auto-advance to next POI on arrival
  var autoAdvance: Bool = true

  /// Haptic feedback on arrival
  var hapticFeedback: Bool = true

  /// Voice guidance
  var voiceGuidance: Bool = false

  /// AR overlay opacity (0-1)
  var overlayOpacity: Double = 0.9

  static let `default` = ARNavigationSettings()
}

// MARK: - Direction Helpers

extension ARPoi {
  /// Get cardinal direction string
  var cardinalDirection: String {
    let directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
    let index = Int((bearing + 22.5).truncatingRemainder(dividingBy: 360) / 45)
    return directions[index]
  }

  /// Formatted distance string
  var formattedDistance: String {
    if distance < 1000 {
      return String(format: "%.0f米", distance)
    } else {
      return String(format: "%.1f公里", distance / 1000)
    }
  }

  /// Icon for POI type
  var typeIcon: String {
    switch type?.lowercased() {
    case "景点", "attraction": return "building.columns"
    case "餐厅", "restaurant", "美食", "food": return "fork.knife"
    case "酒店", "hotel", "住宿", "accommodation": return "bed.double"
    case "交通", "transport", "transportation": return "tram"
    case "购物", "shopping": return "bag"
    case "咖啡", "cafe": return "cup.and.saucer"
    default: return "mappin"
    }
  }

  /// Color for POI type
  var typeColorName: String {
    switch type?.lowercased() {
    case "景点", "attraction": return "orange"
    case "餐厅", "restaurant", "美食", "food": return "red"
    case "酒店", "hotel", "住宿", "accommodation": return "blue"
    case "交通", "transport", "transportation": return "green"
    case "购物", "shopping": return "purple"
    case "咖啡", "cafe": return "brown"
    default: return "indigo"
    }
  }
}

// MARK: - Location Math Utilities

struct LocationMath {
  /// Calculate distance between two coordinates in meters
  static func distance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
    let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
    let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
    return fromLocation.distance(from: toLocation)
  }

  /// Calculate bearing from one coordinate to another in degrees
  static func bearing(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
    let lat1 = from.latitude.toRadians
    let lat2 = to.latitude.toRadians
    let dLon = (to.longitude - from.longitude).toRadians

    let y = sin(dLon) * cos(lat2)
    let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
    let bearing = atan2(y, x).toDegrees

    return (bearing + 360).truncatingRemainder(dividingBy: 360)
  }

  /// Convert bearing and distance to AR world position
  static func bearingToPosition(
    bearing: Double,
    distance: Double,
    deviceHeading: Double
  ) -> simd_float3 {
    // Adjust bearing relative to device heading
    let relativeBearing = (bearing - deviceHeading).toRadians

    // Scale distance for AR (1 meter = 1 AR unit, but cap for visibility)
    let scaledDistance = min(Float(distance), 100) // Cap at 100m for AR

    // Calculate x, z position (y is up in AR)
    let x = Float(sin(relativeBearing)) * scaledDistance
    let z = -Float(cos(relativeBearing)) * scaledDistance

    return simd_float3(x, 0, z)
  }
}

// MARK: - Degree/Radian Extensions

private extension Double {
  var toRadians: Double { self * .pi / 180 }
  var toDegrees: Double { self * 180 / .pi }
}
