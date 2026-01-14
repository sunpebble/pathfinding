import AppIntents
import Foundation

// MARK: - Record Travel Note Intent

/// Intent to record a quick travel note via Siri
@available(iOS 16.0, *)
struct RecordTravelNoteIntent: AppIntent {
  static let title: LocalizedStringResource = "记录旅行笔记"
  static let description = IntentDescription("快速记录一条旅行笔记或备忘")

  /// Opens the app when executed
  static let openAppWhenRun: Bool = true

  /// Note content from user voice input
  @Parameter(title: "笔记内容", description: "你想记录的内容")
  var content: String?

  /// Note title (optional)
  @Parameter(title: "标题", description: "笔记标题（可选）")
  var noteTitle: String?

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    // Store the content for the app to process
    if let content = content {
      UserDefaults.standard.set(content, forKey: "siri_note_content")
      if let title = noteTitle {
        UserDefaults.standard.set(title, forKey: "siri_note_title")
      }
      UserDefaults.standard.set(true, forKey: "siri_create_note")

      return .result(dialog: IntentDialog("好的，已记录「\(content.prefix(20))...」，正在打开应用完成编辑。"))
    }

    // No content provided, just open the note creation screen
    UserDefaults.standard.set(true, forKey: "siri_create_note")
    return .result(dialog: IntentDialog("正在打开笔记编辑页面..."))
  }
}

// MARK: - Quick Note Intent (Simplified)

/// Simplified intent for quick voice notes
@available(iOS 16.0, *)
struct QuickNoteIntent: AppIntent {
  static let title: LocalizedStringResource = "快速笔记"
  static let description = IntentDescription("快速添加一条语音备忘")

  static let openAppWhenRun: Bool = false

  @Parameter(title: "内容")
  var content: String

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    // Save to local quick notes
    let quickNote = QuickNote(
      id: UUID(),
      content: content,
      createdAt: Date()
    )

    // Store in UserDefaults for later sync
    var quickNotes = loadQuickNotes()
    quickNotes.append(quickNote)
    saveQuickNotes(quickNotes)

    return .result(dialog: IntentDialog("已保存备忘：\(content.prefix(30))..."))
  }

  private func loadQuickNotes() -> [QuickNote] {
    guard let data = UserDefaults.standard.data(forKey: "quick_notes"),
      let notes = try? JSONDecoder().decode([QuickNote].self, from: data)
    else {
      return []
    }
    return notes
  }

  private func saveQuickNotes(_ notes: [QuickNote]) {
    guard let data = try? JSONEncoder().encode(notes) else { return }
    UserDefaults.standard.set(data, forKey: "quick_notes")
  }
}

// MARK: - Quick Note Model

/// Simple quick note model for Siri voice memos
struct QuickNote: Codable, Identifiable {
  let id: UUID
  let content: String
  let createdAt: Date
  var syncedToNote: Bool = false
  var noteId: String?
}

// MARK: - Travel Note Entity

/// Entity representing a travel note for Siri
@available(iOS 16.0, *)
struct TravelNoteEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "旅行笔记"
  static let defaultQuery = TravelNoteEntityQuery()

  var id: String
  var title: String
  var content: String
  var location: String?
  var createdAt: Date

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(
      title: LocalizedStringResource(stringLiteral: title),
      subtitle: location.map { LocalizedStringResource(stringLiteral: $0) },
      image: DisplayRepresentation.Image(systemName: "note.text")
    )
  }
}

@available(iOS 16.0, *)
struct TravelNoteEntityQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [TravelNoteEntity] {
    return []
  }

  func suggestedEntities() async throws -> [TravelNoteEntity] {
    return []
  }
}
