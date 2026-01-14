import AppIntents
import Foundation

// MARK: - View Today Itinerary Intent

/// Intent to view today's itinerary via Siri
@available(iOS 16.0, *)
struct ViewTodayItineraryIntent: AppIntent {
  static var title: LocalizedStringResource = "查看今日行程"
  static var description = IntentDescription("显示今天的旅行行程安排")

  /// Opens the app when executed
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let store = ItineraryStore.shared
    let today = Calendar.current.startOfDay(for: Date())

    // Find itineraries that include today
    let todayItineraries = store.paginatedItineraries.filter { itinerary in
      guard let startDate = itinerary.days.first.map({ _ in itinerary.savedAt }) else {
        return false
      }
      let endDate = Calendar.current.date(
        byAdding: .day,
        value: itinerary.days.count - 1,
        to: startDate
      ) ?? startDate

      return today >= Calendar.current.startOfDay(for: startDate)
        && today <= Calendar.current.startOfDay(for: endDate)
    }

    if let currentItinerary = todayItineraries.first {
      // Calculate which day of the itinerary we're on
      let startDate = currentItinerary.savedAt
      let daysDiff = Calendar.current.dateComponents([.day], from: startDate, to: today).day ?? 0
      let currentDayNumber = daysDiff + 1

      if let currentDay = currentItinerary.days.first(where: { $0.dayNumber == currentDayNumber }) {
        let poiCount = currentDay.pois.count
        let theme = currentDay.theme ?? "今日行程"

        // Store the navigation intent for the app to handle
        UserDefaults.standard.set(currentItinerary.id.uuidString, forKey: "siri_navigate_itinerary_id")
        UserDefaults.standard.set(currentDayNumber, forKey: "siri_navigate_day_number")

        return .result(
          dialog: IntentDialog(
            "今天是「\(currentItinerary.title)」的第\(currentDayNumber)天：\(theme)。共有\(poiCount)个景点安排。"
          )
        )
      }
    }

    return .result(dialog: IntentDialog("今天没有安排行程。要不要创建一个新行程？"))
  }
}

// MARK: - Today Itinerary Entity

/// Entity representing today's itinerary for Siri
@available(iOS 16.0, *)
struct TodayItineraryEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "今日行程"
  static var defaultQuery = TodayItineraryQuery()

  var id: String
  var title: String
  var dayNumber: Int
  var poiCount: Int
  var theme: String?

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: "\(title) - 第\(dayNumber)天",
      subtitle: theme.map { LocalizedStringResource(stringLiteral: $0) }
    )
  }
}

@available(iOS 16.0, *)
struct TodayItineraryQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [TodayItineraryEntity] {
    // Return empty for now - this is mainly for Siri suggestions
    return []
  }

  func suggestedEntities() async throws -> [TodayItineraryEntity] {
    return []
  }
}
