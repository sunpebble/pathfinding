import SwiftUI
import OSLog

private let logger = Logger(subsystem: "org.pathfinding.app", category: "CommentSection")

// MARK: - Comment Section View

/// Main comment section to be embedded in itinerary detail views
struct CommentSectionView: View {
  let itineraryId: String
  @State private var store = CommentStore()
  @State private var showCommentSheet = false
  @State private var replyToComment: ItineraryComment?
  @State private var scrollToCommentId: String?
  @State private var currentUserId: String?

  var body: some View {
    ScrollViewReader { proxy in
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
        // Section Header
        HStack {
          Label("Comments", systemImage: "bubble.left.and.bubble.right.fill")
            .font(.headline)

          Spacer()

          Button {
            showCommentSheet = true
          } label: {
            Label("Add Comment", systemImage: "plus.circle.fill")
              .font(.subheadline)
          }
          .buttonStyle(.secondary)
        }
        
        // Comment List
        if store.isLoadingComments && store.comments.isEmpty {
          ProgressView()
            .frame(maxWidth: .infinity, alignment: .center)
            .padding()
        } else if store.comments.isEmpty {
          EmptyCommentView {
            showCommentSheet = true
          }
        } else {
          LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(store.comments) { comment in
              CommentRow(
                comment: comment,
                onReply: {
                  replyToComment = comment
                  showCommentSheet = true
                },
                onLike: {
                  Task {
                    _ = await store.toggleLike(commentId: comment.id)
                  }
                },
                onDelete: {
                  Task {
                    _ = await store.deleteComment(commentId: comment.id, itineraryId: itineraryId)
                  }
                },
                currentUserId: currentUserId,
                store: store
              )
              .id(comment.id)
            }

            // Load More
            if store.commentsPage < store.commentsTotalPages {
              Button {
                Task {
                  await store.loadMoreComments(itineraryId: itineraryId)
                }
              } label: {
                if store.isLoadingComments {
                  ProgressView()
                } else {
                  Text("Load more comments")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, DesignTokens.Spacing.sm)
            }
          }
        }
      }
      .onChange(of: scrollToCommentId) { _, newValue in
        if let commentId = newValue {
          withAnimation {
            proxy.scrollTo(commentId, anchor: .center)
          }
          scrollToCommentId = nil
        }
      }
    }
    .task {
      // Ensure auth session is loaded before accessing userId
      await AuthManager.shared.ensureSessionLoaded()
      
      // Get token and decode userId directly (workaround for caching issues)
      if let token = try? await AuthManager.shared.getAccessToken() {
        // Decode the 'sub' claim from JWT token
        let parts = token.split(separator: ".")
        if parts.count == 3 {
          var payload = String(parts[1])
          payload = payload.replacingOccurrences(of: "-", with: "+")
          payload = payload.replacingOccurrences(of: "_", with: "/")
          while payload.count % 4 != 0 {
            payload += "="
          }
          if let data = Data(base64Encoded: payload),
             let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
             let sub = json["sub"] as? String {
            currentUserId = sub
          }
        }
      }
      
      await store.fetchComments(itineraryId: itineraryId, refresh: true)
    }
    .refreshable {
      await store.fetchComments(itineraryId: itineraryId, refresh: true)
    }
    .sheet(isPresented: $showCommentSheet) {
      CommentComposeSheet(
        itineraryId: itineraryId,
        replyTo: replyToComment,
        store: store,
        onSuccess: { targetCommentId in
          // Scroll to the target comment (parent for replies, new comment for top-level)
          if let targetCommentId {
            // Small delay to allow the list to update
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
              scrollToCommentId = targetCommentId
            }
          }
        }
      ) {
        showCommentSheet = false
        replyToComment = nil
      }
    }
  }
}

// MARK: - Comment Row

struct CommentRow: View {
  let comment: ItineraryComment
  let onReply: () -> Void
  let onLike: () -> Void
  let onDelete: () -> Void
  let currentUserId: String?
  @Bindable var store: CommentStore
  
  private var isOwnComment: Bool {
    // TODO: Frontend userId retrieval not working. Let backend handle permission checking.
    // Backend will reject unauthorized delete requests with "You can only delete your own comments"
    return true
  }

  @State private var showReportSheet = false
  @State private var showDeleteAlert = false
  @State private var showDeleteErrorAlert = false
  @State private var likeButtonScale: CGFloat = 1.0
  
  private var isLiking: Bool {
    store.likeInProgress.contains(comment.id)
  }
  
  private var showReplies: Bool {
    store.expandedCommentIds.contains(comment.id)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Author Row
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Avatar
        if let avatarUrl = comment.authorAvatar, let url = URL(string: avatarUrl) {
          AsyncImage(url: url) { image in
            image
              .resizable()
              .scaledToFill()
          } placeholder: {
            Circle().fill(Color.gray.opacity(0.3))
          }
          .frame(width: 32, height: 32)
          .clipShape(Circle())
        } else {
          Circle()
            .fill(DesignTokens.Colors.accent.gradient)
            .frame(width: 32, height: 32)
            .overlay {
              Text(String(comment.authorName?.prefix(1) ?? "?"))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            }
        }

        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Text(comment.authorName ?? "Anonymous")
              .font(.subheadline)
              .fontWeight(.medium)

            if comment.isEdited {
              Text("(edited)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }

          Text(comment.timeAgo)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Options Menu
        Menu {
          if isOwnComment {
            Button(role: .destructive) {
              showDeleteAlert = true
            } label: {
              Label("Delete", systemImage: "trash")
            }
          }
          
          Button(role: .destructive) {
            showReportSheet = true
          } label: {
            Label("Report", systemImage: "flag")
          }
        } label: {
          Image(systemName: "ellipsis")
            .foregroundStyle(.secondary)
            .padding(DesignTokens.Spacing.xs)
        }
      }

      // Content
      if comment.isDeleted {
        Text(comment.content)
          .font(.body)
          .foregroundStyle(.tertiary)
          .italic()
      } else {
        Text(comment.content)
          .font(.body)
      }

      // Actions
      HStack(spacing: DesignTokens.Spacing.lg) {
        // Like
        Button {
          // Animate the button
          withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
            likeButtonScale = 1.3
          }
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
              likeButtonScale = 1.0
            }
          }
          onLike()
        } label: {
          HStack(spacing: 4) {
            Image(systemName: comment.isLikedByUser == true ? "heart.fill" : "heart")
              .foregroundStyle(comment.isLikedByUser == true ? .red : .secondary)
              .scaleEffect(likeButtonScale)
            if comment.likesCount > 0 {
              Text("\(comment.likesCount)")
                .foregroundStyle(.secondary)
            }
          }
          .font(.subheadline)
          .contentShape(Rectangle())
          .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.plain)
        .disabled(isLiking)

        // Reply
        Button(action: onReply) {
          HStack(spacing: 4) {
            Image(systemName: "arrowshape.turn.up.left")
            Text("Reply")
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)

        // Show Replies
        if comment.repliesCount > 0 {
          Button {
            withAnimation {
              if showReplies {
                store.expandedCommentIds.remove(comment.id)
              } else {
                store.expandedCommentIds.insert(comment.id)
                Task {
                  await store.fetchReplies(commentId: comment.id)
                }
              }
            }
          } label: {
            HStack(spacing: 4) {
              Image(systemName: showReplies ? "chevron.up" : "chevron.down")
              Text("\(comment.repliesCount) replies")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
          }
          .buttonStyle(.plain)
        }

        Spacer()
      }

      // Replies
      if showReplies {
        if store.isLoadingReplies {
          ProgressView()
            .padding(.leading, 40)
        } else if let replies = store.replies[comment.id] {
          VStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(replies) { reply in
              ReplyRow(
                reply: reply,
                currentUserId: currentUserId,
                parentCommentId: comment.id,
                onLike: {
                  Task {
                    _ = await store.toggleLike(commentId: reply.id)
                  }
                },
                store: store
              )
            }
          }
          .padding(.leading, 40)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .subtleCardStyle()
    .sheet(isPresented: $showReportSheet) {
      ReportCommentSheet(commentId: comment.id, store: store) {
        showReportSheet = false
      }
    }
    .alert("Delete Comment", isPresented: $showDeleteAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Delete", role: .destructive) {
        Task {
          let success = await store.deleteComment(commentId: comment.id, itineraryId: comment.itineraryId)
          if !success {
            showDeleteErrorAlert = true
          }
        }
      }
    } message: {
      Text("Are you sure you want to delete this comment?")
    }
    .alert("无法删除", isPresented: $showDeleteErrorAlert) {
      Button("确定", role: .cancel) {}
    } message: {
      Text("非本人无法删除该评论")
    }
  }
}

// MARK: - Reply Row

struct ReplyRow: View {
  let reply: ItineraryComment
  let currentUserId: String?
  let parentCommentId: String
  let onLike: () -> Void
  @Bindable var store: CommentStore
  
  @State private var showDeleteAlert = false
  @State private var showDeleteErrorAlert = false
  
  private var isOwnReply: Bool {
    // TODO: Frontend userId retrieval not working. Let backend handle permission checking.
    return true
  }

  var body: some View {
    HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
      // Avatar
      Circle()
        .fill(Color.gray.opacity(0.3))
        .frame(width: 24, height: 24)
        .overlay {
          Text(String(reply.authorName?.prefix(1) ?? "?"))
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(.white)
        }

      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(reply.authorName ?? "Anonymous")
            .font(.caption)
            .fontWeight(.medium)

          Text(reply.timeAgo)
            .font(.caption2)
            .foregroundStyle(.tertiary)
          
          Spacer()
          
          // Options Menu for own replies
          if isOwnReply {
            Menu {
              Button(role: .destructive) {
                showDeleteAlert = true
              } label: {
                Label("Delete", systemImage: "trash")
              }
            } label: {
              Image(systemName: "ellipsis")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }

        Text(reply.content)
          .font(.subheadline)


        // Like button
        Button(action: onLike) {
          HStack(spacing: 2) {
            Image(systemName: reply.isLikedByUser == true ? "heart.fill" : "heart")
              .foregroundStyle(reply.isLikedByUser == true ? .red : .secondary)
            if reply.likesCount > 0 {
              Text("\(reply.likesCount)")
            }
          }
          .font(.caption2)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
    .alert("Delete Reply", isPresented: $showDeleteAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Delete", role: .destructive) {
        Task {
          let success = await store.deleteComment(commentId: reply.id, itineraryId: reply.itineraryId)
          if !success {
            showDeleteErrorAlert = true
          } else {
            // Refresh replies after deletion
            await store.fetchReplies(commentId: parentCommentId)
          }
        }
      }
    } message: {
      Text("Are you sure you want to delete this reply?")
    }
    .alert("无法删除", isPresented: $showDeleteErrorAlert) {
      Button("确定", role: .cancel) {}
    } message: {
      Text("非本人无法删除该回复")
    }
  }
}

// MARK: - Empty Comment View

struct EmptyCommentView: View {
  let onAddComment: () -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "bubble.left.and.bubble.right")
        .font(.system(size: 40))
        .foregroundStyle(.tertiary)

      Text("No comments yet")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("Be the first to share your thoughts!")
        .font(.subheadline)
        .foregroundStyle(.tertiary)

      Button("Add Comment", action: onAddComment)
        .buttonStyle(.primary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
  }
}

// MARK: - Comment Compose Sheet

struct CommentComposeSheet: View {
  let itineraryId: String
  let replyTo: ItineraryComment?
  @Bindable var store: CommentStore
  var onSuccess: ((String?) -> Void)? = nil
  let onDismiss: () -> Void

  @State private var content = ""
  @State private var debugStatus = "Ready"
  @FocusState private var isFocused: Bool
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Reply context
        if let replyTo {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("Replying to \(replyTo.authorName ?? "comment")")
              .font(.caption)
              .foregroundStyle(.secondary)

            Text(replyTo.content)
              .font(.subheadline)
              .foregroundStyle(.secondary)
              .lineLimit(2)
          }
          .padding(DesignTokens.Spacing.sm)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.systemGray6))
          .cornerRadius(DesignTokens.Radius.sm)
        }

        // Text Editor
        TextEditor(text: $content)
          .frame(minHeight: 120)
          .padding(DesignTokens.Spacing.xs)
          .background(Color(.systemGray6))
          .cornerRadius(DesignTokens.Radius.sm)
          .focused($isFocused)

        // Character count
        HStack {
          Text(debugStatus)
            .font(.caption)
            .foregroundStyle(.blue)
          Spacer()
          Text("\(content.count)/2000")
            .font(.caption)
            .foregroundStyle(content.count > 2000 ? .red : .secondary)
        }

        // Error message
        if let error = store.errorMessage {
          Text(error)
            .font(.caption)
            .foregroundStyle(.red)
        }

        Spacer()
      }
      .padding()
      .navigationTitle(replyTo != nil ? "Reply" : "Add Comment")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button {
            logger.info("🔘 Post button tapped! content length: \(self.content.count)")
            print("🔘 Post button tapped!")
            submitComment()
          } label: {
            Text("Post")
          }
        }
      }
      .onAppear {
        isFocused = true
      }
    }
  }

  private func submitComment() {
    debugStatus = "Submitting..."
    guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      debugStatus = "Error: Empty content"
      logger.info("🔘 Content is empty, returning")
      return
    }
    guard content.count <= 2000 else {
      debugStatus = "Error: Too long"
      logger.info("🔘 Content too long, returning")
      return
    }
    guard !store.isSubmitting else {
      debugStatus = "Error: Already submitting"
      logger.info("🔘 Already submitting, returning")
      return
    }
    Task {
      debugStatus = "Calling API..."
      logger.info("🔘 Task started, calling createComment...")
      logger.info("🔘 replyTo: \(String(describing: replyTo)), replyTo.id: \(replyTo?.id ?? "nil")")
      print("🔘 REPLY DEBUG - replyTo: \(String(describing: replyTo)), replyTo.id: \(replyTo?.id ?? "nil")")
      let newCommentId = await store.createComment(
        itineraryId: itineraryId,
        content: content,
        parentId: replyTo?.id
      )
      logger.info("🔘 createComment returned: \(newCommentId ?? "nil")")
      if newCommentId != nil {
        debugStatus = "Success!"
        // For replies, scroll to parent; for new comments, scroll to the new comment
        let scrollTarget = replyTo?.id ?? newCommentId
        onSuccess?(scrollTarget)
        dismiss()
        onDismiss()
      } else {
        debugStatus = "Failed: \(store.errorMessage ?? "unknown")"
        logger.error("🔘 createComment failed: \(self.store.errorMessage ?? "nil")")
      }
    }
  }
}

// MARK: - Report Comment Sheet

struct ReportCommentSheet: View {
  let commentId: String
  @Bindable var store: CommentStore
  let onDismiss: () -> Void

  @State private var selectedReason: CommentReportReason?
  @State private var description = ""
  @State private var showConfirmation = false

  var body: some View {
    NavigationStack {
      Form {
        Section("Reason") {
          ForEach(CommentReportReason.allCases, id: \.self) { reason in
            Button {
              selectedReason = reason
            } label: {
              HStack {
                Image(systemName: reason.icon)
                  .foregroundStyle(.secondary)
                  .frame(width: 24)

                Text(reason.displayName)
                  .foregroundStyle(.primary)

                Spacer()

                if selectedReason == reason {
                  Image(systemName: "checkmark")
                    .foregroundStyle(.blue)
                }
              }
            }
          }
        }

        Section("Additional Details (Optional)") {
          TextField("Describe the issue...", text: $description, axis: .vertical)
            .lineLimit(3...6)
        }
      }
      .navigationTitle("Report Comment")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Submit") {
            Task {
              if let reason = selectedReason {
                let success = await store.reportComment(
                  commentId: commentId,
                  reason: reason,
                  description: description.isEmpty ? nil : description
                )
                if success {
                  showConfirmation = true
                }
              }
            }
          }
          .disabled(selectedReason == nil || store.isSubmitting)
        }
      }
      .alert("Report Submitted", isPresented: $showConfirmation) {
        Button("OK") {
          onDismiss()
        }
      } message: {
        Text("Thank you for your report. We will review it shortly.")
      }
    }
  }
}

// MARK: - Preview

#Preview("Comment Section") {
  ScrollView {
    CommentSectionView(itineraryId: "test-itinerary-id")
      .padding()
  }
}

#Preview("Empty Comments") {
  EmptyCommentView {}
    .padding()
}
