import AppIntents
import Foundation

// MARK: - App Shortcuts Provider

/// Provides Siri shortcuts and suggestions for the Pathfinding app
@available(iOS 16.0, *)
struct PathfindingShortcuts: AppShortcutsProvider {
  /// Define the app's shortcuts that appear in Shortcuts app and Siri suggestions
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ViewTodayItineraryIntent(),
      phrases: [
        "查看今日行程",
        "今天的行程",
        "显示今日行程",
        "查看\(.applicationName)今日行程",
        "在\(.applicationName)中查看今天的安排",
        "Show today's itinerary in \(.applicationName)",
        "What's on my itinerary today"
      ],
      shortTitle: "查看今日行程",
      systemImageName: "calendar.day.timeline.left"
    )

    AppShortcut(
      intent: NavigateToNextPOIIntent(),
      phrases: [
        "导航到下一个景点",
        "去下一个地点",
        "导航到下一站",
        "在\(.applicationName)中导航到下一个景点",
        "Navigate to next destination in \(.applicationName)",
        "Take me to the next spot"
      ],
      shortTitle: "导航到下一站",
      systemImageName: "location.fill"
    )

    AppShortcut(
      intent: RecordTravelNoteIntent(),
      phrases: [
        "记录旅行笔记",
        "添加旅行备忘",
        "写旅行日记",
        "在\(.applicationName)中记录笔记",
        "Record a travel note in \(.applicationName)",
        "Add a travel memo"
      ],
      shortTitle: "记录笔记",
      systemImageName: "note.text"
    )

    AppShortcut(
      intent: ViewItineraryIntent(),
      phrases: [
        "查看行程",
        "打开我的行程",
        "显示行程列表",
        "在\(.applicationName)中查看行程",
        "Show my itineraries in \(.applicationName)"
      ],
      shortTitle: "查看行程",
      systemImageName: "map"
    )

    AppShortcut(
      intent: SearchPOIIntent(),
      phrases: [
        "搜索景点 \(\.$query)",
        "在\(.applicationName)中搜索 \(\.$query)",
        "查找 \(\.$query)",
        "Search for \(\.$query) in \(.applicationName)"
      ],
      shortTitle: "搜索景点",
      systemImageName: "magnifyingglass"
    )
  }
}
