import SwiftUI

// MARK: - Siri Shortcuts Settings View

/// Settings view for managing Siri shortcuts
@available(iOS 17.0, *)
struct SiriShortcutsSettingsView: View {
  @State private var siriManager = SiriShortcutsManager.shared
  @State private var showAddShortcutSheet = false
  @State private var showDeleteConfirmation = false
  @State private var shortcutToDelete: CustomShortcut?

  var body: some View {
    List {
      // Built-in Shortcuts Section
      Section {
        NavigationLink {
          BuiltInShortcutsView()
        } label: {
          Label("siri.builtin_shortcuts".localized, systemImage: "wand.and.stars")
        }

        Button {
          openShortcutsApp()
        } label: {
          Label("siri.open_in_shortcuts_app".localized, systemImage: "arrow.up.right.square")
        }
      } header: {
        Text("siri.section_system".localized)
      } footer: {
        Text("siri.footer_voice".localized)
      }

      // Custom Shortcuts Section
      Section {
        if siriManager.customShortcuts.isEmpty {
          ContentUnavailableView(
            "siri.empty_title".localized,
            systemImage: "star.slash",
            description: Text("siri.empty_description".localized)
          )
        } else {
          ForEach(siriManager.customShortcuts) { shortcut in
            CustomShortcutRow(shortcut: shortcut) {
              shortcutToDelete = shortcut
              showDeleteConfirmation = true
            }
          }
        }
      } header: {
        Text("siri.section_custom".localized)
      }

      // Tips Section
      Section {
        SiriTipRow(
          icon: "mic.fill",
          title: "siri.tip_voice_title".localized,
          description: "siri.tip_voice_desc".localized
        )

        SiriTipRow(
          icon: "clock.arrow.circlepath",
          title: "siri.tip_suggest_title".localized,
          description: "siri.tip_suggest_desc".localized
        )

        SiriTipRow(
          icon: "location.fill",
          title: "siri.tip_location_title".localized,
          description: "siri.tip_location_desc".localized
        )
      } header: {
        Text("siri.section_tips".localized)
      }
    }
    .navigationTitle("siri.title".localized)
    .navigationBarTitleDisplayMode(.large)
    .confirmationDialog(
      "siri.delete_dialog_title".localized,
      isPresented: $showDeleteConfirmation,
      presenting: shortcutToDelete
    ) { shortcut in
      Button("common.delete".localized, role: .destructive) {
        siriManager.deleteShortcut(shortcut)
      }
      Button("common.cancel".localized, role: .cancel) {}
    } message: { shortcut in
      Text("siri.delete_confirm_message".localized(shortcut.phrase))
    }
  }

  private func openShortcutsApp() {
    if let url = URL(string: "shortcuts://") {
      UIApplication.shared.open(url)
    }
  }
}

// MARK: - Built-in Shortcuts View

@available(iOS 17.0, *)
struct BuiltInShortcutsView: View {
  var body: some View {
    List {
      ShortcutInfoRow(
        title: "siri.builtin_today_title".localized,
        phrases: [
          "siri.builtin_today_title".localized,
          "siri.phrase_today_2".localized,
          "siri.phrase_today_3".localized,
        ],
        description: "siri.builtin_today_desc".localized,
        icon: "calendar.day.timeline.left",
        iconColor: DesignTokens.Colors.accent
      )

      ShortcutInfoRow(
        title: "siri.builtin_navigate_title".localized,
        phrases: [
          "siri.phrase_navigate_1".localized,
          "siri.phrase_navigate_2".localized,
          "siri.builtin_navigate_title".localized,
        ],
        description: "siri.builtin_navigate_desc".localized,
        icon: "location.fill",
        iconColor: .green
      )

      ShortcutInfoRow(
        title: "siri.builtin_list_title".localized,
        phrases: [
          "siri.phrase_list_1".localized,
          "siri.phrase_list_2".localized,
          "siri.phrase_list_3".localized,
        ],
        description: "siri.builtin_list_desc".localized,
        icon: "map",
        iconColor: DesignTokens.Colors.accent
      )

      ShortcutInfoRow(
        title: "siri.builtin_search_title".localized,
        phrases: [
          "siri.phrase_search_1".localized,
          "siri.phrase_search_2".localized,
        ],
        description: "siri.builtin_search_desc".localized,
        icon: "magnifyingglass",
        iconColor: DesignTokens.Colors.accent
      )
    }
    .navigationTitle("siri.builtin_shortcuts".localized)
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Shortcut Info Row

@available(iOS 17.0, *)
struct ShortcutInfoRow: View {
  let title: String
  let phrases: [String]
  let description: String
  let icon: String
  let iconColor: Color

  @State private var isExpanded = false

  var body: some View {
    DisclosureGroup(isExpanded: $isExpanded) {
      VStack(alignment: .leading, spacing: 12) {
        Text(description)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Divider()

        Text("siri.wake_phrase".localized)
          .font(.caption)
          .foregroundStyle(.tertiary)

        ForEach(phrases, id: \.self) { phrase in
          HStack(spacing: 8) {
            Image(systemName: "mic.fill")
              .font(.caption)
              .foregroundStyle(.secondary)

            Text("siri.phrase_quoted".localized(phrase))
              .font(.subheadline)
          }
        }
      }
      .padding(.vertical, 8)
    } label: {
      Label {
        Text(title)
      } icon: {
        Image(systemName: icon)
          .foregroundStyle(iconColor)
      }
    }
  }
}

// MARK: - Custom Shortcut Row

@available(iOS 17.0, *)
struct CustomShortcutRow: View {
  let shortcut: CustomShortcut
  let onDelete: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: iconForType(shortcut.type))
        .font(.title3)
        .foregroundStyle(DesignTokens.Colors.accent)
        .frame(width: 32, height: 32)

      VStack(alignment: .leading, spacing: 4) {
        Text(shortcut.title)
          .font(.headline)

        Text("siri.phrase_quoted".localized(shortcut.phrase))
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Text(shortcut.createdAt, style: .date)
          .font(.caption)
          .foregroundStyle(.tertiary)
      }

      Spacer()

      Button(role: .destructive) {
        onDelete()
      } label: {
        Image(systemName: "trash")
          .foregroundStyle(.red)
      }
      .buttonStyle(.borderless)
    }
    .padding(.vertical, 4)
  }

  private func iconForType(_ type: CustomShortcut.ShortcutType) -> String {
    switch type {
    case .viewItinerary:
      return "map"
    case .navigateToPOI:
      return "location.fill"
    case .createNote:
      return "note.text"
    case .search:
      return "magnifyingglass"
    }
  }
}

// MARK: - Tip Row

private struct SiriTipRow: View {
  let icon: String
  let title: String
  let description: String

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(DesignTokens.Colors.accent)
        .frame(width: 32, height: 32)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.subheadline)
          .fontWeight(.medium)

        Text(description)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Add Custom Shortcut Sheet

@available(iOS 17.0, *)
struct AddCustomShortcutSheet: View {
  @Environment(\.dismiss) private var dismiss
  let itinerary: SavedItinerary?
  let poi: AiPoi?

  @State private var phrase: String = ""
  @State private var siriManager = SiriShortcutsManager.shared

  var body: some View {
    NavigationStack {
      Form {
        Section {
          if let itinerary = itinerary {
            HStack {
              Image(systemName: "map")
                .foregroundStyle(DesignTokens.Colors.accent)
              Text(itinerary.title)
            }
          } else if let poi = poi {
            HStack {
              Image(systemName: "mappin.circle.fill")
                .foregroundStyle(.red)
              Text(poi.name)
            }
          }
        } header: {
          Text("siri.target".localized)
        }

        Section {
          TextField("siri.phrase_placeholder".localized, text: $phrase)
            .textInputAutocapitalization(.never)
        } header: {
          Text("siri.wake_phrase".localized)
        } footer: {
          Text("siri.add_footer".localized)
        }
      }
      .navigationTitle("siri.add_title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("common.cancel".localized) {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("siri.add".localized) {
            createShortcut()
            dismiss()
          }
          .disabled(phrase.isEmpty)
        }
      }
    }
  }

  private func createShortcut() {
    if let itinerary = itinerary {
      siriManager.createItineraryShortcut(itinerary, phrase: phrase)
    } else if let poi = poi {
      siriManager.createPOIShortcut(poi: poi, phrase: phrase)
    }
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    SiriShortcutsSettingsView()
  }
}
