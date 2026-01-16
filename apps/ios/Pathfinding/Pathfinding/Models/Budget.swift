import Foundation
import SwiftUI

// MARK: - Expense Category Model

/// Expense category model for budget tracking
struct ExpenseCategory: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let nameEn: String
  let icon: String
  let color: String
  let sortOrder: Int
  let isSystem: Bool

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case nameEn = "name_en"
    case icon
    case color
    case sortOrder = "sort_order"
    case isSystem = "is_system"
  }

  // MARK: - Computed Properties

  /// SwiftUI Color from hex string
  var swiftUIColor: Color {
    Color(hex: color) ?? .gray
  }

  /// SF Symbol name (convert from iOS icon names if needed)
  var sfSymbol: String {
    icon
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ExpenseCategory, rhs: ExpenseCategory) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Category Budget Model

/// Budget allocation for a specific category
struct CategoryBudget: Codable, Hashable {
  let categoryId: String
  let amount: Double

  enum CodingKeys: String, CodingKey {
    case categoryId = "category_id"
    case amount
  }
}

// MARK: - Itinerary Budget Model

/// Budget settings for an itinerary
struct ItineraryBudget: Codable, Identifiable, Hashable {
  let id: String
  let itineraryId: String
  let userId: String
  let totalBudget: Double
  let currency: String
  let categoryBudgets: [CategoryBudget]
  let notes: String?
  let createdAt: Double
  let updatedAt: Double

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case itineraryId = "itinerary_id"
    case userId = "user_id"
    case totalBudget = "total_budget"
    case currency
    case categoryBudgets = "category_budgets"
    case notes
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var updatedDate: Date {
    Date(timeIntervalSince1970: updatedAt / 1000)
  }

  /// Get budget amount for a specific category
  func budgetAmount(for categoryId: String) -> Double {
    categoryBudgets.first { $0.categoryId == categoryId }?.amount ?? 0
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ItineraryBudget, rhs: ItineraryBudget) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Expense Model

/// Individual expense record
struct Expense: Codable, Identifiable, Hashable {
  let id: String
  let itineraryId: String
  let userId: String
  let categoryId: String
  let amount: Double
  let currency: String
  let description: String
  let date: String
  let time: String?
  let poiId: String?
  let dayNumber: Int?
  let paymentMethod: String?
  let receiptImageUrl: String?
  let notes: String?
  let createdAt: Double
  let updatedAt: Double

  // Enriched field
  var category: ExpenseCategory?

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case itineraryId = "itinerary_id"
    case userId = "user_id"
    case categoryId = "category_id"
    case amount
    case currency
    case description
    case date
    case time
    case poiId = "poi_id"
    case dayNumber = "day_number"
    case paymentMethod = "payment_method"
    case receiptImageUrl = "receipt_image_url"
    case notes
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case category
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var expenseDate: Date? {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: date)
  }

  var formattedAmount: String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    return formatter.string(from: NSNumber(value: amount)) ?? "\(currency) \(amount)"
  }

  var paymentMethodIcon: String {
    switch paymentMethod?.lowercased() {
    case "cash", "现金":
      return "banknote.fill"
    case "wechat", "微信":
      return "message.fill"
    case "alipay", "支付宝":
      return "a.circle.fill"
    case "credit_card", "信用卡":
      return "creditcard.fill"
    case "debit_card", "借记卡":
      return "creditcard"
    default:
      return "creditcard.fill"
    }
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: Expense, rhs: Expense) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Budget Summary Model

/// Summary of budget vs actual spending
struct BudgetSummary: Codable {
  let budget: BudgetInfo?
  let totalSpent: Double
  let remaining: Double
  let percentUsed: Double
  let isOverBudget: Bool
  let expenseCount: Int
  let spendingByCategory: [CategorySpending]
  let dailyTrend: [DailySpending]

  enum CodingKeys: String, CodingKey {
    case budget
    case totalSpent = "total_spent"
    case remaining
    case percentUsed = "percent_used"
    case isOverBudget = "is_over_budget"
    case expenseCount = "expense_count"
    case spendingByCategory = "spending_by_category"
    case dailyTrend = "daily_trend"
  }

  struct BudgetInfo: Codable {
    let total: Double
    let currency: String
    let notes: String?
  }
}

/// Spending breakdown by category
struct CategorySpending: Codable, Identifiable {
  let category: ExpenseCategory
  let budgetAmount: Double
  let spent: Double
  let remaining: Double
  let percentUsed: Double
  let isOverBudget: Bool
  let expenseCount: Int

  var id: String { category.id }

  enum CodingKeys: String, CodingKey {
    case category
    case budgetAmount = "budget_amount"
    case spent
    case remaining
    case percentUsed = "percent_used"
    case isOverBudget = "is_over_budget"
    case expenseCount = "expense_count"
  }

  /// Progress value clamped to 0-1 range
  var progressValue: Double {
    min(max(percentUsed / 100, 0), 1)
  }
}

/// Daily spending for trend charts
struct DailySpending: Codable, Identifiable {
  let date: String
  let amount: Double

  var id: String { date }

  var dateValue: Date? {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: date)
  }
}

// MARK: - Spending Trend Model

/// Spending trend data for charts
struct SpendingTrend: Codable {
  let category: ExpenseCategory?
  let amount: Double
  let date: String?

  // For category-based trend (pie chart)
  var categoryId: String? { category?.id }

  // For date-based trend (line chart)
  var dateValue: Date? {
    guard let date else { return nil }
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: date)
  }
}

// MARK: - API Response Types

/// Category list response
struct CategoryListResponse: Codable {
  let success: Bool
  let data: [ExpenseCategory]
}

/// Budget response
struct BudgetResponse: Codable {
  let success: Bool
  let data: ItineraryBudget?
}

/// Budget upsert response
struct BudgetUpsertResponse: Codable {
  let success: Bool
  let data: BudgetId?

  struct BudgetId: Codable {
    let id: String
  }
}

/// Expense list response
struct ExpenseListResponse: Codable {
  let success: Bool
  let data: [Expense]
}

/// Single expense response
struct ExpenseResponse: Codable {
  let success: Bool
  let data: Expense?
}

/// Expense create response
struct ExpenseCreateResponse: Codable {
  let success: Bool
  let data: ExpenseId?

  struct ExpenseId: Codable {
    let id: String
  }
}

/// Budget summary response
struct BudgetSummaryResponse: Codable {
  let success: Bool
  let data: BudgetSummary
}

/// Spending trend response (array of trend items)
struct SpendingTrendResponse: Codable {
  let success: Bool
  let data: [SpendingTrend]
}

// MARK: - Payment Method

enum PaymentMethod: String, CaseIterable, Codable {
  case cash = "cash"
  case wechat = "wechat"
  case alipay = "alipay"
  case creditCard = "credit_card"
  case debitCard = "debit_card"
  case other = "other"

  var displayName: String {
    switch self {
    case .cash:
      return "现金"
    case .wechat:
      return "微信支付"
    case .alipay:
      return "支付宝"
    case .creditCard:
      return "信用卡"
    case .debitCard:
      return "借记卡"
    case .other:
      return "其他"
    }
  }

  var icon: String {
    switch self {
    case .cash:
      return "banknote.fill"
    case .wechat:
      return "message.fill"
    case .alipay:
      return "a.circle.fill"
    case .creditCard:
      return "creditcard.fill"
    case .debitCard:
      return "creditcard"
    case .other:
      return "ellipsis.circle.fill"
    }
  }
}

