import SwiftUI
import Observation

enum Tab: String, CaseIterable {
  case home
  case guides
  case chat
  case itinerary
  case profile

  var title: String {
    switch self {
    case .home: return "tab.home".localized
    case .guides: return "tab.guides".localized
    case .chat: return "tab.chat".localized
    case .itinerary: return "tab.itinerary".localized
    case .profile: return "tab.profile".localized
    }
  }

  var icon: String {
    switch self {
    case .home: return "house"
    case .guides: return "book"
    case .chat: return "bubble.left.and.bubble.right"
    case .itinerary: return "map"
    case .profile: return "person"
    }
  }

  var selectedIcon: String {
    switch self {
    case .home: return "house.fill"
    case .guides: return "book.fill"
    case .chat: return "bubble.left.and.bubble.right.fill"
    case .itinerary: return "map.fill"
    case .profile: return "person.fill"
    }
  }
}

@Observable
class AppState {
  var selectedTab: Tab = .home
}

struct ContentView: View {
  @State private var appState = AppState()
  @Environment(\.localizationManager) private var localizationManager

  var body: some View {
    TabView(selection: $appState.selectedTab) {
      HomeView()
        .tag(Tab.home)
        .tabItem {
          Label(Tab.home.title, systemImage: appState.selectedTab == .home ? Tab.home.selectedIcon : Tab.home.icon)
        }

      BlogListView()
        .tag(Tab.guides)
        .tabItem {
          Label(Tab.guides.title, systemImage: appState.selectedTab == .guides ? Tab.guides.selectedIcon : Tab.guides.icon)
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
