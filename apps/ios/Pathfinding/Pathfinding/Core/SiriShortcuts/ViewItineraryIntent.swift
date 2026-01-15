import AppIntents
import Foundation

// MARK: - View Itinerary Intent

/// Intent to view the list of itineraries via Siri
@available(iOS 16.0, *)
struct ViewItineraryIntent: AppIntent {
  nonisolated(unsafe) static var title: LocalizedStringResource = "查看行程"
  nonisolated(unsafe) static var description = IntentDescription("查看我的旅行行程列表")

  /// Opens the app when executed
  nonisolated(unsafe) static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let store = ItineraryStore.shared
    let count = store.paginatedItineraries.count

    if count == 0 {
      return .result(dialog: IntentDialog("你还没有保存任何行程。快去发现精彩的旅行攻略吧！"))
    }

    // Get upcoming itineraries
    let today = Calendar.current.startOfDay(for: Date())
    let upcomingCount = store.paginatedItineraries.filter { itinerary in
      // Consider saved date as the start date approximation
      let startDate = Calendar.current.startOfDay(for: itinerary.savedAt)
      return startDate >= today
    }.count

    let message: String
    if upcomingCount > 0 {
      message = "你有\(count)个行程，其中\(upcomingCount)个即将进行。"
    } else {
      message = "你有\(count)个已保存的行程。"
    }

    // Signal the app to navigate to itinerary list
    UserDefaults.standard.set(true, forKey: "siri_show_itinerary_list")

    return .result(dialog: IntentDialog(stringLiteral: message))
  }
}

// MARK: - View Specific Itinerary Intent

/// Intent to view a specific itinerary by name
@available(iOS 16.0, *)
struct ViewSpecificItineraryIntent: AppIntent {
  nonisolated(unsafe) static var title: LocalizedStringResource = "查看指定行程"
  nonisolated(unsafe) static var description = IntentDescription("查看指定名称的行程详情")

  nonisolated(unsafe) static var openAppWhenRun: Bool = true

  @Parameter(title: "行程名称", description: "要查看的行程名称")
  var itineraryName: String?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard let name = itineraryName, !name.isEmpty else {
      return .result(dialog: IntentDialog("请告诉我你想查看哪个行程。"))
    }

    let store = ItineraryStore.shared

    // Search for matching itinerary
    let matchingItineraries = store.paginatedItineraries.filter { itinerary in
      itinerary.title.localizedCaseInsensitiveContains(name)
        || itinerary.destination?.localizedCaseInsensitiveContains(name) == true
    }

    if let itinerary = matchingItineraries.first {
      // Store the ID for app navigation
      UserDefaults.standard.set(itinerary.id.uuidString, forKey: "siri_navigate_itinerary_id")

      let daysCount = itinerary.days.count
      let destination = itinerary.destination ?? "未知目的地"

      return .result(
        dialog: IntentDialog("找到行程「\(itinerary.title)」，前往\(destination)，共\(daysCount)天。正在打开...")
      )
    } else {
      return .result(dialog: IntentDialog("没有找到名为「\(name)」的行程。"))
    }
  }
}

// MARK: - Itinerary Entity

/// Entity representing an itinerary for Siri
@available(iOS 16.0, *)
struct ItineraryEntity: AppEntity {
  nonisolated(unsafe) static var typeDisplayRepresentation: TypeDisplayRepresentation = "行程"
  nonisolated(unsafe) static var defaultQuery = ItineraryEntityQuery()

  var id: String
  var title: String
  var destination: String?
  var daysCount: Int
  var savedAt: Date

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: LocalizedStringResource(stringLiteral: title),
      subtitle: destination.map { LocalizedStringResource(stringLiteral: "\($0) · \(daysCount)天") },
      image: DisplayRepresentation.Image(systemName: "map")
    )
  }
}

@available(iOS 16.0, *)
struct ItineraryEntityQuery: EntityQuery {
  @MainActor
  func entities(for identifiers: [String]) async throws -> [ItineraryEntity] {
    let store = ItineraryStore.shared
    return store.paginatedItineraries
      .filter { identifiers.contains($0.id.uuidString) }
      .map { itinerary in
        ItineraryEntity(
          id: itinerary.id.uuidString,
          title: itinerary.title,
          destination: itinerary.destination,
          daysCount: itinerary.days.count,
          savedAt: itinerary.savedAt
        )
      }
  }

  @MainActor
  func suggestedEntities() async throws -> [ItineraryEntity] {
    let store = ItineraryStore.shared
    return Array(
      store.paginatedItineraries.prefix(5).map { itinerary in
        ItineraryEntity(
          id: itinerary.id.uuidString,
          title: itinerary.title,
          destination: itinerary.destination,
          daysCount: itinerary.days.count,
          savedAt: itinerary.savedAt
        )
      })
  }
}
