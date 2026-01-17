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

  var selectedIcon: String {
    switch self {
    case .discover: return "sparkle.magnifyingglass"
    case .chat: return "bubble.left.and.bubble.right.fill"
    case .itinerary: return "map.fill"
    case .profile: return "person.fill"
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

  var body: some View {
    TabView(selection: $appState.selectedTab) {
      DiscoverView()
        .tag(Tab.discover)
        .tabItem {
          Label(Tab.discover.title, systemImage: appState.selectedTab == .discover ? Tab.discover.selectedIcon : Tab.discover.icon)
        }

      ChatSessionListView(userId: AuthManager.shared.currentUserId ?? "guest")
        .tag(Tab.chat)
        .tabItem {
          Label(Tab.chat.title, systemImage: appState.selectedTab == .chat ? Tab.chat.selectedIcon : Tab.chat.icon)
        }

      ItineraryListView()
        .tag(Tab.itinerary)
        .tabItem {
          Label(Tab.itinerary.title, systemImage: appState.selectedTab == .itinerary ? Tab.itinerary.selectedIcon : Tab.itinerary.icon)
        }

      ProfileView()
        .tag(Tab.profile)
        .tabItem {
          Label(Tab.profile.title, systemImage: appState.selectedTab == .profile ? Tab.profile.selectedIcon : Tab.profile.icon)
        }
    }
    .tint(.indigo)
    .environment(appState)
    // Force view refresh when language changes
    .id(localizationManager.currentLanguage)
  }
}

#Preview {
  ContentView()
    .environment(LocalizationManager.shared)
}
