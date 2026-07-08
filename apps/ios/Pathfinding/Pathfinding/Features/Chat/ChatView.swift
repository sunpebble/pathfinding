import SwiftUI

// MARK: - Chat Session List View

/// List of chat sessions with the AI assistant
struct ChatSessionListView: View {
  @State private var store = ChatStore()
  @State private var showNewSessionSheet = false
  @State private var showDeleteAlert = false
  @State private var sessionToDelete: ChatSession?
  @State private var swipeHintOffset: CGFloat = 0
  @AppStorage("hasShownSwipeHint") private var hasShownSwipeHint = false

  let userId: String

  var body: some View {
    NavigationStack {
      ZStack {
        // Explorer background
        ExplorerPageBackground(style: .list, accentColor: .cyan)

        Group {
          if store.isLoadingSessions && store.sessions.isEmpty {
            LoadingView()
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
        await store.fetchSessions(userId: userId, refresh: true)
      }
      .refreshable {
        await store.fetchSessions(userId: userId, refresh: true)
      }
      .sheet(isPresented: $showNewSessionSheet) {
        NewSessionSheet(userId: userId, store: store) {
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

      HStack(spacing: DesignTokens.Spacing.sm) {
        Label("\(session.messageCount)", systemImage: "bubble.left.and.bubble.right")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }
}

// MARK: - Empty Sessions View

private struct EmptySessionsView: View {
  let onCreateNew: () -> Void

  var body: some View {
    ContentUnavailableView {
      Label("chat.empty".localized, systemImage: "bubble.left.and.bubble.right")
    } description: {
      Text("chat.empty_description".localized)
    } actions: {
      Button {
        onCreateNew()
      } label: {
        Label("chat.start_new".localized, systemImage: "plus.circle.fill")
      }
      .buttonStyle(.borderedProminent)
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

// MARK: - New Session Sheet

private struct NewSessionSheet: View {
  let userId: String
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
              .foregroundStyle(.yellow)
            Text("chat.title".localized)
              .font(.headline)
          }

          Text("chat.capabilities_intro".localized)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            FeatureRow(icon: "mappin.circle.fill", text: "chat.feature.attractions".localized, color: .red)
            FeatureRow(icon: "calendar", text: "chat.feature.planning".localized, color: .blue)
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
                userId: userId,
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
  @State private var showClearAlert = false
  @FocusState private var isInputFocused: Bool

  var body: some View {
    VStack(spacing: 0) {
      // Messages List
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.md) {
            // Load more indicator
            if !store.messagesIsDone && !store.messages.isEmpty {
              Button {
                Task {
                  await store.loadMoreMessages()
                }
              } label: {
                if store.isLoadingMessages {
                  ProgressView()
                } else {
                  Text("chat.load_more".localized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
              .padding()
            }

            // Messages
            ForEach(store.messages) { message in
              MessageBubble(message: message)
                .id(message.id)
            }

            // Pending user message
            if let pending = store.pendingUserMessage {
              PendingMessageBubble(content: pending, isUser: true)
            }

            // Pending assistant message (typing indicator)
            if store.isSending && store.pendingUserMessage != nil {
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
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Menu {
          Button {
            showClearAlert = true
          } label: {
            Label("chat.clear".localized, systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
        .accessibilityLabel("chat.more_actions".localized)
        .accessibilityHint("chat.more_actions_hint".localized)
      }
    }
    .task {
      await store.selectSession(session)
    }
    .alert("chat.clear".localized, isPresented: $showClearAlert) {
      Button("common.cancel".localized, role: .cancel) {}
      Button("chat.clear_confirm".localized, role: .destructive) {
        Task {
          _ = await store.clearMessages()
        }
      }
    } message: {
      Text("chat.clear_message".localized)
    }
  }

  private func sendMessage() {
    let content = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !content.isEmpty else { return }

    inputText = ""
    Task {
      _ = await store.sendMessage(content)
    }
  }
}

// MARK: - Message Bubble

private struct MessageBubble: View {
  let message: ChatMessage

  var body: some View {
    HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
      if message.role == .assistant {
        // AI Avatar
        Circle()
          .fill(LinearGradient(
            colors: [.blue, .purple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          ))
          .frame(width: 32, height: 32)
          .overlay {
            Image(systemName: "sparkles")
              .font(.caption)
              .foregroundStyle(.white)
          }
      }

      VStack(alignment: message.role == .user ? .trailing : .leading, spacing: DesignTokens.Spacing.xs) {
        // Message content
        Text(message.content)
          .padding(DesignTokens.Spacing.sm)
          .background(
            message.role == .user
              ? Color.blue
              : Color(.systemGray6)
          )
          .foregroundStyle(message.role == .user ? .white : .primary)
          .clipShape(RoundedRectangle(cornerRadius: 16))

        // Timestamp
        Text(message.timeString)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: 280, alignment: message.role == .user ? .trailing : .leading)

      if message.role == .user {
        // User Avatar
        Circle()
          .fill(Color.orange.gradient)
          .frame(width: 32, height: 32)
          .overlay {
            Image(systemName: "person.fill")
              .font(.caption)
              .foregroundStyle(.white)
          }
      }
    }
    .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
  }
}

// MARK: - Pending Message Bubble

private struct PendingMessageBubble: View {
  let content: String
  let isUser: Bool

  var body: some View {
    HStack {
      if !isUser {
        Circle()
          .fill(Color.gray.opacity(0.3))
          .frame(width: 32, height: 32)
      }

      Text(content)
        .padding(DesignTokens.Spacing.sm)
        .background(isUser ? Color.blue.opacity(0.7) : Color(.systemGray5))
        .foregroundStyle(isUser ? .white.opacity(0.7) : .secondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))

      if isUser {
        Circle()
          .fill(Color.orange.opacity(0.5))
          .frame(width: 32, height: 32)
      }
    }
    .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
    .opacity(0.7)
  }
}

// MARK: - Typing Indicator

private struct TypingIndicator: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var animationPhase = 0

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Circle()
        .fill(LinearGradient(
          colors: [.blue, .purple],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        ))
        .frame(width: 32, height: 32)
        .overlay {
          Image(systemName: "sparkles")
            .font(.caption)
            .foregroundStyle(.white)
        }

      HStack(spacing: 4) {
        ForEach(0..<3) { index in
          Circle()
            .fill(Color.gray)
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
      .background(Color(.systemGray6))
      .clipShape(RoundedRectangle(cornerRadius: 16))

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
              .background(Color.blue.opacity(0.1))
              .foregroundStyle(.blue)
              .clipShape(Capsule())
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(Color(.systemBackground))
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
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 20))
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
            .foregroundStyle(text.isEmpty ? .gray : .blue)
        }
      }
      .disabled(text.isEmpty || isSending)
    }
    .padding(.horizontal)
    .padding(.vertical, DesignTokens.Spacing.sm)
    .background(Color(.systemBackground))
  }
}

// MARK: - Preview

#Preview {
  ChatSessionListView(userId: "test-user")
}
