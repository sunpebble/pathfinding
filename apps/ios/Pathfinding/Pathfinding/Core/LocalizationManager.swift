import Foundation
import SwiftUI
import Observation

// MARK: - Supported Language

/// Represents the supported languages in the app
enum AppLanguage: String, CaseIterable, Identifiable {
  case system = "system"
  case chinese = "zh-Hans"
  case english = "en"

  var id: String { rawValue }

  /// Display name in the language itself
  var displayName: String {
    switch self {
    case .system: return NSLocalizedString("language.system", comment: "System language")
    case .chinese: return "简体中文"
    case .english: return "English"
    }
  }

  /// Native name shown in settings
  var nativeName: String {
    switch self {
    case .system: return NSLocalizedString("language.system", comment: "System language")
    case .chinese: return "简体中文"
    case .english: return "English"
    }
  }

  /// Icon for the language
  var icon: String {
    switch self {
    case .system: return "globe"
    case .chinese: return "character.zh"
    case .english: return "character.en"
    }
  }

  /// Icon color for the language
  var iconColor: Color {
    switch self {
    case .system: return .indigo
    case .chinese: return .red
    case .english: return .blue
    }
  }

  /// Locale identifier for this language
  var localeIdentifier: String {
    switch self {
    case .system:
      return Locale.current.language.languageCode?.identifier ?? "en"
    case .chinese:
      return "zh-Hans"
    case .english:
      return "en"
    }
  }

  /// Get the effective language code (resolves system to actual language)
  var effectiveLanguageCode: String {
    switch self {
    case .system:
      let preferredLanguage = Locale.preferredLanguages.first ?? "en"
      if preferredLanguage.hasPrefix("zh") {
        return "zh-Hans"
      }
      return "en"
    case .chinese:
      return "zh-Hans"
    case .english:
      return "en"
    }
  }
}

// MARK: - Localization Manager

/// Manages the app's localization settings with UserDefaults persistence
@MainActor
@Observable
final class LocalizationManager {
  // MARK: - Singleton

  static let shared = LocalizationManager()

  /// Thread-safe bundle for non-MainActor access (used by String.localized)
  nonisolated(unsafe) private static var _currentBundle: Bundle = .main

  /// Thread-safe getter for current bundle
  nonisolated static var currentBundle: Bundle { _currentBundle }

  // MARK: - Properties

  /// Current language selected by the user
  private(set) var currentLanguage: AppLanguage = .system

  /// Bundle for loading localized strings
  private var localizedBundle: Bundle = .main {
    didSet {
      // Keep the static bundle in sync
      LocalizationManager._currentBundle = localizedBundle
    }
  }

  /// Key for UserDefaults storage
  private let languageKey = "app_language"

  // MARK: - Computed Properties

  /// The effective language being used (resolves system to actual language)
  var effectiveLanguage: AppLanguage {
    if currentLanguage == .system {
      let preferredLanguage = Locale.preferredLanguages.first ?? "en"
      if preferredLanguage.hasPrefix("zh") {
        return .chinese
      }
      return .english
    }
    return currentLanguage
  }

  /// Whether the current effective language is Chinese
  var isChinese: Bool {
    effectiveLanguage == .chinese
  }

  /// Whether the current effective language is English
  var isEnglish: Bool {
    effectiveLanguage == .english
  }

  /// Current locale based on language setting
  var currentLocale: Locale {
    Locale(identifier: effectiveLanguage.localeIdentifier)
  }

  // MARK: - Initialization

  private init() {
    loadSettings()
    updateBundle()
  }

  // MARK: - Public Methods

  /// Set the language and persist to UserDefaults
  func setLanguage(_ language: AppLanguage) {
    guard language != currentLanguage else { return }

    currentLanguage = language
    saveSettings()
    updateBundle()
    notifyLanguageChange()
  }

  /// Get localized string for a given key
  func localizedString(_ key: String) -> String {
    localizedBundle.localizedString(forKey: key, value: nil, table: "Localizable")
  }

  /// Get localized string with format arguments
  func localizedString(_ key: String, _ arguments: CVarArg...) -> String {
    let format = localizedString(key)
    return String(format: format, arguments: arguments)
  }

  /// Reset language to system default
  func resetToDefault() {
    setLanguage(.system)
  }

  /// Force refresh the localization bundle
  func refreshBundle() {
    updateBundle()
    notifyLanguageChange()
  }

  // MARK: - Private Methods

  private func loadSettings() {
    if let savedLanguage = UserDefaults.standard.string(forKey: languageKey),
       let language = AppLanguage(rawValue: savedLanguage) {
      currentLanguage = language
    }
  }

  private func saveSettings() {
    UserDefaults.standard.set(currentLanguage.rawValue, forKey: languageKey)
  }

  private func updateBundle() {
    let languageCode = effectiveLanguage.effectiveLanguageCode

    // Try to find the localized bundle
    if let path = Bundle.main.path(forResource: languageCode, ofType: "lproj"),
       let bundle = Bundle(path: path) {
      localizedBundle = bundle
    } else {
      // Fallback to main bundle
      localizedBundle = .main
    }
  }

  private func notifyLanguageChange() {
    NotificationCenter.default.post(name: .languageDidChange, object: nil)
  }
}

// MARK: - Notification Extension

extension Notification.Name {
  static let languageDidChange = Notification.Name("languageDidChange")
}

// MARK: - String Extension for Localization

extension String {
  /// Returns the localized version of this string using the current language bundle
  var localized: String {
    LocalizationManager.currentBundle.localizedString(forKey: self, value: nil, table: "Localizable")
  }

  /// Returns the localized version of this string with format arguments
  func localized(_ arguments: CVarArg...) -> String {
    let format = LocalizationManager.currentBundle.localizedString(forKey: self, value: nil, table: "Localizable")
    return String(format: format, arguments: arguments)
  }
}

// MARK: - Environment Key

private struct LocalizationManagerKey: @preconcurrency EnvironmentKey {
  @MainActor static let defaultValue: LocalizationManager = .shared
}

extension EnvironmentValues {
  var localizationManager: LocalizationManager {
    get { self[LocalizationManagerKey.self] }
    set { self[LocalizationManagerKey.self] = newValue }
  }
}

// MARK: - View Modifier

/// View modifier to apply localization and trigger updates on language change
struct LocalizationModifier: ViewModifier {
  @Environment(\.localizationManager) private var localizationManager

  func body(content: Content) -> some View {
    content
      .environment(\.locale, localizationManager.currentLocale)
  }
}

extension View {
  /// Apply localization settings to this view hierarchy
  func withLocalization() -> some View {
    modifier(LocalizationModifier())
  }
}

// MARK: - Localized Text View

/// A text view that automatically updates when language changes
struct LocalizedText: View {
  let key: String
  let arguments: [CVarArg]

  @Environment(\.localizationManager) private var localizationManager

  init(_ key: String, _ arguments: CVarArg...) {
    self.key = key
    self.arguments = arguments
  }

  var body: some View {
    if arguments.isEmpty {
      Text(localizationManager.localizedString(key))
    } else {
      Text(String(format: localizationManager.localizedString(key), arguments: arguments))
    }
  }
}
