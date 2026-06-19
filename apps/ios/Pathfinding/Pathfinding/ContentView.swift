import SwiftUI
import Observation

enum Tab: String, CaseIterable {
  case discover
  case chat
  case itinerary
  case profile

  var title: String {
    switch self {
    case .discover: return "tab.discover".localized
    case .chat: return "tab.chat".localized
    case .itinerary: return "tab.itinerary".localized
    case .profile: return "tab.profile".localized
    }
  }

  var icon: String {
    switch self {
    case .discover: return "sparkle.magnifyingglass"
    case .chat: return "bubble.left.and.bubble.right"
    case .itinerary: return "map"
    case .profile: return "person"
    }
  }

}

@Observable
class AppState {
  var selectedTab: Tab = .discover
}

struct ContentView: View {
  @State private var appState = AppState()
  @Environment(\.localizationManager) private var localizationManager
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    TabView(selection: $appState.selectedTab) {
      SwiftUI.Tab(Tab.discover.title, systemImage: Tab.discover.icon, value: Tab.discover) {
        DiscoverView()
      }
      SwiftUI.Tab(Tab.chat.title, systemImage: Tab.chat.icon, value: Tab.chat) {
        ChatSessionListView(userId: AuthManager.shared.currentUserId ?? "guest")
      }
      SwiftUI.Tab(Tab.itinerary.title, systemImage: Tab.itinerary.icon, value: Tab.itinerary) {
        ItineraryListView()
      }
      SwiftUI.Tab(Tab.profile.title, systemImage: Tab.profile.icon, value: Tab.profile) {
        ProfileView()
      }
    }
    .tabBarMinimizeBehavior(.onScrollDown)
    .accessibilityIdentifier("authenticated-root")
    .tint(ThemeManager.shared.accentColor.color)
    .sensoryFeedback(.selection, trigger: appState.selectedTab)
    .environment(appState)
    .id(localizationManager.currentLanguage)
  }
}

#Preview {
  ContentView()
    .environment(LocalizationManager.shared)
}
