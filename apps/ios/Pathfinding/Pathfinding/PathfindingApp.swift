import SwiftUI

@main
struct PathfindingApp: App {
  init() {
    configureAppearance()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }

  private func configureAppearance() {
    // Configure navigation bar appearance
    let navBarAppearance = UINavigationBarAppearance()
    navBarAppearance.configureWithDefaultBackground()
    navBarAppearance.titleTextAttributes = [
      .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
    ]
    navBarAppearance.largeTitleTextAttributes = [
      .font: UIFont.systemFont(ofSize: 34, weight: .bold)
    ]

    UINavigationBar.appearance().standardAppearance = navBarAppearance
    UINavigationBar.appearance().scrollEdgeAppearance = navBarAppearance
    UINavigationBar.appearance().compactAppearance = navBarAppearance

    // Configure tab bar appearance
    let tabBarAppearance = UITabBarAppearance()
    tabBarAppearance.configureWithDefaultBackground()

    UITabBar.appearance().standardAppearance = tabBarAppearance
    UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
  }
}
