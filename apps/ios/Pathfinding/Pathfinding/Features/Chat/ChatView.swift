import SwiftUI

// MARK: - Chat Session List View

/// List of chat sessions with the AI assistant
struct ChatSessionListView: View {
  @State private var store = ChatStore()
  @State private var showNewSessionSheet = false
  @State private var showDeleteAlert = false
  @State private var sessionToDelete: ChatSession?

  let userId: String

  var body: some View {
    NavigationStack {
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
      .navigationTitle("AI Travel Assistant")
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showNewSessionSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
          }
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
      .alert("Delete Chat", isPresented: $showDeleteAlert) {
        Button("Cancel", role: .cancel) {
          sessionToDelete = nil
        }
        Button("Delete", role: .destructive) {
          if let session = sessionToDelete {
            Task {
              _ = await store.deleteSession(session)
            }
          }
        }
      } message: {
        Text("Are you sure you want to delete this chat? This action cannot be undone.")
      }
    }
  }

  private var sessionsList: some View {
    List {
      ForEach(store.sessions) { session in
        NavigationLink {
          ChatConversationView(session: session, store: store)
        } label: {
          SessionRow(session: session)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
          Button(role: .destructive) {
            sessionToDelete = session
            showDeleteAlert = true
          } label: {
            Label("Delete", systemImage: "trash")
          }

          Button {
            Task {
              _ = await store.archiveSession(session)
            }
          } label: {
            Label("Archive", systemImage: "archivebox")
          }
          .tint(.orange)
        }
      }
    }
    .listStyle(.insetGrouped)
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

        if let itinerary = session.itinerary {
          Label(itinerary.title, systemImage: "map")
            .font(.caption)
            .foregroundStyle(.blue)
            .lineLimit(1)
        }

        if let guide = session.guide {
          Label(guide.title, systemImage: "book")
            .font(.caption)
            .foregroundStyle(.green)
            .lineLimit(1)
        }
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
      Label("No Chats Yet", systemImage: "bubble.left.and.bubble.right")
    } description: {
      Text("Start a conversation with your AI travel assistant to get personalized travel recommendations.")
    } actions: {
      Button {
        onCreateNew()
      } label: {
        Label("Start New Chat", systemImage: "plus.circle.fill")
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
      Text("Loading chats...")
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
          TextField("Chat Title (optional)", text: $title)
        } header: {
          Text("Title")
        } footer: {
          Text("Leave empty to auto-generate from your first message")
        }

        Section {
          TextField("Additional context", text: $context, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("Context")
        } footer: {
          Text("Provide any additional context like travel preferences or constraints")
        }

        Section {
          HStack {
            Image(systemName: "sparkles")
              .foregroundStyle(.yellow)
            Text("AI Travel Assistant")
              .font(.headline)
          }

          Text("I can help you with:")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            FeatureRow(icon: "mappin.circle.fill", text: "POI recommendations", color: .red)
            FeatureRow(icon: "calendar", text: "Itinerary planning", color: .blue)
            FeatureRow(icon: "lightbulb.fill", text: "Travel tips & advice", color: .yellow)
            FeatureRow(icon: "fork.knife", text: "Restaurant suggestions", color: .orange)
          }
        } header: {
          Text("Features")
        }
      }
      .navigationTitle("New Chat")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            onDismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Create") {
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
                  Text("Load earlier messages")
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
          inputText = suggestion.chineseText
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
            Label("Clear Chat", systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
      }
    }
    .task {
      await store.selectSession(session)
    }
    .alert("Clear Chat", isPresented: $showClearAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Clear", role: .destructive) {
        Task {
          _ = await store.clearMessages()
        }
      }
    } message: {
      Text("This will delete all messages in this chat.")
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

        // Metadata (POIs, quick actions)
        if let metadata = message.metadata {
          MetadataView(metadata: metadata)
        }

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

// MARK: - Metadata View

private struct MetadataView: View {
  let metadata: MessageMetadata

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // POI Recommendations
      if let pois = metadata.pois, !pois.isEmpty {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          Text("Recommended Places")
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.secondary)

          ForEach(pois) { poi in
            PoiCard(poi: poi)
          }
        }
      }

      // Quick Actions
      if let actions = metadata.quickActions, !actions.isEmpty {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(actions) { action in
              ChatQuickActionButton(action: action)
            }
          }
        }
      }
    }
  }
}

// MARK: - POI Card

private struct PoiCard: View {
  let poi: MessageMetadata.RecommendedPoi

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: poi.typeIcon)
        .foregroundStyle(.blue)
        .frame(width: 24)

      VStack(alignment: .leading, spacing: 2) {
        Text(poi.name)
          .font(.subheadline)
          .fontWeight(.medium)

        if let description = poi.description {
          Text(description)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let rating = poi.rating {
            Label(String(format: "%.1f", rating), systemImage: "star.fill")
              .font(.caption2)
              .foregroundStyle(.orange)
          }
          if let priceInfo = poi.priceInfo {
            Text(priceInfo)
              .font(.caption2)
              .foregroundStyle(.green)
          }
        }
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.sm)
    .background(Color(.systemBackground))
    .clipShape(RoundedRectangle(cornerRadius: 8))
    .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
  }
}

// MARK: - Chat Quick Action Button

private struct ChatQuickActionButton: View {
  let action: MessageMetadata.QuickAction

  var body: some View {
    Button {
      // Handle action
    } label: {
      Label(action.label, systemImage: action.actionIcon)
        .font(.caption)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Color.blue.opacity(0.1))
        .foregroundStyle(.blue)
        .clipShape(Capsule())
    }
    .buttonStyle(.plain)
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
            .scaleEffect(animationPhase == index ? 1.2 : 0.8)
            .animation(
              .easeInOut(duration: 0.5)
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
            Label(suggestion.chineseText, systemImage: suggestion.icon)
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
      TextField("Ask anything about travel...", text: $text, axis: .vertical)
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
