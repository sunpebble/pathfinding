import SwiftUI

// MARK: - Question Detail View

/// Full view for a question with its answers
struct QuestionDetailView: View {
  let question: POIQuestion
  @Bindable var store: QAStore
  @Environment(\.dismiss) private var dismiss

  @State private var showAnswerSheet = false
  @State private var showReportSheet = false
  @State private var showEditSheet = false
  @State private var showDeleteAlert = false
  @State private var answerSortOption: AnswerSortOption = .mostUpvoted

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Question Section
          questionSection

          Divider()

          // Answers Section
          answersSection
        }
        .padding()
      }
      .navigationTitle("Question")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") {
            dismiss()
          }
        }

        ToolbarItem(placement: .primaryAction) {
          Menu {
            Button {
              showReportSheet = true
            } label: {
              Label("Report Question", systemImage: "flag")
            }

            // Show edit/delete only for question owner
            // In production, check if current user is the author
            Button {
              showEditSheet = true
            } label: {
              Label("Edit Question", systemImage: "pencil")
            }

            Button(role: .destructive) {
              showDeleteAlert = true
            } label: {
              Label("Delete Question", systemImage: "trash")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
          }
        }
      }
      .task {
        await store.fetchQuestion(questionId: question.id)
        await store.fetchAnswers(questionId: question.id, sortBy: answerSortOption, refresh: true)
      }
      .sheet(isPresented: $showAnswerSheet) {
        AnswerComposeSheet(
          questionId: question.id,
          questionTitle: question.title,
          store: store
        ) {
          showAnswerSheet = false
        }
      }
      .sheet(isPresented: $showReportSheet) {
        ReportQASheet(
          targetType: .question,
          targetId: question.id,
          store: store
        ) {
          showReportSheet = false
        }
      }
      .sheet(isPresented: $showEditSheet) {
        QuestionEditSheet(
          question: store.currentQuestion ?? question,
          store: store
        ) {
          showEditSheet = false
        }
      }
      .alert("Delete Question", isPresented: $showDeleteAlert) {
        Button("Cancel", role: .cancel) {}
        Button("Delete", role: .destructive) {
          Task {
            let success = await store.deleteQuestion(questionId: question.id)
            if success {
              dismiss()
            }
          }
        }
      } message: {
        Text("Are you sure you want to delete this question? This action cannot be undone.")
      }
    }
  }

  // MARK: - Question Section

  private var questionSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      // Status badge
      HStack {
        statusBadge
        Spacer()
        if let currentQ = store.currentQuestion ?? Optional(question), currentQ.isEdited {
          Text("Edited")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
      }

      // Title
      Text((store.currentQuestion ?? question).title)
        .font(.title3)
        .fontWeight(.semibold)

      // Author & Time
      HStack(spacing: DesignTokens.Spacing.sm) {
        authorAvatar

        VStack(alignment: .leading, spacing: 2) {
          Text((store.currentQuestion ?? question).authorName ?? "Anonymous")
            .font(.subheadline)
            .fontWeight(.medium)

          Text((store.currentQuestion ?? question).timeAgo)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      // Content
      Text((store.currentQuestion ?? question).content)
        .font(.body)

      // Tags
      if let tags = (store.currentQuestion ?? question).tags, !tags.isEmpty {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(tags, id: \.self) { tag in
              Text(tag)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.1))
                .foregroundStyle(.blue)
                .cornerRadius(6)
            }
          }
        }
      }

      // Vote & Actions Row
      HStack(spacing: DesignTokens.Spacing.lg) {
        // Voting
        VoteButtons(
          score: (store.currentQuestion ?? question).score,
          userVote: (store.currentQuestion ?? question).userVote,
          onUpvote: {
            Task {
              _ = await store.voteQuestion(questionId: question.id, voteType: .up)
            }
          },
          onDownvote: {
            Task {
              _ = await store.voteQuestion(questionId: question.id, voteType: .down)
            }
          }
        )

        // Views
        HStack(spacing: 4) {
          Image(systemName: "eye")
          Text("\((store.currentQuestion ?? question).viewsCount)")
        }
        .font(.caption)
        .foregroundStyle(.tertiary)

        Spacer()

        // Status actions (for question author)
        if (store.currentQuestion ?? question).status == .open {
          Button {
            Task {
              _ = await store.closeQuestion(questionId: question.id)
            }
          } label: {
            Label("Close", systemImage: "xmark.circle")
              .font(.caption)
          }
          .buttonStyle(.plain)
          .foregroundStyle(.secondary)
        } else if (store.currentQuestion ?? question).status == .closed {
          Button {
            Task {
              _ = await store.reopenQuestion(questionId: question.id)
            }
          } label: {
            Label("Reopen", systemImage: "arrow.counterclockwise")
              .font(.caption)
          }
          .buttonStyle(.plain)
          .foregroundStyle(.secondary)
        }
      }
    }
  }

  private var statusBadge: some View {
    let currentQ = store.currentQuestion ?? question
    return HStack(spacing: 4) {
      Image(systemName: currentQ.statusIcon)
      Text(currentQ.status.rawValue.capitalized)
    }
    .font(.caption)
    .fontWeight(.medium)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(statusBackgroundColor.opacity(0.15))
    .foregroundStyle(statusBackgroundColor)
    .cornerRadius(6)
  }

  private var statusBackgroundColor: Color {
    switch (store.currentQuestion ?? question).status {
    case .open:
      return .blue
    case .closed:
      return .gray
    case .resolved:
      return .green
    }
  }

  private var authorAvatar: some View {
    let currentQ = store.currentQuestion ?? question
    return Group {
      if let avatarUrl = currentQ.authorAvatarUrl, let url = URL(string: avatarUrl) {
        AsyncImage(url: url) { image in
          image
            .resizable()
            .scaledToFill()
        } placeholder: {
          Circle().fill(Color.gray.opacity(0.3))
        }
        .frame(width: 36, height: 36)
        .clipShape(Circle())
      } else {
        Circle()
          .fill(Color.indigo.gradient)
          .frame(width: 36, height: 36)
          .overlay {
            Text(String(currentQ.authorName?.prefix(1) ?? "?"))
              .font(.subheadline)
              .fontWeight(.bold)
              .foregroundStyle(.white)
          }
      }
    }
  }

  // MARK: - Answers Section

  private var answersSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        Text("\((store.currentQuestion ?? question).answersCount) Answers")
          .font(.headline)

        Spacer()

        // Sort menu
        Menu {
          ForEach(AnswerSortOption.allCases, id: \.self) { option in
            Button {
              answerSortOption = option
              Task {
                await store.fetchAnswers(questionId: question.id, sortBy: option, refresh: true)
              }
            } label: {
              HStack {
                Text(option.displayName)
                if answerSortOption == option {
                  Image(systemName: "checkmark")
                }
              }
            }
          }
        } label: {
          HStack(spacing: 4) {
            Text(answerSortOption.displayName)
            Image(systemName: "chevron.down")
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        Button {
          showAnswerSheet = true
        } label: {
          Label("Answer", systemImage: "plus.circle.fill")
            .font(.subheadline)
        }
        .buttonStyle(.secondary)
      }

      // Answers list
      if store.isLoadingAnswers && store.answers.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, alignment: .center)
          .padding()
      } else if store.answers.isEmpty {
        VStack(spacing: DesignTokens.Spacing.md) {
          Image(systemName: "text.bubble")
            .font(.system(size: 32))
            .foregroundStyle(.tertiary)

          Text("No answers yet")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Button("Be the first to answer") {
            showAnswerSheet = true
          }
          .font(.caption)
          .buttonStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.lg)
      } else {
        LazyVStack(spacing: DesignTokens.Spacing.md) {
          ForEach(store.answers) { answer in
            AnswerRow(
              answer: answer,
              isQuestionAuthor: true, // In production, check if current user is question author
              questionId: question.id,
              store: store
            )
          }

          // Load more
          if store.answersPage < store.answersTotalPages {
            Button {
              Task {
                await store.loadMoreAnswers(questionId: question.id, sortBy: answerSortOption)
              }
            } label: {
              if store.isLoadingAnswers {
                ProgressView()
              } else {
                Text("Load more answers")
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
  }
}

// MARK: - Answer Row

struct AnswerRow: View {
  let answer: POIAnswer
  let isQuestionAuthor: Bool
  let questionId: String
  @Bindable var store: QAStore

  @State private var showReportSheet = false
  @State private var showEditSheet = false
  @State private var showDeleteAlert = false

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Best answer badge
      if answer.isBestAnswer {
        HStack(spacing: 4) {
          Image(systemName: "checkmark.seal.fill")
          Text("Best Answer")
        }
        .font(.caption)
        .fontWeight(.medium)
        .foregroundStyle(.green)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.green.opacity(0.1))
        .cornerRadius(6)
      }

      // Author row
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Avatar
        if let avatarUrl = answer.authorAvatarUrl, let url = URL(string: avatarUrl) {
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
            .fill(Color.teal.gradient)
            .frame(width: 32, height: 32)
            .overlay {
              Text(String(answer.authorName?.prefix(1) ?? "?"))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            }
        }

        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Text(answer.authorName ?? "Anonymous")
              .font(.subheadline)
              .fontWeight(.medium)

            if answer.isEdited {
              Text("(edited)")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }

          Text(answer.timeAgo)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Options menu
        Menu {
          if isQuestionAuthor && !answer.isBestAnswer {
            Button {
              Task {
                _ = await store.markBestAnswer(answerId: answer.id, questionId: questionId)
              }
            } label: {
              Label("Mark as Best Answer", systemImage: "checkmark.seal")
            }
          } else if isQuestionAuthor && answer.isBestAnswer {
            Button {
              Task {
                _ = await store.unmarkBestAnswer(answerId: answer.id, questionId: questionId)
              }
            } label: {
              Label("Unmark Best Answer", systemImage: "xmark.seal")
            }
          }

          Button {
            showReportSheet = true
          } label: {
            Label("Report", systemImage: "flag")
          }

          // Show edit/delete only for answer owner
          Button {
            showEditSheet = true
          } label: {
            Label("Edit", systemImage: "pencil")
          }

          Button(role: .destructive) {
            showDeleteAlert = true
          } label: {
            Label("Delete", systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis")
            .foregroundStyle(.secondary)
            .padding(DesignTokens.Spacing.xs)
        }
      }

      // Content
      Text(answer.content)
        .font(.body)

      // Actions row
      HStack(spacing: DesignTokens.Spacing.lg) {
        VoteButtons(
          score: answer.score,
          userVote: answer.userVote,
          onUpvote: {
            Task {
              _ = await store.voteAnswer(answerId: answer.id, voteType: .up)
            }
          },
          onDownvote: {
            Task {
              _ = await store.voteAnswer(answerId: answer.id, voteType: .down)
            }
          }
        )

        Spacer()
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(answer.isBestAnswer ? Color.green.opacity(0.05) : Color(.systemGray6))
    .cornerRadius(DesignTokens.Radius.md)
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(answer.isBestAnswer ? Color.green.opacity(0.3) : Color.clear, lineWidth: 1)
    )
    .sheet(isPresented: $showReportSheet) {
      ReportQASheet(
        targetType: .answer,
        targetId: answer.id,
        store: store
      ) {
        showReportSheet = false
      }
    }
    .sheet(isPresented: $showEditSheet) {
      AnswerEditSheet(
        answer: answer,
        questionId: questionId,
        store: store
      ) {
        showEditSheet = false
      }
    }
    .alert("Delete Answer", isPresented: $showDeleteAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Delete", role: .destructive) {
        Task {
          _ = await store.deleteAnswer(answerId: answer.id, questionId: questionId)
        }
      }
    } message: {
      Text("Are you sure you want to delete this answer?")
    }
  }
}

// MARK: - Vote Buttons

struct VoteButtons: View {
  let score: Int
  let userVote: VoteType?
  let onUpvote: () -> Void
  let onDownvote: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Button(action: onUpvote) {
        Image(systemName: userVote == .up ? "arrow.up.circle.fill" : "arrow.up.circle")
          .font(.title3)
          .foregroundStyle(userVote == .up ? .green : .secondary)
      }
      .buttonStyle(.plain)

      Text("\(score)")
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundStyle(scoreColor)
        .frame(minWidth: 24)

      Button(action: onDownvote) {
        Image(systemName: userVote == .down ? "arrow.down.circle.fill" : "arrow.down.circle")
          .font(.title3)
          .foregroundStyle(userVote == .down ? .red : .secondary)
      }
      .buttonStyle(.plain)
    }
  }

  private var scoreColor: Color {
    if score > 0 {
      return .green
    } else if score < 0 {
      return .red
    } else {
      return .secondary
    }
  }
}

// MARK: - Answer Compose Sheet

struct AnswerComposeSheet: View {
  let questionId: String
  let questionTitle: String
  let store: QAStore
  let onDismiss: () -> Void

  @State private var content = ""
  @FocusState private var isFocused: Bool

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Question context
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          Text("Answering")
            .font(.caption)
            .foregroundStyle(.secondary)

          Text(questionTitle)
            .font(.subheadline)
            .fontWeight(.medium)
            .lineLimit(2)
        }
        .padding(DesignTokens.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(DesignTokens.Radius.sm)

        // Text Editor
        TextEditor(text: $content)
          .frame(minHeight: 150)
          .padding(DesignTokens.Spacing.xs)
          .background(Color(.systemGray6))
          .cornerRadius(DesignTokens.Radius.sm)
          .focused($isFocused)

        // Character count
        HStack {
          Text("Provide a helpful and detailed answer")
            .font(.caption)
            .foregroundStyle(.tertiary)

          Spacer()

          Text("\(content.count)/10000")
            .font(.caption)
            .foregroundStyle(content.count > 10000 ? .red : .secondary)
        }

        Spacer()
      }
      .padding()
      .navigationTitle("Your Answer")
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
              let success = await store.createAnswer(questionId: questionId, content: content)
              if success {
                onDismiss()
              }
            }
          }
          .disabled(!isValid || store.isSubmitting)
        }
      }
      .onAppear {
        isFocused = true
      }
    }
  }

  private var isValid: Bool {
    !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && content.count <= 10000
  }
}

// MARK: - Question Edit Sheet

struct QuestionEditSheet: View {
  let question: POIQuestion
  let store: QAStore
  let onDismiss: () -> Void

  @State private var title: String
  @State private var content: String
  @State private var tagInput = ""
  @State private var tags: [String]

  init(question: POIQuestion, store: QAStore, onDismiss: @escaping () -> Void) {
    self.question = question
    self.store = store
    self.onDismiss = onDismiss
    _title = State(initialValue: question.title)
    _content = State(initialValue: question.content)
    _tags = State(initialValue: question.tags ?? [])
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("Question") {
          TextField("Title", text: $title)

          TextEditor(text: $content)
            .frame(minHeight: 100)
        }

        Section {
          HStack {
            TextField("Add tag", text: $tagInput)
              .onSubmit {
                addTag()
              }

            Button("Add") {
              addTag()
            }
            .disabled(tagInput.trimmingCharacters(in: .whitespaces).isEmpty || tags.count >= 5)
          }

          if !tags.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
              HStack {
                ForEach(tags, id: \.self) { tag in
                  HStack(spacing: 4) {
                    Text(tag)
                    Button {
                      tags.removeAll { $0 == tag }
                    } label: {
                      Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                    }
                  }
                  .padding(.horizontal, 8)
                  .padding(.vertical, 4)
                  .background(Color.blue.opacity(0.1))
                  .foregroundStyle(.blue)
                  .cornerRadius(8)
                }
              }
            }
          }
        } header: {
          Text("Tags")
        }
      }
      .navigationTitle("Edit Question")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            Task {
              let success = await store.updateQuestion(
                questionId: question.id,
                title: title,
                content: content,
                tags: tags.isEmpty ? nil : tags
              )
              if success {
                onDismiss()
              }
            }
          }
          .disabled(!isValid || store.isSubmitting)
        }
      }
    }
  }

  private var isValid: Bool {
    !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
      !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
      title.count <= 200 &&
      content.count <= 5000
  }

  private func addTag() {
    let tag = tagInput.trimmingCharacters(in: .whitespaces)
    if !tag.isEmpty && !tags.contains(tag) && tags.count < 5 {
      tags.append(tag)
      tagInput = ""
    }
  }
}

// MARK: - Answer Edit Sheet

struct AnswerEditSheet: View {
  let answer: POIAnswer
  let questionId: String
  let store: QAStore
  let onDismiss: () -> Void

  @State private var content: String

  init(answer: POIAnswer, questionId: String, store: QAStore, onDismiss: @escaping () -> Void) {
    self.answer = answer
    self.questionId = questionId
    self.store = store
    self.onDismiss = onDismiss
    _content = State(initialValue: answer.content)
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.md) {
        TextEditor(text: $content)
          .frame(minHeight: 150)
          .padding(DesignTokens.Spacing.xs)
          .background(Color(.systemGray6))
          .cornerRadius(DesignTokens.Radius.sm)

        HStack {
          Spacer()
          Text("\(content.count)/10000")
            .font(.caption)
            .foregroundStyle(content.count > 10000 ? .red : .secondary)
        }

        Spacer()
      }
      .padding()
      .navigationTitle("Edit Answer")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            onDismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            Task {
              let success = await store.updateAnswer(
                answerId: answer.id,
                content: content,
                questionId: questionId
              )
              if success {
                onDismiss()
              }
            }
          }
          .disabled(!isValid || store.isSubmitting)
        }
      }
    }
  }

  private var isValid: Bool {
    !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && content.count <= 10000
  }
}

// MARK: - Report QA Sheet

struct ReportQASheet: View {
  enum TargetType {
    case question
    case answer
  }

  let targetType: TargetType
  let targetId: String
  @Bindable var store: QAStore
  let onDismiss: () -> Void

  @State private var selectedReason: QAReportReason?
  @State private var description = ""
  @State private var showConfirmation = false

  var body: some View {
    NavigationStack {
      Form {
        Section("Reason") {
          ForEach(QAReportReason.allCases, id: \.self) { reason in
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
            .lineLimit(3 ... 6)
        }
      }
      .navigationTitle("Report \(targetType == .question ? "Question" : "Answer")")
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
                let success: Bool
                if targetType == .question {
                  success = await store.reportQuestion(
                    questionId: targetId,
                    reason: reason,
                    description: description.isEmpty ? nil : description
                  )
                } else {
                  success = await store.reportAnswer(
                    answerId: targetId,
                    reason: reason,
                    description: description.isEmpty ? nil : description
                  )
                }
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

// MARK: - Previews

#Preview("Question Detail") {
  QuestionDetailView(
    question: POIQuestion(
      id: "q1",
      poiId: "poi1",
      userId: "user1",
      title: "What's the best time to visit?",
      content: "I'm planning a trip and wondering when is the best time to visit this attraction. Any suggestions?",
      authorName: "John Doe",
      authorAvatarUrl: nil,
      upvotesCount: 5,
      downvotesCount: 1,
      answersCount: 3,
      viewsCount: 42,
      bestAnswerId: nil,
      hasBestAnswer: false,
      status: .open,
      isEdited: false,
      isDeleted: false,
      tags: ["timing", "travel-tips"],
      createdAt: Date().timeIntervalSince1970 * 1000 - 86400000,
      updatedAt: nil,
      lastActivityAt: Date().timeIntervalSince1970 * 1000,
      userVote: nil,
      poiName: "Eiffel Tower"
    ),
    store: QAStore()
  )
}
