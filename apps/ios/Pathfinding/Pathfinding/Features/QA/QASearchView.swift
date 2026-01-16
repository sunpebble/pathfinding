import SwiftUI

// MARK: - QA Search View

/// Search view for finding Q&A questions across POIs
struct QASearchView: View {
  @State private var store = QAStore()
  @State private var searchQuery = ""
  @State private var selectedQuestion: POIQuestion?
  @State private var isSearching = false

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Search results
        if store.isLoadingSearch {
          ProgressView("Searching...")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if searchQuery.isEmpty {
          searchPromptView
        } else if store.searchResults.isEmpty {
          noResultsView
        } else {
          searchResultsList
        }
      }
      .navigationTitle("Search Q&A")
      .searchable(
        text: $searchQuery,
        placement: .navigationBarDrawer(displayMode: .always),
        prompt: "Search questions..."
      )
      .onSubmit(of: .search) {
        performSearch()
      }
      .onChange(of: searchQuery) { _, newValue in
        if newValue.isEmpty {
          store.clearSearchResults()
        }
      }
      .sheet(item: $selectedQuestion) { question in
        QuestionDetailView(question: question, store: store)
      }
    }
  }

  // MARK: - Search Prompt View

  private var searchPromptView: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      Image(systemName: "magnifyingglass")
        .font(.system(size: 48))
        .foregroundStyle(.tertiary)

      Text("Search Questions")
        .font(.title3)
        .fontWeight(.medium)

      Text("Find questions and answers about places you're interested in")
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal)

      // Popular tags or recent searches could go here
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        Text("Try searching for:")
          .font(.caption)
          .foregroundStyle(.secondary)

        FlowLayout(spacing: DesignTokens.Spacing.xs) {
          ForEach(sampleSearchSuggestions, id: \.self) { suggestion in
            Button {
              searchQuery = suggestion
              performSearch()
            } label: {
              Text(suggestion)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.blue.opacity(0.1))
                .foregroundStyle(.blue)
                .cornerRadius(16)
            }
          }
        }
      }
      .padding(.top, DesignTokens.Spacing.lg)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  private var sampleSearchSuggestions: [String] {
    ["opening hours", "best time to visit", "ticket prices", "parking", "accessibility"]
  }

  // MARK: - No Results View

  private var noResultsView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "questionmark.folder")
        .font(.system(size: 48))
        .foregroundStyle(.tertiary)

      Text("No questions found")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("Try different keywords or check your spelling")
        .font(.subheadline)
        .foregroundStyle(.tertiary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  // MARK: - Search Results List

  private var searchResultsList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.searchResults) { question in
          SearchResultRow(question: question) {
            selectedQuestion = question
          }
        }
      }
      .padding()
    }
  }

  // MARK: - Helpers

  private func performSearch() {
    guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else { return }
    Task {
      await store.searchQuestions(query: searchQuery)
    }
  }
}

// MARK: - Search Result Row

struct SearchResultRow: View {
  let question: POIQuestion
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        // POI name badge
        if let poiName = question.poiName {
          HStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
              .font(.caption2)
            Text(poiName)
              .font(.caption)
          }
          .foregroundStyle(.blue)
        }

        // Title
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

        // Meta
        HStack(spacing: DesignTokens.Spacing.md) {
          // Score
          HStack(spacing: 2) {
            Image(systemName: "arrow.up")
            Text("\(question.score)")
          }
          .font(.caption2)
          .foregroundStyle(question.score > 0 ? .green : (question.score < 0 ? .red : .secondary))

          // Answers
          HStack(spacing: 2) {
            Image(systemName: question.hasBestAnswer ? "checkmark.message.fill" : "message")
              .foregroundStyle(question.hasBestAnswer ? .green : .secondary)
            Text("\(question.answersCount)")
          }
          .font(.caption2)
          .foregroundStyle(.secondary)

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
}

// MARK: - Flow Layout

/// A simple flow layout for wrapping content
struct FlowLayout: Layout {
  var spacing: CGFloat = 8

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
    let result = FlowResult(
      in: proposal.replacingUnspecifiedDimensions().width,
      subviews: subviews,
      spacing: spacing
    )
    return result.size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
    let result = FlowResult(
      in: proposal.replacingUnspecifiedDimensions().width,
      subviews: subviews,
      spacing: spacing
    )
    for (index, subview) in subviews.enumerated() {
      subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                y: bounds.minY + result.positions[index].y),
                    proposal: .unspecified)
    }
  }

  struct FlowResult {
    var size: CGSize = .zero
    var positions: [CGPoint] = []

    init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
      var currentX: CGFloat = 0
      var currentY: CGFloat = 0
      var lineHeight: CGFloat = 0

      for subview in subviews {
        let size = subview.sizeThatFits(.unspecified)

        if currentX + size.width > maxWidth, currentX > 0 {
          currentX = 0
          currentY += lineHeight + spacing
          lineHeight = 0
        }

        positions.append(CGPoint(x: currentX, y: currentY))

        lineHeight = max(lineHeight, size.height)
        currentX += size.width + spacing
        self.size.width = max(self.size.width, currentX)
      }

      size.height = currentY + lineHeight
    }
  }
}

// MARK: - My Questions View

/// View showing the current user's questions
struct MyQuestionsView: View {
  @State private var store = QAStore()
  @State private var selectedQuestion: POIQuestion?

  var body: some View {
    NavigationStack {
      Group {
        if store.isLoadingQuestions && store.myQuestions.isEmpty {
          ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if store.myQuestions.isEmpty {
          emptyView
        } else {
          questionsList
        }
      }
      .navigationTitle("My Questions")
      .task {
        await store.fetchMyQuestions(refresh: true)
      }
      .refreshable {
        await store.fetchMyQuestions(refresh: true)
      }
      .sheet(item: $selectedQuestion) { question in
        QuestionDetailView(question: question, store: store)
      }
    }
  }

  private var emptyView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "questionmark.bubble")
        .font(.system(size: 48))
        .foregroundStyle(.tertiary)

      Text("No questions yet")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("Questions you ask about places will appear here")
        .font(.subheadline)
        .foregroundStyle(.tertiary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  private var questionsList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.myQuestions) { question in
          SearchResultRow(question: question) {
            selectedQuestion = question
          }
        }
      }
      .padding()
    }
  }
}

// MARK: - My Answers View

/// View showing the current user's answers
struct MyAnswersView: View {
  @State private var store = QAStore()

  var body: some View {
    NavigationStack {
      Group {
        if store.isLoadingAnswers && store.myAnswers.isEmpty {
          ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if store.myAnswers.isEmpty {
          emptyView
        } else {
          answersList
        }
      }
      .navigationTitle("My Answers")
      .task {
        await store.fetchMyAnswers(refresh: true)
      }
      .refreshable {
        await store.fetchMyAnswers(refresh: true)
      }
    }
  }

  private var emptyView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "text.bubble")
        .font(.system(size: 48))
        .foregroundStyle(.tertiary)

      Text("No answers yet")
        .font(.headline)
        .foregroundStyle(.secondary)

      Text("Answers you provide to questions will appear here")
        .font(.subheadline)
        .foregroundStyle(.tertiary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding()
  }

  private var answersList: some View {
    ScrollView {
      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.myAnswers) { answer in
          MyAnswerRow(answer: answer)
        }
      }
      .padding()
    }
  }
}

// MARK: - My Answer Row

struct MyAnswerRow: View {
  let answer: POIAnswer

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
      }

      // Content
      Text(answer.content)
        .font(.subheadline)
        .lineLimit(3)

      // Meta
      HStack(spacing: DesignTokens.Spacing.md) {
        // Score
        HStack(spacing: 2) {
          Image(systemName: "arrow.up")
          Text("\(answer.score)")
        }
        .font(.caption)
        .foregroundStyle(answer.score > 0 ? .green : (answer.score < 0 ? .red : .secondary))

        Spacer()

        // Time
        Text(answer.timeAgo)
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .subtleCardStyle()
  }
}

// MARK: - Previews

#Preview("QA Search") {
  QASearchView()
}

#Preview("My Questions") {
  MyQuestionsView()
}

#Preview("My Answers") {
  MyAnswersView()
}
