import SwiftUI

// MARK: - QA Section View

/// Main Q&A section to be embedded in POI detail views
struct QASectionView: View {
  let poiId: String
  let poiName: String
  @State private var store = QAStore()
  @State private var showQuestionSheet = false
  @State private var selectedQuestion: POIQuestion?
  @State private var sortOption: QuestionSortOption = .newest
  @State private var statusFilter: POIQuestion.QuestionStatus?

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      // Section Header
      HStack {
        Label("Q&A", systemImage: "questionmark.bubble.fill")
          .font(.headline)

        Spacer()

        // Sort Menu
        Menu {
          ForEach(QuestionSortOption.allCases, id: \.self) { option in
            Button {
              sortOption = option
              Task {
                await store.fetchQuestions(poiId: poiId, sortBy: option, refresh: true)
              }
            } label: {
              HStack {
                Image(systemName: option.icon)
                Text(option.displayName)
                if sortOption == option {
                  Image(systemName: "checkmark")
                }
              }
            }
          }
        } label: {
          Image(systemName: "arrow.up.arrow.down")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }

        Button {
          showQuestionSheet = true
        } label: {
          Label("Ask", systemImage: "plus.circle.fill")
            .font(.subheadline)
        }
        .buttonStyle(.secondary)
      }

      // Question List
      if store.isLoadingQuestions && store.questions.isEmpty {
        ProgressView()
          .frame(maxWidth: .infinity, alignment: .center)
          .padding()
      } else if store.questions.isEmpty {
        EmptyQAView {
          showQuestionSheet = true
        }
      } else {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(store.questions) { question in
            QuestionRow(
              question: question,
              onTap: {
                selectedQuestion = question
              },
              onVote: { voteType in
                Task {
                  _ = await store.voteQuestion(questionId: question.id, voteType: voteType)
                }
              }
            )
          }

          // Load More
          if store.questionsPage < store.questionsTotalPages {
            Button {
              Task {
                await store.loadMoreQuestions(poiId: poiId, sortBy: sortOption)
              }
            } label: {
              if store.isLoadingQuestions {
                ProgressView()
              } else {
                Text("Load more questions")
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
      await store.fetchQuestions(poiId: poiId, sortBy: sortOption, refresh: true)
    }
    .refreshable {
      await store.fetchQuestions(poiId: poiId, sortBy: sortOption, refresh: true)
    }
    .sheet(isPresented: $showQuestionSheet) {
      QuestionComposeSheet(
        poiId: poiId,
        poiName: poiName,
        store: store
      ) {
        showQuestionSheet = false
      }
    }
    .sheet(item: $selectedQuestion) { question in
      QuestionDetailView(question: question, store: store)
    }
  }
}

// MARK: - Question Row

struct QuestionRow: View {
  let question: POIQuestion
  let onTap: () -> Void
  let onVote: (VoteType) -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        // Status & Title
        HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
          Image(systemName: question.statusIcon)
            .foregroundStyle(statusColor)
            .font(.caption)

          Text(question.title)
            .font(.subheadline)
            .fontWeight(.medium)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
            .foregroundStyle(.primary)
        }

        // Content preview
        Text(question.content)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
          .multilineTextAlignment(.leading)

        // Tags
        if let tags = question.tags, !tags.isEmpty {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.xs) {
              ForEach(tags, id: \.self) { tag in
                Text(tag)
                  .font(.caption2)
                  .padding(.horizontal, 6)
                  .padding(.vertical, 2)
                  .background(Color.blue.opacity(0.1))
                  .foregroundStyle(.blue)
                  .cornerRadius(4)
              }
            }
          }
        }

        // Meta Row
        HStack(spacing: DesignTokens.Spacing.md) {
          // Vote buttons
          HStack(spacing: DesignTokens.Spacing.xs) {
            Button {
              onVote(.up)
            } label: {
              Image(systemName: question.userVote == .up ? "arrow.up.circle.fill" : "arrow.up.circle")
                .foregroundStyle(question.userVote == .up ? .green : .secondary)
            }
            .buttonStyle(.plain)

            Text("\(question.score)")
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(scoreColor)

            Button {
              onVote(.down)
            } label: {
              Image(systemName: question.userVote == .down ? "arrow.down.circle.fill" : "arrow.down.circle")
                .foregroundStyle(question.userVote == .down ? .red : .secondary)
            }
            .buttonStyle(.plain)
          }

          // Answers count
          HStack(spacing: 2) {
            Image(systemName: question.hasBestAnswer ? "checkmark.message.fill" : "message")
              .foregroundStyle(question.hasBestAnswer ? .green : .secondary)
            Text("\(question.answersCount)")
              .foregroundStyle(.secondary)
          }
          .font(.caption)

          // Views count
          HStack(spacing: 2) {
            Image(systemName: "eye")
            Text("\(question.viewsCount)")
          }
          .font(.caption)
          .foregroundStyle(.tertiary)

          Spacer()

          // Time
          Text(question.timeAgo)
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
      }
      .padding(DesignTokens.Spacing.md)
      .subtleCardStyle()
    }
    .buttonStyle(.plain)
  }

  private var statusColor: Color {
    switch question.status {
    case .open:
      return .blue
    case .closed:
      return .gray
    case .resolved:
      return .green
    }
  }

  private var scoreColor: Color {
    if question.score > 0 {
      return .green
    } else if question.score < 0 {
      return .red
    } else {
      return .secondary
    }
  }
}

// MARK: - Empty QA View

struct EmptyQAView: View {
  let onAskQuestion: () -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "questionmark.bubble")
        .font(.system(size: 40))
        .foregroundStyle(.tertiary)

      Text("No questions yet")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("Be the first to ask a question about this place!")
        .font(.subheadline)
        .foregroundStyle(.tertiary)
        .multilineTextAlignment(.center)

      Button("Ask a Question", action: onAskQuestion)
        .buttonStyle(.primary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
  }
}

// MARK: - Question Compose Sheet

struct QuestionComposeSheet: View {
  let poiId: String
  let poiName: String
  let store: QAStore
  let onDismiss: () -> Void

  @State private var title = ""
  @State private var content = ""
  @State private var tagInput = ""
  @State private var tags: [String] = []
  @FocusState private var focusedField: Field?

  enum Field {
    case title, content, tag
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          Text(poiName)
            .foregroundStyle(.secondary)
        } header: {
          Text("Asking about")
        }

        Section {
          TextField("What's your question?", text: $title)
            .focused($focusedField, equals: .title)

          TextEditor(text: $content)
            .frame(minHeight: 100)
            .focused($focusedField, equals: .content)
        } header: {
          Text("Question")
        } footer: {
          HStack {
            Text("Be specific and clear")
            Spacer()
            Text("\(content.count)/5000")
              .foregroundStyle(content.count > 5000 ? .red : .secondary)
          }
        }

        Section {
          HStack {
            TextField("Add tag", text: $tagInput)
              .focused($focusedField, equals: .tag)
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
          Text("Tags (Optional)")
        } footer: {
          Text("Up to 5 tags to help others find your question")
        }
      }
      .navigationTitle("Ask a Question")
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
              let success = await store.createQuestion(
                poiId: poiId,
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
      .onAppear {
        focusedField = .title
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

// MARK: - Preview

#Preview("QA Section") {
  ScrollView {
    QASectionView(poiId: "test-poi-id", poiName: "Eiffel Tower")
      .padding()
  }
}

#Preview("Empty QA") {
  EmptyQAView {}
    .padding()
}
