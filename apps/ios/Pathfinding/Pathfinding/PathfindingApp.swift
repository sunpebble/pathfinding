import SwiftUI
import Observation

@main
struct PathfindingApp: App {
  @State private var authViewModel = AuthViewModel()
  @State private var themeManager = ThemeManager.shared
  @State private var localizationManager = LocalizationManager.shared
  @State private var siriNavigationAction: SiriNavigationAction?
  @Environment(\.scenePhase) private var scenePhase

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
        } else if authViewModel.isAuthenticated || authViewModel.isGuestMode {
          // Show main app when authenticated or in guest mode
          ContentView()
            .onSiriNavigationAction(siriNavigationAction)
        } else {
          // Show login when not authenticated
          LoginView()
        }
      }
      .environment(authViewModel)
      .environment(themeManager)
      .environment(localizationManager)
      .withTheme(themeManager)
      .withLocalization()
      .task {
        await authViewModel.initialize()
        // Apply theme immediately on app launch
        themeManager.applyThemeImmediately()
        // Check for pending Siri navigation on app launch
        checkPendingSiriNavigation()
      }
      .onChange(of: scenePhase) { oldPhase, newPhase in
        if newPhase == .active {
          // Check for pending Siri navigation when app becomes active
          checkPendingSiriNavigation()
        }
      }
    }
  }

  /// Check for pending Siri navigation actions
  private func checkPendingSiriNavigation() {
    if #available(iOS 16.0, *) {
      siriNavigationAction = SiriShortcutsManager.shared.checkPendingNavigation()
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
@MainActor
@Observable
final class AuthViewModel {
  private(set) var isAuthenticated: Bool = false
  private(set) var isLoading: Bool = true
  private(set) var userEmail: String?
  private(set) var isGuestMode: Bool = false

  /// Initialize and check for existing session
  func initialize() async {
    // Check for stored guest mode preference
    isGuestMode = UserDefaults.standard.bool(forKey: "isGuestMode")

    if isGuestMode {
      isLoading = false
      return
    }

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

  /// Continue as guest without authentication
  func continueAsGuest() {
    isGuestMode = true
    UserDefaults.standard.set(true, forKey: "isGuestMode")
  }

  /// Sign out the current user
  func signOut() async throws {
    try await AuthManager.shared.signOut()
    isGuestMode = false
    UserDefaults.standard.set(false, forKey: "isGuestMode")
    await updateAuthState()
  }
}
