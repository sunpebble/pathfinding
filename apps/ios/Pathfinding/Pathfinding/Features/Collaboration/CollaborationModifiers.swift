import SwiftUI

// MARK: - Collaboration View Modifier

/// A view modifier that adds collaboration functionality to an itinerary view
struct CollaborationModifier: ViewModifier {
  let itineraryId: String
  let displayName: String?
  let avatarUrl: String?

  @State private var collaborationManager = CollaborationManager.shared
  @State private var showConflictSheet = false
  @Environment(\.scenePhase) private var scenePhase

  func body(content: Content) -> some View {
    content
      .safeAreaInset(edge: .top) {
        if collaborationManager.isInSession {
          CollaboratorsBar()
        }
      }
      .overlay(alignment: .topTrailing) {
        if !collaborationManager.conflictedOperations.isEmpty {
          Button {
            showConflictSheet = true
          } label: {
            Image(systemName: "exclamationmark.triangle.fill")
              .foregroundStyle(.white)
              .padding(8)
              .background(.orange)
              .clipShape(Circle())
              .shadow(radius: 4)
          }
          .padding()
        }
      }
      .sheet(isPresented: $showConflictSheet) {
        ConflictResolutionSheet()
      }
      .task {
        await joinSession()
      }
      .onChange(of: scenePhase) { oldPhase, newPhase in
        Task {
          await handleScenePhaseChange(from: oldPhase, to: newPhase)
        }
      }
      .onDisappear {
        Task {
          await collaborationManager.leaveSession()
        }
      }
  }

  private func joinSession() async {
    do {
      try await collaborationManager.joinSession(
        itineraryId: itineraryId,
        displayName: displayName,
        avatarUrl: avatarUrl
      )
    } catch {
      // Handle error silently - collaboration is optional
      print("Failed to join collaboration session: \(error)")
    }
  }

  private func handleScenePhaseChange(from oldPhase: ScenePhase, to newPhase: ScenePhase) async {
    switch newPhase {
    case .active:
      if oldPhase == .background {
        await collaborationManager.handleAppForeground(itineraryId: itineraryId)
      }
    case .background:
      await collaborationManager.handleAppBackground()
    case .inactive:
      break
    @unknown default:
      break
    }
  }
}

// MARK: - View Extension

extension View {
  /// Enables collaborative editing for this view
  /// - Parameters:
  ///   - itineraryId: The ID of the itinerary being edited
  ///   - displayName: Optional display name for the current user
  ///   - avatarUrl: Optional avatar URL for the current user
  func collaborativeEditing(
    itineraryId: String,
    displayName: String? = nil,
    avatarUrl: String? = nil
  ) -> some View {
    modifier(CollaborationModifier(
      itineraryId: itineraryId,
      displayName: displayName,
      avatarUrl: avatarUrl
    ))
  }
}

// MARK: - Collaborative Text Field

/// A text field that tracks cursor position for collaboration
struct CollaborativeTextField: View {
  let fieldName: String
  @Binding var text: String
  let placeholder: String

  let dayId: String?
  let itemId: String?

  @State private var collaborationManager = CollaborationManager.shared
  @FocusState private var isFocused: Bool

  var body: some View {
    TextField(placeholder, text: $text)
      .focused($isFocused)
      .onChange(of: isFocused) { _, focused in
        Task {
          if focused {
            await collaborationManager.updateCursor(
              dayId: dayId,
              itemId: itemId,
              field: fieldName
            )
          } else {
            await collaborationManager.updateCursor()
          }
        }
      }
      .onChange(of: text) { _, _ in
        // Debounce cursor updates during typing
        Task {
          await collaborationManager.updateCursor(
            dayId: dayId,
            itemId: itemId,
            field: fieldName
          )
        }
      }
  }
}

// MARK: - Collaborative Text Editor

/// A text editor that tracks cursor position for collaboration
struct CollaborativeTextEditor: View {
  let fieldName: String
  @Binding var text: String

  let dayId: String?
  let itemId: String?

  @State private var collaborationManager = CollaborationManager.shared
  @FocusState private var isFocused: Bool

  var body: some View {
    TextEditor(text: $text)
      .focused($isFocused)
      .onChange(of: isFocused) { _, focused in
        Task {
          if focused {
            await collaborationManager.updateCursor(
              dayId: dayId,
              itemId: itemId,
              field: fieldName
            )
          } else {
            await collaborationManager.updateCursor()
          }
        }
      }
  }
}

// MARK: - Selection Tracking Modifier

/// A modifier that tracks selection state for collaboration
struct SelectionTrackingModifier: ViewModifier {
  let elementType: SelectedElement.ElementType
  let elementId: String
  @Binding var isSelected: Bool

  @State private var collaborationManager = CollaborationManager.shared

  func body(content: Content) -> some View {
    content
      .onChange(of: isSelected) { _, selected in
        Task {
          if selected {
            await collaborationManager.updateSelection(elements: [
              SelectedElement(type: elementType, id: elementId)
            ])
          } else {
            await collaborationManager.updateSelection(elements: nil)
          }
        }
      }
  }
}

extension View {
  /// Tracks selection state for collaborative editing
  func trackSelection(
    type: SelectedElement.ElementType,
    id: String,
    isSelected: Binding<Bool>
  ) -> some View {
    modifier(SelectionTrackingModifier(
      elementType: type,
      elementId: id,
      isSelected: isSelected
    ))
  }
}

// MARK: - Edit Operation Tracking

/// A helper for tracking edit operations
@MainActor
struct EditTracker {
  private let collaborationManager = CollaborationManager.shared

  /// Record a create operation
  func recordCreate(
    targetType: CollaborationTargetType,
    targetId: String,
    changes: [String: Any]? = nil
  ) async throws -> RecordOperationData {
    try await collaborationManager.recordOperation(
      operationType: .create,
      targetType: targetType,
      targetId: targetId,
      changes: changes
    )
  }

  /// Record an update operation
  func recordUpdate(
    targetType: CollaborationTargetType,
    targetId: String,
    changes: [String: Any]? = nil,
    baseVersion: Int? = nil
  ) async throws -> RecordOperationData {
    try await collaborationManager.recordOperation(
      operationType: .update,
      targetType: targetType,
      targetId: targetId,
      changes: changes,
      baseVersion: baseVersion
    )
  }

  /// Record a delete operation
  func recordDelete(
    targetType: CollaborationTargetType,
    targetId: String
  ) async throws -> RecordOperationData {
    try await collaborationManager.recordOperation(
      operationType: .delete,
      targetType: targetType,
      targetId: targetId
    )
  }

  /// Record a reorder operation
  func recordReorder(
    targetType: CollaborationTargetType,
    targetId: String,
    changes: [String: Any]? = nil
  ) async throws -> RecordOperationData {
    try await collaborationManager.recordOperation(
      operationType: .reorder,
      targetType: targetType,
      targetId: targetId,
      changes: changes
    )
  }
}

// MARK: - Collaborator Highlight Border

/// A border that shows which collaborator is editing an element
struct CollaboratorHighlightBorder: ViewModifier {
  let collaborators: [CollaboratorPresence]
  let dayId: String?
  let itemId: String?

  private var editingCollaborator: CollaboratorPresence? {
    collaborators.first { collaborator in
      if let itemId = itemId {
        return collaborator.currentItemId == itemId
      }
      if let dayId = dayId {
        return collaborator.currentDayId == dayId && collaborator.currentItemId == nil
      }
      return false
    }
  }

  func body(content: Content) -> some View {
    content
      .overlay {
        if let collaborator = editingCollaborator {
          RoundedRectangle(cornerRadius: 8)
            .stroke(collaborator.swiftUIColor, lineWidth: 2)
            .animation(.easeInOut(duration: 0.2), value: collaborator.id)
        }
      }
      .overlay(alignment: .topLeading) {
        if let collaborator = editingCollaborator {
          Text(collaborator.displayName ?? "用户")
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(collaborator.swiftUIColor)
            .foregroundStyle(.white)
            .clipShape(Capsule())
            .offset(x: 8, y: -10)
        }
      }
  }
}

extension View {
  /// Highlights the view when another collaborator is editing it
  func collaboratorHighlight(
    collaborators: [CollaboratorPresence],
    dayId: String? = nil,
    itemId: String? = nil
  ) -> some View {
    modifier(CollaboratorHighlightBorder(
      collaborators: collaborators,
      dayId: dayId,
      itemId: itemId
    ))
  }
}
