import SwiftUI

// MARK: - Online Collaborators Bar

/// A horizontal bar showing online collaborators with their avatars
struct CollaboratorsBar: View {
  @State private var collaborationManager = CollaborationManager.shared

  var body: some View {
    HStack(spacing: 8) {
      // Online indicator
      if !collaborationManager.onlineCollaborators.isEmpty {
        HStack(spacing: -8) {
          ForEach(collaborationManager.onlineCollaborators.prefix(5)) { collaborator in
            CollaboratorAvatar(collaborator: collaborator)
          }

          // Show overflow count
          if collaborationManager.onlineCollaborators.count > 5 {
            Text("+\(collaborationManager.onlineCollaborators.count - 5)")
              .font(.caption2)
              .fontWeight(.medium)
              .foregroundStyle(.secondary)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(.ultraThinMaterial)
              .clipShape(Capsule())
          }
        }

        Text("\(collaborationManager.onlineCollaborators.count) 人在线")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else if collaborationManager.isInSession {
        Circle()
          .fill(.green)
          .frame(width: 8, height: 8)

        Text("协作模式")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      // Conflict indicator
      if !collaborationManager.conflictedOperations.isEmpty {
        Button {
          // Show conflict resolution sheet
        } label: {
          HStack(spacing: 4) {
            Image(systemName: "exclamationmark.triangle.fill")
              .foregroundStyle(.orange)
            Text("\(collaborationManager.conflictedOperations.count)")
              .font(.caption)
              .fontWeight(.medium)
          }
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(.ultraThinMaterial)
  }
}

// MARK: - Collaborator Avatar

/// A circular avatar for a collaborator with online indicator
struct CollaboratorAvatar: View {
  let collaborator: CollaboratorPresence

  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      // Avatar
      if let avatarUrl = collaborator.avatarUrl,
         let url = URL(string: avatarUrl) {
        AsyncImage(url: url) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          initialsView
        }
        .frame(width: 32, height: 32)
        .clipShape(Circle())
      } else {
        initialsView
      }

      // Online indicator
      Circle()
        .fill(.green)
        .frame(width: 10, height: 10)
        .overlay(
          Circle()
            .stroke(.white, lineWidth: 2)
        )
        .offset(x: 2, y: 2)
    }
    .overlay(
      Circle()
        .stroke(collaborator.swiftUIColor, lineWidth: 2)
    )
  }

  private var initialsView: some View {
    Circle()
      .fill(collaborator.swiftUIColor.opacity(0.2))
      .frame(width: 32, height: 32)
      .overlay(
        Text(initials)
          .font(.caption)
          .fontWeight(.medium)
          .foregroundStyle(collaborator.swiftUIColor)
      )
  }

  private var initials: String {
    guard let name = collaborator.displayName, !name.isEmpty else {
      return String(collaborator.userId.prefix(2)).uppercased()
    }
    let components = name.components(separatedBy: " ")
    if components.count >= 2 {
      return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
    }
    return String(name.prefix(2)).uppercased()
  }
}

// MARK: - Collaborator Cursor Overlay

/// An overlay showing where other collaborators are editing
struct CollaboratorCursorOverlay: View {
  let collaborators: [CollaboratorPresence]
  let currentDayId: String?
  let currentItemId: String?

  var relevantCollaborators: [CollaboratorPresence] {
    collaborators.filter { collaborator in
      // Show collaborators editing the same day or item
      if let itemId = currentItemId {
        return collaborator.currentItemId == itemId
      }
      if let dayId = currentDayId {
        return collaborator.currentDayId == dayId
      }
      return false
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      ForEach(relevantCollaborators) { collaborator in
        HStack(spacing: 4) {
          Circle()
            .fill(collaborator.swiftUIColor)
            .frame(width: 8, height: 8)

          Text(collaborator.displayName ?? "用户")
            .font(.caption2)
            .foregroundStyle(collaborator.swiftUIColor)

          if let position = collaborator.cursorPosition {
            Text("正在编辑 \(position.field)")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(collaborator.swiftUIColor.opacity(0.1))
        .clipShape(Capsule())
      }
    }
  }
}

// MARK: - Conflict Resolution Sheet

/// A sheet for resolving edit conflicts
struct ConflictResolutionSheet: View {
  @State private var collaborationManager = CollaborationManager.shared
  @Environment(\.dismiss) private var dismiss

  @State private var isResolving = false
  @State private var selectedConflict: EditOperation?

  var body: some View {
    NavigationStack {
      List {
        if collaborationManager.conflictedOperations.isEmpty {
          ContentUnavailableView(
            "没有冲突",
            systemImage: "checkmark.circle",
            description: Text("所有编辑都已同步")
          )
        } else {
          ForEach(collaborationManager.conflictedOperations) { operation in
            ConflictRow(operation: operation) {
              selectedConflict = operation
            }
          }
        }
      }
      .navigationTitle("编辑冲突")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") {
            dismiss()
          }
        }
      }
      .sheet(item: $selectedConflict) { conflict in
        ConflictDetailSheet(operation: conflict)
      }
    }
  }
}

// MARK: - Conflict Row

/// A row displaying a single conflict
struct ConflictRow: View {
  let operation: EditOperation
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 4) {
            Image(systemName: iconName)
              .foregroundStyle(.orange)

            Text(operationDescription)
              .font(.subheadline)
              .fontWeight(.medium)
          }

          Text("目标: \(operation.targetType.rawValue) - \(operation.targetId.prefix(8))...")
            .font(.caption)
            .foregroundStyle(.secondary)

          Text(timeAgo)
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .buttonStyle(.plain)
  }

  private var iconName: String {
    switch operation.operationType {
    case .create: return "plus.circle"
    case .update: return "pencil.circle"
    case .delete: return "trash.circle"
    case .reorder: return "arrow.up.arrow.down.circle"
    }
  }

  private var operationDescription: String {
    switch operation.operationType {
    case .create: return "创建冲突"
    case .update: return "更新冲突"
    case .delete: return "删除冲突"
    case .reorder: return "排序冲突"
    }
  }

  private var timeAgo: String {
    let date = Date(timeIntervalSince1970: operation.timestamp / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: "zh_CN")
    formatter.unitsStyle = .short
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

// MARK: - Conflict Detail Sheet

/// A detailed view for resolving a specific conflict
struct ConflictDetailSheet: View {
  let operation: EditOperation

  @State private var collaborationManager = CollaborationManager.shared
  @Environment(\.dismiss) private var dismiss

  @State private var isResolving = false
  @State private var errorMessage: String?

  var body: some View {
    NavigationStack {
      VStack(spacing: 20) {
        // Conflict info
        VStack(alignment: .leading, spacing: 12) {
          Label("冲突详情", systemImage: "exclamationmark.triangle")
            .font(.headline)

          VStack(alignment: .leading, spacing: 8) {
            InfoRow(label: "操作类型", value: operationTypeText)
            InfoRow(label: "目标类型", value: targetTypeText)
            InfoRow(label: "版本", value: "v\(operation.version)")
            InfoRow(label: "操作者", value: operation.userId.prefix(8) + "...")
          }
          .padding()
          .background(Color(.systemGray6))
          .clipShape(RoundedRectangle(cornerRadius: 12))
        }

        Divider()

        // Resolution options
        VStack(alignment: .leading, spacing: 12) {
          Label("选择解决方案", systemImage: "arrow.triangle.branch")
            .font(.headline)

          VStack(spacing: 12) {
            ResolutionButton(
              title: "保留我的更改",
              description: "使用您的版本，放弃其他人的更改",
              icon: "person.fill",
              color: .blue
            ) {
              await resolveConflict(with: .acceptMine)
            }

            ResolutionButton(
              title: "使用他人的更改",
              description: "放弃您的更改，使用其他人的版本",
              icon: "person.2.fill",
              color: .orange
            ) {
              await resolveConflict(with: .acceptTheirs)
            }

            ResolutionButton(
              title: "合并更改",
              description: "尝试合并双方的更改",
              icon: "arrow.triangle.merge",
              color: .green
            ) {
              await resolveConflict(with: .merge)
            }
          }
        }

        if let error = errorMessage {
          Text(error)
            .font(.caption)
            .foregroundStyle(.red)
            .padding()
            .background(Color.red.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }

        Spacer()
      }
      .padding()
      .navigationTitle("解决冲突")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
      }
      .disabled(isResolving)
      .overlay {
        if isResolving {
          ProgressView("正在解决...")
            .padding()
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
    }
  }

  private var operationTypeText: String {
    switch operation.operationType {
    case .create: return "创建"
    case .update: return "更新"
    case .delete: return "删除"
    case .reorder: return "重新排序"
    }
  }

  private var targetTypeText: String {
    switch operation.targetType {
    case .itinerary: return "行程"
    case .day: return "天"
    case .item: return "项目"
    }
  }

  private func resolveConflict(with resolution: ResolutionType) async {
    isResolving = true
    errorMessage = nil

    do {
      try await collaborationManager.resolveConflict(
        operationId: operation.id,
        resolution: resolution
      )
      dismiss()
    } catch {
      errorMessage = error.localizedDescription
    }

    isResolving = false
  }
}

// MARK: - Helper Views

private struct InfoRow: View {
  let label: String
  let value: String

  var body: some View {
    HStack {
      Text(label)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
        .fontWeight(.medium)
    }
    .font(.subheadline)
  }
}

private struct ResolutionButton: View {
  let title: String
  let description: String
  let icon: String
  let color: Color
  let action: () async -> Void

  @State private var isPressed = false

  var body: some View {
    Button {
      Task {
        await action()
      }
    } label: {
      HStack(spacing: 12) {
        Image(systemName: icon)
          .font(.title2)
          .foregroundStyle(color)
          .frame(width: 40)

        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.primary)

          Text(description)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
      .padding()
      .background(color.opacity(0.1))
      .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Collaboration Status Badge

/// A badge showing the current collaboration status
struct CollaborationStatusBadge: View {
  @State private var collaborationManager = CollaborationManager.shared

  var body: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(statusColor)
        .frame(width: 8, height: 8)

      Text(statusText)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .background(.ultraThinMaterial)
    .clipShape(Capsule())
  }

  private var statusColor: Color {
    if collaborationManager.isLoading {
      return .orange
    } else if collaborationManager.isInSession {
      return .green
    } else {
      return .gray
    }
  }

  private var statusText: String {
    if collaborationManager.isLoading {
      return "连接中..."
    } else if collaborationManager.isInSession {
      let count = collaborationManager.onlineCollaborators.count
      return count > 0 ? "\(count) 人协作中" : "协作模式"
    } else {
      return "离线"
    }
  }
}

// MARK: - Previews

#Preview("Collaborators Bar") {
  CollaboratorsBar()
}

#Preview("Conflict Resolution") {
  ConflictResolutionSheet()
}

#Preview("Status Badge") {
  CollaborationStatusBadge()
}
