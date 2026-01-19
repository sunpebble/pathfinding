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
      .navigationTitle("AI 旅行助手")
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
      .alert("删除对话", isPresented: $showDeleteAlert) {
        Button("取消", role: .cancel) {
          sessionToDelete = nil
        }
        Button("删除", role: .destructive) {
          if let session = sessionToDelete {
            Task {
              _ = await store.deleteSession(session)
            }
          }
        }
      } message: {
        Text("确定要删除这个对话吗？此操作无法撤销。")
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
            Label("删除", systemImage: "trash")
          }

          Button {
            Task {
              _ = await store.archiveSession(session)
            }
          } label: {
            Label("归档", systemImage: "archivebox")
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
      Label("暂无对话", systemImage: "bubble.left.and.bubble.right")
    } description: {
      Text("开始与 AI 旅行助手对话，获取个性化的旅行推荐。")
    } actions: {
      Button {
        onCreateNew()
      } label: {
        Label("开始新对话", systemImage: "plus.circle.fill")
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
      Text("加载中...")
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
          TextField("对话标题（可选）", text: $title)
        } header: {
          Text("标题")
        } footer: {
          Text("留空将根据您的第一条消息自动生成")
        }

        Section {
          TextField("附加上下文", text: $context, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("上下文")
        } footer: {
          Text("提供任何额外的上下文，如旅行偏好或限制条件")
        }

        Section {
          HStack {
            Image(systemName: "sparkles")
              .foregroundStyle(.yellow)
            Text("AI 旅行助手")
              .font(.headline)
          }

          Text("我可以帮助您：")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            FeatureRow(icon: "mappin.circle.fill", text: "景点推荐", color: .red)
            FeatureRow(icon: "calendar", text: "行程规划", color: .blue)
            FeatureRow(icon: "lightbulb.fill", text: "旅行建议", color: .yellow)
            FeatureRow(icon: "fork.knife", text: "美食推荐", color: .orange)
          }
        } header: {
          Text("功能")
        }
      }
      .navigationTitle("新建对话")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            onDismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("创建") {
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
                  Text("加载更多消息")
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
            Label("清空对话", systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
      }
    }
    .task {
      await store.selectSession(session)
    }
    .alert("清空对话", isPresented: $showClearAlert) {
      Button("取消", role: .cancel) {}
      Button("清空", role: .destructive) {
        Task {
          _ = await store.clearMessages()
        }
      }
    } message: {
      Text("这将删除此对话中的所有消息。")
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
          Text("推荐地点")
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
      TextField("随便问我关于旅行的问题...", text: $text, axis: .vertical)
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
