import AppIntents
import CoreLocation
import Foundation
import MapKit

// MARK: - Navigate to Next POI Intent

/// Intent to navigate to the next POI in the current itinerary
@available(iOS 16.0, *)
struct NavigateToNextPOIIntent: AppIntent {
  static let title: LocalizedStringResource = "导航到下一个景点"
  static let description = IntentDescription("导航到当前行程中的下一个景点")

  /// Opens the app when executed
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let store = ItineraryStore.shared
    let today = Calendar.current.startOfDay(for: Date())

    // Find current active itinerary
    let todayItineraries = store.paginatedItineraries.filter { itinerary in
      guard !itinerary.days.isEmpty else { return false }
      let startDate = itinerary.savedAt
      let endDate = Calendar.current.date(
        byAdding: .day,
        value: itinerary.days.count - 1,
        to: startDate
      ) ?? startDate

      return today >= Calendar.current.startOfDay(for: startDate)
        && today <= Calendar.current.startOfDay(for: endDate)
    }

    guard let currentItinerary = todayItineraries.first else {
      return .result(dialog: IntentDialog("今天没有安排行程，无法导航。"))
    }

    // Calculate current day
    let startDate = currentItinerary.savedAt
    let daysDiff = Calendar.current.dateComponents([.day], from: startDate, to: today).day ?? 0
    let currentDayNumber = daysDiff + 1

    guard let currentDay = currentItinerary.days.first(where: { $0.dayNumber == currentDayNumber })
    else {
      return .result(dialog: IntentDialog("今天的行程安排暂无数据。"))
    }

    // Get next POI based on current time
    let nextPOI = findNextPOI(in: currentDay.pois)

    guard let poi = nextPOI else {
      return .result(dialog: IntentDialog("今天的行程已经完成了！休息一下吧。"))
    }

    // Store navigation intent for the app
    UserDefaults.standard.set(currentItinerary.id.uuidString, forKey: "siri_navigate_itinerary_id")
    UserDefaults.standard.set(poi.name, forKey: "siri_navigate_poi_name")

    // Check if we have coordinates
    if let lat = poi.latitude, let lon = poi.longitude {
      // Store coordinates for navigation
      UserDefaults.standard.set(lat, forKey: "siri_navigate_latitude")
      UserDefaults.standard.set(lon, forKey: "siri_navigate_longitude")

      // Open Maps with directions
      let mapItem = MKMapItem(location: CLLocation(latitude: lat, longitude: lon), address: nil)
      mapItem.name = poi.name

      // Launch Apple Maps with directions
      mapItem.openInMaps(launchOptions: [
        MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault
      ])

      return .result(dialog: IntentDialog("正在为你导航到「\(poi.name)」"))
    } else {
      return .result(dialog: IntentDialog("「\(poi.name)」没有位置信息，无法导航。请在应用中查看详情。"))
    }
  }

  /// Find the next POI based on current time (simple heuristic)
  private func findNextPOI(in pois: [AiPoi]) -> AiPoi? {
    guard !pois.isEmpty else { return nil }

    // Check if there's a stored current POI index
    let currentIndex = UserDefaults.standard.integer(forKey: "current_poi_index")

    // Return next POI if available, otherwise return first
    if currentIndex < pois.count - 1 {
      // Move to next POI
      UserDefaults.standard.set(currentIndex + 1, forKey: "current_poi_index")
      return pois[currentIndex + 1]
    } else if currentIndex == 0 && pois.count > 0 {
      return pois[0]
    }

    return nil
  }
}

// MARK: - POI Entity for Siri

/// Entity representing a POI for Siri interactions
@available(iOS 16.0, *)
struct POIEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "景点"
  static let defaultQuery = POIEntityQuery()

  var id: String
  var name: String
  var type: String
  var address: String?
  var latitude: Double?
  var longitude: Double?

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: LocalizedStringResource(stringLiteral: name),
      subtitle: address.map { LocalizedStringResource(stringLiteral: $0) },
      image: DisplayRepresentation.Image(systemName: iconForType(type))
    )
  }

  private func iconForType(_ type: String) -> String {
    switch type.lowercased() {
    case "attraction", "景点":
      return "mappin.circle.fill"
    case "restaurant", "餐厅":
      return "fork.knife"
    case "hotel", "酒店":
      return "bed.double.fill"
    case "transportation", "交通":
      return "bus.fill"
    case "shopping", "购物":
      return "bag.fill"
    default:
      return "mappin"
    }
  }
}

@available(iOS 16.0, *)
struct POIEntityQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [POIEntity] {
    return []
  }

  func suggestedEntities() async throws -> [POIEntity] {
    return []
  }
}
