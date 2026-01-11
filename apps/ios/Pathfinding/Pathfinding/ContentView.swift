import SwiftUI

struct ContentView: View {
  @State private var selectedTab: Tab = .home
  @Namespace private var animation

  enum Tab: String, CaseIterable {
    case home = "首页"
    case guides = "攻略"
    case itinerary = "行程"
    case profile = "我的"

    var icon: String {
      switch self {
      case .home: return "house"
      case .guides: return "book"
      case .itinerary: return "map"
      case .profile: return "person"
      }
    }

    var selectedIcon: String {
      switch self {
      case .home: return "house.fill"
      case .guides: return "book.fill"
      case .itinerary: return "map.fill"
      case .profile: return "person.fill"
      }
    }
  }

  var body: some View {
    TabView(selection: $selectedTab) {
      HomeView()
        .tag(Tab.home)
        .tabItem {
          Label(Tab.home.rawValue, systemImage: selectedTab == .home ? Tab.home.selectedIcon : Tab.home.icon)
        }

      BlogListView()
        .tag(Tab.guides)
        .tabItem {
          Label(Tab.guides.rawValue, systemImage: selectedTab == .guides ? Tab.guides.selectedIcon : Tab.guides.icon)
        }

      ItineraryListView()
        .tag(Tab.itinerary)
        .tabItem {
          Label(Tab.itinerary.rawValue, systemImage: selectedTab == .itinerary ? Tab.itinerary.selectedIcon : Tab.itinerary.icon)
        }

      ProfileView()
        .tag(Tab.profile)
        .tabItem {
          Label(Tab.profile.rawValue, systemImage: selectedTab == .profile ? Tab.profile.selectedIcon : Tab.profile.icon)
        }
    }
    .tint(.indigo)
  }
}

#Preview {
  ContentView()
}
