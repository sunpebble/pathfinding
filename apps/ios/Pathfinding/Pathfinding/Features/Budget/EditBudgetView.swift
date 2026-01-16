import SwiftUI

/// Form view for editing budget settings
struct EditBudgetView: View {
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @Environment(\.dismiss) private var dismiss

  @State private var totalBudget: String = ""
  @State private var currency: String = "CNY"
  @State private var categoryBudgets: [String: String] = [:] // categoryId -> amount string
  @State private var notes: String = ""
  @State private var showCurrencyPicker = false

  private let currencies = ["CNY", "USD", "EUR", "JPY", "GBP", "HKD", "TWD", "KRW", "THB", "SGD"]

  private var isValid: Bool {
    guard let total = Double(totalBudget), total > 0 else { return false }
    return true
  }

  private var totalCategoryBudget: Double {
    categoryBudgets.values.compactMap { Double($0) }.reduce(0, +)
  }

  private var remainingToAllocate: Double {
    guard let total = Double(totalBudget) else { return 0 }
    return total - totalCategoryBudget
  }

  var body: some View {
    NavigationStack {
      Form {
        // Total Budget Section
        Section {
          HStack {
            Button {
              showCurrencyPicker = true
            } label: {
              HStack(spacing: 4) {
                Text(currency)
                  .font(.headline)
                Image(systemName: "chevron.down")
                  .font(.caption)
              }
              .foregroundStyle(.secondary)
            }

            TextField("0", text: $totalBudget)
              .keyboardType(.numberPad)
              .font(.system(size: 36, weight: .bold))
              .multilineTextAlignment(.trailing)
          }
          .padding(.vertical, DesignTokens.Spacing.sm)
        } header: {
          Text("总预算")
        } footer: {
          Text("设置此次行程的总预算金额")
        }

        // Category Budgets Section
        Section {
          ForEach(budgetStore.categories) { category in
            CategoryBudgetRow(
              category: category,
              amount: binding(for: category.id),
              currency: currency
            )
          }

          // Summary row
          HStack {
            Text("已分配")
              .foregroundStyle(.secondary)
            Spacer()
            Text(formatAmount(totalCategoryBudget))
              .fontWeight(.medium)
          }

          HStack {
            Text("未分配")
              .foregroundStyle(remainingToAllocate < 0 ? .red : .secondary)
            Spacer()
            Text(formatAmount(remainingToAllocate))
              .fontWeight(.medium)
              .foregroundStyle(remainingToAllocate < 0 ? .red : .primary)
          }
        } header: {
          Text("分类预算")
        } footer: {
          if remainingToAllocate < 0 {
            Text("分类预算总和超过了总预算")
              .foregroundStyle(.red)
          } else {
            Text("为每个分类设置预算上限（可选）")
          }
        }

        // Notes Section
        Section {
          TextField("预算备注（可选）", text: $notes, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("备注")
        }

        // Quick Allocation Section
        Section {
          Button {
            autoAllocateBudget()
          } label: {
            Label("自动分配预算", systemImage: "wand.and.stars")
          }

          Button {
            clearCategoryBudgets()
          } label: {
            Label("清空分类预算", systemImage: "trash")
              .foregroundStyle(.red)
          }
        } header: {
          Text("快捷操作")
        }
      }
      .navigationTitle(budgetStore.budget == nil ? "设置预算" : "编辑预算")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            saveBudget()
          }
          .disabled(!isValid || budgetStore.isSubmitting)
        }
      }
      .sheet(isPresented: $showCurrencyPicker) {
        CurrencyPickerView(
          currencies: currencies,
          selectedCurrency: $currency
        )
      }
      .onAppear {
        loadBudgetData()
      }
      .task {
        if budgetStore.categories.isEmpty {
          await budgetStore.fetchCategories()
        }
      }
    }
  }

  // MARK: - Helpers

  private func binding(for categoryId: String) -> Binding<String> {
    Binding(
      get: { categoryBudgets[categoryId] ?? "" },
      set: { categoryBudgets[categoryId] = $0 }
    )
  }

  private func loadBudgetData() {
    if let budget = budgetStore.budget {
      totalBudget = String(format: "%.0f", budget.totalBudget)
      currency = budget.currency
      notes = budget.notes ?? ""

      for cb in budget.categoryBudgets {
        categoryBudgets[cb.categoryId] = String(format: "%.0f", cb.amount)
      }
    }
  }

  private func saveBudget() {
    guard let total = Double(totalBudget) else { return }

    let categoryBudgetsList = categoryBudgets.compactMap { (categoryId, amountStr) -> CategoryBudget? in
      guard let amount = Double(amountStr), amount > 0 else { return nil }
      return CategoryBudget(categoryId: categoryId, amount: amount)
    }

    Task {
      let success = await budgetStore.saveBudget(
        itineraryId: itineraryId,
        userId: "current-user", // TODO: Get from AuthManager
        totalBudget: total,
        currency: currency,
        categoryBudgets: categoryBudgetsList,
        notes: notes.isEmpty ? nil : notes
      )

      if success {
        // Refresh summary after saving
        await budgetStore.fetchSummary(itineraryId: itineraryId)
        dismiss()
      }
    }
  }

  private func autoAllocateBudget() {
    guard let total = Double(totalBudget), total > 0 else { return }

    // Default allocation percentages
    let allocations: [String: Double] = [
      "Transportation": 0.25,
      "Accommodation": 0.30,
      "Food & Dining": 0.20,
      "Tickets & Entrance": 0.10,
      "Shopping": 0.10,
      "Entertainment": 0.03,
      "Other": 0.02,
    ]

    for category in budgetStore.categories {
      let percentage = allocations[category.nameEn] ?? 0.05
      let amount = total * percentage
      categoryBudgets[category.id] = String(format: "%.0f", amount)
    }
  }

  private func clearCategoryBudgets() {
    categoryBudgets.removeAll()
  }

  private func formatAmount(_ amount: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount)) ?? "\(currency) \(Int(amount))"
  }
}

// MARK: - Category Budget Row

struct CategoryBudgetRow: View {
  let category: ExpenseCategory
  @Binding var amount: String
  let currency: String

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Category icon
      Image(systemName: category.sfSymbol)
        .foregroundStyle(category.swiftUIColor)
        .frame(width: 28, height: 28)
        .background(category.swiftUIColor.opacity(0.15))
        .clipShape(Circle())

      // Category name
      Text(category.name)
        .font(.subheadline)

      Spacer()

      // Amount input
      HStack(spacing: 4) {
        Text(currencySymbol)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        TextField("0", text: $amount)
          .keyboardType(.numberPad)
          .font(.subheadline)
          .fontWeight(.medium)
          .multilineTextAlignment(.trailing)
          .frame(width: 80)
      }
    }
  }

  private var currencySymbol: String {
    let locale = Locale(identifier: "en_US")
    return locale.currencySymbol ?? currency
  }
}

// MARK: - Currency Picker View

struct CurrencyPickerView: View {
  let currencies: [String]
  @Binding var selectedCurrency: String

  @Environment(\.dismiss) private var dismiss

  private let currencyNames: [String: String] = [
    "CNY": "人民币",
    "USD": "美元",
    "EUR": "欧元",
    "JPY": "日元",
    "GBP": "英镑",
    "HKD": "港币",
    "TWD": "新台币",
    "KRW": "韩元",
    "THB": "泰铢",
    "SGD": "新加坡元",
  ]

  private let currencySymbols: [String: String] = [
    "CNY": "¥",
    "USD": "$",
    "EUR": "€",
    "JPY": "¥",
    "GBP": "£",
    "HKD": "HK$",
    "TWD": "NT$",
    "KRW": "₩",
    "THB": "฿",
    "SGD": "S$",
  ]

  var body: some View {
    NavigationStack {
      List {
        ForEach(currencies, id: \.self) { (currency: String) in
          Button {
            selectedCurrency = currency
            dismiss()
          } label: {
            HStack {
              Text(currencySymbols[currency] ?? currency)
                .font(.headline)
                .frame(width: 40, alignment: .leading)

              VStack(alignment: .leading, spacing: 2) {
                Text(currency)
                  .font(.subheadline)
                  .fontWeight(.medium)
                Text(currencyNames[currency] ?? "")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }

              Spacer()

              if selectedCurrency == currency {
                Image(systemName: "checkmark")
                  .foregroundStyle(Color.accentColor)
              }
            }
            .foregroundStyle(.primary)
          }
        }
      }
      .navigationTitle("选择货币")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
      }
    }
    .presentationDetents([.medium, .large])
  }
}

// MARK: - Preview

#Preview("Edit Budget") {
  EditBudgetView(
    itineraryId: "test-itinerary-id",
    budgetStore: BudgetStore()
  )
}
