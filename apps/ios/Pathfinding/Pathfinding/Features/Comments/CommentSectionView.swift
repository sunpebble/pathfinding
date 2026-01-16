import SwiftUI

// MARK: - Comment Section View

/// Main comment section to be embedded in itinerary detail views
struct CommentSectionView: View {
  let itineraryId: String
  @State private var store = CommentStore()
  @State private var showCommentSheet = false
  @State private var replyToComment: ItineraryComment?

  var body: some View {
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
              store: store
            )
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
    .task {
      await store.fetchComments(itineraryId: itineraryId, refresh: true)
    }
    .refreshable {
      await store.fetchComments(itineraryId: itineraryId, refresh: true)
    }
    .sheet(isPresented: $showCommentSheet) {
      CommentComposeSheet(
        itineraryId: itineraryId,
        replyTo: replyToComment,
        store: store
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
  let store: CommentStore

  @State private var showReplies = false
  @State private var showReportSheet = false
  @State private var showDeleteAlert = false

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
        Button(action: onLike) {
          HStack(spacing: 4) {
            Image(systemName: comment.isLikedByUser == true ? "heart.fill" : "heart")
              .foregroundStyle(comment.isLikedByUser == true ? .red : .secondary)
            if comment.likesCount > 0 {
              Text("\(comment.likesCount)")
            }
          }
          .font(.caption)
        }
        .buttonStyle(.plain)

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
              showReplies.toggle()
            }
            if showReplies {
              Task {
                await store.fetchReplies(commentId: comment.id)
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
              ReplyRow(reply: reply, onLike: {
                Task {
                  _ = await store.toggleLike(commentId: reply.id)
                }
              })
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
      Button("Delete", role: .destructive, action: onDelete)
    } message: {
      Text("Are you sure you want to delete this comment?")
    }
  }
}

// MARK: - Reply Row

struct ReplyRow: View {
  let reply: ItineraryComment
  let onLike: () -> Void

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
  let store: CommentStore
  let onDismiss: () -> Void

  @State private var content = ""
  @FocusState private var isFocused: Bool

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
          Spacer()
          Text("\(content.count)/2000")
            .font(.caption)
            .foregroundStyle(content.count > 2000 ? .red : .secondary)
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
          Button("Post") {
            Task {
              let success = await store.createComment(
                itineraryId: itineraryId,
                content: content,
                parentId: replyTo?.id
              )
              if success {
                onDismiss()
              }
            }
          }
          .disabled(content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || content.count > 2000 || store.isSubmitting)
        }
      }
      .onAppear {
        isFocused = true
      }
    }
  }
}

// MARK: - Report Comment Sheet

struct ReportCommentSheet: View {
  let commentId: String
  let store: CommentStore
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
