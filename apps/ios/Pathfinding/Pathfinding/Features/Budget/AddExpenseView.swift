import SwiftUI

// MARK: - Expense Form Model

/// Backing model for create/edit expense forms.
@Observable
final class ExpenseFormModel {
  enum Mode {
    case create
    case edit(Expense)
  }

  // Editable fields
  var amountText: String
  var description: String
  var selectedCategory: ExpenseCategory?
  var date: Date
  var time: Date
  var includeTime: Bool
  var paymentMethod: PaymentMethod
  var notes: String
  var showCategoryPicker: Bool = false

  /// Parsed numeric amount; 0 when amountText is invalid.
  var amount: Double { Double(amountText) ?? 0 }

  /// Current selected category; seeded from expense.category in edit mode, updated by the picker in both modes.
  var category: ExpenseCategory? { selectedCategory }

  var isValid: Bool {
    guard let value = Double(amountText), value > 0 else { return false }
    guard !description.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
    return selectedCategory != nil
  }

  init(mode: Mode) {
    switch mode {
    case .create:
      amountText = ""
      description = ""
      selectedCategory = nil
      date = Date()
      time = Date()
      includeTime = false
      paymentMethod = .wechat
      notes = ""

    case .edit(let expense):
      amountText = String(format: "%.2f", expense.amount)
      description = expense.description
      // category is resolved later via budgetStore.categories; keep enriched field as seed
      selectedCategory = expense.category
      notes = expense.notes ?? ""
      paymentMethod = {
        if let raw = expense.paymentMethod, let method = PaymentMethod(rawValue: raw) {
          return method
        }
        return .wechat
      }()
      // Parse date
      let dateFormatter = DateFormatter()
      dateFormatter.locale = Locale(identifier: "en_US_POSIX")
      dateFormatter.dateFormat = "yyyy-MM-dd"
      date = dateFormatter.date(from: expense.date) ?? Date()
      // Parse time
      if let timeStr = expense.time {
        includeTime = true
        let timeFormatter = DateFormatter()
        timeFormatter.locale = Locale(identifier: "en_US_POSIX")
        timeFormatter.dateFormat = "HH:mm"
        time = timeFormatter.date(from: timeStr) ?? Date()
      } else {
        includeTime = false
        time = Date()
      }
    }
  }
}

// MARK: - Shared Expense Form

/// Shared form body used by both AddExpenseView and EditExpenseView.
struct ExpenseForm: View {
  @Bindable var budgetStore: BudgetStore
  let model: ExpenseFormModel
  var currencyLabel: String

  var body: some View {
    Form {
      // Amount Section
      Section {
        HStack {
          Text(currencyLabel)
            .font(.headline)
            .foregroundStyle(.secondary)

          TextField("0.00", text: Bindable(model).amountText)
            .keyboardType(.decimalPad)
            .font(.system(size: 36, weight: .bold))
            .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
      } header: {
        Text("expense.form.amount".localized)
      }

      // Category Section
      Section {
        Button {
          model.showCategoryPicker = true
        } label: {
          HStack {
            if let category = model.selectedCategory {
              Image(systemName: category.sfSymbol)
                .foregroundStyle(category.swiftUIColor)
                .frame(width: 28, height: 28)
                .background(category.swiftUIColor.opacity(0.15))
                .clipShape(Circle())

              Text(category.name)
                .foregroundStyle(.primary)
            } else {
              Image(systemName: "folder")
                .foregroundStyle(.secondary)
                .frame(width: 28, height: 28)
                .background(Sunpebble.sunSoft)
                .clipShape(Circle())

              Text("expense.form.pick_category".localized)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
              .font(.caption)
              .foregroundStyle(.tertiary)
          }
        }
      } header: {
        Text("expense.form.category".localized)
      }

      // Description Section
      Section {
        TextField("expense.form.description_placeholder".localized, text: Bindable(model).description)
      } header: {
        Text("expense.form.description".localized)
      }

      // Date & Time Section
      Section {
        DatePicker(
          "expense.form.date".localized,
          selection: Bindable(model).date,
          displayedComponents: .date
        )

        Toggle("expense.form.include_time".localized, isOn: Bindable(model).includeTime)

        if model.includeTime {
          DatePicker(
            "expense.form.time".localized,
            selection: Bindable(model).time,
            displayedComponents: .hourAndMinute
          )
        }
      } header: {
        Text("expense.form.date_time".localized)
      }

      // Payment Method Section
      Section {
        Picker("expense.form.payment_method".localized, selection: Bindable(model).paymentMethod) {
          ForEach(PaymentMethod.allCases, id: \.self) { method in
            Label(method.displayName, systemImage: method.icon)
              .tag(method)
          }
        }
        .pickerStyle(.menu)
      } header: {
        Text("expense.form.payment_method".localized)
      }

      // Notes Section
      Section {
        TextField("expense.form.notes_placeholder".localized, text: Bindable(model).notes, axis: .vertical)
          .lineLimit(3...6)
      } header: {
        Text("budget.edit.notes".localized)
      }
    }
    .sheet(isPresented: Bindable(model).showCategoryPicker) {
      CategoryPickerView(
        categories: budgetStore.categories,
        selectedCategory: Bindable(model).selectedCategory
      )
    }
  }
}

// MARK: - Add Expense View

/// Thin wrapper around ExpenseForm for creating a new expense.
struct AddExpenseView: View {
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @Environment(\.dismiss) private var dismiss

  @State private var model = ExpenseFormModel(mode: .create)

  var body: some View {
    NavigationStack {
      ExpenseForm(
        budgetStore: budgetStore,
        model: model,
        currencyLabel: budgetStore.budget?.currency ?? "CNY"
      )
      .navigationTitle("expense.add".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("common.cancel".localized) { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("common.save".localized) { saveExpense() }
            .disabled(!model.isValid || budgetStore.isSubmitting)
        }
      }
      .task {
        if budgetStore.categories.isEmpty {
          await budgetStore.fetchCategories()
        }
        // Auto-select first category if none chosen
        if model.selectedCategory == nil, let first = budgetStore.categories.first {
          model.selectedCategory = first
        }
      }
    }
  }

  private func saveExpense() {
    guard let category = model.selectedCategory,
          let amountValue = Double(model.amountText) else { return }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let dateStr = dateFormatter.string(from: model.date)

    var timeStr: String?
    if model.includeTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      timeStr = timeFormatter.string(from: model.time)
    }

    Task {
      let success = await budgetStore.createExpense(
        itineraryId: itineraryId,
        userId: AuthManager.shared.currentUserId ?? "guest",
        categoryId: category.id,
        amount: amountValue,
        currency: budgetStore.budget?.currency ?? "CNY",
        description: model.description.trimmingCharacters(in: .whitespaces),
        date: dateStr,
        time: timeStr,
        paymentMethod: model.paymentMethod,
        notes: model.notes.isEmpty ? nil : model.notes
      )
      if success { dismiss() }
    }
  }
}

// MARK: - Category Picker View

struct CategoryPickerView: View {
  let categories: [ExpenseCategory]
  @Binding var selectedCategory: ExpenseCategory?

  @Environment(\.dismiss) private var dismiss

  private let columns = [
    GridItem(.flexible()),
    GridItem(.flexible()),
    GridItem(.flexible()),
  ]

  var body: some View {
    NavigationStack {
      ScrollView {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
          ForEach(categories) { category in
            CategoryGridItem(
              category: category,
              isSelected: selectedCategory?.id == category.id
            ) {
              selectedCategory = category
              dismiss()
            }
          }
        }
        .padding(DesignTokens.Spacing.md)
      }
      .navigationTitle("expense.form.pick_category".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("common.cancel".localized) { dismiss() }
        }
      }
    }
    .presentationDetents([.medium])
  }
}

struct CategoryGridItem: View {
  let category: ExpenseCategory
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: DesignTokens.Spacing.sm) {
        Image(systemName: category.sfSymbol)
          .font(.title2)
          .foregroundStyle(isSelected ? .white : category.swiftUIColor)
          .frame(width: 56, height: 56)
          .background(isSelected ? category.swiftUIColor : category.swiftUIColor.opacity(0.15))
          .clipShape(Circle())
          .overlay {
            if isSelected {
              Circle()
                .stroke(category.swiftUIColor, lineWidth: 3)
                .padding(-4)
            }
          }

        Text(category.name)
          .font(.caption)
          .fontWeight(isSelected ? .semibold : .regular)
          .foregroundStyle(isSelected ? category.swiftUIColor : .primary)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Edit Expense View

/// Thin wrapper around ExpenseForm for updating an existing expense.
struct EditExpenseView: View {
  let expense: Expense
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @Environment(\.dismiss) private var dismiss

  @State private var model: ExpenseFormModel

  init(expense: Expense, itineraryId: String, budgetStore: BudgetStore) {
    self.expense = expense
    self.itineraryId = itineraryId
    self.budgetStore = budgetStore
    self._model = State(initialValue: ExpenseFormModel(mode: .edit(expense)))
  }

  var body: some View {
    NavigationStack {
      ExpenseForm(
        budgetStore: budgetStore,
        model: model,
        currencyLabel: expense.currency
      )
      .navigationTitle("expense.edit".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("common.cancel".localized) { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("common.save".localized) { updateExpense() }
            .disabled(!model.isValid || budgetStore.isSubmitting)
        }
      }
      .task {
        if budgetStore.categories.isEmpty {
          await budgetStore.fetchCategories()
        }
        // Resolve category from store now that categories are loaded
        if let stored = budgetStore.categories.first(where: { $0.id == expense.categoryId }) {
          model.selectedCategory = stored
        }
      }
    }
  }

  private func updateExpense() {
    guard let category = model.selectedCategory,
          let amountValue = Double(model.amountText) else { return }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let dateStr = dateFormatter.string(from: model.date)

    var timeStr: String?
    if model.includeTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      timeStr = timeFormatter.string(from: model.time)
    }

    Task {
      let success = await budgetStore.updateExpense(
        expenseId: expense.id,
        itineraryId: itineraryId,
        categoryId: category.id,
        amount: amountValue,
        description: model.description.trimmingCharacters(in: .whitespaces),
        date: dateStr,
        time: timeStr,
        paymentMethod: model.paymentMethod.rawValue,
        notes: model.notes.isEmpty ? nil : model.notes
      )
      if success { dismiss() }
    }
  }
}

// MARK: - Preview

#Preview("Add Expense") {
  AddExpenseView(
    itineraryId: "test-itinerary-id",
    budgetStore: BudgetStore()
  )
}
