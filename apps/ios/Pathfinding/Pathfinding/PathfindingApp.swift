import SwiftUI
import Observation

@main
struct PathfindingApp: App {
  @State private var authViewModel = AuthViewModel()

  init() {
    configureAppearance()
  }

  var body: some Scene {
    WindowGroup {
      Group {
        if authViewModel.isLoading {
          // Show loading state while checking authentication
          ProgressView()
            .controlSize(.large)
        } else if authViewModel.isAuthenticated {
          // Show main app when authenticated
          ContentView()
        } else {
          // Show login when not authenticated
          LoginView()
        }
      }
      .environment(authViewModel)
      .task {
        await authViewModel.initialize()
      }
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

// MARK: - AuthViewModel

/// Observable wrapper for AuthManager to provide reactive authentication state to SwiftUI
@Observable
final class AuthViewModel {
  private(set) var isAuthenticated: Bool = false
  private(set) var isLoading: Bool = true
  private(set) var userEmail: String?

  /// Initialize and check for existing session
  func initialize() async {
    // Give AuthManager time to load stored session
    try? await Task.sleep(for: .milliseconds(100))

    await updateAuthState()
    isLoading = false
  }

  /// Update authentication state from AuthManager
  func updateAuthState() async {
    let authManager = AuthManager.shared
    isAuthenticated = await authManager.isAuthenticated
    userEmail = await authManager.userEmail
  }

  /// Sign out the current user
  func signOut() async throws {
    try await AuthManager.shared.signOut()
    await updateAuthState()
  }
}
