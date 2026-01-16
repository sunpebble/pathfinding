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
        "查看\(.applicationName)今日行程",
        "在\(.applicationName)中查看今天的安排",
        "用\(.applicationName)显示今日行程",
        "Show today's itinerary in \(.applicationName)",
        "What's on my itinerary today in \(.applicationName)"
      ],
      shortTitle: "查看今日行程",
      systemImageName: "calendar.day.timeline.left"
    )

    AppShortcut(
      intent: NavigateToNextPOIIntent(),
      phrases: [
        "在\(.applicationName)中导航到下一个景点",
        "用\(.applicationName)去下一个地点",
        "用\(.applicationName)导航到下一站",
        "Navigate to next destination in \(.applicationName)",
        "Take me to the next spot with \(.applicationName)"
      ],
      shortTitle: "导航到下一站",
      systemImageName: "location.fill"
    )

    AppShortcut(
      intent: RecordTravelNoteIntent(),
      phrases: [
        "在\(.applicationName)中记录笔记",
        "用\(.applicationName)记录旅行笔记",
        "用\(.applicationName)添加旅行备忘",
        "Record a travel note in \(.applicationName)",
        "Add a travel memo with \(.applicationName)"
      ],
      shortTitle: "记录笔记",
      systemImageName: "note.text"
    )

    AppShortcut(
      intent: ViewItineraryIntent(),
      phrases: [
        "在\(.applicationName)中查看行程",
        "用\(.applicationName)打开我的行程",
        "用\(.applicationName)显示行程列表",
        "Show my itineraries in \(.applicationName)",
        "Open my trips in \(.applicationName)"
      ],
      shortTitle: "查看行程",
      systemImageName: "map"
    )
  }
}
