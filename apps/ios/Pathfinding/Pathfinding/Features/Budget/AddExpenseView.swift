import SwiftUI

/// Form view for adding a new expense
struct AddExpenseView: View {
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @Environment(\.dismiss) private var dismiss

  @State private var amount: String = ""
  @State private var description: String = ""
  @State private var selectedCategory: ExpenseCategory?
  @State private var date: Date = Date()
  @State private var time: Date = Date()
  @State private var includeTime: Bool = false
  @State private var paymentMethod: PaymentMethod = .wechat
  @State private var notes: String = ""
  @State private var showCategoryPicker = false

  private var isValid: Bool {
    guard let amountValue = Double(amount), amountValue > 0 else { return false }
    guard !description.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
    guard selectedCategory != nil else { return false }
    return true
  }

  var body: some View {
    NavigationStack {
      Form {
        // Amount Section
        Section {
          HStack {
            Text(budgetStore.budget?.currency ?? "CNY")
              .font(.headline)
              .foregroundStyle(.secondary)

            TextField("0.00", text: $amount)
              .keyboardType(.decimalPad)
              .font(.system(size: 36, weight: .bold))
              .multilineTextAlignment(.trailing)
          }
          .padding(.vertical, DesignTokens.Spacing.sm)
        } header: {
          Text("金额")
        }

        // Category Section
        Section {
          Button {
            showCategoryPicker = true
          } label: {
            HStack {
              if let category = selectedCategory {
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
                  .background(Color(.systemGray5))
                  .clipShape(Circle())

                Text("选择分类")
                  .foregroundStyle(.secondary)
              }

              Spacer()

              Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
            }
          }
        } header: {
          Text("分类")
        }

        // Description Section
        Section {
          TextField("支出说明", text: $description)
        } header: {
          Text("说明")
        }

        // Date & Time Section
        Section {
          DatePicker(
            "日期",
            selection: $date,
            displayedComponents: .date
          )

          Toggle("记录时间", isOn: $includeTime)

          if includeTime {
            DatePicker(
              "时间",
              selection: $time,
              displayedComponents: .hourAndMinute
            )
          }
        } header: {
          Text("日期时间")
        }

        // Payment Method Section
        Section {
          Picker("支付方式", selection: $paymentMethod) {
            ForEach(PaymentMethod.allCases, id: \.self) { method in
              Label(method.displayName, systemImage: method.icon)
                .tag(method)
            }
          }
          .pickerStyle(.menu)
        } header: {
          Text("支付方式")
        }

        // Notes Section
        Section {
          TextField("备注（可选）", text: $notes, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("备注")
        }
      }
      .navigationTitle("添加支出")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            saveExpense()
          }
          .disabled(!isValid || budgetStore.isSubmitting)
        }
      }
      .sheet(isPresented: $showCategoryPicker) {
        CategoryPickerView(
          categories: budgetStore.categories,
          selectedCategory: $selectedCategory
        )
      }
      .task {
        if budgetStore.categories.isEmpty {
          await budgetStore.fetchCategories()
        }
        // Auto-select first category if none selected
        if selectedCategory == nil, let first = budgetStore.categories.first {
          selectedCategory = first
        }
      }
    }
  }

  private func saveExpense() {
    guard let category = selectedCategory,
          let amountValue = Double(amount) else { return }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let dateStr = dateFormatter.string(from: date)

    var timeStr: String?
    if includeTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      timeStr = timeFormatter.string(from: time)
    }

    Task {
      let success = await budgetStore.createExpense(
        itineraryId: itineraryId,
        userId: "current-user", // TODO: Get from AuthManager
        categoryId: category.id,
        amount: amountValue,
        currency: budgetStore.budget?.currency ?? "CNY",
        description: description.trimmingCharacters(in: .whitespaces),
        date: dateStr,
        time: timeStr,
        paymentMethod: paymentMethod,
        notes: notes.isEmpty ? nil : notes
      )

      if success {
        dismiss()
      }
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
      .navigationTitle("选择分类")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
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

struct EditExpenseView: View {
  let expense: Expense
  let itineraryId: String
  @Bindable var budgetStore: BudgetStore

  @Environment(\.dismiss) private var dismiss

  @State private var amount: String = ""
  @State private var description: String = ""
  @State private var selectedCategory: ExpenseCategory?
  @State private var date: Date = Date()
  @State private var time: Date = Date()
  @State private var includeTime: Bool = false
  @State private var paymentMethod: PaymentMethod = .wechat
  @State private var notes: String = ""
  @State private var showCategoryPicker = false

  private var isValid: Bool {
    guard let amountValue = Double(amount), amountValue > 0 else { return false }
    guard !description.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
    guard selectedCategory != nil else { return false }
    return true
  }

  var body: some View {
    NavigationStack {
      Form {
        // Amount Section
        Section {
          HStack {
            Text(expense.currency)
              .font(.headline)
              .foregroundStyle(.secondary)

            TextField("0.00", text: $amount)
              .keyboardType(.decimalPad)
              .font(.system(size: 36, weight: .bold))
              .multilineTextAlignment(.trailing)
          }
          .padding(.vertical, DesignTokens.Spacing.sm)
        } header: {
          Text("金额")
        }

        // Category Section
        Section {
          Button {
            showCategoryPicker = true
          } label: {
            HStack {
              if let category = selectedCategory {
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

                Text("选择分类")
                  .foregroundStyle(.secondary)
              }

              Spacer()

              Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
            }
          }
        } header: {
          Text("分类")
        }

        // Description Section
        Section {
          TextField("支出说明", text: $description)
        } header: {
          Text("说明")
        }

        // Date & Time Section
        Section {
          DatePicker(
            "日期",
            selection: $date,
            displayedComponents: .date
          )

          Toggle("记录时间", isOn: $includeTime)

          if includeTime {
            DatePicker(
              "时间",
              selection: $time,
              displayedComponents: .hourAndMinute
            )
          }
        } header: {
          Text("日期时间")
        }

        // Payment Method Section
        Section {
          Picker("支付方式", selection: $paymentMethod) {
            ForEach(PaymentMethod.allCases, id: \.self) { method in
              Label(method.displayName, systemImage: method.icon)
                .tag(method)
            }
          }
          .pickerStyle(.menu)
        } header: {
          Text("支付方式")
        }

        // Notes Section
        Section {
          TextField("备注（可选）", text: $notes, axis: .vertical)
            .lineLimit(3...6)
        } header: {
          Text("备注")
        }
      }
      .navigationTitle("编辑支出")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            updateExpense()
          }
          .disabled(!isValid || budgetStore.isSubmitting)
        }
      }
      .sheet(isPresented: $showCategoryPicker) {
        CategoryPickerView(
          categories: budgetStore.categories,
          selectedCategory: $selectedCategory
        )
      }
      .onAppear {
        loadExpenseData()
      }
      .task {
        if budgetStore.categories.isEmpty {
          await budgetStore.fetchCategories()
        }
      }
    }
  }

  private func loadExpenseData() {
    amount = String(format: "%.2f", expense.amount)
    description = expense.description
    selectedCategory = budgetStore.categories.first { $0.id == expense.categoryId }
    notes = expense.notes ?? ""

    // Parse date
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    if let parsedDate = dateFormatter.date(from: expense.date) {
      date = parsedDate
    }

    // Parse time
    if let timeStr = expense.time {
      includeTime = true
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      if let parsedTime = timeFormatter.date(from: timeStr) {
        time = parsedTime
      }
    }

    // Parse payment method
    if let methodStr = expense.paymentMethod,
       let method = PaymentMethod(rawValue: methodStr) {
      paymentMethod = method
    }
  }

  private func updateExpense() {
    guard let category = selectedCategory,
          let amountValue = Double(amount) else { return }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let dateStr = dateFormatter.string(from: date)

    var timeStr: String?
    if includeTime {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      timeStr = timeFormatter.string(from: time)
    }

    var updates: [String: Any] = [
      "categoryId": category.id,
      "amount": amountValue,
      "description": description.trimmingCharacters(in: .whitespaces),
      "date": dateStr,
      "paymentMethod": paymentMethod.rawValue,
    ]

    if let timeStr {
      updates["time"] = timeStr
    }

    if !notes.isEmpty {
      updates["notes"] = notes
    }

    Task {
      let success = await budgetStore.updateExpense(
        expenseId: expense.id,
        itineraryId: itineraryId,
        updates: updates
      )

      if success {
        dismiss()
      }
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
