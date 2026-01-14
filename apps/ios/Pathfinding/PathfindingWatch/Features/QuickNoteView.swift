import SwiftUI

// MARK: - Quick Note View

/// View for quickly recording notes on Apple Watch
struct QuickNoteView: View {
  @State private var sessionManager = WatchSessionManager.shared
  @State private var noteText = ""
  @State private var showingTextInput = false
  @State private var selectedPOI: WatchPOI?
  @State private var isSaving = false
  @State private var showingSavedConfirmation = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 16) {
          // Quick Input Section
          quickInputSection

          Divider()

          // Recent Notes
          recentNotesSection
        }
        .padding(.horizontal)
      }
      .navigationTitle("快速记录")
      .overlay {
        if showingSavedConfirmation {
          savedConfirmationOverlay
        }
      }
    }
  }

  // MARK: - Quick Input Section

  private var quickInputSection: some View {
    VStack(spacing: 12) {
      // Voice/Text Input Button
      Button {
        showingTextInput = true
      } label: {
        HStack {
          Image(systemName: "mic.fill")
            .font(.title2)
          Text("语音/文字记录")
            .font(.footnote)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
      }
      .buttonStyle(.borderedProminent)
      .tint(.orange)
      .textInputAutocapitalization(.sentences)

      // POI Context Selector
      if let itinerary = sessionManager.todayItinerary, !itinerary.pois.isEmpty {
        Menu {
          Button("不关联景点") {
            selectedPOI = nil
          }

          ForEach(itinerary.pois) { poi in
            Button {
              selectedPOI = poi
            } label: {
              Label(poi.name, systemImage: poi.iconName)
            }
          }
        } label: {
          HStack {
            Image(systemName: selectedPOI?.iconName ?? "mappin.circle")
            Text(selectedPOI?.name ?? "关联景点（可选）")
              .lineLimit(1)
            Spacer()
            Image(systemName: "chevron.up.chevron.down")
              .font(.caption2)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
          .padding(8)
          .background(
            RoundedRectangle(cornerRadius: 8)
              .fill(.ultraThinMaterial)
          )
        }
        .buttonStyle(.plain)
      }

      // Quick Templates
      quickTemplatesSection
    }
    .sheet(isPresented: $showingTextInput) {
      TextInputSheet(
        text: $noteText,
        onSave: saveNote
      )
    }
  }

  // MARK: - Quick Templates

  private var quickTemplatesSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("快捷模板")
        .font(.caption)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible())
      ], spacing: 8) {
        ForEach(QuickNoteTemplate.allCases, id: \.self) { template in
          Button {
            saveTemplateNote(template)
          } label: {
            VStack(spacing: 4) {
              Image(systemName: template.icon)
                .font(.title3)
              Text(template.title)
                .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
          }
          .buttonStyle(.bordered)
          .tint(template.color)
        }
      }
    }
  }

  // MARK: - Recent Notes Section

  private var recentNotesSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("最近记录")
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        if !sessionManager.recentNotes.isEmpty {
          Text("\(sessionManager.recentNotes.count)条")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
      }

      if sessionManager.recentNotes.isEmpty {
        emptyNotesView
      } else {
        ForEach(sessionManager.recentNotes.prefix(5)) { note in
          NoteRowView(note: note)
        }
      }
    }
  }

  private var emptyNotesView: some View {
    VStack(spacing: 8) {
      Image(systemName: "note.text")
        .font(.title2)
        .foregroundStyle(.secondary)

      Text("暂无记录")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding()
  }

  // MARK: - Saved Confirmation

  private var savedConfirmationOverlay: some View {
    VStack {
      Image(systemName: "checkmark.circle.fill")
        .font(.largeTitle)
        .foregroundStyle(.green)

      Text("已保存")
        .font(.headline)
    }
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 16)
        .fill(.ultraThickMaterial)
    )
    .transition(.scale.combined(with: .opacity))
  }

  // MARK: - Actions

  private func saveNote() {
    guard !noteText.isEmpty else { return }

    let note = WatchNote(
      content: noteText,
      itineraryId: sessionManager.todayItinerary?.id,
      poiId: selectedPOI?.id,
      type: .text
    )

    sessionManager.saveNote(note)

    // Show confirmation
    withAnimation {
      showingSavedConfirmation = true
    }

    // Reset
    noteText = ""
    selectedPOI = nil

    // Hide confirmation after delay
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      withAnimation {
        showingSavedConfirmation = false
      }
    }
  }

  private func saveTemplateNote(_ template: QuickNoteTemplate) {
    let note = WatchNote(
      content: template.content,
      itineraryId: sessionManager.todayItinerary?.id,
      poiId: selectedPOI?.id,
      type: .text
    )

    sessionManager.saveNote(note)

    withAnimation {
      showingSavedConfirmation = true
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      withAnimation {
        showingSavedConfirmation = false
      }
    }
  }
}

// MARK: - Text Input Sheet

struct TextInputSheet: View {
  @Binding var text: String
  let onSave: () -> Void

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    VStack(spacing: 12) {
      Text("输入备注")
        .font(.headline)

      TextField("记录一些有趣的事...", text: $text, axis: .vertical)
        .lineLimit(3...6)
        .textFieldStyle(.plain)
        .padding(8)
        .background(
          RoundedRectangle(cornerRadius: 8)
            .fill(.ultraThinMaterial)
        )

      HStack {
        Button("取消") {
          dismiss()
        }
        .buttonStyle(.bordered)

        Button("保存") {
          onSave()
          dismiss()
        }
        .buttonStyle(.borderedProminent)
        .disabled(text.isEmpty)
      }
    }
    .padding()
  }
}

// MARK: - Note Row View

struct NoteRowView: View {
  let note: WatchNote

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Image(systemName: note.type == .voice ? "mic.fill" : "note.text")
          .font(.caption)
          .foregroundStyle(.orange)

        Text(formattedTime)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }

      Text(note.content)
        .font(.caption)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(8)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(.ultraThinMaterial)
    )
  }

  private var formattedTime: String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated
    return formatter.localizedString(for: note.createdAt, relativeTo: Date())
  }
}

// MARK: - Quick Note Templates

enum QuickNoteTemplate: CaseIterable {
  case arrived
  case photo
  case food
  case tip

  var title: String {
    switch self {
    case .arrived: return "已到达"
    case .photo: return "拍照点"
    case .food: return "美食"
    case .tip: return "小贴士"
    }
  }

  var icon: String {
    switch self {
    case .arrived: return "checkmark.circle"
    case .photo: return "camera"
    case .food: return "fork.knife"
    case .tip: return "lightbulb"
    }
  }

  var content: String {
    switch self {
    case .arrived: return "已到达此地点"
    case .photo: return "这里适合拍照"
    case .food: return "这里的美食很棒"
    case .tip: return "旅行小贴士"
    }
  }

  var color: Color {
    switch self {
    case .arrived: return .green
    case .photo: return .purple
    case .food: return .orange
    case .tip: return .blue
    }
  }
}

// MARK: - Preview

#Preview {
  QuickNoteView()
}
