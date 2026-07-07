import SwiftUI
import Charts

/// Main budget overview view with summary, charts, and expense list
struct BudgetOverviewView: View {
  let itineraryId: String
  let itineraryTitle: String

  @State private var budgetStore = BudgetStore()
  @State private var showAddExpense = false
  @State private var showEditBudget = false
  @State private var selectedChartType: ChartType = .category

  @Environment(\.colorScheme) private var colorScheme

  enum ChartType: String, CaseIterable {
    case category = "分类"
    case daily = "每日"
  }

  var body: some View {
    ScrollView {
      GlassEffectContainer {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Budget Summary Card
          budgetSummaryCard

          // Chart Section
          chartSection

          // Category Breakdown
          categoryBreakdownSection

          // Recent Expenses
          recentExpensesSection
        }
        .padding(DesignTokens.Spacing.md)
      }
    }
    .background(DesignTokens.Colors.backgroundGrouped)
    .navigationTitle("预算追踪")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Menu {
          Button {
            showEditBudget = true
          } label: {
            Label("设置预算", systemImage: "slider.horizontal.3")
          }

          Button {
            showAddExpense = true
          } label: {
            Label("添加支出", systemImage: "plus.circle")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
      }
    }
    .sheet(isPresented: $showAddExpense) {
      AddExpenseView(
        itineraryId: itineraryId,
        budgetStore: budgetStore
      )
    }
    .sheet(isPresented: $showEditBudget) {
      EditBudgetView(
        itineraryId: itineraryId,
        budgetStore: budgetStore
      )
    }
    .task {
      await budgetStore.loadAll(itineraryId: itineraryId)
    }
    .refreshable {
      await budgetStore.loadAll(itineraryId: itineraryId)
    }
  }

  // MARK: - Budget Summary Card

  private var budgetSummaryCard: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(itineraryTitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text("预算概览")
            .font(.title2)
            .fontWeight(.bold)
        }

        Spacer()

        // Budget status indicator
        if let summary = budgetStore.summary {
          BudgetStatusBadge(
            isOverBudget: summary.isOverBudget,
            percentUsed: summary.percentUsed
          )
        }
      }

      Divider()

      // Budget amounts
      if let summary = budgetStore.summary, let budget = summary.budget {
        HStack(spacing: DesignTokens.Spacing.xl) {
          BudgetAmountView(
            title: "总预算",
            amount: budget.total,
            currency: budget.currency,
            color: .blue
          )

          BudgetAmountView(
            title: "已支出",
            amount: summary.totalSpent,
            currency: budget.currency,
            color: summary.isOverBudget ? .red : .orange
          )

          BudgetAmountView(
            title: "剩余",
            amount: max(0, summary.remaining),
            currency: budget.currency,
            color: summary.isOverBudget ? .red : .green
          )
        }

        // Progress bar
        BudgetProgressBar(
          progress: min(summary.percentUsed / 100, 1.0),
          isOverBudget: summary.isOverBudget
        )
        .padding(.top, DesignTokens.Spacing.xs)

      } else {
        // No budget set
        VStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "chart.pie")
            .font(.largeTitle)
            .foregroundStyle(.secondary)

          Text("尚未设置预算")
            .font(.headline)
            .foregroundStyle(.secondary)

          Button("设置预算") {
            showEditBudget = true
          }
          .buttonStyle(.glassProminent)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }

  // MARK: - Chart Section

  private var chartSection: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Chart type picker
      Picker("图表类型", selection: $selectedChartType) {
        ForEach(ChartType.allCases, id: \.self) { type in
          Text(type.rawValue).tag(type)
        }
      }
      .pickerStyle(.segmented)

      // Chart
      Group {
        if selectedChartType == .category {
          categoryPieChart
        } else {
          dailyTrendChart
        }
      }
      .frame(height: 220)
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }

  // MARK: - Category Pie Chart

  private var categoryPieChart: some View {
    Group {
      if let summary = budgetStore.summary,
         !summary.spendingByCategory.isEmpty {
        Chart(summary.spendingByCategory) { item in
          SectorMark(
            angle: .value("金额", item.spent),
            innerRadius: .ratio(0.5),
            angularInset: 1.5
          )
          .foregroundStyle(item.category.swiftUIColor)
          .cornerRadius(4)
        }
        .chartLegend(position: .bottom, spacing: 12)
      } else {
        emptyChartPlaceholder
      }
    }
  }

  // MARK: - Daily Trend Chart

  private var dailyTrendChart: some View {
    Group {
      if !budgetStore.dailyTrend.isEmpty {
        Chart(budgetStore.dailyTrend) { item in
          BarMark(
            x: .value("日期", item.date),
            y: .value("金额", item.amount)
          )
          .foregroundStyle(DesignTokens.Colors.accent.gradient)
          .cornerRadius(4)
        }
        .chartXAxis {
          AxisMarks(values: .automatic) { value in
            AxisValueLabel {
              if let dateStr = value.as(String.self) {
                Text(formatDateLabel(dateStr))
                  .font(.caption2)
              }
            }
          }
        }
        .chartYAxis {
          AxisMarks(position: .leading)
        }
      } else {
        emptyChartPlaceholder
      }
    }
  }

  private var emptyChartPlaceholder: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: "chart.bar.xaxis")
        .font(.largeTitle)
        .foregroundStyle(.tertiary)

      Text("暂无支出数据")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  // MARK: - Category Breakdown Section

  private var categoryBreakdownSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Text("分类明细")
        .font(.headline)

      if let summary = budgetStore.summary,
         !summary.spendingByCategory.isEmpty {
        ForEach(summary.spendingByCategory) { item in
          CategorySpendingRow(item: item)
        }
      } else {
        Text("暂无分类支出")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.lg)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }

  // MARK: - Recent Expenses Section

  private var recentExpensesSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        Text("最近支出")
          .font(.headline)

        Spacer()

        NavigationLink {
          ExpenseListView(
            itineraryId: itineraryId,
            budgetStore: budgetStore
          )
        } label: {
          Text("查看全部")
            .font(.subheadline)
            .foregroundStyle(.blue)
        }
      }

      if budgetStore.expenses.isEmpty {
        VStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "receipt")
            .font(.largeTitle)
            .foregroundStyle(.tertiary)

          Text("暂无支出记录")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Button("添加支出") {
            showAddExpense = true
          }
          .buttonStyle(.glass)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.lg)
      } else {
        ForEach(budgetStore.expenses.prefix(5)) { expense in
          ExpenseRow(expense: expense)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }

  // MARK: - Helpers

  private func formatDateLabel(_ dateStr: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    guard let date = formatter.date(from: dateStr) else { return dateStr }

    let displayFormatter = DateFormatter()
    displayFormatter.dateFormat = "M/d"
    return displayFormatter.string(from: date)
  }
}

// MARK: - Supporting Views

struct BudgetStatusBadge: View {
  let isOverBudget: Bool
  let percentUsed: Double

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: isOverBudget ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
      Text(isOverBudget ? "超支" : "\(Int(percentUsed))%")
    }
    .font(.caption)
    .fontWeight(.semibold)
    .foregroundStyle(.white)
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .background(isOverBudget ? Color.red : (percentUsed > 80 ? Color.orange : Color.green))
    .clipShape(Capsule())
  }
}

struct BudgetAmountView: View {
  let title: String
  let amount: Double
  let currency: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Text(title)
        .font(.caption)
        .foregroundStyle(.secondary)

      Text(formatAmount(amount, currency: currency))
        .font(.headline)
        .fontWeight(.bold)
        .foregroundStyle(color)
    }
    .frame(maxWidth: .infinity)
  }

  private func formatAmount(_ amount: Double, currency: String) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount)) ?? "\(currency) \(Int(amount))"
  }
}

struct BudgetProgressBar: View {
  let progress: Double
  let isOverBudget: Bool

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        // Background
        RoundedRectangle(cornerRadius: 4)
          .fill(Color(.systemGray5))

        // Progress
        RoundedRectangle(cornerRadius: 4)
          .fill(progressColor)
          .frame(width: geometry.size.width * min(progress, 1.0))
      }
    }
    .frame(height: 8)
  }

  private var progressColor: Color {
    if isOverBudget {
      return .red
    } else if progress > 0.8 {
      return .orange
    } else {
      return .green
    }
  }
}

struct CategorySpendingRow: View {
  let item: CategorySpending

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
      HStack {
        // Category icon and name
        HStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: item.category.sfSymbol)
            .foregroundStyle(item.category.swiftUIColor)
            .frame(width: 24)

          Text(item.category.name)
            .font(.subheadline)
        }

        Spacer()

        // Amount
        VStack(alignment: .trailing, spacing: 2) {
          Text(formatAmount(item.spent))
            .font(.subheadline)
            .fontWeight(.medium)

          if item.budgetAmount > 0 {
            Text("/ \(formatAmount(item.budgetAmount))")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Progress bar
      if item.budgetAmount > 0 {
        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
              .fill(Color(.systemGray5))

            RoundedRectangle(cornerRadius: 2)
              .fill(item.isOverBudget ? Color.red : item.category.swiftUIColor)
              .frame(width: geometry.size.width * item.progressValue)
          }
        }
        .frame(height: 4)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  private func formatAmount(_ amount: Double) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
  }
}

struct ExpenseRow: View {
  let expense: Expense

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Category icon
      if let category = expense.category {
        Image(systemName: category.sfSymbol)
          .foregroundStyle(category.swiftUIColor)
          .frame(width: 32, height: 32)
          .background(category.swiftUIColor.opacity(0.15))
          .clipShape(Circle())
      } else {
        Image(systemName: "questionmark.circle")
          .foregroundStyle(.secondary)
          .frame(width: 32, height: 32)
          .background(Color(.systemGray5))
          .clipShape(Circle())
      }

      // Description and date
      VStack(alignment: .leading, spacing: 2) {
        Text(expense.description)
          .font(.subheadline)
          .lineLimit(1)

        Text(expense.date)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      // Amount
      Text(expense.formattedAmount)
        .font(.subheadline)
        .fontWeight(.medium)
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    BudgetOverviewView(
      itineraryId: "test-itinerary-id",
      itineraryTitle: "东京5日游"
    )
  }
}
