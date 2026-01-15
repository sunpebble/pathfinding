import Foundation
import OSLog

/// Store for managing POI Q&A questions and answers
@Observable
@MainActor
final class QAStore {
  // MARK: - Properties

  private(set) var questions: [POIQuestion] = []
  private(set) var currentQuestion: POIQuestion?
  private(set) var answers: [POIAnswer] = []
  private(set) var myQuestions: [POIQuestion] = []
  private(set) var myAnswers: [POIAnswer] = []
  private(set) var searchResults: [POIQuestion] = []

  private(set) var isLoadingQuestions = false
  private(set) var isLoadingAnswers = false
  private(set) var isLoadingSearch = false
  private(set) var isSubmitting = false

  private(set) var questionsPage = 1
  private(set) var questionsTotalPages = 1
  private(set) var answersPage = 1
  private(set) var answersTotalPages = 1

  var errorMessage: String?

  private let apiClient = APIClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "QAStore")

  // MARK: - Question Operations

  /// Fetch questions for a POI
  func fetchQuestions(
    poiId: String,
    page: Int = 1,
    sortBy: QuestionSortOption = .newest,
    status: POIQuestion.QuestionStatus? = nil,
    refresh: Bool = false
  ) async {
    if refresh {
      questions = []
      questionsPage = 1
    }

    guard !isLoadingQuestions else { return }
    isLoadingQuestions = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "pageSize", value: "20"),
        URLQueryItem(name: "sortBy", value: sortBy.rawValue),
      ]

      if let status {
        queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
      }

      let response: QuestionListResponse = try await apiClient.fetch(
        path: "pois/\(poiId)/questions",
        queryItems: queryItems
      )

      if refresh || page == 1 {
        questions = response.data
      } else {
        questions.append(contentsOf: response.data)
      }

      questionsPage = response.meta?.page ?? page
      questionsTotalPages = response.meta?.totalPages ?? 1

      logger.info("Fetched \(response.data.count) questions for POI \(poiId)")
    } catch {
      logger.error("Failed to fetch questions: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingQuestions = false
  }

  /// Get a single question by ID
  func fetchQuestion(questionId: String) async {
    guard !isLoadingQuestions else { return }
    isLoadingQuestions = true
    errorMessage = nil

    do {
      let response: QuestionResponse = try await apiClient.fetch(
        path: "pois/questions/\(questionId)"
      )

      if let question = response.data {
        currentQuestion = question
        logger.info("Fetched question \(questionId)")
      }
    } catch {
      logger.error("Failed to fetch question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingQuestions = false
  }

  /// Search questions
  func searchQuestions(query: String, poiId: String? = nil, limit: Int = 20) async {
    guard !isLoadingSearch else { return }
    isLoadingSearch = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "q", value: query),
        URLQueryItem(name: "limit", value: String(limit)),
      ]

      if let poiId {
        queryItems.append(URLQueryItem(name: "poiId", value: poiId))
      }

      let response: QuestionSearchResponse = try await apiClient.fetch(
        path: "pois/questions/search",
        queryItems: queryItems
      )

      searchResults = response.data
      logger.info("Found \(response.data.count) questions for query '\(query)'")
    } catch {
      logger.error("Failed to search questions: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingSearch = false
  }

  /// Get question count for a POI
  func getQuestionCount(poiId: String) async -> Int {
    do {
      let response: QuestionCountResponse = try await apiClient.fetch(
        path: "pois/\(poiId)/questions/count"
      )
      return response.data.count
    } catch {
      logger.error("Failed to get question count: \(error.localizedDescription)")
      return 0
    }
  }

  /// Fetch user's own questions
  func fetchMyQuestions(page: Int = 1, refresh: Bool = false) async {
    if refresh {
      myQuestions = []
    }

    do {
      let response: QuestionListResponse = try await apiClient.fetch(
        path: "pois/me/questions",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )

      if refresh || page == 1 {
        myQuestions = response.data
      } else {
        myQuestions.append(contentsOf: response.data)
      }

      logger.info("Fetched \(response.data.count) of my questions")
    } catch {
      logger.error("Failed to fetch my questions: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Create a new question
  func createQuestion(poiId: String, title: String, content: String, tags: [String]? = nil) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [
        "title": title,
        "content": content,
      ]

      if let tags, !tags.isEmpty {
        body["tags"] = tags
      }

      let _: QuestionResponse = try await apiClient.post(
        path: "pois/\(poiId)/questions",
        body: body
      )

      // Refresh questions after creating
      await fetchQuestions(poiId: poiId, refresh: true)

      logger.info("Created question for POI \(poiId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to create question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Update a question
  func updateQuestion(questionId: String, title: String?, content: String?, tags: [String]?) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [:]

      if let title {
        body["title"] = title
      }
      if let content {
        body["content"] = content
      }
      if let tags {
        body["tags"] = tags
      }

      let response: QuestionResponse = try await apiClient.patch(
        path: "pois/questions/\(questionId)",
        body: body
      )

      if let updated = response.data {
        currentQuestion = updated
        // Update in list if present
        if let index = questions.firstIndex(where: { $0.id == questionId }) {
          questions[index] = updated
        }
      }

      logger.info("Updated question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Delete a question
  func deleteQuestion(questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "pois/questions/\(questionId)")

      // Remove from lists
      questions.removeAll { $0.id == questionId }
      myQuestions.removeAll { $0.id == questionId }
      if currentQuestion?.id == questionId {
        currentQuestion = nil
      }

      logger.info("Deleted question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Vote on a question
  func voteQuestion(questionId: String, voteType: VoteType) async -> VoteType? {
    do {
      let response: VoteResponse = try await apiClient.post(
        path: "pois/questions/\(questionId)/vote",
        body: ["voteType": voteType.rawValue]
      )

      // Update local state
      let newVote = response.data.voteType

      if var question = currentQuestion, question.id == questionId {
        question.userVote = newVote
        currentQuestion = question
      }

      if let index = questions.firstIndex(where: { $0.id == questionId }) {
        var updated = questions[index]
        updated.userVote = newVote
        questions[index] = updated
      }

      logger.info("Voted on question \(questionId): \(response.data.action)")
      return newVote
    } catch {
      logger.error("Failed to vote on question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return nil
    }
  }

  /// Close a question
  func closeQuestion(questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true

    do {
      let _: EmptyResponse = try await apiClient.post(
        path: "pois/questions/\(questionId)/close",
        body: [String: String]()
      )

      // Refresh question
      await fetchQuestion(questionId: questionId)

      logger.info("Closed question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to close question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Reopen a question
  func reopenQuestion(questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true

    do {
      let _: EmptyResponse = try await apiClient.post(
        path: "pois/questions/\(questionId)/reopen",
        body: [String: String]()
      )

      // Refresh question
      await fetchQuestion(questionId: questionId)

      logger.info("Reopened question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to reopen question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Report a question
  func reportQuestion(questionId: String, reason: QAReportReason, description: String?) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: String] = ["reason": reason.rawValue]
      if let description, !description.isEmpty {
        body["description"] = description
      }

      let _: EmptyResponse = try await apiClient.post(
        path: "pois/questions/\(questionId)/report",
        body: body
      )

      logger.info("Reported question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to report question: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  // MARK: - Answer Operations

  /// Fetch answers for a question
  func fetchAnswers(
    questionId: String,
    page: Int = 1,
    sortBy: AnswerSortOption = .mostUpvoted,
    refresh: Bool = false
  ) async {
    if refresh {
      answers = []
      answersPage = 1
    }

    guard !isLoadingAnswers else { return }
    isLoadingAnswers = true
    errorMessage = nil

    do {
      let response: AnswerListResponse = try await apiClient.fetch(
        path: "pois/questions/\(questionId)/answers",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
          URLQueryItem(name: "sortBy", value: sortBy.rawValue),
        ]
      )

      if refresh || page == 1 {
        answers = response.data
      } else {
        answers.append(contentsOf: response.data)
      }

      answersPage = response.meta?.page ?? page
      answersTotalPages = response.meta?.totalPages ?? 1

      logger.info("Fetched \(response.data.count) answers for question \(questionId)")
    } catch {
      logger.error("Failed to fetch answers: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingAnswers = false
  }

  /// Fetch user's own answers
  func fetchMyAnswers(page: Int = 1, refresh: Bool = false) async {
    if refresh {
      myAnswers = []
    }

    do {
      let response: AnswerListResponse = try await apiClient.fetch(
        path: "pois/me/answers",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )

      if refresh || page == 1 {
        myAnswers = response.data
      } else {
        myAnswers.append(contentsOf: response.data)
      }

      logger.info("Fetched \(response.data.count) of my answers")
    } catch {
      logger.error("Failed to fetch my answers: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Create an answer
  func createAnswer(questionId: String, content: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: AnswerResponse = try await apiClient.post(
        path: "pois/questions/\(questionId)/answers",
        body: ["content": content]
      )

      // Refresh answers
      await fetchAnswers(questionId: questionId, refresh: true)

      // Refresh question to update answer count
      await fetchQuestion(questionId: questionId)

      logger.info("Created answer for question \(questionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to create answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Update an answer
  func updateAnswer(answerId: String, content: String, questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: AnswerResponse = try await apiClient.patch(
        path: "pois/answers/\(answerId)",
        body: ["content": content]
      )

      // Refresh answers
      await fetchAnswers(questionId: questionId, refresh: true)

      logger.info("Updated answer \(answerId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Delete an answer
  func deleteAnswer(answerId: String, questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "pois/answers/\(answerId)")

      // Remove from list
      answers.removeAll { $0.id == answerId }

      // Refresh question to update answer count
      await fetchQuestion(questionId: questionId)

      logger.info("Deleted answer \(answerId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Vote on an answer
  func voteAnswer(answerId: String, voteType: VoteType) async -> VoteType? {
    do {
      let response: VoteResponse = try await apiClient.post(
        path: "pois/answers/\(answerId)/vote",
        body: ["voteType": voteType.rawValue]
      )

      // Update local state
      let newVote = response.data.voteType

      if let index = answers.firstIndex(where: { $0.id == answerId }) {
        var updated = answers[index]
        updated.userVote = newVote
        answers[index] = updated
      }

      logger.info("Voted on answer \(answerId): \(response.data.action)")
      return newVote
    } catch {
      logger.error("Failed to vote on answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return nil
    }
  }

  /// Mark an answer as best
  func markBestAnswer(answerId: String, questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true

    do {
      let _: EmptyResponse = try await apiClient.post(
        path: "pois/answers/\(answerId)/best",
        body: [String: String]()
      )

      // Refresh answers and question
      await fetchAnswers(questionId: questionId, refresh: true)
      await fetchQuestion(questionId: questionId)

      logger.info("Marked answer \(answerId) as best")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to mark best answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Unmark an answer as best
  func unmarkBestAnswer(answerId: String, questionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true

    do {
      try await apiClient.delete(path: "pois/answers/\(answerId)/best")

      // Refresh answers and question
      await fetchAnswers(questionId: questionId, refresh: true)
      await fetchQuestion(questionId: questionId)

      logger.info("Unmarked answer \(answerId) as best")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to unmark best answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Report an answer
  func reportAnswer(answerId: String, reason: QAReportReason, description: String?) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: String] = ["reason": reason.rawValue]
      if let description, !description.isEmpty {
        body["description"] = description
      }

      let _: EmptyResponse = try await apiClient.post(
        path: "pois/answers/\(answerId)/report",
        body: body
      )

      logger.info("Reported answer \(answerId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to report answer: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  // MARK: - Helpers

  /// Clear search results
  func clearSearchResults() {
    searchResults = []
  }

  /// Clear all data
  func clear() {
    questions = []
    currentQuestion = nil
    answers = []
    myQuestions = []
    myAnswers = []
    searchResults = []
    questionsPage = 1
    answersPage = 1
    errorMessage = nil
  }

  /// Load more questions if available
  func loadMoreQuestions(poiId: String, sortBy: QuestionSortOption = .newest) async {
    guard questionsPage < questionsTotalPages else { return }
    await fetchQuestions(poiId: poiId, page: questionsPage + 1, sortBy: sortBy)
  }

  /// Load more answers if available
  func loadMoreAnswers(questionId: String, sortBy: AnswerSortOption = .mostUpvoted) async {
    guard answersPage < answersTotalPages else { return }
    await fetchAnswers(questionId: questionId, page: answersPage + 1, sortBy: sortBy)
  }
}
