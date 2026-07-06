import AppIntents
import Foundation
import OSLog

// MARK: - Siri Shortcuts Manager

/// Manager for handling Siri shortcuts, donations, and deep linking
@available(iOS 16.0, *)
@MainActor
@Observable
final class SiriShortcutsManager {
  static let shared = SiriShortcutsManager()

  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "SiriShortcuts")

  /// Pending navigation action from Siri
  private(set) var pendingNavigation: SiriNavigationAction?

  /// Custom shortcuts created by the user
  private(set) var customShortcuts: [CustomShortcut] = []

  private init() {
    loadCustomShortcuts()
  }

  // MARK: - Navigation Handling

  /// Check and handle pending Siri navigation on app launch/foreground
  func checkPendingNavigation() -> SiriNavigationAction? {
    var action: SiriNavigationAction?

    // Check for itinerary navigation
    if let itineraryId = UserDefaults.standard.string(forKey: "siri_navigate_itinerary_id") {
      let dayNumber = UserDefaults.standard.integer(forKey: "siri_navigate_day_number")
      action = .viewItinerary(id: itineraryId, day: dayNumber > 0 ? dayNumber : nil)
      clearNavigationKeys()
    }
    // Check for POI navigation
    else if let poiName = UserDefaults.standard.string(forKey: "siri_navigate_poi_name") {
      let lat = UserDefaults.standard.double(forKey: "siri_navigate_latitude")
      let lon = UserDefaults.standard.double(forKey: "siri_navigate_longitude")
      action = .navigateToPOI(
        name: poiName,
        latitude: lat != 0 ? lat : nil,
        longitude: lon != 0 ? lon : nil
      )
      clearNavigationKeys()
    }
    // Check for note creation
    else if UserDefaults.standard.bool(forKey: "siri_create_note") {
      let content = UserDefaults.standard.string(forKey: "siri_note_content")
      let title = UserDefaults.standard.string(forKey: "siri_note_title")
      action = .createNote(title: title, content: content)
      clearNoteKeys()
    }
    // Check for search
    else if UserDefaults.standard.bool(forKey: "siri_perform_search") {
      let query = UserDefaults.standard.string(forKey: "siri_search_query") ?? ""
      action = .search(query: query)
      clearSearchKeys()
    }
    // Check for itinerary list
    else if UserDefaults.standard.bool(forKey: "siri_show_itinerary_list") {
      action = .showItineraryList
      UserDefaults.standard.removeObject(forKey: "siri_show_itinerary_list")
    }
    // Check for nearby search
    else if UserDefaults.standard.bool(forKey: "siri_search_nearby") {
      let type = UserDefaults.standard.string(forKey: "siri_nearby_type")
      action = .searchNearby(type: type)
      clearNearbyKeys()
    }

    pendingNavigation = action
    return action
  }

  /// Clear pending navigation
  func clearPendingNavigation() {
    pendingNavigation = nil
  }

  // MARK: - Custom Shortcuts

  /// Create a custom shortcut for a specific itinerary
  func createItineraryShortcut(_ itinerary: SavedItinerary, phrase: String) {
    let shortcut = CustomShortcut(
      id: UUID(),
      type: .viewItinerary,
      targetId: itinerary.id.uuidString,
      title: itinerary.title,
      phrase: phrase,
      createdAt: Date()
    )

    customShortcuts.append(shortcut)
    saveCustomShortcuts()

    logger.info("Created custom shortcut for itinerary: \(itinerary.title)")
  }

  /// Create a custom shortcut for a POI
  func createPOIShortcut(poi: AiPoi, phrase: String) {
    let shortcut = CustomShortcut(
      id: UUID(),
      type: .navigateToPOI,
      targetId: poi.name,
      title: poi.name,
      phrase: phrase,
      createdAt: Date(),
      latitude: poi.latitude,
      longitude: poi.longitude
    )

    customShortcuts.append(shortcut)
    saveCustomShortcuts()

    logger.info("Created custom shortcut for POI: \(poi.name)")
  }

  /// Delete a custom shortcut
  func deleteShortcut(_ shortcut: CustomShortcut) {
    customShortcuts.removeAll { $0.id == shortcut.id }
    saveCustomShortcuts()
  }

  // MARK: - Siri Suggestions / Donations

  /// Donate an intent for Siri suggestions
  func donateViewItinerary(_ itinerary: SavedItinerary) {
    let intent = ViewSpecificItineraryIntent()
    intent.itineraryName = itinerary.title

    // Donate the intent for Siri suggestions
    // Note: In iOS 16+, App Intents are automatically suggested based on usage
    logger.debug("Donated view itinerary intent: \(itinerary.title)")
  }

  /// Donate a search intent
  func donateSearch(query: String) {
    let intent = SearchPOIIntent()
    intent.query = query

    logger.debug("Donated search intent: \(query)")
  }

  /// Donate a note creation intent
  func donateNoteCreation() {
    // Just log - iOS 16+ handles suggestions automatically
    logger.debug("Donated note creation intent")
  }

  // MARK: - Private Helpers

  private func clearNavigationKeys() {
    UserDefaults.standard.removeObject(forKey: "siri_navigate_itinerary_id")
    UserDefaults.standard.removeObject(forKey: "siri_navigate_day_number")
    UserDefaults.standard.removeObject(forKey: "siri_navigate_poi_name")
    UserDefaults.standard.removeObject(forKey: "siri_navigate_latitude")
    UserDefaults.standard.removeObject(forKey: "siri_navigate_longitude")
  }

  private func clearNoteKeys() {
    UserDefaults.standard.removeObject(forKey: "siri_create_note")
    UserDefaults.standard.removeObject(forKey: "siri_note_content")
    UserDefaults.standard.removeObject(forKey: "siri_note_title")
  }

  private func clearSearchKeys() {
    UserDefaults.standard.removeObject(forKey: "siri_perform_search")
    UserDefaults.standard.removeObject(forKey: "siri_search_query")
  }

  private func clearNearbyKeys() {
    UserDefaults.standard.removeObject(forKey: "siri_search_nearby")
    UserDefaults.standard.removeObject(forKey: "siri_nearby_type")
  }

  // MARK: - Persistence

  private func loadCustomShortcuts() {
    guard let data = UserDefaults.standard.data(forKey: "custom_siri_shortcuts"),
      let shortcuts = try? JSONDecoder().decode([CustomShortcut].self, from: data)
    else {
      return
    }
    customShortcuts = shortcuts
  }

  private func saveCustomShortcuts() {
    guard let data = try? JSONEncoder().encode(customShortcuts) else { return }
    UserDefaults.standard.set(data, forKey: "custom_siri_shortcuts")
  }
}

// MARK: - Navigation Action

/// Represents a navigation action triggered by Siri
enum SiriNavigationAction: Equatable {
  case viewItinerary(id: String, day: Int?)
  case navigateToPOI(name: String, latitude: Double?, longitude: Double?)
  case createNote(title: String?, content: String?)
  case search(query: String)
  case showItineraryList
  case searchNearby(type: String?)
}

// MARK: - Custom Shortcut

/// User-created custom shortcut
struct CustomShortcut: Codable, Identifiable {
  let id: UUID
  let type: ShortcutType
  let targetId: String
  let title: String
  let phrase: String
  let createdAt: Date
  var latitude: Double?
  var longitude: Double?

  enum ShortcutType: String, Codable {
    case viewItinerary
    case navigateToPOI
    case createNote
    case search
  }
}

// MARK: - Quick Notes Manager

/// Manager for quick voice notes captured via Siri
@MainActor
@Observable
final class QuickNotesManager {
  static let shared = QuickNotesManager()

  private(set) var quickNotes: [QuickNote] = []

  private init() {
    loadQuickNotes()
  }

  /// Load pending quick notes
  func loadQuickNotes() {
    guard let data = UserDefaults.standard.data(forKey: "quick_notes"),
      let notes = try? JSONDecoder().decode([QuickNote].self, from: data)
    else {
      return
    }
    quickNotes = notes
  }

  /// Get unsynchronized notes
  var unsyncedNotes: [QuickNote] {
    quickNotes.filter { !$0.syncedToNote }
  }

  /// Mark a quick note as synced
  func markAsSynced(_ noteId: UUID, travelNoteId: String) {
    if let index = quickNotes.firstIndex(where: { $0.id == noteId }) {
      quickNotes[index].syncedToNote = true
      quickNotes[index].noteId = travelNoteId
      saveQuickNotes()
    }
  }

  /// Delete a quick note
  func delete(_ noteId: UUID) {
    quickNotes.removeAll { $0.id == noteId }
    saveQuickNotes()
  }

  /// Clear all synced notes
  func clearSyncedNotes() {
    quickNotes.removeAll { $0.syncedToNote }
    saveQuickNotes()
  }

  private func saveQuickNotes() {
    guard let data = try? JSONEncoder().encode(quickNotes) else { return }
    UserDefaults.standard.set(data, forKey: "quick_notes")
  }
}
