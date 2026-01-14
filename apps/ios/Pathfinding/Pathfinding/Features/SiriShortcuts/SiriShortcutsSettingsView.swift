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
          Label("内置快捷指令", systemImage: "wand.and.stars")
        }

        Button {
          openShortcutsApp()
        } label: {
          Label("在快捷指令App中打开", systemImage: "arrow.up.right.square")
        }
      } header: {
        Text("系统快捷指令")
      } footer: {
        Text("探路支持Siri语音控制，你可以说「嘿Siri，查看今日行程」来快速查看今天的安排。")
      }

      // Custom Shortcuts Section
      Section {
        if siriManager.customShortcuts.isEmpty {
          ContentUnavailableView(
            "暂无自定义快捷指令",
            systemImage: "star.slash",
            description: Text("为常用行程或景点创建快捷指令，用语音快速访问。")
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
        Text("自定义快捷指令")
      }

      // Tips Section
      Section {
        TipRow(
          icon: "mic.fill",
          title: "语音触发",
          description: "对Siri说出你设定的唤醒短语即可快速执行"
        )

        TipRow(
          icon: "clock.arrow.circlepath",
          title: "智能建议",
          description: "探路会根据你的使用习惯自动推荐快捷指令"
        )

        TipRow(
          icon: "location.fill",
          title: "位置感知",
          description: "在旅途中，系统会智能推荐导航到下一个景点"
        )
      } header: {
        Text("使用技巧")
      }
    }
    .navigationTitle("Siri快捷指令")
    .navigationBarTitleDisplayMode(.large)
    .confirmationDialog(
      "删除快捷指令",
      isPresented: $showDeleteConfirmation,
      presenting: shortcutToDelete
    ) { shortcut in
      Button("删除", role: .destructive) {
        siriManager.deleteShortcut(shortcut)
      }
      Button("取消", role: .cancel) {}
    } message: { shortcut in
      Text("确定要删除「\(shortcut.phrase)」快捷指令吗？")
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
        title: "查看今日行程",
        phrases: ["查看今日行程", "今天的行程", "显示今日行程"],
        description: "显示今天的旅行安排和景点列表",
        icon: "calendar.day.timeline.left",
        iconColor: .blue
      )

      ShortcutInfoRow(
        title: "导航到下一站",
        phrases: ["导航到下一个景点", "去下一个地点", "导航到下一站"],
        description: "打开地图导航到当前行程中的下一个景点",
        icon: "location.fill",
        iconColor: .green
      )

      ShortcutInfoRow(
        title: "记录旅行笔记",
        phrases: ["记录旅行笔记", "添加旅行备忘", "写旅行日记"],
        description: "快速创建一条旅行笔记或语音备忘",
        icon: "note.text",
        iconColor: .orange
      )

      ShortcutInfoRow(
        title: "查看行程列表",
        phrases: ["查看行程", "打开我的行程", "显示行程列表"],
        description: "打开已保存的行程列表",
        icon: "map",
        iconColor: .purple
      )

      ShortcutInfoRow(
        title: "搜索景点",
        phrases: ["搜索景点 [关键词]", "查找 [景点名]"],
        description: "搜索行程中的景点或发现新目的地",
        icon: "magnifyingglass",
        iconColor: .pink
      )
    }
    .navigationTitle("内置快捷指令")
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

        Text("唤醒短语")
          .font(.caption)
          .foregroundStyle(.tertiary)

        ForEach(phrases, id: \.self) { phrase in
          HStack(spacing: 8) {
            Image(systemName: "mic.fill")
              .font(.caption)
              .foregroundStyle(.secondary)

            Text("「\(phrase)」")
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
        .foregroundStyle(.blue)
        .frame(width: 32, height: 32)

      VStack(alignment: .leading, spacing: 4) {
        Text(shortcut.title)
          .font(.headline)

        Text("「\(shortcut.phrase)」")
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

struct TipRow: View {
  let icon: String
  let title: String
  let description: String

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(.blue)
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
                .foregroundStyle(.blue)
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
          Text("目标")
        }

        Section {
          TextField("例如：打开东京之旅", text: $phrase)
            .textInputAutocapitalization(.never)
        } header: {
          Text("唤醒短语")
        } footer: {
          Text("设置一个简短的短语，对Siri说出这个短语即可快速打开。")
        }
      }
      .navigationTitle("添加快捷指令")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("添加") {
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
  if #available(iOS 17.0, *) {
    NavigationStack {
      SiriShortcutsSettingsView()
    }
  }
}
