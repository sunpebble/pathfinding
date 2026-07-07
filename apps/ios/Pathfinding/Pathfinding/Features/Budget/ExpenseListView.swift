import SwiftUI

/// Full expense list view with filtering and sorting
struct ExpenseListView: View {
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @State private var selectedCategory: ExpenseCategory?
  @State private var sortOrder: SortOrder = .dateDesc
  @State private var showAddExpense = false
  @State private var expenseToEdit: Expense?
  @State private var expenseToDelete: Expense?
  @State private var showDeleteConfirmation = false

  enum SortOrder: String, CaseIterable {
    case dateDesc = "expense.sort.date_desc"
    case dateAsc = "expense.sort.date_asc"
    case amountDesc = "expense.sort.amount_desc"
    case amountAsc = "expense.sort.amount_asc"

    var title: String { rawValue.localized }
  }

  private var filteredExpenses: [Expense] {
    var expenses = budgetStore.expenses

    // Filter by category
    if let category = selectedCategory {
      expenses = expenses.filter { $0.categoryId == category.id }
    }

    // Sort
    switch sortOrder {
    case .dateDesc:
      expenses.sort { $0.date > $1.date }
    case .dateAsc:
      expenses.sort { $0.date < $1.date }
    case .amountDesc:
      expenses.sort { $0.amount > $1.amount }
    case .amountAsc:
      expenses.sort { $0.amount < $1.amount }
    }

    return expenses
  }

  private var totalAmount: Double {
    filteredExpenses.reduce(0) { $0 + $1.amount }
  }

  var body: some View {
    VStack(spacing: 0) {
      // Filter and sort bar
      filterBar

      // Expense list
      if filteredExpenses.isEmpty {
        emptyStateView
      } else {
        expenseList
      }
    }
    .background(DesignTokens.Colors.backgroundGrouped)
    .navigationTitle("expense.list.title".localized)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          showAddExpense = true
        } label: {
          Image(systemName: "plus")
        }
      }
    }
    .sheet(isPresented: $showAddExpense) {
      AddExpenseView(
        itineraryId: itineraryId,
        budgetStore: budgetStore
      )
    }
    .sheet(item: $expenseToEdit) { expense in
      EditExpenseView(
        expense: expense,
        itineraryId: itineraryId,
        budgetStore: budgetStore
      )
    }
    .alert("expense.delete.title".localized, isPresented: $showDeleteConfirmation) {
      Button("common.cancel".localized, role: .cancel) {
        expenseToDelete = nil
      }
      Button("common.delete".localized, role: .destructive) {
        if let expense = expenseToDelete {
          Task {
            await budgetStore.deleteExpense(expenseId: expense.id, itineraryId: itineraryId)
          }
        }
        expenseToDelete = nil
      }
    } message: {
      if let expense = expenseToDelete {
        Text("expense.delete.message".localized(expense.description))
      }
    }
    .task {
      if budgetStore.categories.isEmpty {
        await budgetStore.fetchCategories()
      }
    }
  }

  // MARK: - Filter Bar

  private var filterBar: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // Category filter
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          // All categories button
          CategoryFilterChip(
            name: "common.all".localized,
            icon: "square.grid.2x2",
            color: .indigo,
            isSelected: selectedCategory == nil
          ) {
            selectedCategory = nil
          }

          // Category chips
          ForEach(budgetStore.categories) { category in
            CategoryFilterChip(
              name: category.name,
              icon: category.sfSymbol,
              color: category.swiftUIColor,
              isSelected: selectedCategory?.id == category.id
            ) {
              selectedCategory = category
            }
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
      }

      // Sort and total
      HStack {
        // Sort picker
        Menu {
          ForEach(SortOrder.allCases, id: \.self) { order in
            Button {
              sortOrder = order
            } label: {
              HStack {
                Text(order.title)
                if sortOrder == order {
                  Image(systemName: "checkmark")
                }
              }
            }
          }
        } label: {
          HStack(spacing: 4) {
            Image(systemName: "arrow.up.arrow.down")
            Text(sortOrder.title)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        Spacer()

        // Total
        Text("expense.list.summary".localized(filteredExpenses.count, formatAmount(totalAmount)))
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
    .background(DesignTokens.Colors.cardBackground)
  }

  // MARK: - Expense List

  private var expenseList: some View {
    List {
      ForEach(groupedExpenses, id: \.date) { group in
        Section {
          ForEach(group.expenses) { expense in
            ExpenseListRow(expense: expense)
              .contentShape(Rectangle())
              .onTapGesture {
                expenseToEdit = expense
              }
              .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                Button(role: .destructive) {
                  expenseToDelete = expense
                  showDeleteConfirmation = true
                } label: {
                  Label("common.delete".localized, systemImage: "trash")
                }

                Button {
                  expenseToEdit = expense
                } label: {
                  Label("common.edit".localized, systemImage: "pencil")
                }
                .tint(.orange)
              }
          }
        } header: {
          HStack {
            Text(formatSectionDate(group.date))
            Spacer()
            Text(formatAmount(group.total))
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .listStyle(.insetGrouped)
  }

  // MARK: - Empty State

  private var emptyStateView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Spacer()

      Image(systemName: "receipt")
        .font(.system(size: 60))
        .foregroundStyle(.tertiary)

      Text("expense.empty".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      if selectedCategory != nil {
        Text("expense.list.empty_category".localized)
          .font(.subheadline)
          .foregroundStyle(.tertiary)

        Button("expense.view_all".localized) {
          selectedCategory = nil
        }
        .buttonStyle(.glass)
      } else {
        Button("expense.add".localized) {
          showAddExpense = true
        }
        .buttonStyle(.glassProminent)
      }

      Spacer()
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Grouped Expenses

  private struct ExpenseGroup {
    let date: String
    let expenses: [Expense]
    var total: Double {
      expenses.reduce(0) { $0 + $1.amount }
    }
  }

  private var groupedExpenses: [ExpenseGroup] {
    let grouped = Dictionary(grouping: filteredExpenses) { $0.date }
    return grouped.map { ExpenseGroup(date: $0.key, expenses: $0.value) }
      .sorted { $0.date > $1.date }
  }

  // MARK: - Helpers

  private func formatAmount(_ amount: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = budgetStore.budget?.currency ?? "CNY"
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount)) ?? "¥\(Int(amount))"
  }

  private func formatSectionDate(_ dateStr: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    guard let date = formatter.date(from: dateStr) else { return dateStr }

    let displayFormatter = DateFormatter()
    displayFormatter.dateFormat = "expense.list.date_format".localized
    displayFormatter.locale = LocalizationManager.shared.currentLocale
    return displayFormatter.string(from: date)
  }
}

// MARK: - Category Filter Chip

struct CategoryFilterChip: View {
  let name: String
  let icon: String
  let color: Color
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 6) {
        Image(systemName: icon)
          .font(.caption)
        Text(name)
          .font(.caption)
          .fontWeight(.medium)
      }
      .foregroundStyle(isSelected ? .white : color)
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      .background(isSelected ? color : color.opacity(0.15))
      .clipShape(Capsule())
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Expense List Row

struct ExpenseListRow: View {
  let expense: Expense

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Category icon
      if let category = expense.category {
        Image(systemName: category.sfSymbol)
          .foregroundStyle(category.swiftUIColor)
          .frame(width: 36, height: 36)
          .background(category.swiftUIColor.opacity(0.15))
          .clipShape(Circle())
      } else {
        Image(systemName: "questionmark.circle")
          .foregroundStyle(.secondary)
          .frame(width: 36, height: 36)
          .background(Color(.systemGray5))
          .clipShape(Circle())
      }

      // Description and details
      VStack(alignment: .leading, spacing: 4) {
        Text(expense.description)
          .font(.subheadline)
          .fontWeight(.medium)
          .lineLimit(1)

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let time = expense.time {
            Label(time, systemImage: "clock")
          }

          if let paymentMethod = expense.paymentMethod {
            Label(paymentMethod, systemImage: expense.paymentMethodIcon)
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }

      Spacer()

      // Amount
      Text(expense.formattedAmount)
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundStyle(.primary)
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    ExpenseListView(
      itineraryId: "test-itinerary-id",
      budgetStore: BudgetStore()
    )
  }
}
