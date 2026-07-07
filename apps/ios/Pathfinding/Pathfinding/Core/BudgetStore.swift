import Foundation
import OSLog

// MARK: - Request Types

private struct CategoryBudgetInput: Encodable {
  let categoryId: String
  let amount: Double
}

private struct SaveBudgetRequest: Encodable {
  let userId: String
  let totalBudget: Double
  let currency: String
  let categoryBudgets: [CategoryBudgetInput]
  let notes: String?
}

private struct UpdateExpenseRequest: Encodable {
  let categoryId: String?
  let amount: Double?
  let description: String?
  let date: String?
  let time: String?
  let paymentMethod: String?
  let notes: String?
}

/// Store for managing budgets and expenses
@Observable
@MainActor
final class BudgetStore {
  // MARK: - Properties

  private(set) var categories: [ExpenseCategory] = []
  private(set) var budget: ItineraryBudget?
  private(set) var expenses: [Expense] = []
  private(set) var summary: BudgetSummary?
  private(set) var dailyTrend: [DailySpending] = []
  private(set) var categoryTrend: [SpendingTrend] = []

  private(set) var isLoadingCategories = false
  private(set) var isLoadingBudget = false
  private(set) var isLoadingExpenses = false
  private(set) var isLoadingSummary = false
  private(set) var isSubmitting = false

  var errorMessage: String?

  private let apiClient = NetworkClient.shared
  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "BudgetStore")

  // MARK: - Category Operations

  /// Fetch all expense categories
  func fetchCategories() async {
    guard !isLoadingCategories else { return }
    isLoadingCategories = true
    errorMessage = nil

    do {
      let response: CategoryListResponse = try await apiClient.fetch(path: "categories")
      categories = response.data.sorted { $0.sortOrder < $1.sortOrder }
      logger.info("Fetched \(self.categories.count) expense categories")
    } catch {
      logger.error("Failed to fetch categories: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingCategories = false
  }

  /// Seed default categories if none exist
  func seedCategories() async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: EmptyResponse = try await apiClient.post(
        path: "categories/seed",
        body: EmptyBody()
      )
      await fetchCategories()
      logger.info("Seeded default categories")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to seed categories: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  private struct EmptyBody: Encodable {}
  private struct EmptyResponse: Decodable {}

  // MARK: - Budget Operations

  /// Fetch budget for an itinerary
  func fetchBudget(itineraryId: String, withCategories: Bool = false) async {
    guard !isLoadingBudget else { return }
    isLoadingBudget = true
    errorMessage = nil

    do {
      let queryItems = withCategories
        ? [URLQueryItem(name: "withCategories", value: "true")]
        : []

      let response: BudgetResponse = try await apiClient.fetch(
        path: "itineraries/\(itineraryId)/budget",
        queryItems: queryItems
      )
      budget = response.data
      logger.info("Fetched budget for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to fetch budget: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingBudget = false
  }

  /// Create or update budget for an itinerary
  func saveBudget(
    itineraryId: String,
    userId: String,
    totalBudget: Double,
    currency: String,
    categoryBudgets: [CategoryBudget],
    notes: String?
  ) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let budgetInputs = categoryBudgets.map { CategoryBudgetInput(categoryId: $0.categoryId, amount: $0.amount) }
      let request = SaveBudgetRequest(
        userId: userId,
        totalBudget: totalBudget,
        currency: currency,
        categoryBudgets: budgetInputs,
        notes: notes?.isEmpty == false ? notes : nil
      )

      let _: BudgetUpsertResponse = try await apiClient.putWithBody(
        path: "itineraries/\(itineraryId)/budget",
        body: request
      )

      // Refresh budget after saving
      await fetchBudget(itineraryId: itineraryId)

      logger.info("Saved budget for itinerary \(itineraryId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to save budget: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  /// Delete budget
  func deleteBudget(budgetId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "budgets/\(budgetId)")
      budget = nil
      logger.info("Deleted budget \(budgetId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete budget: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  // MARK: - Expense Operations

  /// Fetch expenses for an itinerary
  func fetchExpenses(itineraryId: String, categoryId: String? = nil, withCategories: Bool = true) async {
    guard !isLoadingExpenses else { return }
    isLoadingExpenses = true
    errorMessage = nil

    do {
      var queryItems: [URLQueryItem] = []
      if withCategories {
        queryItems.append(URLQueryItem(name: "withCategories", value: "true"))
      }
      if let categoryId {
        queryItems.append(URLQueryItem(name: "categoryId", value: categoryId))
      }

      let response: ExpenseListResponse = try await apiClient.fetch(
        path: "itineraries/\(itineraryId)/expenses",
        queryItems: queryItems
      )
      expenses = response.data
      logger.info("Fetched \(self.expenses.count) expenses for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to fetch expenses: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingExpenses = false
  }

  /// Create a new expense
  func createExpense(
    itineraryId: String,
    userId: String,
    categoryId: String,
    amount: Double,
    currency: String,
    description: String,
    date: String,
    time: String? = nil,
    poiId: String? = nil,
    dayNumber: Int? = nil,
    paymentMethod: PaymentMethod? = nil,
    receiptImageUrl: String? = nil,
    notes: String? = nil
  ) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [
        "userId": userId,
        "categoryId": categoryId,
        "amount": amount,
        "currency": currency,
        "description": description,
        "date": date,
      ]

      if let time { body["time"] = time }
      if let poiId { body["poiId"] = poiId }
      if let dayNumber { body["dayNumber"] = dayNumber }
      if let paymentMethod { body["paymentMethod"] = paymentMethod.rawValue }
      if let receiptImageUrl { body["receiptImageUrl"] = receiptImageUrl }
      if let notes, !notes.isEmpty { body["notes"] = notes }

      let _: ExpenseCreateResponse = try await apiClient.post(
        path: "itineraries/\(itineraryId)/expenses",
        body: body
      )

      // Refresh expenses after creating
      await fetchExpenses(itineraryId: itineraryId)

      logger.info("Created expense for itinerary \(itineraryId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to create expense: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  /// Update an expense
  func updateExpense(
    expenseId: String,
    itineraryId: String,
    categoryId: String?,
    amount: Double?,
    description: String?,
    date: String?,
    time: String?,
    paymentMethod: String?,
    notes: String?
  ) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let request = UpdateExpenseRequest(
        categoryId: categoryId,
        amount: amount,
        description: description,
        date: date,
        time: time,
        paymentMethod: paymentMethod,
        notes: notes
      )
      let _: [String: Bool] = try await apiClient.patchWithBody(
        path: "expenses/\(expenseId)",
        body: request
      )

      // Refresh expenses
      await fetchExpenses(itineraryId: itineraryId)

      logger.info("Updated expense \(expenseId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update expense: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  /// Delete an expense
  func deleteExpense(expenseId: String, itineraryId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "expenses/\(expenseId)")

      // Refresh expenses
      await fetchExpenses(itineraryId: itineraryId)

      logger.info("Deleted expense \(expenseId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete expense: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSubmitting = false
      return false
    }
  }

  // MARK: - Summary & Analytics

  /// Fetch budget summary with spending breakdown
  func fetchSummary(itineraryId: String) async {
    guard !isLoadingSummary else { return }
    isLoadingSummary = true
    errorMessage = nil

    do {
      let response: BudgetSummaryResponse = try await apiClient.fetch(
        path: "itineraries/\(itineraryId)/budget/summary"
      )
      summary = response.data
      dailyTrend = response.data.dailyTrend
      logger.info("Fetched budget summary for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to fetch budget summary: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingSummary = false
  }

  /// Fetch spending trend data
  func fetchSpendingTrend(itineraryId: String, groupBy: String = "day") async {
    do {
      let response: SpendingTrendResponse = try await apiClient.fetch(
        path: "itineraries/\(itineraryId)/budget/trend",
        queryItems: [URLQueryItem(name: "groupBy", value: groupBy)]
      )

      if groupBy == "category" {
        categoryTrend = response.data
      } else {
        dailyTrend = response.data.compactMap { trend in
          guard let date = trend.date else { return nil }
          return DailySpending(date: date, amount: trend.amount)
        }
      }

      logger.info("Fetched spending trend for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to fetch spending trend: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }
  }

  // MARK: - Helpers

  /// Load all budget data for an itinerary
  func loadAll(itineraryId: String) async {
    async let categoriesTask: () = fetchCategories()
    async let budgetTask: () = fetchBudget(itineraryId: itineraryId)
    async let expensesTask: () = fetchExpenses(itineraryId: itineraryId)
    async let summaryTask: () = fetchSummary(itineraryId: itineraryId)

    _ = await (categoriesTask, budgetTask, expensesTask, summaryTask)
  }

  /// Clear all data
  func clear() {
    categories = []
    budget = nil
    expenses = []
    summary = nil
    dailyTrend = []
    categoryTrend = []
    errorMessage = nil
  }

  /// Total spent amount
  var totalSpent: Double {
    expenses.reduce(0) { $0 + $1.amount }
  }

  /// Remaining budget
  var remainingBudget: Double {
    guard let budget else { return 0 }
    return budget.totalBudget - totalSpent
  }

  /// Whether budget is exceeded
  var isOverBudget: Bool {
    guard let budget else { return false }
    return totalSpent > budget.totalBudget
  }

  /// Budget usage percentage (0-100)
  var budgetUsagePercent: Double {
    guard let budget, budget.totalBudget > 0 else { return 0 }
    return (totalSpent / budget.totalBudget) * 100
  }
}
