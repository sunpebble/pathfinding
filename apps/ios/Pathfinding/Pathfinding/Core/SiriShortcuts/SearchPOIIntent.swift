import AppIntents
import Foundation

// MARK: - Search POI Intent

/// Intent to search for POIs/attractions via Siri
@available(iOS 16.0, *)
struct SearchPOIIntent: AppIntent {
  static let title: LocalizedStringResource = "搜索景点"
  static let description = IntentDescription("搜索景点、餐厅或其他旅行目的地")

  /// Opens the app when executed
  static let openAppWhenRun: Bool = true

  /// Search query from Siri
  @Parameter(title: "搜索词", description: "要搜索的景点名称或关键词")
  var query: String

  /// Parameter summary for Siri
  static var parameterSummary: some ParameterSummary {
    Summary("搜索 \(\.$query)")
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    // Store search query for the app
    UserDefaults.standard.set(query, forKey: "siri_search_query")
    UserDefaults.standard.set(true, forKey: "siri_perform_search")

    // Search in current itineraries for matching POIs
    let store = ItineraryStore.shared
    var matchingPOIs: [(poi: AiPoi, itinerary: SavedItinerary)] = []

    for itinerary in store.paginatedItineraries {
      for day in itinerary.days {
        for poi in day.pois {
          if poi.name.localizedCaseInsensitiveContains(query)
            || (poi.address?.localizedCaseInsensitiveContains(query) ?? false)
            || (poi.type?.localizedCaseInsensitiveContains(query) ?? false)
          {
            matchingPOIs.append((poi, itinerary))
          }
        }
      }
    }

    if !matchingPOIs.isEmpty {
      let count = matchingPOIs.count
      let firstPOI = matchingPOIs[0].poi
      let firstItinerary = matchingPOIs[0].itinerary

      if count == 1 {
        return .result(
          dialog: IntentDialog(
            "在「\(firstItinerary.title)」中找到「\(firstPOI.name)」。正在打开详情..."
          )
        )
      } else {
        return .result(
          dialog: IntentDialog(
            "找到\(count)个相关景点。第一个是「\(firstItinerary.title)」中的「\(firstPOI.name)」。"
          )
        )
      }
    }

    return .result(dialog: IntentDialog("正在搜索「\(query)」相关的景点..."))
  }
}

// MARK: - Search Nearby Intent

/// Intent to search for nearby POIs
@available(iOS 16.0, *)
struct SearchNearbyIntent: AppIntent {
  static let title: LocalizedStringResource = "附近景点"
  static let description = IntentDescription("搜索当前位置附近的景点")

  static let openAppWhenRun: Bool = true

  @Parameter(title: "类型", description: "景点类型（如餐厅、景点、酒店）")
  var poiType: String?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    // Signal app to show nearby POIs
    UserDefaults.standard.set(true, forKey: "siri_search_nearby")
    if let type = poiType {
      UserDefaults.standard.set(type, forKey: "siri_nearby_type")
    }

    let typeText = poiType ?? "景点"
    return .result(dialog: IntentDialog("正在搜索附近的\(typeText)..."))
  }
}

// MARK: - POI Type Enum for Siri

@available(iOS 16.0, *)
enum POITypeEnum: String, AppEnum {
  case attraction = "attraction"
  case restaurant = "restaurant"
  case hotel = "hotel"
  case transportation = "transportation"
  case shopping = "shopping"

  nonisolated(unsafe) static var typeDisplayRepresentation: TypeDisplayRepresentation = "景点类型"

  nonisolated(unsafe) static var caseDisplayRepresentations: [POITypeEnum: DisplayRepresentation] = [
    .attraction: DisplayRepresentation(
      title: "景点",
      image: DisplayRepresentation.Image(systemName: "mappin.circle.fill")
    ),
    .restaurant: DisplayRepresentation(
      title: "餐厅",
      image: DisplayRepresentation.Image(systemName: "fork.knife")
    ),
    .hotel: DisplayRepresentation(
      title: "酒店",
      image: DisplayRepresentation.Image(systemName: "bed.double.fill")
    ),
    .transportation: DisplayRepresentation(
      title: "交通",
      image: DisplayRepresentation.Image(systemName: "bus.fill")
    ),
    .shopping: DisplayRepresentation(
      title: "购物",
      image: DisplayRepresentation.Image(systemName: "bag.fill")
    ),
  ]
}
