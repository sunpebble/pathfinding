import SwiftUI

// MARK: - Siri Navigation View Modifier

/// View modifier that handles Siri navigation actions
@available(iOS 16.0, *)
struct SiriNavigationModifier: ViewModifier {
  let action: SiriNavigationAction?

  @State private var showItineraryDetail: Bool = false
  @State private var selectedItineraryId: String?
  @State private var selectedDayNumber: Int?
  @State private var showNoteCreation: Bool = false
  @State private var noteTitle: String?
  @State private var noteContent: String?
  @State private var searchQuery: String?
  @State private var showSearch: Bool = false
  @State private var showItineraryList: Bool = false
  @State private var showNearbySearch: Bool = false
  @State private var nearbySearchType: String?

  func body(content: Content) -> some View {
    content
      .onChange(of: action) { oldValue, newValue in
        handleNavigationAction(newValue)
      }
      .onAppear {
        // Handle action on initial appear as well
        handleNavigationAction(action)
      }
      .sheet(isPresented: $showNoteCreation) {
        if #available(iOS 17.0, *) {
          SiriQuickNoteSheet(
            title: noteTitle,
            content: noteContent,
            onDismiss: {
              showNoteCreation = false
              clearNoteState()
            }
          )
        }
      }
  }

  private func handleNavigationAction(_ action: SiriNavigationAction?) {
    guard let action = action else { return }

    switch action {
    case .viewItinerary(let id, let day):
      selectedItineraryId = id
      selectedDayNumber = day
      showItineraryDetail = true
      // Post notification for navigation
      NotificationCenter.default.post(
        name: .siriNavigateToItinerary,
        object: nil,
        userInfo: ["id": id, "day": day as Any]
      )

    case .navigateToPOI(let name, let latitude, let longitude):
      // Post notification for POI navigation
      var userInfo: [String: Any] = ["name": name]
      if let lat = latitude { userInfo["latitude"] = lat }
      if let lon = longitude { userInfo["longitude"] = lon }
      NotificationCenter.default.post(
        name: .siriNavigateToPOI,
        object: nil,
        userInfo: userInfo
      )

    case .createNote(let title, let content):
      noteTitle = title
      noteContent = content
      showNoteCreation = true

    case .search(let query):
      searchQuery = query
      showSearch = true
      NotificationCenter.default.post(
        name: .siriPerformSearch,
        object: nil,
        userInfo: ["query": query]
      )

    case .showItineraryList:
      showItineraryList = true
      NotificationCenter.default.post(
        name: .siriShowItineraryList,
        object: nil
      )

    case .searchNearby(let type):
      nearbySearchType = type
      showNearbySearch = true
      NotificationCenter.default.post(
        name: .siriSearchNearby,
        object: nil,
        userInfo: ["type": type as Any]
      )
    }

    // Clear the pending navigation after handling
    SiriShortcutsManager.shared.clearPendingNavigation()
  }

  private func clearNoteState() {
    noteTitle = nil
    noteContent = nil
  }
}

// MARK: - View Extension

extension View {
  /// Handles Siri navigation actions
  @ViewBuilder
  func onSiriNavigationAction(_ action: SiriNavigationAction?) -> some View {
    if #available(iOS 16.0, *) {
      self.modifier(SiriNavigationModifier(action: action))
    } else {
      self
    }
  }
}

// MARK: - Notification Names

extension Notification.Name {
  static let siriNavigateToItinerary = Notification.Name("siriNavigateToItinerary")
  static let siriNavigateToPOI = Notification.Name("siriNavigateToPOI")
  static let siriPerformSearch = Notification.Name("siriPerformSearch")
  static let siriShowItineraryList = Notification.Name("siriShowItineraryList")
  static let siriSearchNearby = Notification.Name("siriSearchNearby")
  static let siriCreateNote = Notification.Name("siriCreateNote")
}

// MARK: - Quick Note Sheet

/// Sheet for creating a quick note from Siri
@available(iOS 17.0, *)
struct SiriQuickNoteSheet: View {
  let title: String?
  let content: String?
  let onDismiss: () -> Void

  @State private var editedTitle: String = ""
  @State private var editedContent: String = ""
  @State private var isSaving: Bool = false

  var body: some View {
    NavigationStack {
      Form {
        Section("标题") {
          TextField("笔记标题", text: $editedTitle)
        }

        Section("内容") {
          TextEditor(text: $editedContent)
            .frame(minHeight: 150)
        }

        Section {
          Text("此笔记由Siri快捷指令创建")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("快速笔记")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            saveNote()
          }
          .disabled(editedContent.isEmpty || isSaving)
        }
      }
      .onAppear {
        editedTitle = title ?? ""
        editedContent = content ?? ""
      }
    }
  }

  private func saveNote() {
    isSaving = true

    // Save to quick notes for later sync
    let quickNote = QuickNote(
      id: UUID(),
      content: editedContent,
      createdAt: Date()
    )

    // Load existing notes
    var quickNotes: [QuickNote] = []
    if let data = UserDefaults.standard.data(forKey: "quick_notes"),
       let notes = try? JSONDecoder().decode([QuickNote].self, from: data) {
      quickNotes = notes
    }

    // Add new note
    quickNotes.append(quickNote)

    // Save back
    if let data = try? JSONEncoder().encode(quickNotes) {
      UserDefaults.standard.set(data, forKey: "quick_notes")
    }

    // Post notification for travel note creation
    NotificationCenter.default.post(
      name: .siriCreateNote,
      object: nil,
      userInfo: [
        "title": editedTitle,
        "content": editedContent
      ]
    )

    isSaving = false
    onDismiss()
  }
}
