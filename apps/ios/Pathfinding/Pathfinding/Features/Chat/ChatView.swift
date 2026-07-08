import SwiftUI

// MARK: - Chat Session List View

/// List of chat sessions with the AI assistant
struct ChatSessionListView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(AppState.self) private var appState
  @State private var store = ChatStore()
  @State private var showNewSessionSheet = false
  @State private var showDeleteAlert = false
  @State private var sessionToDelete: ChatSession?
  @State private var swipeHintOffset: CGFloat = 0
  @AppStorage("hasShownSwipeHint") private var hasShownSwipeHint = false

  var body: some View {
    if !authViewModel.isAuthenticated {
      ChatEmptyState(
        glyph: "bubble.left.and.bubble.right.fill",
        title: "chat.login_required".localized,
        message: "chat.login_required_description".localized
      ) {
        Button {
          appState.selectedTab = .profile
        } label: {
          Label("chat.go_login".localized, systemImage: "person.crop.circle.badge.plus")
        }
        .buttonStyle(.sunpebblePrimary)
      }
      .background(DesignTokens.Colors.background.ignoresSafeArea())
    } else {
      NavigationStack {
        ZStack {
          DesignTokens.Colors.background.ignoresSafeArea()

          Group {
            if store.isLoadingSessions && store.sessions.isEmpty && store.errorMessage == nil {
              LoadingView()
            } else if store.errorMessage != nil && store.sessions.isEmpty {
              ChatErrorRetryView(message: store.errorMessage!) {
                Task { await store.fetchSessions() }
              }
            } else if store.sessions.isEmpty {
              EmptySessionsView {
                showNewSessionSheet = true
              }
            } else {
              sessionsList
            }
          }
        }
        .navigationTitle("chat.title".localized)
        .toolbar {
          ToolbarItem(placement: .primaryAction) {
            Button {
              showNewSessionSheet = true
            } label: {
              Image(systemName: "plus.circle.fill")
            }
            .accessibilityLabel("chat.new_session".localized)
            .accessibilityHint("chat.new_session_hint".localized)
          }
        }
        .task {
          await store.fetchSessions()
        }
        .refreshable {
          await store.fetchSessions()
        }
        .sheet(isPresented: $showNewSessionSheet) {
          NewSessionSheet(store: store) {
            showNewSessionSheet = false
          }
        }
        .alert("chat.delete_session".localized, isPresented: $showDeleteAlert) {
          Button("common.cancel".localized, role: .cancel) {
            sessionToDelete = nil
          }
          Button("common.delete".localized, role: .destructive) {
            if let session = sessionToDelete {
              Task {
                _ = await store.deleteSession(session)
              }
            }
          }
        } message: {
          Text("chat.delete_session_message".localized)
        }
      }
    }
  }

  private var sessionsList: some View {
    List {
      ForEach(Array(store.sessions.enumerated()), id: \.element.id) { index, session in
        NavigationLink {
          ChatConversationView(session: session, store: store)
        } label: {
          SessionRow(session: session)
        }
        .offset(x: index == 0 ? swipeHintOffset : 0)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
          Button(role: .destructive) {
            sessionToDelete = session
            showDeleteAlert = true
          } label: {
            Label("common.delete".localized, systemImage: "trash")
          }

          Button {
            Task {
              _ = await store.archiveSession(session)
            }
          } label: {
            Label("chat.archive".localized, systemImage: "archivebox")
          }
          .tint(.orange)
        }
        .contextMenu {
          Button {
            Task {
              _ = await store.archiveSession(session)
            }
          } label: {
            Label("chat.archive".localized, systemImage: "archivebox")
          }

          Button(role: .destructive) {
            sessionToDelete = session
            showDeleteAlert = true
          } label: {
            Label("common.delete".localized, systemImage: "trash")
          }
        }
      }
    }
    .listStyle(.insetGrouped)
    .sunpebbleCanvas()
    .onAppear {
      guard !hasShownSwipeHint, !store.sessions.isEmpty else { return }
      Task {
        try? await Task.sleep(for: .seconds(0.8))
        withAnimation(.easeInOut(duration: 0.4)) {
          swipeHintOffset = -40
        }
        try? await Task.sleep(for: .seconds(0.6))
        withAnimation(.easeInOut(duration: 0.3)) {
          swipeHintOffset = 0
        }
        hasShownSwipeHint = true
      }
    }
  }
}

// MARK: - Session Row

private struct SessionRow: View {
  let session: ChatSession

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      HStack {
        Text(session.title)
          .font(.headline)
          .lineLimit(1)

        Spacer()

        Text(session.timeAgo)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }
}

// MARK: - Empty State (Sunpebble)

/// 居中空态：白卡 glyph 方块 + 衬线标题 + 卵石副文 + 主按钮（对齐 11-assistant）。
private struct ChatEmptyState<Actions: View>: View {
  let glyph: String
  let title: String
  let message: String
  @ViewBuilder var actions: Actions

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: glyph)
        .font(.system(size: 26, weight: .regular))
        .foregroundStyle(DesignTokens.Colors.textSecondary)
        .frame(width: 64, height: 64)
        .cardSurface(cornerRadius: 18)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text(title)
          .sunpebbleTitle(20)
          .multilineTextAlignment(.center)

        Text(message)
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }

      actions
        .frame(maxWidth: 260)
        .padding(.top, DesignTokens.Spacing.sm)
    }
    .padding(DesignTokens.Spacing.xl)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Empty Sessions View

private struct EmptySessionsView: View {
  let onCreateNew: () -> Void

  var body: some View {
    ChatEmptyState(
      glyph: "bubble.left.and.bubble.right",
      title: "chat.empty".localized,
      message: "chat.empty_description".localized
    ) {
      Button {
        onCreateNew()
      } label: {
        Label("chat.start_new".localized, systemImage: "plus.circle.fill")
      }
      .buttonStyle(.sunpebblePrimary)
    }
  }
}

// MARK: - Loading View

private struct LoadingView: View {
  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
      Text("common.loading".localized)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Error Retry View

private struct ChatErrorRetryView: View {
  let message: String
  let onRetry: () -> Void

  var body: some View {
    ChatEmptyState(
      glyph: "exclamationmark.triangle.fill",
      title: "error.load_failed".localized,
      message: message
    ) {
      Button(action: onRetry) {
        Label("common.retry".localized, systemImage: "arrow.clockwise")
      }
      .buttonStyle(.sunpebblePrimary)
    }
  }
}

// MARK: - New Session Sheet

private struct NewSessionSheet: View {
  let store: ChatStore
  let onDismiss: () -> Void

  @State private var title = ""
  @State private var context = ""
  @State private var isCreating = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("chat.session_title_placeholder".localized, text: $title)
        } header: {
          Text("chat.session_title".localized)
        } footer: {
          Text("chat.session_title_footer".localized)
        }

        Section {
          TextField("chat.context_placeholder".localized, text: $context, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("chat.context".localized)
        } footer: {
          Text("chat.context_footer".localized)
        }

        if let errorMessage = store.errorMessage {
          Section {
            Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
              .font(.footnote)
              .foregroundStyle(.red)
          }
        }

        Section {
          HStack {
            Image(systemName: "sparkles")
              .font(.caption)
              .foregroundStyle(DesignTokens.Colors.accent)
              .frame(width: 32, height: 32)
              .background(Sunpebble.ink)
              .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text("chat.title".localized)
              .font(.headline)
          }

          Text("chat.capabilities_intro".localized)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            FeatureRow(icon: "mappin.circle.fill", text: "chat.feature.attractions".localized, color: .red)
            FeatureRow(icon: "calendar", text: "chat.feature.planning".localized, color: DesignTokens.Colors.accent)
            FeatureRow(icon: "lightbulb.fill", text: "chat.feature.tips".localized, color: .yellow)
            FeatureRow(icon: "fork.knife", text: "chat.feature.food".localized, color: .orange)
          }
        } header: {
          Text("chat.features".localized)
        }
      }
      .navigationTitle("chat.new_session".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("common.cancel".localized) {
            onDismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("common.create".localized) {
            Task {
              isCreating = true
              let session = await store.createSession(
                title: title.isEmpty ? nil : title,
                context: context.isEmpty ? nil : context
              )
              isCreating = false
              if session != nil {
                onDismiss()
              }
            }
          }
          .disabled(isCreating)
        }
      }
    }
    .presentationDetents([.medium])
  }
}

private struct FeatureRow: View {
  let icon: String
  let text: String
  let color: Color

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: icon)
        .foregroundStyle(color)
        .frame(width: 20)
      Text(text)
        .font(.subheadline)
    }
  }
}

// MARK: - Chat Conversation View

struct ChatConversationView: View {
  let session: ChatSession
  let store: ChatStore

  @State private var inputText = ""
  @State private var failedMessage: String?
  @FocusState private var isInputFocused: Bool

  var body: some View {
    VStack(spacing: 0) {
      // Messages List
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.md) {
            // Messages
            ForEach(store.messages) { message in
              MessageBubble(message: message)
                .id(message.id)
            }

            // Typing indicator while waiting for the assistant reply
            if store.isSending {
              TypingIndicator()
            }
          }
          .padding()
        }
        .onChange(of: store.messages.count) { _, _ in
          if let lastMessage = store.messages.last {
            withAnimation {
              proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
          }
        }
      }

      Divider()

      // Send-failure banner (tap to retry the same content)
      if let failed = failedMessage {
        Button {
          retrySend(failed)
        } label: {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "exclamationmark.circle.fill")
            Text("chat.send_failed_retry".localized)
          }
          .font(.footnote)
          .fontWeight(.medium)
          .foregroundStyle(.red)
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
        .accessibilityLabel("chat.send_failed_retry".localized)
      }

      // Quick Replies
      if store.messages.isEmpty && !store.isSending {
        QuickRepliesView { suggestion in
          inputText = "chat.quick_reply.\(suggestion.rawValue)".localized
          sendMessage()
        }
      }

      // Input Area
      InputBar(
        text: $inputText,
        isSending: store.isSending,
        onSend: sendMessage
      )
      .focused($isInputFocused)
    }
    .navigationTitle(session.title)
    .navigationBarTitleDisplayMode(.inline)
    .background(DesignTokens.Colors.background)
    .task {
      await store.selectSession(session)
    }
  }

  private func sendMessage() {
    let content = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !content.isEmpty else { return }

    inputText = ""
    failedMessage = nil
    Task {
      let ok = await store.sendMessage(content)
      if !ok { failedMessage = content }
    }
  }

  private func retrySend(_ content: String) {
    failedMessage = nil
    Task {
      let ok = await store.sendMessage(content)
      if !ok { failedMessage = content }
    }
  }
}

// MARK: - Message Bubble

private struct MessageBubble: View {
  let message: ChatMessage

  var body: some View {
    HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
      if message.role == .assistant {
        // AI Avatar — ai-star: 墨色方块 + 阳光图标
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(Sunpebble.ink)
          .frame(width: 32, height: 32)
          .overlay {
            Image(systemName: "sparkles")
              .font(.caption)
              .foregroundStyle(DesignTokens.Colors.accent)
          }
      }

      VStack(alignment: message.role == .user ? .trailing : .leading, spacing: DesignTokens.Spacing.xs) {
        // Message content
        Text(message.content)
          .foregroundStyle(message.role == .user ? Color.white : DesignTokens.Colors.textPrimary)
          .padding(DesignTokens.Spacing.sm)
          .background(message.role == .user ? Sunpebble.ink : Sunpebble.surface)
          .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
          .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
              .stroke(message.role == .user ? Color.clear : DesignTokens.Colors.border, lineWidth: 1)
          )

        // Timestamp
        Text(message.timeString)
          .font(.caption2)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
      }
      .frame(maxWidth: 280, alignment: message.role == .user ? .trailing : .leading)

      if message.role == .user {
        // User Avatar — 阳光柔和方块，与 AI 墨色 mark 成对
        RoundedRectangle(cornerRadius: 10, style: .continuous)
          .fill(Sunpebble.sunSoft)
          .frame(width: 32, height: 32)
          .overlay {
            Image(systemName: "person.fill")
              .font(.caption)
              .foregroundStyle(Sunpebble.ink)
          }
      }
    }
    .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
  }
}

// MARK: - Typing Indicator

private struct TypingIndicator: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var animationPhase = 0

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .fill(Sunpebble.ink)
        .frame(width: 32, height: 32)
        .overlay {
          Image(systemName: "sparkles")
            .font(.caption)
            .foregroundStyle(DesignTokens.Colors.accent)
        }

      HStack(spacing: 4) {
        ForEach(0..<3) { index in
          Circle()
            .fill(DesignTokens.Colors.textSecondary)
            .frame(width: 8, height: 8)
            .scaleEffect(reduceMotion ? 1.0 : (animationPhase == index ? 1.2 : 0.8))
            .animation(
              reduceMotion ? nil : .easeInOut(duration: 0.5)
                .repeatForever()
                .delay(Double(index) * 0.15),
              value: animationPhase
            )
        }
      }
      .padding(DesignTokens.Spacing.sm)
      .background(Sunpebble.surface)
      .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 16, style: .continuous)
          .stroke(DesignTokens.Colors.border, lineWidth: 1)
      )

      Spacer()
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .onAppear {
      guard !reduceMotion else { return }
      animationPhase = 1
    }
  }
}

// MARK: - Quick Replies View

private struct QuickRepliesView: View {
  let onSelect: (QuickReplySuggestion) -> Void

  var body: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(QuickReplySuggestion.allCases) { suggestion in
          Button {
            onSelect(suggestion)
          } label: {
            Label("chat.quick_reply.\(suggestion.rawValue)".localized, systemImage: suggestion.icon)
              .font(.subheadline)
              .padding(.horizontal, DesignTokens.Spacing.md)
              .padding(.vertical, DesignTokens.Spacing.sm)
              .background(Sunpebble.sunSoft)
              .foregroundStyle(DesignTokens.Colors.textPrimary)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(DesignTokens.Colors.background)
  }
}

// MARK: - Input Bar

private struct InputBar: View {
  @Binding var text: String
  let isSending: Bool
  let onSend: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      TextField("chat.input_placeholder".localized, text: $text, axis: .vertical)
        .lineLimit(1...4)
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Colors.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: 20, style: .continuous)
            .stroke(DesignTokens.Colors.border, lineWidth: 1)
        )
        .disabled(isSending)

      Button {
        onSend()
      } label: {
        if isSending {
          ProgressView()
            .frame(width: 36, height: 36)
        } else {
          Image(systemName: "arrow.up.circle.fill")
            .font(.system(size: 36))
            .foregroundStyle(text.isEmpty ? DesignTokens.Colors.textSecondary : DesignTokens.Colors.accent)
        }
      }
      .disabled(text.isEmpty || isSending)
    }
    .padding(.horizontal)
    .padding(.vertical, DesignTokens.Spacing.sm)
    .background(DesignTokens.Colors.background)
  }
}

// MARK: - Preview

#Preview {
  ChatSessionListView()
    .environmentObject(AuthViewModel())
    .environment(AppState())
}
